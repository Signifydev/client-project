import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    const pendingEMIs = await db.collection('emis').find({
      status: 'pending',
      dueDate: { $lt: new Date() }
    }).toArray();

    return NextResponse.json({ 
      success: true, 
      data: pendingEMIs 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}