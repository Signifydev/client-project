import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    // Get all requests with detailed info
    const requests = await Request.find({}).sort({ createdAt: -1 });
    
    console.log('🔍 DEBUG - All requests in database:', requests.length);
    requests.forEach((req, index) => {
      console.log(`Request ${index + 1}:`, {
        _id: req._id,
        type: req.type,
        status: req.status,
        customerName: req.customerName,
        createdAt: req.createdAt,
        step1Data: !!req.step1Data,
        requestedData: !!req.requestedData
      });
    });

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests: requests
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}