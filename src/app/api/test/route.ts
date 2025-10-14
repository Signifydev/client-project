import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ 
      success: true, 
      message: 'DB connected successfully!' 
    });
  } catch (error) {
    // Handle the unknown error type
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { 
      status: 500 
    });
  }
}