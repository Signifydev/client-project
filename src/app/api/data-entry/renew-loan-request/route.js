import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('📥 Received renew loan request - FULL BODY:', body);

    const {
      loanId,
      customerId,
      customerName,
      customerNumber,
      loanNumber,
      originalLoanNumber,
      originalLoanId,
      renewalDate,
      newLoanAmount,
      newEmiAmount,
      newLoanDays,
      newLoanType,
      emiStartDate,
      emiType,
      customEmiAmount,
      remarks,
      requestedBy,
      requestType
    } = body;

    // Debug: Log all received fields
    console.log('🔍 Parsed fields:', {
      loanId,
      customerId,
      customerName,
      customerNumber,
      loanNumber,
      originalLoanNumber,
      originalLoanId,
      renewalDate,
      newLoanAmount,
      newEmiAmount,
      newLoanDays,
      newLoanType,
      emiStartDate,
      emiType,
      customEmiAmount,
      remarks,
      requestedBy,
      requestType
    });

    // Validate required fields
    const requiredFields = {
      loanId,
      customerId, 
      customerName,
      customerNumber,
      newLoanAmount,
      newEmiAmount,
      newLoanDays,
      newLoanType
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate the original loan exists and is active
    const originalLoan = await Loan.findById(loanId);
    if (!originalLoan) {
      console.error('❌ Original loan not found for ID:', loanId);
      return NextResponse.json(
        { success: false, error: 'Original loan not found' },
        { status: 404 }
      );
    }

    console.log('✅ Original loan found:', {
      loanNumber: originalLoan.loanNumber,
      status: originalLoan.status,
      isRenewed: originalLoan.isRenewed
    });

    // Check if loan is already renewed
    if (originalLoan.isRenewed || originalLoan.status === 'renewed') {
      console.error('❌ Loan already renewed:', originalLoan.loanNumber);
      return NextResponse.json(
        { success: false, error: 'This loan has already been renewed' },
        { status: 400 }
      );
    }

    // Generate the next loan number for this customer
    const nextLoanNumber = await Loan.generateLoanNumber(customerId);
    console.log('🔢 Generated next loan number:', nextLoanNumber);

    // Use the original loan's loanNumber if not provided
    const actualLoanNumber = loanNumber || originalLoan.loanNumber;

    // Create the renew request with ALL necessary data for admin to process
    const renewRequest = new Request({
      type: 'Loan Renew',
      customerId: customerId,
      customerName: customerName,
      customerNumber: customerNumber,
      loanId: loanId,
      loanNumber: actualLoanNumber,
      requestedData: {
        action: 'renew_loan',
        originalLoanNumber: originalLoanNumber || actualLoanNumber,
        originalLoanId: originalLoanId || loanId,
        renewalDate: renewalDate || new Date().toISOString().split('T')[0],
        newLoanAmount: parseFloat(newLoanAmount),
        newEmiAmount: parseFloat(newEmiAmount),
        newLoanDays: parseInt(newLoanDays),
        newLoanType: newLoanType,
        emiStartDate: emiStartDate || renewalDate || new Date().toISOString().split('T')[0],
        emiType: emiType || 'fixed',
        customEmiAmount: customEmiAmount ? parseFloat(customEmiAmount) : null,
        newLoanNumber: nextLoanNumber,
        remarks: remarks || `Renewal of loan ${actualLoanNumber}`,
        // Include the original loan data for reference
        originalLoanData: {
          amount: originalLoan.amount,
          emiAmount: originalLoan.emiAmount,
          loanType: originalLoan.loanType,
          loanDays: originalLoan.loanDays,
          status: originalLoan.status,
          emiPaidCount: originalLoan.emiPaidCount,
          totalPaidAmount: originalLoan.totalPaidAmount
        }
      },
      description: `Loan renewal request for ${customerName} - Renewing ${actualLoanNumber} to ${nextLoanNumber}, New Amount: ₹${newLoanAmount}`,
      priority: 'Medium',
      status: 'Pending',
      createdBy: requestedBy || 'data_entry_operator_1',
      createdByRole: 'data_entry'
    });

    await renewRequest.save();

    console.log('✅ Renew loan request saved successfully:', {
      requestId: renewRequest._id,
      originalLoan: actualLoanNumber,
      newLoanNumber: nextLoanNumber,
      customer: customerName
    });

    return NextResponse.json({
      success: true,
      message: 'Loan renewal request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: renewRequest._id,
        type: 'Loan Renew',
        customerName: customerName,
        originalLoanNumber: actualLoanNumber,
        newLoanNumber: nextLoanNumber,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing renew loan request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit renew request: ' + error.message 
      },
      { status: 500 }
    );
  }
}