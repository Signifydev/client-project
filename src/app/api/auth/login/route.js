import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { loginId, password, role } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, error: 'Login ID and password are required' },
        { status: 400 }
      );
    }

    await connectDB();
    const db = mongoose.connection.db;

    // Find team member by loginId and role
    const teamMember = await db.collection('team_members').findOne({ 
      loginId: loginId,
      role: role,
      status: 'active'
    });

    if (!teamMember) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or role mismatch' },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, teamMember.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Return team member data (without password)
    const { password: _, ...memberData } = teamMember;

    return NextResponse.json({
      success: true,
      data: memberData,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}