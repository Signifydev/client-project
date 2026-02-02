import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

interface RemoveAssignmentRequestBody {
  customerIds: string[];
  removedBy: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RemoveAssignmentRequestBody = await request.json();
    
    console.log('🗑️ Removing team assignment from customers:', {
      customerCount: body.customerIds?.length || 0,
      removedBy: body.removedBy
    });

    // Validate request
    if (!body.customerIds || !Array.isArray(body.customerIds) || body.customerIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Customer IDs array is required and cannot be empty'
      }, { status: 400 });
    }

    if (!body.removedBy || body.removedBy.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Removed by field is required'
      }, { status: 400 });
    }

    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    
    const db = mongoose.connection.db;

    // Step 1: Validate all customer IDs exist
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

    // Step 2: Get current assignments
    const customersBefore = await db.collection('customers')
  .find({
    _id: { $in: customerObjectIds },
    status: 'active',
    isActive: true,
    teamMemberNumber: { $exists: true, $nin: [null, ''] } // FIXED LINE
  })
  .project({ _id: 1, customerNumber: 1, name: 1, teamMemberNumber: 1 })
  .toArray();

    console.log(`Found ${customersBefore.length} customers with team assignments to remove`);

    if (customersBefore.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No customers found with team assignments to remove'
      }, { status: 404 });
    }

    // Step 3: Prepare update operations
    const updateOperations = customersBefore.map(customer => {
      return {
        updateOne: {
          filter: {
            _id: customer._id
          },
          update: {
            $set: {
              teamMemberNumber: null,
              updatedAt: new Date()
            },
            $push: {
              assignmentHistory: {
                action: 'REMOVED',
                previousTeamMemberNumber: customer.teamMemberNumber,
                removedBy: body.removedBy,
                removedAt: new Date(),
                notes: body.notes || `Removed by ${body.removedBy}`,
                timestamp: new Date()
              } as any
            }
          }
        }
      };
    });

    // Step 4: Execute bulk update
    const bulkWriteResult = await db.collection('customers').bulkWrite(updateOperations as any, {
      ordered: false
    });

    const removedCount = bulkWriteResult.modifiedCount;
    const failedCount = customersBefore.length - removedCount;

    // Step 5: Log the removal
    const removalLog = {
      type: 'TEAM_ASSIGNMENT_REMOVAL',
      removedBy: body.removedBy,
      customerCount: customersBefore.length,
      removedCount: removedCount,
      failedCount: failedCount,
      timestamp: new Date(),
      notes: body.notes || `Bulk removal by ${body.removedBy}`,
      affectedCustomers: customersBefore.map(c => ({
        customerId: c._id,
        customerNumber: c.customerNumber,
        name: c.name,
        previousTeamMemberNumber: c.teamMemberNumber
      }))
    };

    await db.collection('assignment_logs').insertOne(removalLog);

    console.log(`✅ Successfully removed team assignments from ${removedCount} customers`);

    return NextResponse.json({
      success: true,
      data: {
        removedCount,
        failedCount,
        totalProcessed: customersBefore.length
      },
      message: `Successfully removed team assignments from ${removedCount} customer(s)`
    });

  } catch (error: unknown) {
    console.error('❌ Error removing team assignments:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove team assignments';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}