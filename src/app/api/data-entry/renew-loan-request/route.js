import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Loan from '@/lib/models/Loan';
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
      originalLoanNumber, // The loan being renewed
      originalLoanId,     // ID of the loan being renewed
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

    // Validate required fields
    if (!loanId || !customerId || !customerName || !customerNumber || !loanNumber || 
        !newLoanAmount || !newEmiAmount || !newLoanDays || !newLoanType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate the original loan exists and is active
    const originalLoan = await Loan.findById(loanId);
    if (!originalLoan) {
      return NextResponse.json(
        { success: false, error: 'Original loan not found' },
        { status: 404 }
      );
    }

    if (originalLoan.isRenewed || originalLoan.status === 'renewed') {
      return NextResponse.json(
        { success: false, error: 'This loan has already been renewed' },
        { status: 400 }
      );
    }

    // Generate the next loan number for this customer
    const nextLoanNumber = await Loan.generateLoanNumber(customerId);
    
    console.log('🔢 Generated next loan number:', nextLoanNumber);

    // Create the renew request
    const renewRequest = new Request({
      type: 'Loan Renew',
      customerId: customerId,
      customerName: customerName,
      customerNumber: customerNumber,
      loanId: loanId,
      loanNumber: loanNumber,
      requestedData: {
        action: 'renew_loan',
        originalLoanNumber: originalLoanNumber || loanNumber,
        originalLoanId: originalLoanId || loanId,
        renewalDate: renewalDate || new Date().toISOString().split('T')[0],
        newLoanAmount: parseFloat(newLoanAmount),
        newEmiAmount: parseFloat(newEmiAmount),
        newLoanDays: parseInt(newLoanDays),
        newLoanType: newLoanType,
        emiStartDate: emiStartDate || renewalDate || new Date().toISOString().split('T')[0],
        emiType: emiType || 'fixed',
        customEmiAmount: customEmiAmount ? parseFloat(customEmiAmount) : null,
        newLoanNumber: nextLoanNumber, // Include the generated loan number
        remarks: remarks || `Renewal of loan ${loanNumber}`
      },
      description: `Loan renewal request for ${customerName} - Renewing ${loanNumber} to ${nextLoanNumber}, New Amount: ₹${newLoanAmount}`,
      priority: 'Medium',
      status: 'Pending',
      createdBy: requestedBy || 'data_entry_operator_1',
      createdByRole: 'data_entry'
    });

    await renewRequest.save();

    console.log('✅ Renew loan request saved to database:', {
      requestId: renewRequest._id,
      originalLoan: loanNumber,
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
        originalLoanNumber: loanNumber,
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

// NEW: API endpoint for admin to approve renew loan requests
export async function PUT(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const action = searchParams.get('action'); // 'approve' or 'reject'
    
    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId or action' },
        { status: 400 }
      );
    }

    // Find the renew request
    const renewRequest = await Request.findById(requestId);
    if (!renewRequest) {
      return NextResponse.json(
        { success: false, error: 'Renew request not found' },
        { status: 404 }
      );
    }

    if (renewRequest.status !== 'Pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'reject') {
      // Mark request as rejected
      renewRequest.status = 'Rejected';
      renewRequest.processedAt = new Date();
      await renewRequest.save();
      
      return NextResponse.json({
        success: true,
        message: 'Loan renewal request rejected successfully',
        data: {
          requestId: renewRequest._id,
          status: 'Rejected'
        }
      });
    }

    if (action === 'approve') {
      const requestedData = renewRequest.requestedData;
      
      // Use the Loan model's renewLoan method to handle the renewal
      const result = await Loan.renewLoan(
        requestedData.originalLoanId || renewRequest.loanId,
        {
          newLoanAmount: requestedData.newLoanAmount,
          newEmiAmount: requestedData.newEmiAmount,
          newLoanDays: requestedData.newLoanDays,
          newLoanType: requestedData.newLoanType,
          renewalDate: requestedData.renewalDate,
          emiStartDate: requestedData.emiStartDate,
          emiType: requestedData.emiType,
          customEmiAmount: requestedData.customEmiAmount
        },
        renewRequest.createdBy
      );

      // Update the request status
      renewRequest.status = 'Approved';
      renewRequest.processedAt = new Date();
      renewRequest.processedData = {
        newLoanId: result.newLoan._id,
        newLoanNumber: result.newLoan.loanNumber,
        originalLoanStatus: result.originalLoan.status
      };
      await renewRequest.save();

      console.log('✅ Loan renewal completed successfully:', {
        originalLoan: result.originalLoan.loanNumber,
        newLoan: result.newLoan.loanNumber,
        customer: renewRequest.customerName
      });

      return NextResponse.json({
        success: true,
        message: 'Loan renewed successfully!',
        data: {
          requestId: renewRequest._id,
          originalLoan: {
            loanNumber: result.originalLoan.loanNumber,
            status: result.originalLoan.status,
            renewedLoanNumber: result.originalLoan.renewedLoanNumber
          },
          newLoan: {
            loanNumber: result.newLoan.loanNumber,
            amount: result.newLoan.amount,
            emiAmount: result.newLoan.emiAmount,
            loanType: result.newLoan.loanType
          },
          status: 'Approved'
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Error processing renew loan approval:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process renew request: ' + error.message 
      },
      { status: 500 }
    );
  }
}