import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// GET - Get single team member by ID
export async function GET(request, { params }) {
  try {
    const { id } = params;
    console.log('Fetching team member with ID:', id); // Debug log
    
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
    
    console.log('Found team member:', teamMember); // Debug log
    
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
    console.log('Updating team member ID:', id, 'with data:', body); // Debug log
    
    await connectDB();
    const db = mongoose.connection.db;
    
    const updateData = {
      name: body.name,
      phone: body.phone,
      whatsappNumber: body.whatsappNumber || '',
      address: body.address || '',
      loginId: body.loginId,
      role: body.role,
      officeCategory: body.role === 'Data Entry Operator' ? (body.officeCategory || '') : '',
      status: body.status || 'active',
      updatedAt: new Date()
    };
    
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
    
    console.log('Update result:', result); // Debug log
    
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
    console.log('Deleting team member with ID:', id); // Debug log
    
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
    
    console.log('Delete result:', result); // Debug log
    
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
    console.log('Partial updating team member ID:', id, 'with data:', body); // Debug log
    
    await connectDB();
    const db = mongoose.connection.db;
    
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
    
    console.log('PATCH Update result:', result); // Debug log
    
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