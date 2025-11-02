import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('📥 Received delete loan request:', body);

    const { loanId, customerId, customerName, customerNumber, loanNumber, requestedBy } = body;

    if (!loanId || !customerId || !customerName || !loanNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create delete request in database
    const deleteRequest = new Request({
      type: 'Loan Deletion',
      customerId: customerId,
      customerName: customerName,
      customerNumber: customerNumber,
      loanId: loanId,
      loanNumber: loanNumber,
      requestedData: {
        action: 'delete_loan',
        loanId: loanId,
        loanNumber: loanNumber
      },
      description: `Loan deletion request for ${customerName} - Loan: ${loanNumber}`,
      priority: 'High',
      status: 'Pending',
      createdBy: requestedBy || 'data_entry_operator_1',
      createdByRole: 'data_entry'
    });

    await deleteRequest.save();

    console.log('✅ Delete loan request saved to database:', deleteRequest._id);

    return NextResponse.json({
      success: true,
      message: 'Loan deletion request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: deleteRequest._id,
        type: 'Loan Deletion',
        customerName: customerName,
        loanNumber: loanNumber,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing delete loan request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit delete request: ' + error.message },
      { status: 500 }
    );
  }
}