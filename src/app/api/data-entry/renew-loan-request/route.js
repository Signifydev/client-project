import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('📥 Received renew loan request:', body);

    const { type, customerId, customerName, loanId, loanNumber, requestedData } = body;

    if (!type || !customerId || !customerName || !loanId || !loanNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const requestId = `renew_${Date.now()}`;
    
    console.log('✅ Renew loan request processed:', {
      requestId,
      customerName,
      loanNumber,
      type
    });

    return NextResponse.json({
      success: true,
      message: 'Loan renewal request submitted successfully',
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
    console.error('❌ Error processing renew loan request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}