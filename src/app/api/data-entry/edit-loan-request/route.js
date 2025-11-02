import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('📥 Received edit loan request:', body);

    const { type, customerId, customerName, customerNumber, loanId, loanNumber, requestedData, description } = body;

    if (!type || !customerId || !customerName || !loanId || !loanNumber || !requestedData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const editRequest = new Request({
      type: type,
      customerId: customerId,
      customerName: customerName,
      customerNumber: customerNumber,
      loanId: loanId,
      loanNumber: loanNumber,
      requestedData: requestedData,
      description: description || `${type} request for ${customerName} - Loan: ${loanNumber}`,
      priority: 'Medium',
      status: 'Pending',
      createdBy: 'data_entry_operator_1',
      createdByRole: 'data_entry'
    });

    await editRequest.save();
    const requestId = `req_${Date.now()}`;
    
    console.log('✅ Edit loan request saved to database:', editRequest._id);

    return NextResponse.json({
      success: true,
      message: 'Loan edit request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: editRequest._id,
        type: type,
        customerName: customerName,
        loanNumber: loanNumber,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing edit loan request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit edit request: ' + error.message },
      { status: 500 }
    );
  }
}