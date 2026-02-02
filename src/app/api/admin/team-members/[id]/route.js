import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// GET - Get single team member by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log('Fetching team member with ID:', id);
    
    await connectDB();
    const db = mongoose.connection.db;
    
    let teamMember;
    
    // Try different ID formats since _id might be string or ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      teamMember = await db.collection('team_members').findOne({ 
        _id: new mongoose.Types.ObjectId(id) 
      });
    } else {
      teamMember = await db.collection('team_members').findOne({ 
        _id: id 
      });
    }
    
    console.log('Found team member:', teamMember ? {
      name: teamMember.name,
      role: teamMember.role,
      permissions: teamMember.permissions
    } : 'Not found');
    
    if (!teamMember) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team member not found' 
      }, { status: 404 });
    }
    
    // Remove password from response for security
    const { password, ...memberWithoutPassword } = teamMember;
    
    return NextResponse.json({ 
      success: true, 
      data: memberWithoutPassword 
    });
  } catch (error) {
    console.error('GET Team Member Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT - Update team member by ID
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    console.log('Updating team member ID:', id, 'with data:', {
      name: body.name,
      role: body.role,
      permissions: body.permissions
    });
    
    await connectDB();
    const db = mongoose.connection.db;
    
    // Find existing member to get current data
    let existingMember;
    if (mongoose.Types.ObjectId.isValid(id)) {
      existingMember = await db.collection('team_members').findOne(
        { _id: new mongoose.Types.ObjectId(id) }
      );
    } else {
      existingMember = await db.collection('team_members').findOne(
        { _id: id }
      );
    }
    
    if (!existingMember) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team member not found' 
      }, { status: 404 });
    }
    
    // Check for duplicate operatorNumber (if changing)
    if (body.operatorNumber && body.operatorNumber !== existingMember.operatorNumber) {
      const existingOperatorNumber = await db.collection('team_members').findOne({ 
        operatorNumber: body.operatorNumber,
        _id: { $ne: existingMember._id }
      });
      
      if (existingOperatorNumber) {
        return NextResponse.json({ 
          success: false, 
          error: `Operator Number "${body.operatorNumber}" is already assigned to another team member` 
        }, { status: 400 });
      }
    }
    
    // Check for duplicate teamMemberNumber (if changing)
    if (body.teamMemberNumber && body.teamMemberNumber !== existingMember.teamMemberNumber) {
      const existingTeamMemberNumber = await db.collection('team_members').findOne({ 
        teamMemberNumber: body.teamMemberNumber,
        _id: { $ne: existingMember._id }
      });
      
      if (existingTeamMemberNumber) {
        return NextResponse.json({ 
          success: false, 
          error: `Team Member Number "${body.teamMemberNumber}" is already assigned to another team member` 
        }, { status: 400 });
      }
    }
    
    // Validate role-specific number requirements
    if (body.role === 'Data Entry Operator' && !body.operatorNumber && !existingMember.operatorNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Operator Number is required for Data Entry Operators' 
      }, { status: 400 });
    }
    
    if (body.role === 'Recovery Team' && !body.teamMemberNumber && !existingMember.teamMemberNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team Member Number is required for Recovery Team' 
      }, { status: 400 });
    }
    
    const updateData = {
      name: body.name,
      phone: body.phone,
      whatsappNumber: body.whatsappNumber || '',
      address: body.address || '',
      loginId: body.loginId,
      role: body.role,
      operatorNumber: body.operatorNumber || '',
      teamMemberNumber: body.teamMemberNumber || '',
      officeCategory: body.role === 'Data Entry Operator' ? (body.officeCategory || '') : '',
      status: body.status || 'active',
      updatedAt: new Date()
    };
    
    // Handle permissions based on role
    if (body.role === 'Data Entry Operator') {
      updateData.teamMemberNumber = '';
      // Set permissions only for Data Entry Operators
      if (body.permissions) {
        updateData.permissions = body.permissions;
      } else if (!existingMember.permissions) {
        // Set default if not exists
        updateData.permissions = 'only_data_entry';
      }
    } else if (body.role === 'Recovery Team') {
      updateData.operatorNumber = '';
      // Clear permissions for Recovery Team
      updateData.permissions = undefined;
    }
    
    // If password is provided, hash it
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 12);
    }
    
    let result;
    
    // Try different ID formats since _id might be string or ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await db.collection('team_members').updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: updateData }
      );
    } else {
      result = await db.collection('team_members').updateOne(
        { _id: id },
        { $set: updateData }
      );
    }
    
    console.log('Update result:', result);
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team member not found' 
      }, { status: 404 });
    }
    
    // Fetch updated document to return
    let updatedMember;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedMember = await db.collection('team_members').findOne({ 
        _id: new mongoose.Types.ObjectId(id) 
      });
    } else {
      updatedMember = await db.collection('team_members').findOne({ 
        _id: id 
      });
    }
    
    // Remove password from response
    if (updatedMember) {
      const { password, ...memberWithoutPassword } = updatedMember;
      updatedMember = memberWithoutPassword;
    }
    
    return NextResponse.json({ 
      success: true,
      data: updatedMember,
      message: 'Team member updated successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('PUT Team Member Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// DELETE - Delete team member by ID
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    console.log('Deleting team member with ID:', id);
    
    await connectDB();
    const db = mongoose.connection.db;
    
    let result;
    
    // Try different ID formats since _id might be string or ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await db.collection('team_members').deleteOne({ 
        _id: new mongoose.Types.ObjectId(id) 
      });
    } else {
      result = await db.collection('team_members').deleteOne({ 
        _id: id 
      });
    }
    
    console.log('Delete result:', result);
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team member not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Team member deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('DELETE Team Member Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PATCH - Partial update team member by ID
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    console.log('Partial updating team member ID:', id, 'with data:', {
      ...body,
      permissions: body.permissions
    });
    
    await connectDB();
    const db = mongoose.connection.db;
    
    // Get existing member to check current role
    let existingMember;
    if (mongoose.Types.ObjectId.isValid(id)) {
      existingMember = await db.collection('team_members').findOne(
        { _id: new mongoose.Types.ObjectId(id) }
      );
    } else {
      existingMember = await db.collection('team_members').findOne(
        { _id: id }
      );
    }
    
    if (!existingMember) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team member not found' 
      }, { status: 404 });
    }
    
    const updateData = {
      ...body,
      updatedAt: new Date()
    };
    
    // If password is provided in partial update, hash it
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 12);
    }
    
    // Handle officeCategory logic for role changes
    if (body.role && body.role === 'Data Entry Operator' && !body.officeCategory) {
      updateData.officeCategory = '';
    } else if (body.role && body.role !== 'Data Entry Operator') {
      updateData.officeCategory = '';
    }
    
    // Handle number fields for role changes
    if (body.role === 'Data Entry Operator') {
      updateData.teamMemberNumber = '';
      if (!body.operatorNumber && !existingMember.operatorNumber) {
        return NextResponse.json({ 
          success: false, 
          error: 'Operator Number is required for Data Entry Operators' 
        }, { status: 400 });
      }
      
      // Handle permissions for Data Entry Operators
      if (body.permissions) {
        updateData.permissions = body.permissions;
      }
    } else if (body.role === 'Recovery Team') {
      updateData.operatorNumber = '';
      if (!body.teamMemberNumber && !existingMember.teamMemberNumber) {
        return NextResponse.json({ 
          success: false, 
          error: 'Team Member Number is required for Recovery Team' 
        }, { status: 400 });
      }
      // Clear permissions for Recovery Team
      updateData.permissions = undefined;
    }
    
    // Check for duplicate numbers if they're being updated
    if (body.operatorNumber && body.operatorNumber !== existingMember.operatorNumber) {
      const existingOperatorNumber = await db.collection('team_members').findOne({ 
        operatorNumber: body.operatorNumber,
        _id: { $ne: id }
      });
      
      if (existingOperatorNumber) {
        return NextResponse.json({ 
          success: false, 
          error: `Operator Number "${body.operatorNumber}" is already assigned` 
        }, { status: 400 });
      }
    }
    
    if (body.teamMemberNumber && body.teamMemberNumber !== existingMember.teamMemberNumber) {
      const existingTeamMemberNumber = await db.collection('team_members').findOne({ 
        teamMemberNumber: body.teamMemberNumber,
        _id: { $ne: id }
      });
      
      if (existingTeamMemberNumber) {
        return NextResponse.json({ 
          success: false, 
          error: `Team Member Number "${body.teamMemberNumber}" is already assigned` 
        }, { status: 400 });
      }
    }
    
    let result;
    
    // Try different ID formats since _id might be string or ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await db.collection('team_members').updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: updateData }
      );
    } else {
      result = await db.collection('team_members').updateOne(
        { _id: id },
        { $set: updateData }
      );
    }
    
    console.log('PATCH Update result:', result);
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Team member not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Team member updated successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('PATCH Team Member Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}