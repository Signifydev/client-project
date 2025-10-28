import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('📥 Received delete loan request:', body);

    const { loanId, customerName, loanNumber, requestedBy } = body;

    if (!loanId || !customerName || !loanNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const requestId = `del_${Date.now()}`;
    
    console.log('✅ Delete loan request processed:', {
      requestId,
      customerName,
      loanNumber
    });

    return NextResponse.json({
      success: true,
      message: 'Loan deletion request submitted successfully',
      data: {
        requestId,
        type: 'Loan Deletion',
        customerName,
        loanNumber,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing delete loan request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}