import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import Loan from '@/lib/models/Loan';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    console.log('🟡 Starting approve-request API call');
    await connectDB();
    const body = await request.json();
    
    // Check if this is a CREATE request or APPROVE/REJECT request
    const { action, requestId } = body;
    
    if (action && ['approve', 'reject'].includes(action)) {
      // This is an APPROVE/REJECT request
      return await handleApproveReject(body);
    } else {
      // This is a CREATE request (new request submission)
      return await handleCreateRequest(body);
    }
    
  } catch (error) {
    console.error('❌ Error in approve-request:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// Handle CREATE request (new request submission)
async function handleCreateRequest(body) {
  try {
    console.log('📝 Creating new request...');
    
    const { type, customerId, customerName, customerNumber, requestedData, createdBy = 'data_entry_operator' } = body;
    
    // Validate required fields
    if (!type) {
      return NextResponse.json({ 
        success: false,
        error: 'Request type is required' 
      }, { status: 400 });
    }
    
    const validTypes = ['New Customer', 'Loan Addition', 'Customer Edit', 'Loan Edit', 'Loan Deletion', 'Loan Renew'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        success: false,
        error: `Invalid request type. Must be one of: ${validTypes.join(', ')}` 
      }, { status: 400 });
    }
    
    // For Loan Addition, validate loan data
    if (type === 'Loan Addition') {
      if (!requestedData || !requestedData.loanNumber || !requestedData.loanAmount) {
        return NextResponse.json({ 
          success: false,
          error: 'For Loan Addition, requestedData must include loanNumber and loanAmount' 
        }, { status: 400 });
      }
      
      // Validate customer exists for loan addition
      if (!customerId) {
        return NextResponse.json({ 
          success: false,
          error: 'Customer ID is required for Loan Addition' 
        }, { status: 400 });
      }
      
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return NextResponse.json({ 
          success: false,
          error: 'Customer not found' 
        }, { status: 404 });
      }
    }
    
    // For New Customer, validate step data
    if (type === 'New Customer') {
      if (!body.step1Data || !body.step2Data || !body.step3Data) {
        return NextResponse.json({ 
          success: false,
          error: 'For New Customer, all step data (step1Data, step2Data, step3Data) is required' 
        }, { status: 400 });
      }
    }
    
    // Create the request in database
    const newRequest = new Request({
      type: type,
      customerId: customerId || null,
      customerName: customerName || '',
      customerNumber: customerNumber || '',
      customerPhone: body.customerPhone || '',
      loanId: body.loanId || null,
      requestedData: requestedData || {},
      step1Data: body.step1Data || null,
      step2Data: body.step2Data || null,
      step3Data: body.step3Data || null,
      status: 'Pending',
      createdBy: createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newRequest.save();
    
    console.log('✅ Request created successfully:', {
      id: newRequest._id,
      type: newRequest.type,
      customerName: newRequest.customerName,
      loanNumber: requestedData?.loanNumber || 'N/A'
    });
    
    return NextResponse.json({
      success: true,
      message: `${type} request created successfully`,
      data: {
        requestId: newRequest._id,
        type: newRequest.type,
        customerName: newRequest.customerName,
        status: newRequest.status,
        createdAt: newRequest.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error in handleCreateRequest:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to create request' 
    }, { status: 500 });
  }
}

// Handle APPROVE/REJECT request
async function handleApproveReject(body) {
  const { requestId, action, reason, processedBy = 'admin' } = body;
  
  console.log('🟡 Processing approve/reject:', { requestId, action, processedBy });

  if (!requestId) {
    return NextResponse.json({ 
      success: false,
      error: 'Request ID is required' 
    }, { status: 400 });
  }

  // Find the request
  const requestDoc = await Request.findById(requestId);
  if (!requestDoc) {
    return NextResponse.json({ 
      success: false,
      error: 'Request not found' 
    }, { status: 404 });
  }

  console.log('🔍 Found request:', {
    type: requestDoc.type,
    customerName: requestDoc.customerName,
    status: requestDoc.status,
    loanSelectionType: requestDoc.step2Data?.loanSelectionType || 'single'
  });

  if (action === 'approve') {
    return await handleApproval(requestDoc, reason, processedBy);
  } else if (action === 'reject') {
    return await handleRejection(requestDoc, reason, processedBy);
  } else {
    return NextResponse.json({ 
      success: false,
      error: 'Invalid action. Use "approve" or "reject".' 
    }, { status: 400 });
  }
}

async function handleApproval(requestDoc, reason, processedBy) {
  try {
    console.log(`🟡 Handling approval for ${requestDoc.type} request`);
    
    switch (requestDoc.type) {
      case 'New Customer':
        return await approveNewCustomer(requestDoc, reason, processedBy);
      case 'Loan Addition':
        return await approveLoanAddition(requestDoc, reason, processedBy);
      case 'Customer Edit':
        return await approveCustomerEdit(requestDoc, reason, processedBy);
      case 'Loan Edit':
        return await approveLoanEdit(requestDoc, reason, processedBy);
      case 'Loan Deletion':
        return await approveLoanDeletion(requestDoc, reason, processedBy);
      case 'Loan Renew':
        return await approveLoanRenew(requestDoc, reason, processedBy);
      default:
        return NextResponse.json({ 
          success: false,
          error: 'Unsupported request type: ' + requestDoc.type
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Error in handleApproval:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

async function handleRejection(requestDoc, reason, processedBy) {
  console.log('❌ Rejecting request:', requestDoc._id);
  
  // Update request status
  requestDoc.status = 'Rejected';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Request rejected by admin';
  requestDoc.rejectionReason = reason || 'Request rejected';
  requestDoc.actionTaken = 'Request rejected';
  requestDoc.reviewedAt = new Date();
  requestDoc.rejectedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Request marked as Rejected');

  return NextResponse.json({ 
    success: true,
    message: 'Request rejected successfully'
  });
}

// Customer number normalization
const normalizeCustomerNumber = (customerNumber) => {
  const cleanNumber = customerNumber.replace(/^CN/i, '').trim();
  return `CN${cleanNumber}`;
};

// Duplicate checking
const checkForDuplicates = async (customerData) => {
  const { phone, customerNumber, loginId, excludeId = null } = customerData;
  
  let query = {
    $or: [
      { phone: { $in: phone } },
      { customerNumber: customerNumber },
      { loginId: loginId }
    ],
    status: { $in: ['active', 'pending'] }
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const duplicates = await Customer.find(query);
  return duplicates.length > 0;
};

async function approveNewCustomer(requestDoc, reason, processedBy) {
  console.log('📝 Creating new customer from multi-step request...');
  
  try {
    const step1Data = requestDoc.step1Data;
    const step2Data = requestDoc.step2Data;
    const step3Data = requestDoc.step3Data;

    // Validate step data exists with detailed error messages
    if (!step1Data) {
      throw new Error('Missing step1Data in request');
    }
    if (!step2Data) {
      throw new Error('Missing step2Data in request');
    }
    if (!step3Data) {
      throw new Error('Missing step3Data in request');
    }

    console.log('🔍 Step data validation passed');

    // Handle loanSelectionType vs loanType
    const loanSelectionType = step2Data.loanSelectionType; // This is "single" or "multiple"
    const loanType = step2Data.loanType; // This is "Daily", "Weekly", or "Monthly"
    
    console.log('📊 Loan data:', {
      loanSelectionType,
      loanType,
      loanNumber: step2Data.loanNumber,
      loanAmount: step2Data.loanAmount,
      emiAmount: step2Data.emiAmount,
      loanDays: step2Data.loanDays
    });

    // Validate required fields with specific error messages
    const requiredStep1Fields = ['name', 'customerNumber', 'phone', 'businessName', 'area'];
    const missingStep1Fields = requiredStep1Fields.filter(field => !step1Data[field]);
    
    if (missingStep1Fields.length > 0) {
      throw new Error(`Missing required customer fields: ${missingStep1Fields.join(', ')}`);
    }

    // CRITICAL FIX: Only validate loan fields for single loans
    if (loanSelectionType === 'single') {
      console.log('🔍 Validating Single Loan details...');
      
      const requiredStep2Fields = ['loanNumber', 'loanAmount', 'emiAmount', 'loanType', 'loanDays'];
      const missingStep2Fields = requiredStep2Fields.filter(field => {
        // Check if field is missing or has invalid value
        const value = step2Data[field];
        return value === undefined || value === null || value === '' || 
               (typeof value === 'number' && isNaN(value)) ||
               (typeof value === 'string' && value.trim() === '');
      });
      
      if (missingStep2Fields.length > 0) {
        throw new Error(`Missing required loan fields for single loan: ${missingStep2Fields.join(', ')}`);
      }

      // FIXED: More flexible loan number validation
      if (!step2Data.loanNumber || !step2Data.loanNumber.trim()) {
        throw new Error('Loan number is required for single loan');
      }
      
      // FIXED: Allow "L1" format (not just "LN1")
      // Remove any "L" or "LN" prefix to get the number
      const loanNum = step2Data.loanNumber.replace(/^L(N)?/i, '');
      const loanNumValue = parseInt(loanNum);
      
      console.log('🔢 Loan number validation:', {
        original: step2Data.loanNumber,
        cleaned: loanNum,
        numericValue: loanNumValue,
        isValid: !isNaN(loanNumValue) && loanNumValue >= 1 && loanNumValue <= 15
      });
      
      if (isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
        throw new Error('Loan number must be between 1 and 15 for single loans (formats: L1, L2, LN1, LN2, etc.)');
      }

      console.log(`✅ Valid loan number for single loan: ${step2Data.loanNumber}`);
    } else {
      // For multiple loans, set default values or ensure they exist but don't validate them as required
      console.log('ℹ️ Multiple loan selected - no loan validation required');
      
      // Set default values to prevent validation errors
      step2Data.loanNumber = '';
      step2Data.loanAmount = step2Data.loanAmount || 0;
      step2Data.emiAmount = step2Data.emiAmount || 0;
      step2Data.loanDays = step2Data.loanDays || 0;
      step2Data.loanType = step2Data.loanType || '';
    }

    const requiredStep3Fields = ['loginId', 'password'];
    const missingStep3Fields = requiredStep3Fields.filter(field => !step3Data[field]);
    
    if (missingStep3Fields.length > 0) {
      throw new Error(`Missing required login fields: ${missingStep3Fields.join(', ')}`);
    }

    console.log('✅ All required fields present');

    // Normalize customer number
    const normalizedCustomerNumber = normalizeCustomerNumber(step1Data.customerNumber);
    console.log('🔧 Normalized customer number:', normalizedCustomerNumber);

    // Enhanced duplicate checking
    const phoneArray = Array.isArray(step1Data.phone) ? step1Data.phone : [step1Data.phone];
    console.log('📱 Phone numbers to check:', phoneArray);

    const hasDuplicates = await checkForDuplicates({
      phone: phoneArray,
      customerNumber: normalizedCustomerNumber,
      loginId: step3Data.loginId
    });

    if (hasDuplicates) {
      throw new Error('Customer with this phone number, customer number, or login ID already exists');
    }

    console.log('✅ No duplicate customers found');

    // Hash password
    const hashedPassword = await bcrypt.hash(step3Data.password, 12);
    console.log('🔐 Password hashed');

    // Create SIMPLIFIED customer data with validation
    const customerDataToSave = {
      name: step1Data.name?.trim() || '',
      phone: phoneArray,
      whatsappNumber: step1Data.whatsappNumber ? step1Data.whatsappNumber.trim() : '',
      businessName: step1Data.businessName?.trim() || '',
      area: step1Data.area?.trim() || '',
      customerNumber: normalizedCustomerNumber,
      address: step1Data.address?.trim() || '',
      category: step1Data.category || 'A',
      officeCategory: step1Data.officeCategory || 'Office 1',
      email: step1Data.email || '',
      businessType: step1Data.businessType || '',
      loginId: step3Data.loginId?.trim() || '',
      password: hashedPassword,
      status: 'active',
      isActive: true,
      createdBy: requestDoc.createdBy || 'system',
      approvedBy: processedBy,
      approvedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate critical fields one more time
    if (!customerDataToSave.name || !customerDataToSave.customerNumber || !customerDataToSave.businessName) {
      throw new Error('Critical customer data missing after processing');
    }

    console.log('💾 Creating customer with data:', {
      name: customerDataToSave.name,
      customerNumber: customerDataToSave.customerNumber,
      businessName: customerDataToSave.businessName,
      phone: customerDataToSave.phone,
      loanSelectionType: loanSelectionType
    });

    let customer;
    try {
      // Use create instead of save to avoid middleware issues
      customer = await Customer.create(customerDataToSave);
      console.log('✅ Customer created successfully:', customer._id);
    } catch (saveError) {
      console.error('❌ Customer creation failed:', saveError);
      
      // Provide more specific error messages based on the error type
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.values(saveError.errors).map(err => err.message);
        throw new Error(`Customer validation failed: ${validationErrors.join(', ')}`);
      } else if (saveError.code === 11000) {
        throw new Error('Customer with these details already exists (duplicate key error)');
      } else {
        throw new Error(`Failed to create customer: ${saveError.message}`);
      }
    }

    // Create user account
    try {
      await User.create({
        customerId: customer._id,
        loginId: step3Data.loginId,
        password: hashedPassword,
        role: 'customer',
        email: step3Data.loginId + '@customer.com',
        status: 'active',
        createdBy: requestDoc.createdBy || 'system'
      });
      console.log('✅ User created for customer');
    } catch (error) {
      console.error('❌ Error creating user:', error);
      // Continue even if user creation fails - this is not critical
    }

    // Only create loan if it's a single loan selection
    if (loanSelectionType === 'single') {
      try {
        // Use the loan number from the form (L1-L15)
        const loanNumber = step2Data.loanNumber;
        
        console.log('💰 Creating Single Loan with number:', loanNumber);
        
        // Simple date handling with validation
        const loanDate = step2Data.loanDate ? new Date(step2Data.loanDate) : new Date();
        let emiStartDate = step2Data.emiStartDate ? new Date(step2Data.emiStartDate) : new Date(loanDate);
        
        // Ensure emiStartDate is not before loanDate
        if (emiStartDate < loanDate) {
          console.log('⚠️ Adjusting EMI start date to match loan date');
          emiStartDate = new Date(loanDate);
        }

        // Calculate next EMI date
        const calculateNextEmiDate = (startDate, loanType) => {
          const date = new Date(startDate);
          switch(loanType) {
            case 'Daily': date.setDate(date.getDate() + 1); break;
            case 'Weekly': date.setDate(date.getDate() + 7); break;
            case 'Monthly': date.setMonth(date.getMonth() + 1); break;
            default: date.setDate(date.getDate() + 1);
          }
          return date;
        };

        // Calculate total loan amount based on EMI type
        let totalLoanAmount;
        if (step2Data.emiType === 'custom' && step2Data.loanType !== 'Daily') {
          const fixedPeriods = Number(step2Data.loanDays) - 1;
          const fixedAmount = Number(step2Data.emiAmount) * fixedPeriods;
          const lastAmount = Number(step2Data.customEmiAmount || step2Data.emiAmount);
          totalLoanAmount = fixedAmount + lastAmount;
        } else {
          totalLoanAmount = Number(step2Data.emiAmount) * Number(step2Data.loanDays);
        }

        const loanData = {
          customerId: customer._id,
          customerName: customer.name,
          customerNumber: customer.customerNumber,
          loanNumber: loanNumber,
          amount: parseFloat(step2Data.loanAmount) || 0,
          emiAmount: parseFloat(step2Data.emiAmount) || 0,
          loanType: step2Data.loanType || 'Daily',
          dateApplied: loanDate,
          loanDays: parseInt(step2Data.loanDays) || 30,
          emiType: step2Data.emiType || 'fixed',
          customEmiAmount: step2Data.customEmiAmount ? parseFloat(step2Data.customEmiAmount) : null,
          emiStartDate: emiStartDate,
          totalEmiCount: parseInt(step2Data.loanDays) || 30,
          emiPaidCount: 0,
          lastEmiDate: null,
          nextEmiDate: calculateNextEmiDate(emiStartDate, step2Data.loanType),
          totalPaidAmount: 0,
          remainingAmount: parseFloat(step2Data.loanAmount) || 0,
          status: 'active',
          createdBy: requestDoc.createdBy || 'system',
          totalLoanAmount: totalLoanAmount
        };

        await Loan.create(loanData);
        console.log('✅ Loan created with selected number:', loanNumber);
      } catch (loanError) {
        console.error('❌ Error creating loan:', loanError);
        // Continue even if loan creation fails - customer is already created
      }
    } else {
      console.log('ℹ️ No loan created (Multiple Loans option selected)');
    }

    // Update request
    requestDoc.status = 'Approved';
    requestDoc.customerId = customer._id;
    requestDoc.reviewedBy = processedBy;
    requestDoc.reviewedByRole = 'admin';
    requestDoc.reviewNotes = reason || 'Customer approved by admin';
    requestDoc.actionTaken = `Customer account created with ${loanSelectionType === 'single' ? 'Single Loan' : 'Multiple Loans (Add Later)'}`;
    requestDoc.reviewedAt = new Date();
    requestDoc.approvedAt = new Date();
    requestDoc.completedAt = new Date();
    requestDoc.updatedAt = new Date();
    
    await requestDoc.save();
    console.log('✅ Request approved and saved');

    return NextResponse.json({ 
      success: true,
      message: 'Customer approved and activated successfully!',
      data: {
        customerId: customer._id,
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        loanSelectionType: loanSelectionType,
        loanNumber: loanSelectionType === 'single' ? step2Data.loanNumber : null
      }
    });

  } catch (error) {
    console.error('❌ Error in approveNewCustomer:', error);
    
    // Ensure we always return proper JSON, even for errors
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Unknown error occurred during customer approval'
    }, { status: 500 });
  }
}

async function approveLoanAddition(requestDoc, reason, processedBy) {
  console.log('📝 Approving loan addition request...');
  
  const requestedData = requestDoc.requestedData;
  
  // Check if this is a multiple loans request
  const isMultipleLoans = requestedData.multipleLoans === true || 
                         requestedData.isBatch === true || 
                         requestedData.loans !== undefined;
  const loansData = isMultipleLoans ? (requestedData.loans || []) : [requestedData];
  
  console.log(`🔄 Processing ${isMultipleLoans ? 'multiple' : 'single'} loan addition`, {
    loanCount: loansData.length,
    isMultiple: isMultipleLoans,
    customerName: requestDoc.customerName,
    customerId: requestDoc.customerId,
    requestedDataKeys: Object.keys(requestedData),
    hasLoansArray: requestedData.loans !== undefined,
    loansDataLength: loansData.length
  });

  // FIXED: Get customer ID from multiple possible locations
  let customerId;
  
  if (requestDoc.customerId) {
    customerId = requestDoc.customerId;
  } else if (requestedData.customerId) {
    customerId = requestedData.customerId;
  } else if (loansData.length > 0 && loansData[0].customerId) {
    customerId = loansData[0].customerId;
  }
  
  console.log('🔍 Customer ID resolution:', {
    fromRequestDoc: requestDoc.customerId,
    fromRequestedData: requestedData.customerId,
    fromFirstLoan: loansData.length > 0 ? loansData[0].customerId : 'N/A',
    finalCustomerId: customerId
  });
  
  if (!customerId) {
    return NextResponse.json({ 
      success: false,
      error: 'Customer ID not found in request data' 
    }, { status: 400 });
  }

  // Find customer
  const customer = await Customer.findById(customerId);
  
  if (!customer) {
    console.error('❌ Customer not found with ID:', customerId);
    return NextResponse.json({ 
      success: false,
      error: `Customer not found with ID: ${customerId}` 
    }, { status: 404 });
  }

  if (customer.status !== 'active') {
    console.error('❌ Customer not active:', {
      customerId: customer._id,
      name: customer.name,
      status: customer.status
    });
    return NextResponse.json({ 
      success: false,
      error: `Customer "${customer.name}" is not active. Current status: ${customer.status}` 
    }, { status: 400 });
  }

  console.log('✅ Customer found and active:', {
    customerId: customer._id,
    name: customer.name,
    customerNumber: customer.customerNumber,
    status: customer.status
  });

  // Array to store created loans
  const createdLoans = [];
  const errors = [];

  // Process each loan
  for (const [index, loanData] of loansData.entries()) {
    try {
      console.log(`🔄 Processing loan ${index + 1}/${loansData.length}:`, {
        loanNumber: loanData.loanNumber,
        loanType: loanData.loanType,
        customerId: loanData.customerId,
        hasCustomerIdInLoanData: !!loanData.customerId
      });

      // FIXED: Validate required fields
      if (!loanData.loanNumber || !loanData.loanNumber.trim()) {
        errors.push(`Loan ${index + 1}: Loan number is required`);
        continue;
      }

      if (!loanData.emiAmount || isNaN(parseFloat(loanData.emiAmount)) || parseFloat(loanData.emiAmount) <= 0) {
        errors.push(`Loan ${index + 1}: Valid EMI amount is required and must be greater than 0`);
        continue;
      }

      if (!loanData.loanType || !['Daily', 'Weekly', 'Monthly'].includes(loanData.loanType)) {
        errors.push(`Loan ${index + 1}: Valid loan type is required (Daily, Weekly, or Monthly)`);
        continue;
      }

      // Check if loan number already exists for this customer
      const existingLoanWithSameNumber = await Loan.findOne({
        customerId: customer._id,
        loanNumber: loanData.loanNumber.trim().toUpperCase(),
        status: { $in: ['active', 'pending'] }
      });

      if (existingLoanWithSameNumber) {
        errors.push(`Loan ${index + 1}: Loan number "${loanData.loanNumber}" already exists for this customer (status: ${existingLoanWithSameNumber.status})`);
        continue;
      }

      // Use the provided loan number (should be validated as available by frontend)
      const loanNumber = loanData.loanNumber.trim().toUpperCase();
      console.log(`✅ Using loan number: ${loanNumber} for customer: ${customer.name}`);

      const calculateNextEmiDate = (emiStartDate, loanType) => {
        const date = new Date(emiStartDate || new Date());
        switch(loanType) {
          case 'Daily':
            date.setDate(date.getDate() + 1);
            break;
          case 'Weekly':
            date.setDate(date.getDate() + 7);
            break;
          case 'Monthly':
            date.setMonth(date.getMonth() + 1);
            break;
          default:
            date.setDate(date.getDate() + 1);
        }
        return date;
      };

      // FIXED: Enhanced date handling
      let emiStartDate;
      let loanDate;
      
      try {
        // Handle loan date
        loanDate = loanData.dateApplied ? new Date(loanData.dateApplied) : new Date();
        if (isNaN(loanDate.getTime())) {
          loanDate = new Date();
        }
        
        // Handle EMI start date
        emiStartDate = loanData.emiStartDate ? new Date(loanData.emiStartDate) : new Date(loanDate);
        if (isNaN(emiStartDate.getTime())) {
          emiStartDate = new Date(loanDate);
        }
        
        // Normalize dates
        loanDate.setHours(0, 0, 0, 0);
        emiStartDate.setHours(0, 0, 0, 0);
        
        // Ensure EMI start date is not before loan date
        if (emiStartDate < loanDate) {
          console.log('⚠️ Adjusting EMI start date to match loan date');
          emiStartDate = new Date(loanDate);
        }
        
      } catch (error) {
        console.error('❌ Error processing dates:', error);
        loanDate = new Date();
        emiStartDate = new Date();
        loanDate.setHours(0, 0, 0, 0);
        emiStartDate.setHours(0, 0, 0, 0);
      }

      // Calculate loan amount based on loan type and EMI type
      let loanAmount;
      let totalLoanAmount;
      
      if (loanData.amount && !isNaN(parseFloat(loanData.amount))) {
        // Use provided amount if available
        loanAmount = parseFloat(loanData.amount);
      } else if (loanData.loanAmount && !isNaN(parseFloat(loanData.loanAmount))) {
        // Use loanAmount if amount is not available
        loanAmount = parseFloat(loanData.loanAmount);
      } else {
        // Calculate based on EMI amount and days
        const emiAmount = parseFloat(loanData.emiAmount);
        const loanDays = parseInt(loanData.loanDays) || 30;
        
        if (loanData.emiType === 'custom' && loanData.loanType !== 'Daily') {
          const fixedPeriods = loanDays - 1;
          const fixedAmount = emiAmount * fixedPeriods;
          const lastAmount = parseFloat(loanData.customEmiAmount || loanData.emiAmount);
          totalLoanAmount = fixedAmount + lastAmount;
          loanAmount = totalLoanAmount;
        } else {
          totalLoanAmount = emiAmount * loanDays;
          loanAmount = totalLoanAmount;
        }
      }

      // Ensure loanAmount is valid
      if (!loanAmount || loanAmount <= 0) {
        loanAmount = parseFloat(loanData.emiAmount) * (parseInt(loanData.loanDays) || 30);
      }

      const newLoanData = {
        customerId: customer._id,
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        loanNumber: loanNumber,
        amount: loanAmount,
        emiAmount: parseFloat(loanData.emiAmount),
        loanType: loanData.loanType,
        dateApplied: loanDate,
        loanDays: parseInt(loanData.loanDays) || 30,
        emiType: loanData.emiType || 'fixed',
        customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
        emiStartDate: emiStartDate,
        totalEmiCount: parseInt(loanData.loanDays) || 30,
        emiPaidCount: 0,
        lastEmiDate: null,
        nextEmiDate: calculateNextEmiDate(emiStartDate, loanData.loanType),
        totalPaidAmount: 0,
        remainingAmount: loanAmount,
        status: 'active',
        createdBy: requestDoc.createdBy || 'system',
        totalLoanAmount: totalLoanAmount || loanAmount,
        // Include fields required by middleware
        dailyEMI: loanData.loanType === 'Daily' ? parseFloat(loanData.emiAmount) : 
                 loanData.loanType === 'Weekly' ? parseFloat(loanData.emiAmount) / 7 :
                 parseFloat(loanData.emiAmount) / 30,
        totalEMI: totalLoanAmount || loanAmount,
        emiPaid: 0,
        emiPending: totalLoanAmount || loanAmount,
        totalPaid: 0,
        tenure: parseInt(loanData.loanDays) || 30,
        tenureType: loanData.loanType.toLowerCase(),
        startDate: loanDate,
        endDate: (() => {
          const end = new Date(loanDate);
          end.setDate(end.getDate() + (parseInt(loanData.loanDays) || 30));
          return end;
        })(),
        interestRate: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Creating loan with data:', {
        loanNumber: newLoanData.loanNumber,
        amount: newLoanData.amount,
        emiAmount: newLoanData.emiAmount,
        loanType: newLoanData.loanType,
        emiType: newLoanData.emiType,
        loanDays: newLoanData.loanDays,
        customerId: newLoanData.customerId
      });

      let newLoan;
      try {
        // Try to create loan with validation
        newLoan = new Loan(newLoanData);
        await newLoan.save();
        console.log(`✅ Loan ${index + 1} created successfully:`, loanNumber);
        createdLoans.push({
          loanId: newLoan._id,
          loanNumber: newLoan.loanNumber,
          amount: newLoan.amount,
          loanType: newLoan.loanType,
          emiAmount: newLoan.emiAmount
        });
      } catch (error) {
        console.error(`❌ Error creating loan ${index + 1}:`, error);
        
        // If validation fails, try with minimal validation
        if (error.name === 'ValidationError') {
          console.log('🔄 Retrying with minimal validation...');
          try {
            // Use create with minimal validation
            newLoan = await Loan.create(newLoanData);
            console.log(`✅ Loan ${index + 1} created with minimal validation:`, loanNumber);
            createdLoans.push({
              loanId: newLoan._id,
              loanNumber: newLoan.loanNumber,
              amount: newLoan.amount,
              loanType: newLoan.loanType,
              emiAmount: newLoan.emiAmount
            });
          } catch (retryError) {
            errors.push(`Loan ${index + 1}: ${retryError.message}`);
          }
        } else {
          errors.push(`Loan ${index + 1}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing loan ${index + 1}:`, error);
      errors.push(`Loan ${index + 1}: ${error.message}`);
    }
  }

  // Check if any loans were created
  if (createdLoans.length === 0 && errors.length > 0) {
    return NextResponse.json({ 
      success: false,
      error: `Failed to create any loans: ${errors.join('; ')}`
    }, { status: 400 });
  }

  // Prepare success message
  let successMessage;
  let actionTaken;
  
  if (createdLoans.length === loansData.length) {
    successMessage = `All ${createdLoans.length} loan(s) added successfully to ${customer.name}!`;
    actionTaken = `Added ${createdLoans.length} loan(s): ${createdLoans.map(l => l.loanNumber).join(', ')}`;
  } else {
    successMessage = `${createdLoans.length} of ${loansData.length} loan(s) added successfully to ${customer.name}.`;
    if (errors.length > 0) {
      successMessage += ` Failed: ${errors.join('; ')}`;
    }
    actionTaken = `Added ${createdLoans.length} loan(s) (${createdLoans.map(l => l.loanNumber).join(', ')})`;
  }

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan addition approved by admin';
  requestDoc.actionTaken = actionTaken;
  requestDoc.reviewedAt = new Date();
  requestDoc.approvedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Loan addition approved');

  return NextResponse.json({ 
    success: true,
    message: successMessage,
    data: {
      customerId: customer._id,
      customerName: customer.name,
      customerNumber: customer.customerNumber,
      createdLoans: createdLoans,
      failedCount: errors.length,
      totalCount: loansData.length
    }
  });
}

async function approveCustomerEdit(requestDoc, reason, processedBy) {
  console.log('📝 Processing Customer Edit request...');
  
  const customerId = requestDoc.customerId;
  if (!customerId) {
    return NextResponse.json({ 
      success: false,
      error: 'Customer ID not found' 
    }, { status: 400 });
  }

  const customer = await Customer.findById(customerId);
  if (!customer) {
    return NextResponse.json({ 
      success: false,
      error: 'Customer not found' 
    }, { status: 404 });
  }

  const changes = requestDoc.requestedData || {};
  const updatableFields = [
    'name', 'phone', 'whatsappNumber', 'businessName', 'area', 'address',
    'customerNumber', 'category', 'officeCategory', 'loginId'
  ];

  let updatedFields = [];
  updatableFields.forEach(field => {
    if (changes[field] !== undefined && changes[field] !== null) {
      // Normalize customer number if it's being updated
      if (field === 'customerNumber') {
        customer[field] = normalizeCustomerNumber(changes[field]);
      } else {
        customer[field] = changes[field];
      }
      updatedFields.push(field);
    }
  });

  // Handle file upload fields separately to ensure they are objects
  if (changes.profilePicture !== undefined) {
    customer.profilePicture = changes.profilePicture && typeof changes.profilePicture === 'object' 
      ? changes.profilePicture 
      : {
          filename: null,
          url: null,
          originalName: null,
          uploadedAt: new Date()
        };
    updatedFields.push('profilePicture');
  }

  if (changes.fiDocuments !== undefined) {
    customer.fiDocuments = changes.fiDocuments && typeof changes.fiDocuments === 'object'
      ? {
          shop: changes.fiDocuments.shop && typeof changes.fiDocuments.shop === 'object'
            ? changes.fiDocuments.shop
            : {
                filename: null,
                url: null,
                originalName: null,
                uploadedAt: new Date()
              },
          home: changes.fiDocuments.home && typeof changes.fiDocuments.home === 'object'
            ? changes.fiDocuments.home
            : {
                filename: null,
                url: null,
                originalName: null,
                uploadedAt: new Date()
              }
        }
      : {
          shop: {
            filename: null,
            url: null,
            originalName: null,
            uploadedAt: new Date()
          },
          home: {
            filename: null,
            url: null,
            originalName: null,
            uploadedAt: new Date()
          }
        };
    updatedFields.push('fiDocuments');
  }

  // Check for duplicates if critical fields are updated
  if (updatedFields.some(field => ['phone', 'customerNumber', 'loginId'].includes(field))) {
    const hasDuplicates = await checkForDuplicates({
      phone: customer.phone,
      customerNumber: customer.customerNumber,
      loginId: customer.loginId,
      excludeId: customer._id
    });

    if (hasDuplicates) {
      return NextResponse.json({ 
        success: false,
        error: 'Updated customer data conflicts with existing customer'
      }, { status: 409 });
    }
  }

  customer.updatedAt = new Date();
  customer.lastEditedBy = processedBy;
  customer.lastEditDate = new Date();
  await customer.save();
  console.log('✅ Customer updated');

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Customer edit approved by admin';
  requestDoc.actionTaken = `Customer details updated. Fields: ${updatedFields.join(', ')}`;
  requestDoc.reviewedAt = new Date();
  requestDoc.approvedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Customer edit approved');

  return NextResponse.json({ 
    success: true,
    message: 'Customer edit approved successfully!',
    data: {
      customerId: customer._id,
      customerName: customer.name,
      updatedFields: updatedFields
    }
  });
}

async function approveLoanEdit(requestDoc, reason, processedBy) {
  console.log('📝 Processing Loan Edit request...');
  
  const loanId = requestDoc.loanId;
  if (!loanId) {
    return NextResponse.json({ 
      success: false,
      error: 'Loan ID not found' 
    }, { status: 400 });
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    return NextResponse.json({ 
      success: false,
      error: 'Loan not found' 
    }, { status: 404 });
  }

  const changes = requestDoc.requestedData || {};
  
  console.log('🔍 Loan edit changes:', {
    loanId: loanId,
    currentLoanNumber: loan.loanNumber,
    requestedLoanNumber: changes.loanNumber,
    changes: changes
  });

  // FIXED: Added all fields that can be edited
  const updatableFields = [
    'loanNumber', // ← ADDED THIS
    'amount', 
    'emiAmount', 
    'loanType', 
    'loanDays', 
    'emiType', 
    'customEmiAmount',
    'dateApplied', // ← ADDED THIS
    'emiStartDate' // ← ADDED THIS
  ];

  let updatedFields = [];
  
  // FIXED: Use for...of loop instead of forEach for async operations
  for (const field of updatableFields) {
    if (changes[field] !== undefined && changes[field] !== null) {
      // Special handling for loan number - ensure uppercase
      if (field === 'loanNumber') {
        const newLoanNumber = changes[field].trim().toUpperCase();
        
        // Check if loan number is being changed
        if (newLoanNumber !== loan.loanNumber) {
          console.log(`🔄 Changing loan number from ${loan.loanNumber} to ${newLoanNumber}`);
          
          // Validate new loan number format (L1-L15)
          const loanNum = newLoanNumber.replace('L', '');
          const loanNumValue = parseInt(loanNum);
          
          if (!newLoanNumber.startsWith('L') || isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
            throw new Error(`Invalid loan number: ${newLoanNumber}. Must be between L1 and L15.`);
          }
          
          // Check if new loan number already exists for this customer (excluding current loan)
          const existingLoan = await Loan.findOne({
            customerId: loan.customerId,
            loanNumber: newLoanNumber,
            _id: { $ne: loanId },
            status: { $in: ['active', 'pending'] }
          });
          
          if (existingLoan) {
            throw new Error(`Loan number ${newLoanNumber} is already taken by another loan for this customer.`);
          }
        }
        
        loan[field] = newLoanNumber;
      } 
      // Handle date fields
      else if (field === 'dateApplied' || field === 'emiStartDate') {
        const newDate = new Date(changes[field]);
        if (isNaN(newDate.getTime())) {
          throw new Error(`Invalid ${field}: ${changes[field]}`);
        }
        loan[field] = newDate;
      }
      // Handle numeric fields
      else if (['amount', 'emiAmount', 'loanDays', 'customEmiAmount'].includes(field)) {
        const numValue = parseFloat(changes[field]);
        if (isNaN(numValue) || numValue <= 0) {
          throw new Error(`Invalid ${field}: must be a positive number`);
        }
        loan[field] = numValue;
      }
      // Handle other fields
      else {
        loan[field] = changes[field];
      }
      
      updatedFields.push(field);
    }
  }

  // Recalculate next EMI date if loan type or EMI start date changed
  if (updatedFields.includes('loanType') || updatedFields.includes('emiStartDate')) {
    const calculateNextEmiDate = (emiStartDate, loanType) => {
      const date = new Date(emiStartDate || new Date());
      switch(loanType) {
        case 'Daily':
          date.setDate(date.getDate() + 1);
          break;
        case 'Weekly':
          date.setDate(date.getDate() + 7);
          break;
        case 'Monthly':
          date.setMonth(date.getMonth() + 1);
          break;
        default:
          date.setDate(date.getDate() + 1);
      }
      return date;
    };
    
    loan.nextEmiDate = calculateNextEmiDate(loan.emiStartDate, loan.loanType);
    updatedFields.push('nextEmiDate');
  }

  // Update remaining amount if amount changed
  if (updatedFields.includes('amount')) {
    loan.remainingAmount = loan.amount - (loan.totalPaidAmount || 0);
    if (loan.remainingAmount < 0) loan.remainingAmount = 0;
    updatedFields.push('remainingAmount');
  }

  // Recalculate total loan amount based on EMI type
  if (updatedFields.includes('emiAmount') || updatedFields.includes('loanDays') || 
      updatedFields.includes('emiType') || updatedFields.includes('customEmiAmount')) {
    
    if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
      const fixedPeriods = loan.loanDays - 1;
      const fixedAmount = loan.emiAmount * fixedPeriods;
      const lastAmount = loan.customEmiAmount || loan.emiAmount;
      loan.totalLoanAmount = fixedAmount + lastAmount;
    } else {
      loan.totalLoanAmount = loan.emiAmount * loan.loanDays;
    }
    updatedFields.push('totalLoanAmount');
  }

  // Update daily EMI if loan type or EMI amount changed
  if (updatedFields.includes('loanType') || updatedFields.includes('emiAmount')) {
    if (loan.loanType === 'Daily') {
      loan.dailyEMI = loan.emiAmount;
    } else if (loan.loanType === 'Weekly') {
      loan.dailyEMI = loan.emiAmount / 7;
    } else if (loan.loanType === 'Monthly') {
      loan.dailyEMI = loan.emiAmount / 30;
    }
    updatedFields.push('dailyEMI');
  }

  // Update tenure for backward compatibility
  if (updatedFields.includes('loanDays')) {
    loan.tenure = loan.loanDays;
    loan.tenureType = loan.loanType.toLowerCase();
    updatedFields.push('tenure', 'tenureType');
  }

  // Update end date
  if (updatedFields.includes('dateApplied') || updatedFields.includes('loanDays')) {
    const endDate = new Date(loan.dateApplied);
    endDate.setDate(endDate.getDate() + loan.loanDays);
    loan.endDate = endDate;
    updatedFields.push('endDate');
  }

  loan.updatedAt = new Date();
  loan.lastEditedBy = processedBy;
  loan.lastEditDate = new Date();
  
  try {
    await loan.save();
    console.log('✅ Loan updated successfully:', {
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      amount: loan.amount,
      updatedFields: updatedFields
    });
  } catch (error) {
    console.error('❌ Error saving loan:', error);
    throw new Error(`Failed to update loan: ${error.message}`);
  }

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan edit approved by admin';
  requestDoc.actionTaken = `Loan ${loan.loanNumber} updated. Fields: ${updatedFields.join(', ')}`;
  requestDoc.reviewedAt = new Date();
  requestDoc.approvedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Loan edit approved');

  return NextResponse.json({ 
    success: true,
    message: 'Loan edit approved successfully!',
    data: {
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      updatedFields: updatedFields,
      changes: {
        oldLoanNumber: loan.originalData?.loanNumber || 'N/A',
        newLoanNumber: loan.loanNumber
      }
    }
  });
}

async function approveLoanDeletion(requestDoc, reason, processedBy) {
  console.log('🗑️ Processing Loan Deletion request...');
  
  const loanId = requestDoc.loanId;
  if (!loanId) {
    return NextResponse.json({ 
      success: false,
      error: 'Loan ID not found' 
    }, { status: 400 });
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    return NextResponse.json({ 
      success: false,
      error: 'Loan not found' 
    }, { status: 404 });
  }

  // Check if loan has any EMI payments
  const hasEMIPayments = await EMIPayment.findOne({ loanId: loanId });
  if (hasEMIPayments) {
    return NextResponse.json({ 
      success: false,
      error: 'Cannot delete loan with existing EMI payments. Consider marking it as inactive instead.'
    }, { status: 400 });
  }

  // Delete the loan
  await Loan.findByIdAndDelete(loanId);
  console.log('✅ Loan deleted');

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan deletion approved by admin';
  requestDoc.actionTaken = `Loan ${loan.loanNumber} deleted permanently`;
  requestDoc.reviewedAt = new Date();
  requestDoc.approvedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Loan deletion approved');

  return NextResponse.json({ 
    success: true,
    message: 'Loan deleted successfully!',
    data: {
      loanNumber: loan.loanNumber,
      customerName: loan.customerName
    }
  });
}

async function approveLoanRenew(requestDoc, reason, processedBy) {
  try {
    console.log('🔄 Processing Loan Renew request...');

    const requestedData = requestDoc.requestedData || {};
    
    // Debug: Log the requested data structure
    console.log('📋 Requested Data for renewal:', JSON.stringify(requestedData, null, 2));
    
    // Validate required fields
    const requiredFields = ['newLoanAmount', 'newEmiAmount', 'newLoanType', 'newLoanNumber', 'newLoanDays'];
    const missingFields = requiredFields.filter(field => !requestedData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required renewal data: ${missingFields.join(', ')}`);
    }

    const originalLoanId = requestDoc.loanId || requestedData.originalLoanId;
    
    if (!originalLoanId) {
      throw new Error('Original loan ID not found in request');
    }

    console.log('🔍 Looking for original loan with ID:', originalLoanId);

    // Find the original loan
    const originalLoan = await Loan.findById(originalLoanId);
    if (!originalLoan) {
      throw new Error('Original loan not found');
    }

    console.log('✅ Original loan found:', {
      loanNumber: originalLoan.loanNumber,
      status: originalLoan.status,
      isRenewed: originalLoan.isRenewed,
      customerName: originalLoan.customerName
    });

    // Check if loan is already renewed
    if (originalLoan.isRenewed || originalLoan.status === 'renewed') {
      throw new Error(`Loan ${originalLoan.loanNumber} has already been renewed`);
    }

    // Get customer
    const customerId = originalLoan.customerId;
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    console.log('✅ Customer found:', {
      customerId: customer._id,
      name: customer.name,
      status: customer.status
    });

    // **FIXED: Use the loan number from the request (user selected)**
    const newLoanNumber = requestedData.newLoanNumber.trim().toUpperCase();
    
    console.log('🔧 Using loan number for renewal:', newLoanNumber);

    // **VALIDATE: Check for duplicates before proceeding**
    const duplicateCheck = await Loan.findOne({
      customerId: customerId,
      loanNumber: newLoanNumber,
      $or: [
        { isRenewed: { $ne: true } },
        { isRenewed: { $exists: false } }
      ]
    });
    
    if (duplicateCheck) {
      console.error('❌ Duplicate loan found:', {
        requested: newLoanNumber,
        existingId: duplicateCheck._id,
        existingStatus: duplicateCheck.status
      });
      throw new Error(`Cannot create renewed loan: Loan number ${newLoanNumber} already exists for this customer`);
    }

    console.log('✅ Unique loan number verified:', newLoanNumber);

    // Helper function to calculate next EMI date
    const calculateNextEmiDate = (emiStartDate, loanType) => {
      const date = new Date(emiStartDate || new Date());
      switch(loanType) {
        case 'Daily':
          date.setDate(date.getDate() + 1);
          break;
        case 'Weekly':
          date.setDate(date.getDate() + 7);
          break;
        case 'Monthly':
          date.setMonth(date.getMonth() + 1);
          break;
        default:
          date.setDate(date.getDate() + 1);
      }
      return date;
    };

    // Process dates
    let emiStartDate;
    let renewalDate;
    
    try {
      renewalDate = requestedData.renewalDate ? new Date(requestedData.renewalDate) : new Date();
      emiStartDate = requestedData.emiStartDate ? new Date(requestedData.emiStartDate) : new Date(renewalDate);
      
      if (isNaN(renewalDate.getTime())) renewalDate = new Date();
      if (isNaN(emiStartDate.getTime())) emiStartDate = new Date(renewalDate);
      
      // Ensure emiStartDate is not before renewalDate
      if (emiStartDate < renewalDate) {
        console.log('⚠️ Adjusting EMI start date to match renewal date');
        emiStartDate = new Date(renewalDate);
      }
      
      // Normalize dates to start of day
      renewalDate.setHours(0, 0, 0, 0);
      emiStartDate.setHours(0, 0, 0, 0);
      
    } catch (error) {
      console.error('❌ Error processing dates:', error);
      renewalDate = new Date();
      emiStartDate = new Date();
      renewalDate.setHours(0, 0, 0, 0);
      emiStartDate.setHours(0, 0, 0, 0);
    }

    // **FIXED: Parse numeric values from requestedData - NO FALLBACK to defaults!**
    const newLoanAmount = parseFloat(requestedData.newLoanAmount);
    const newEmiAmount = parseFloat(requestedData.newEmiAmount);
    const newLoanDays = parseInt(requestedData.newLoanDays);
    
    console.log('💰 Parsed renewal values:', {
      newLoanAmount,
      newEmiAmount,
      newLoanDays,
      newLoanType: requestedData.newLoanType,
      emiType: requestedData.emiType,
      customEmiAmount: requestedData.customEmiAmount
    });
    
    // **FIXED: Validate numeric values properly**
    if (isNaN(newLoanAmount) || newLoanAmount <= 0) {
      throw new Error('Invalid new loan amount. Must be a positive number');
    }
    if (isNaN(newEmiAmount) || newEmiAmount <= 0) {
      throw new Error('Invalid new EMI amount. Must be a positive number');
    }
    if (isNaN(newLoanDays) || newLoanDays <= 0) {
      throw new Error('Invalid loan days. Must be a positive number greater than 0');
    }

    // Calculate total loan amount based on EMI type
    let totalLoanAmount;
    if (requestedData.emiType === 'custom' && requestedData.newLoanType !== 'Daily') {
      const fixedPeriods = newLoanDays - 1;
      const fixedAmount = newEmiAmount * fixedPeriods;
      const lastAmount = parseFloat(requestedData.customEmiAmount || newEmiAmount);
      totalLoanAmount = fixedAmount + lastAmount;
    } else {
      totalLoanAmount = newEmiAmount * newLoanDays;
    }

    console.log('💰 Loan amount calculation:', {
      emiType: requestedData.emiType,
      loanType: requestedData.newLoanType,
      totalLoanAmount: totalLoanAmount,
      emiAmount: newEmiAmount,
      loanDays: newLoanDays,
      customEmiAmount: requestedData.customEmiAmount
    });

    // **FIXED: Create new loan with ALL required fields - NO validateBeforeSave: false!**
    // Start a session for transaction
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      // **FIXED: Create new loan with ALL required fields**
      const newLoan = new Loan({
        customerId: customerId,
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        loanNumber: newLoanNumber,
        amount: newLoanAmount,  // Already validated above
        emiAmount: newEmiAmount, // Already validated above
        loanType: requestedData.newLoanType,
        dateApplied: renewalDate,
        loanDays: newLoanDays,  // Already validated above
        emiType: requestedData.emiType || 'fixed',
        customEmiAmount: requestedData.customEmiAmount ? parseFloat(requestedData.customEmiAmount) : null,
        emiStartDate: emiStartDate,
        totalEmiCount: newLoanDays,
        emiPaidCount: 0,
        lastEmiDate: null,
        nextEmiDate: calculateNextEmiDate(emiStartDate, requestedData.newLoanType),
        totalPaidAmount: 0,
        remainingAmount: newLoanAmount,
        status: 'active',
        createdBy: requestDoc.createdBy || 'system',
        // Track the original loan
        originalLoanNumber: originalLoan.loanNumber,
        // Calculate daily EMI for compatibility
        dailyEMI: requestedData.newLoanType === 'Daily' ? newEmiAmount : 
                 requestedData.newLoanType === 'Weekly' ? newEmiAmount / 7 :
                 newEmiAmount / 30,
        totalLoanAmount: totalLoanAmount,
        totalEMI: totalLoanAmount,
        emiPaid: 0,
        emiPending: totalLoanAmount,
        totalPaid: 0,
        tenure: newLoanDays,
        tenureType: requestedData.newLoanType.toLowerCase(),
        startDate: renewalDate,
        endDate: (() => {
          const end = new Date(renewalDate);
          end.setDate(end.getDate() + newLoanDays);
          return end;
        })(),
        interestRate: 0,
        // These fields will be set by pre-save middleware:
        // remainingAmount, totalEmiCount, etc.
      });

      console.log('💾 Creating renewed loan with data:', {
        loanNumber: newLoan.loanNumber,
        amount: newLoan.amount,
        emiAmount: newLoan.emiAmount,
        loanType: newLoan.loanType,
        loanDays: newLoan.loanDays,
        totalLoanAmount: newLoan.totalLoanAmount
      });

      // **FIXED: Save WITH validation - let pre-save middleware set calculated fields**
      await newLoan.save({ session });
      
      // **FIXED: Mark original loan as renewed with proper fields**
      originalLoan.isRenewed = true;
      originalLoan.status = 'renewed';
      originalLoan.renewedLoanNumber = newLoanNumber;
      originalLoan.renewedDate = new Date();
      originalLoan.updatedAt = new Date();
      // Clear future EMI dates since loan is renewed
      originalLoan.nextEmiDate = null;
      
      console.log('🔄 Marking original loan as renewed:', {
        originalLoan: originalLoan.loanNumber,
        newLoanNumber: newLoanNumber,
        isRenewed: originalLoan.isRenewed,
        status: originalLoan.status
      });
      
      await originalLoan.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      console.log('✅ Loan renewal completed successfully:', {
        originalLoan: originalLoan.loanNumber,
        newLoan: newLoanNumber,
        newAmount: newLoanAmount,
        newEMI: newEmiAmount,
        newType: requestedData.newLoanType,
        newDays: newLoanDays
      });

      // Update the request
      requestDoc.status = 'Approved';
      requestDoc.reviewedBy = processedBy;
      requestDoc.reviewedByRole = 'admin';
      requestDoc.reviewNotes = reason || 'Loan renewal approved by admin';
      requestDoc.actionTaken = `Loan renewed: ${originalLoan.loanNumber} → ${newLoanNumber} (Amount: ₹${newLoanAmount.toLocaleString()}, EMI: ₹${newEmiAmount.toLocaleString()}, Type: ${requestedData.newLoanType}, Days: ${newLoanDays})`;
      requestDoc.reviewedAt = new Date();
      requestDoc.approvedAt = new Date();
      requestDoc.completedAt = new Date();
      requestDoc.updatedAt = new Date();
      
      await requestDoc.save();

      return NextResponse.json({ 
        success: true,
        message: 'Loan renewed successfully!',
        data: {
          originalLoan: {
            loanNumber: originalLoan.loanNumber,
            isRenewed: true,
            renewedLoanNumber: newLoanNumber,
            status: 'renewed'
          },
          newLoan: {
            loanId: newLoan._id,
            loanNumber: newLoan.loanNumber,
            customerName: customer.name,
            amount: newLoanAmount,
            emiAmount: newEmiAmount,
            loanType: requestedData.newLoanType,
            loanDays: newLoanDays,
            originalLoanNumber: originalLoan.loanNumber,
            totalLoanAmount: totalLoanAmount
          }
        }
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ Transaction error:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ Error in approveLoanRenew:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to approve loan renewal: ' + error.message 
    }, { status: 500 });
  }
}