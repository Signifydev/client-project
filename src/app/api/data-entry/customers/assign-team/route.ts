import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

interface AssignTeamRequestBody {
  customerIds: string[];
  teamMemberNumber: string;
  assignedBy: string;
  assignedByOffice?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AssignTeamRequestBody = await request.json();
    
    console.log('🔗 Assigning customers to team member:', {
      teamMemberNumber: body.teamMemberNumber,
      customerCount: body.customerIds?.length || 0,
      assignedBy: body.assignedBy
    });

    // Validate request
    if (!body.customerIds || !Array.isArray(body.customerIds) || body.customerIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer IDs array is required and cannot be empty'
      }, { status: 400 });
    }

    if (!body.teamMemberNumber || body.teamMemberNumber.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Team member number is required'
      }, { status: 400 });
    }

    if (!body.assignedBy || body.assignedBy.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Assigned by field is required'
      }, { status: 400 });
    }

    await connectDB();
    
    // Ensure database connection is established
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    const db = mongoose.connection.db;

    // Step 1: Verify team member exists and is active
    const teamMember = await db.collection('team_members').findOne({
      teamMemberNumber: body.teamMemberNumber,
      role: 'Recovery Team',
      status: 'active'
    }, {
      projection: { _id: 1, name: 1, officeCategory: 1, teamMemberNumber: 1 }
    });

    if (!teamMember) {
      return NextResponse.json({
        success: false,
        error: `Team member with number ${body.teamMemberNumber} not found or inactive`
      }, { status: 404 });
    }

    // Step 2: Validate all customer IDs exist - Convert all IDs to ObjectId
    const validCustomerIds = body.customerIds.filter(id => 
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validCustomerIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid customer IDs provided'
      }, { status: 400 });
    }

    const customerObjectIds = validCustomerIds.map(id => new mongoose.Types.ObjectId(id));

    const customers = await db.collection('customers')
      .find({
        _id: { $in: customerObjectIds },
        status: 'active',
        isActive: true
      })
      .project({ _id: 1, customerNumber: 1, name: 1, officeCategory: 1, teamMemberNumber: 1 })
      .toArray();

    if (customers.length !== validCustomerIds.length) {
      const foundIds = customers.map(c => c._id.toString());
      const missingIds = validCustomerIds.filter(id => !foundIds.includes(id));
      
      console.warn(`⚠️ Some customer IDs not found:`, missingIds);
    }

    // Step 3: Check office compatibility
    const incompatibleCustomers = customers.filter(c => 
      c.officeCategory !== teamMember.officeCategory
    );

    if (incompatibleCustomers.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Cannot assign customers from different office categories. Team member office: ${teamMember.officeCategory}`,
        incompatibleCustomers: incompatibleCustomers.map(c => ({
          customerId: c._id,
          customerNumber: c.customerNumber,
          name: c.name,
          officeCategory: c.officeCategory
        }))
      }, { status: 400 });
    }

    // Step 4: Prepare update operations - Only for valid ObjectIds
    const updateOperations = validCustomerIds.map(customerId => {
      const objectId = new mongoose.Types.ObjectId(customerId);
      return {
        updateOne: {
          filter: {
            _id: objectId,
            status: 'active',
            isActive: true
          },
          update: {
            $set: {
              teamMemberNumber: body.teamMemberNumber,
              updatedAt: new Date()
            },
            $push: {
              assignmentHistory: {
                action: 'ASSIGNED',
                teamMemberNumber: body.teamMemberNumber,
                assignedBy: body.assignedBy,
                assignedAt: new Date(),
                notes: body.notes || `Assigned by ${body.assignedBy}`,
                timestamp: new Date()
              }
            } as any // TypeScript fix: cast to any
          }
        }
      };
    });

    // Step 5: Execute bulk update
    const bulkWriteResult = await db.collection('customers').bulkWrite(updateOperations as any, {
      ordered: false // Continue even if some updates fail
    });

    console.log('📊 Bulk write result:', {
      matched: bulkWriteResult.matchedCount,
      modified: bulkWriteResult.modifiedCount,
      upserted: bulkWriteResult.upsertedCount
    });

    // Step 6: Get updated customers for response
    const updatedCustomers = await db.collection('customers')
      .find({
        _id: { $in: customerObjectIds }
      })
      .project({ _id: 1, customerNumber: 1, name: 1, teamMemberNumber: 1 })
      .toArray();

    const assignedCount = updatedCustomers.filter(c => 
      c.teamMemberNumber === body.teamMemberNumber
    ).length;

    const failedCount = validCustomerIds.length - assignedCount;

    // Step 7: Log the assignment for audit trail
    const assignmentLog = {
      type: 'TEAM_ASSIGNMENT',
      teamMemberNumber: body.teamMemberNumber,
      teamMemberName: teamMember.name,
      assignedBy: body.assignedBy,
      assignedByOffice: body.assignedByOffice || 'Unknown',
      customerCount: validCustomerIds.length,
      assignedCount: assignedCount,
      failedCount: failedCount,
      timestamp: new Date(),
      notes: body.notes || `Bulk assignment by ${body.assignedBy}`
    };

    await db.collection('assignment_logs').insertOne(assignmentLog);

    console.log(`✅ Successfully assigned ${assignedCount} customers to team member ${body.teamMemberNumber}`);

    return NextResponse.json({
      success: true,
      data: {
        assignedCount,
        failedCount,
        totalCustomers: validCustomerIds.length,
        teamMemberNumber: body.teamMemberNumber,
        teamMemberName: teamMember.name,
        assignedCustomers: updatedCustomers.map(c => ({
          customerId: c._id,
          customerNumber: c.customerNumber,
          customerName: c.name,
          success: c.teamMemberNumber === body.teamMemberNumber,
          message: c.teamMemberNumber === body.teamMemberNumber 
            ? 'Successfully assigned' 
            : 'Assignment failed - customer not found or inactive'
        }))
      },
      message: `Successfully assigned ${assignedCount} customer(s) to team member ${body.teamMemberNumber}`
    });

  } catch (error: unknown) {
    console.error('❌ Error assigning customers to team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to assign customers to team member';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}