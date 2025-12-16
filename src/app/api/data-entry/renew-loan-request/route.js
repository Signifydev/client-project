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
      newLoanNumber, // NEW: User-selected loan number for renewal
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
      newLoanNumber, // NEW
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

    // ==================== VALIDATION SECTION ====================
    
    // Validate required fields
    const requiredFields = {
      loanId,
      customerId, 
      customerName,
      customerNumber,
      newLoanAmount,
      newEmiAmount,
      newLoanDays,
      newLoanType,
      newLoanNumber // NEW: Make loan number selection mandatory
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .filter(([key]) => !['remarks', 'customEmiAmount', 'requestType'].includes(key))
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

    // ==================== LOAN NUMBER VALIDATION ====================
    
    // Normalize the new loan number (convert to uppercase, trim)
    const normalizedNewLoanNumber = newLoanNumber.trim().toUpperCase();
    console.log('🔢 Normalized new loan number:', normalizedNewLoanNumber);
    
    // Validate loan number format (must be L1 to L15)
    const loanNumberRegex = /^L(1[0-5]|[1-9])$/;
    if (!loanNumberRegex.test(normalizedNewLoanNumber)) {
      console.error('❌ Invalid loan number format:', normalizedNewLoanNumber);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Loan number must be between L1 and L15 (e.g., L1, L2, ..., L15)' 
        },
        { status: 400 }
      );
    }
    
    // Check if new loan number is the same as original loan number
    if (normalizedNewLoanNumber === originalLoan.loanNumber.trim().toUpperCase()) {
      console.error('❌ Cannot use same loan number for renewal:', normalizedNewLoanNumber);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot use the same loan number for renewal. Please select a different loan number.' 
        },
        { status: 400 }
      );
    }
    
    // Check if loan number already exists for this customer
    const existingLoanWithSameNumber = await Loan.findOne({
      customerId: customerId,
      loanNumber: normalizedNewLoanNumber,
      // Exclude loans that are renewed (they might have the same number but are inactive)
      $or: [
        { isRenewed: { $ne: true } },
        { isRenewed: { $exists: false } }
      ]
    });
    
    if (existingLoanWithSameNumber) {
      console.error('❌ Loan number already taken:', {
        requested: normalizedNewLoanNumber,
        existingLoan: existingLoanWithSameNumber._id,
        status: existingLoanWithSameNumber.status
      });
      
      let errorMessage = `Loan number "${normalizedNewLoanNumber}" is already in use for this customer`;
      
      if (existingLoanWithSameNumber.status === 'active') {
        errorMessage += ' (Active loan)';
      } else if (existingLoanWithSameNumber.status === 'pending') {
        errorMessage += ' (Pending approval)';
      } else if (existingLoanWithSameNumber.isRenewed) {
        errorMessage += ' (Renewed loan)';
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage 
        },
        { status: 409 }
      );
    }
    
    // Also check for pending requests with this loan number
    const pendingRequestWithSameNumber = await Request.findOne({
      type: { $in: ['Loan Renew', 'New Loan', 'Loan Addition'] },
      'requestedData.newLoanNumber': normalizedNewLoanNumber,
      status: 'Pending',
      customerId: customerId
    });
    
    if (pendingRequestWithSameNumber) {
      console.error('❌ Pending request with same loan number:', normalizedNewLoanNumber);
      return NextResponse.json(
        { 
          success: false, 
          error: `Loan number "${normalizedNewLoanNumber}" has a pending request. Please wait for approval or select a different number.` 
        },
        { status: 409 }
      );
    }
    
    console.log('✅ Loan number validation passed:', normalizedNewLoanNumber);
    
    // ==================== NUMERIC VALIDATION ====================
    
    // Validate numeric fields
    const numericFields = {
      newLoanAmount: parseFloat(newLoanAmount),
      newEmiAmount: parseFloat(newEmiAmount),
      newLoanDays: parseInt(newLoanDays)
    };
    
    const numericErrors = [];
    
    for (const [field, value] of Object.entries(numericFields)) {
      if (isNaN(value) || value <= 0) {
        numericErrors.push(`${field} must be a positive number`);
      }
    }
    
    if (numericErrors.length > 0) {
      console.error('❌ Numeric validation errors:', numericErrors);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid values: ${numericErrors.join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    // Validate EMI type and custom EMI amount
    if (emiType === 'custom' && newLoanType !== 'Daily') {
      if (!customEmiAmount || isNaN(parseFloat(customEmiAmount)) || parseFloat(customEmiAmount) <= 0) {
        console.error('❌ Custom EMI amount missing or invalid');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Custom EMI amount is required for custom EMI type with Weekly/Monthly loans' 
          },
          { status: 400 }
        );
      }
    }
    
    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const renewalDateObj = new Date(renewalDate);
    renewalDateObj.setHours(0, 0, 0, 0);
    
    if (isNaN(renewalDateObj.getTime())) {
      console.error('❌ Invalid renewal date:', renewalDate);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid renewal date format' 
        },
        { status: 400 }
      );
    }
    
    if (renewalDateObj > today) {
      console.error('❌ Renewal date in future:', renewalDate);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Renewal date cannot be in the future' 
        },
        { status: 400 }
      );
    }
    
    // Validate EMI start date
    const emiStartDateObj = new Date(emiStartDate || renewalDate);
    emiStartDateObj.setHours(0, 0, 0, 0);
    
    if (isNaN(emiStartDateObj.getTime())) {
      console.error('❌ Invalid EMI start date:', emiStartDate);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid EMI start date format' 
        },
        { status: 400 }
      );
    }
    
    if (emiStartDateObj < renewalDateObj) {
      console.error('❌ EMI start date before renewal date:', { emiStartDate, renewalDate });
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMI start date cannot be before renewal date' 
        },
        { status: 400 }
      );
    }
    
    // ==================== CREATE RENEW REQUEST ====================
    
    // Get the actual loan number (use original if not provided in request)
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
        originalLoanNumber: actualLoanNumber,
        originalLoanId: loanId,
        renewalDate: renewalDate,
        newLoanAmount: numericFields.newLoanAmount,
        newEmiAmount: numericFields.newEmiAmount,
        newLoanDays: numericFields.newLoanDays,
        newLoanType: newLoanType,
        emiStartDate: emiStartDate || renewalDate,
        emiType: emiType || 'fixed',
        customEmiAmount: customEmiAmount ? parseFloat(customEmiAmount) : null,
        newLoanNumber: normalizedNewLoanNumber, // Use user-selected loan number
        remarks: remarks || `Renewal of loan ${actualLoanNumber}`,
        // Include the original loan data for reference
        originalLoanData: {
          amount: originalLoan.amount,
          emiAmount: originalLoan.emiAmount,
          loanType: originalLoan.loanType,
          loanDays: originalLoan.loanDays,
          status: originalLoan.status,
          emiPaidCount: originalLoan.emiPaidCount,
          totalPaidAmount: originalLoan.totalPaidAmount,
          loanNumber: originalLoan.loanNumber
        },
        // Include validation summary
        validation: {
          loanNumberFormatValid: true,
          loanNumberAvailable: true,
          loanNumberNotSameAsOriginal: true,
          datesValid: true,
          numericFieldsValid: true
        }
      },
      description: `Loan renewal request for ${customerName} - Renewing ${actualLoanNumber} to ${normalizedNewLoanNumber}, New Amount: ₹${newLoanAmount}`,
      priority: 'Medium',
      status: 'Pending',
      createdBy: requestedBy || 'data_entry_operator',
      createdByRole: 'data_entry'
    });

    await renewRequest.save();

    console.log('✅ Renew loan request saved successfully:', {
      requestId: renewRequest._id,
      originalLoan: actualLoanNumber,
      newLoanNumber: normalizedNewLoanNumber,
      customer: customerName,
      newAmount: `₹${newLoanAmount}`,
      newEMI: `₹${newEmiAmount}`,
      newType: newLoanType
    });

    return NextResponse.json({
      success: true,
      message: 'Loan renewal request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: renewRequest._id,
        type: 'Loan Renew',
        customerName: customerName,
        originalLoanNumber: actualLoanNumber,
        newLoanNumber: normalizedNewLoanNumber,
        newLoanAmount: numericFields.newLoanAmount,
        newEmiAmount: numericFields.newEmiAmount,
        newLoanType: newLoanType,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing renew loan request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit renew request: ' + error.message,
        details: error.stack
      },
      { status: 500 }
    );
  }
}

// Helper function to validate loan number
function validateLoanNumberFormat(loanNumber) {
  const normalized = loanNumber.trim().toUpperCase();
  const regex = /^L(1[0-5]|[1-9])$/;
  return regex.test(normalized);
}

// Helper function to get all loan numbers for a customer (for future use)
export async function getCustomerLoanNumbers(customerId) {
  await connectDB();
  
  const loans = await Loan.find({
    customerId: customerId,
    $or: [
      { status: 'active' },
      { status: 'pending' },
      { isRenewed: { $ne: true } }
    ]
  }).select('loanNumber status isRenewed');
  
  return loans.map(loan => ({
    loanNumber: loan.loanNumber,
    status: loan.status,
    isRenewed: loan.isRenewed || false,
    isActive: loan.status === 'active' && !loan.isRenewed
  }));
}