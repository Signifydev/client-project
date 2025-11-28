import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    const teamMembers = await db.collection('team_members').find({}).toArray();
    
    console.log('Fetched team members:', teamMembers); // Debug log
    
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
    console.log('Adding team member:', body); // Debug log
    
    await connectDB();
    const db = mongoose.connection.db;
    
    // Check if loginId already exists
    const existingMember = await db.collection('team_members').findOne({ 
      loginId: body.loginId 
    });
    
    if (existingMember) {
      return NextResponse.json({ 
        success: false, 
        error: 'Login ID already exists' 
      }, { status: 400 });
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
      officeCategory: body.role === 'Data Entry Operator' ? (body.officeCategory || '') : '',
      status: body.status || 'active',
      createdAt: new Date(),
      joinDate: new Date()
    };
    
    const result = await db.collection('team_members').insertOne(newMember);
    
    console.log('Insert result:', result); // Debug log
    
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
    console.log('Updating team member:', body); // Debug log
    
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
    
    console.log('Update result:', result); // Debug log
    
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
    
    console.log('Deleting team member with ID:', memberId); // Debug log
    
    await connectDB();
    const db = mongoose.connection.db;
    
    let result;
    
    // Try different ID formats since _id might be string or ObjectId
    if (mongoose.Types.ObjectId.isValid(memberId)) {
      // If it's a valid MongoDB ObjectId
      result = await db.collection('team_members').deleteOne({ 
        _id: new mongoose.Types.ObjectId(memberId) 
      });
    } else {
      // If it's a string ID (like from Date.now())
      result = await db.collection('team_members').deleteOne({ 
        _id: memberId 
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