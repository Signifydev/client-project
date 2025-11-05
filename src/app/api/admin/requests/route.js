import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    console.log('🟡 Admin - Fetching pending requests...');
    
    // Get pending requests with all necessary data
    const requests = await Request.find({ 
      status: 'Pending' 
    })
    .sort({ createdAt: -1 })
    .lean();
    
    console.log(`✅ Admin - Found ${requests.length} pending requests`);
    
    // Log the first request to see its structure
    if (requests.length > 0) {
      console.log('📊 First request structure:', {
        _id: requests[0]._id,
        type: requests[0].type,
        customerName: requests[0].customerName,
        hasStep1Data: !!requests[0].step1Data,
        hasRequestedData: !!requests[0].requestedData
      });
    }

    return NextResponse.json({
      success: true,
      data: requests
    });
    
  } catch (error) {
    console.error('❌ Admin requests error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message,
      data: []
    }, { status: 500 });
  }
}