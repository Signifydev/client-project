import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('📥 Received edit loan request:', body);

    // Validate required fields
    const { type, customerId, customerName, loanId, loanNumber, requestedData, description } = body;

    if (!type || !customerId || !customerName || !loanId || !loanNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Here you would typically save to your database
    // For now, we'll simulate a successful response
    
    const requestId = `req_${Date.now()}`;
    
    console.log('✅ Edit loan request processed:', {
      requestId,
      customerName,
      loanNumber,
      type
    });

    return NextResponse.json({
      success: true,
      message: 'Loan edit request submitted successfully',
      data: {
        requestId,
        type,
        customerName,
        loanNumber,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing edit loan request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}