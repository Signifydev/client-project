import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('📥 Received renew loan request:', body);

    const {
      loanId,
      customerId,
      customerName,
      customerNumber,
      loanNumber,
      renewalDate,
      newLoanAmount,
      newEmiAmount,
      newLoanDays,
      newLoanType,
      remarks,
      requestedBy
    } = body;

    if (!loanId || !customerId || !customerName || !loanNumber || !newLoanAmount || !newEmiAmount || !newLoanDays) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const renewRequest = new Request({
      type: 'Loan Renew',
      customerId: customerId,
      customerName: customerName,
      customerNumber: customerNumber,
      loanId: loanId,
      loanNumber: loanNumber,
      requestedData: {
        action: 'renew_loan',
        renewalDate: renewalDate,
        newLoanAmount: parseFloat(newLoanAmount),
        newEmiAmount: parseFloat(newEmiAmount),
        newLoanDays: parseInt(newLoanDays),
        newLoanType: newLoanType,
        remarks: remarks
      },
      description: `Loan renewal request for ${customerName} - Loan: ${loanNumber}, New Amount: ₹${newLoanAmount}`,
      priority: 'Medium',
      status: 'Pending',
      createdBy: requestedBy || 'data_entry_operator_1',
      createdByRole: 'data_entry'
    });

    await renewRequest.save();

    console.log('✅ Renew loan request saved to database:', renewRequest._id);

    return NextResponse.json({
      success: true,
      message: 'Loan renewal request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: renewRequest._id,
        type: 'Loan Renew',
        customerName: customerName,
        loanNumber: loanNumber,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing renew loan request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit renew request: ' + error.message },
      { status: 500 }
    );
  }
}