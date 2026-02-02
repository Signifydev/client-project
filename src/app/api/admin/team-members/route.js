import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    const teamMembers = await db.collection('team_members').find({}).toArray();
    
    console.log('Fetched team members:', teamMembers.length);
    
    return NextResponse.json({ 
      success: true, 
      data: teamMembers 
    });
  } catch (error) {
    console.error('GET Team Members Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('Adding team member:', { 
      name: body.name, 
      role: body.role,
      officeCategory: body.officeCategory,
      permissions: body.permissions 
    });
    
    await connectDB();
    const db = mongoose.connection.db;
    
    // Check if loginId already exists
    const existingLoginId = await db.collection('team_members').findOne({ 
      loginId: body.loginId 
    });
    
    if (existingLoginId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Login ID already exists' 
      }, { status: 400 });
    }
    
    // Check for duplicate operatorNumber (if provided)
    if (body.operatorNumber) {
      const existingOperatorNumber = await db.collection('team_members').findOne({ 
        operatorNumber: body.operatorNumber 
      });
      
      if (existingOperatorNumber) {
        return NextResponse.json({ 
          success: false, 
          error: `Operator Number "${body.operatorNumber}" is already assigned to another team member` 
        }, { status: 400 });
      }
    }
    
    // Check for duplicate teamMemberNumber (if provided)
    if (body.teamMemberNumber) {
      const existingTeamMemberNumber = await db.collection('team_members').findOne({ 
        teamMemberNumber: body.teamMemberNumber 
      });
      
      if (existingTeamMemberNumber) {
        return NextResponse.json({ 
          success: false, 
          error: `Team Member Number "${body.teamMemberNumber}" is already assigned to another team member` 
        }, { status: 400 });
      }
    }
    
    // Validate role-specific number requirements
    if (body.role === 'Data Entry Operator') {
      if (!body.operatorNumber) {
        return NextResponse.json({ 
          success: false, 
          error: 'Operator Number is required for Data Entry Operators' 
        }, { status: 400 });
      }
      
      // Set default permissions for Data Entry Operators if not provided
      if (!body.permissions) {
        body.permissions = 'only_data_entry';
      }
    } else if (body.role === 'Recovery Team') {
      if (!body.teamMemberNumber) {
        return NextResponse.json({ 
          success: false, 
          error: 'Team Member Number is required for Recovery Team' 
        }, { status: 400 });
      }
      // Clear permissions for Recovery Team (not needed)
      body.permissions = undefined;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 12);
    
    const newMember = {
      name: body.name,
      phone: body.phone,
      whatsappNumber: body.whatsappNumber || '',
      address: body.address || '',
      loginId: body.loginId,
      password: hashedPassword,
      role: body.role,
      permissions: body.permissions || 'only_data_entry',
      operatorNumber: body.operatorNumber || '',
      teamMemberNumber: body.teamMemberNumber || '',
      officeCategory: body.officeCategory || '', // FIXED: Include for both roles
      status: body.status || 'active',
      createdAt: new Date(),
      joinDate: new Date()
    };
    
    const result = await db.collection('team_members').insertOne(newMember);
    
    console.log('Insert result:', result);
    
    // Return member without password for security
    const { password, ...memberWithoutPassword } = newMember;
    
    return NextResponse.json({ 
      success: true, 
      data: { ...memberWithoutPassword, _id: result.insertedId }
    }, { status: 201 });
  } catch (error) {
    console.error('POST Team Member Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    console.log('Updating team member:', { 
      memberId: body.memberId, 
      name: body.name,
      officeCategory: body.officeCategory,
      permissions: body.permissions 
    });
    
    await connectDB();
    const db = mongoose.connection.db;
    
    // Find existing member to get current data
    let existingMember;
    if (mongoose.Types.ObjectId.isValid(body.memberId)) {
      existingMember = await db.collection('team_members').findOne(
        { _id: new mongoose.Types.ObjectId(body.memberId) }
      );
    } else {
      existingMember = await db.collection('team_members').findOne(
        { _id: body.memberId }
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
      officeCategory: body.officeCategory || '', // FIXED: Include for both roles
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
    if (mongoose.Types.ObjectId.isValid(body.memberId)) {
      result = await db.collection('team_members').updateOne(
        { _id: new mongoose.Types.ObjectId(body.memberId) },
        { $set: updateData }
      );
    } else {
      result = await db.collection('team_members').updateOne(
        { _id: body.memberId },
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
    
    return NextResponse.json({ 
      success: true,
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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    
    console.log('Deleting team member with ID:', memberId);
    
    await connectDB();
    const db = mongoose.connection.db;
    
    let result;
    
    // Try different ID formats since _id might be string or ObjectId
    if (mongoose.Types.ObjectId.isValid(memberId)) {
      result = await db.collection('team_members').deleteOne({ 
        _id: new mongoose.Types.ObjectId(memberId) 
      });
    } else {
      result = await db.collection('team_members').deleteOne({ 
        _id: memberId 
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