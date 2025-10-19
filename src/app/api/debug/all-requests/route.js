import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    // Get ALL requests regardless of status
    const allRequests = await Request.find({})
      .sort({ createdAt: -1 })
      .limit(20);
    
    console.log('🔍 DEBUG - All requests in database:', allRequests.length);
    
    // Get only Pending requests
    const pendingRequests = await Request.find({ status: 'Pending' })
      .sort({ createdAt: -1 });
    
    console.log('🔍 DEBUG - Pending requests:', pendingRequests.length);
    
    return NextResponse.json({ 
      success: true,
      data: {
        totalRequests: allRequests.length,
        pendingRequests: pendingRequests.length,
        allRequests: allRequests,
        pendingRequestsList: pendingRequests
      }
    });
    
  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}