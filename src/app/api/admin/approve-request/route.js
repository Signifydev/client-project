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
    status: requestDoc.status
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
      loanNumber: step2Data.loanNumber
    });

    // Validate required fields with specific error messages
    const requiredStep1Fields = ['name', 'customerNumber', 'phone', 'businessName', 'area'];
    const missingStep1Fields = requiredStep1Fields.filter(field => !step1Data[field]);
    
    if (missingStep1Fields.length > 0) {
      throw new Error(`Missing required customer fields: ${missingStep1Fields.join(', ')}`);
    }

    const requiredStep2Fields = ['loanAmount', 'emiAmount', 'loanType', 'loanDays'];
    const missingStep2Fields = requiredStep2Fields.filter(field => !step2Data[field]);
    
    if (missingStep2Fields.length > 0) {
      throw new Error(`Missing required loan fields: ${missingStep2Fields.join(', ')}`);
    }

    // Validate loan number for single loans (LN1-LN15)
    if (loanSelectionType === 'single') {
      if (!step2Data.loanNumber || !step2Data.loanNumber.trim()) {
        throw new Error('Loan number is required for single loan');
      }
      
      // Validate LN1-LN15 range
      const loanNum = step2Data.loanNumber.replace('LN', '');
      const loanNumValue = parseInt(loanNum);
      if (!step2Data.loanNumber.startsWith('LN') || isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
        throw new Error('Loan number must be between LN1 and LN15 for single loans');
      }
      
      console.log(`✅ Valid loan number: ${step2Data.loanNumber}`);
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
      phone: customerDataToSave.phone
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
        // Use the loan number from the form (LN1-LN15) instead of generating new one
        const loanNumber = step2Data.loanNumber; // This is LN1, LN2, etc.
        
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
          createdBy: requestDoc.createdBy || 'system'
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
  
  if (!requestedData.loanAmount || !requestedData.emiAmount || !requestedData.loanType) {
    return NextResponse.json({ 
      success: false,
      error: 'Missing required loan data' 
    }, { status: 400 });
  }

  const customer = await Customer.findById(requestedData.customerId);
  if (!customer || customer.status !== 'active') {
    return NextResponse.json({ 
      success: false,
      error: 'Customer not found or not active' 
    }, { status: 404 });
  }

  // For additional loans, we can generate or use provided loan number
  let loanNumber;
  
  // Check if loan number is provided and validate it if it's a specific format
  if (requestedData.loanNumber && requestedData.loanNumber.startsWith('LN')) {
    // Validate LN1-LN15 range if it's in that format
    const loanNum = requestedData.loanNumber.replace('LN', '');
    const loanNumValue = parseInt(loanNum);
    if (isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
      console.log('⚠️ Provided loan number is not in LN1-LN15 range, generating new one');
      loanNumber = await Loan.generateLoanNumber(customer._id);
    } else {
      loanNumber = requestedData.loanNumber;
      console.log(`✅ Using provided loan number: ${loanNumber}`);
    }
  } else {
    // Generate new loan number
    loanNumber = await Loan.generateLoanNumber(customer._id);
    console.log('🔧 Generated loan number for additional loan:', loanNumber);
  }

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

  // FIXED: Enhanced date handling to prevent validation errors
  let emiStartDate;
  let loanDate;
  
  try {
    // Handle loan date
    loanDate = requestedData.dateApplied ? new Date(requestedData.dateApplied) : new Date();
    if (isNaN(loanDate.getTime())) {
      loanDate = new Date();
    }
    
    // Handle EMI start date - ensure it's not before loan date
    emiStartDate = requestedData.emiStartDate ? new Date(requestedData.emiStartDate) : new Date(loanDate);
    if (isNaN(emiStartDate.getTime())) {
      emiStartDate = new Date(loanDate);
    }
    
    // FIX: Normalize dates to avoid timezone comparison issues
    // Set both dates to start of day (00:00:00) for consistent comparison
    loanDate.setHours(0, 0, 0, 0);
    emiStartDate.setHours(0, 0, 0, 0);
    
    // FIX: If EMI start date is before loan date, set it to loan date
    if (emiStartDate < loanDate) {
      console.log('⚠️ Adjusting EMI start date to match loan date');
      emiStartDate = new Date(loanDate);
    }
    
    console.log('📅 Date validation:', {
      loanDate: loanDate.toISOString(),
      emiStartDate: emiStartDate.toISOString(),
      isValid: emiStartDate >= loanDate
    });
    
  } catch (error) {
    console.error('❌ Error processing dates:', error);
    // Fallback to current date
    loanDate = new Date();
    emiStartDate = new Date();
    loanDate.setHours(0, 0, 0, 0);
    emiStartDate.setHours(0, 0, 0, 0);
  }

  // Calculate total loan amount based on EMI type
  let totalLoanAmount;
  if (requestedData.emiType === 'custom' && requestedData.loanType !== 'Daily') {
    const fixedPeriods = Number(requestedData.loanDays) - 1;
    const fixedAmount = Number(requestedData.emiAmount) * fixedPeriods;
    const lastAmount = Number(requestedData.customEmiAmount || requestedData.emiAmount);
    totalLoanAmount = fixedAmount + lastAmount;
  } else {
    totalLoanAmount = Number(requestedData.emiAmount) * Number(requestedData.loanDays);
  }

  const loanData = {
    customerId: customer._id,
    customerName: customer.name,
    customerNumber: customer.customerNumber,
    loanNumber: loanNumber,
    amount: Number(requestedData.loanAmount),
    emiAmount: Number(requestedData.emiAmount),
    loanType: requestedData.loanType,
    dateApplied: loanDate,
    loanDays: Number(requestedData.loanDays) || 30,
    emiType: requestedData.emiType || 'fixed',
    customEmiAmount: requestedData.customEmiAmount ? Number(requestedData.customEmiAmount) : null,
    emiStartDate: emiStartDate,
    totalEmiCount: Number(requestedData.loanDays) || 30,
    emiPaidCount: 0,
    lastEmiDate: null,
    nextEmiDate: calculateNextEmiDate(emiStartDate, requestedData.loanType),
    totalPaidAmount: 0,
    remainingAmount: Number(requestedData.loanAmount),
    status: 'active',
    createdBy: requestDoc.createdBy,
    totalLoanAmount: totalLoanAmount
  };

  console.log('💾 Creating loan with data:', {
    loanNumber: loanData.loanNumber,
    amount: loanData.amount,
    emiAmount: loanData.emiAmount,
    loanType: loanData.loanType,
    dateApplied: loanData.dateApplied.toISOString(),
    emiStartDate: loanData.emiStartDate.toISOString(),
    emiType: loanData.emiType,
    loanDays: loanData.loanDays
  });

  // FIXED: Define newLoan variable properly
  let newLoan;
  try {
    newLoan = new Loan(loanData);
    await newLoan.save();
    console.log('✅ Additional loan created with enhanced details');
  } catch (error) {
    console.error('❌ Error creating loan:', error);
    // If validation still fails, try with adjusted dates
    if (error.message.includes('EMI start date cannot be before loan date')) {
      console.log('🔄 Retrying with adjusted dates...');
      loanData.emiStartDate = new Date(loanData.dateApplied);
      loanData.emiStartDate.setHours(0, 0, 0, 0);
      
      newLoan = new Loan(loanData);
      await newLoan.save();
      console.log('✅ Additional loan created with adjusted dates');
    } else {
      throw error;
    }
  }

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan addition approved by admin';
  requestDoc.actionTaken = `Additional loan created: ${loanNumber} with ${requestedData.loanType} EMI`;
  requestDoc.reviewedAt = new Date();
  requestDoc.approvedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Loan addition approved');

  return NextResponse.json({ 
    success: true,
    message: 'Additional loan approved successfully!',
    data: {
      loanId: newLoan._id,
      loanNumber: newLoan.loanNumber,
      customerName: customer.name,
      loanType: newLoan.loanType,
      emiType: newLoan.emiType,
      totalAmount: totalLoanAmount
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
  const updatableFields = [
    'amount', 'emiAmount', 'loanType', 'loanDays', 'emiType', 'customEmiAmount'
  ];

  let updatedFields = [];
  updatableFields.forEach(field => {
    if (changes[field] !== undefined && changes[field] !== null) {
      loan[field] = changes[field];
      updatedFields.push(field);
    }
  });

  if (changes.amount) {
    loan.remainingAmount = changes.amount - loan.totalPaidAmount;
  }

  loan.updatedAt = new Date();
  await loan.save();
  console.log('✅ Loan updated');

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan edit approved by admin';
  requestDoc.actionTaken = `Loan details updated. Fields: ${updatedFields.join(', ')}`;
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
      updatedFields: updatedFields
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
    console.log('🔄 Processing Loan Renew request (Native MongoDB Approach)...');

    const requestedData = requestDoc.requestedData || requestDoc;
    
    // Validate required fields
    if (!requestedData.newLoanAmount || !requestedData.newEmiAmount || !requestedData.newLoanType) {
      throw new Error('Missing required renewal data: newLoanAmount, newEmiAmount, newLoanType');
    }

    const originalLoanId = requestDoc.loanId || requestedData.originalLoanId || requestedData.loanId;
    
    if (!originalLoanId) {
      throw new Error('Original loan ID not found in request');
    }

    console.log('🔍 Looking for original loan with ID:', originalLoanId);

    // Find the original loan using Mongoose (this should work for queries)
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

    // Generate new loan number
    const customerLoans = await Loan.find({ customerId });
    const newLoanNumber = `L${customerLoans.length + 1}`;
    console.log('🔧 Generated loan number for renewal:', newLoanNumber);

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
    try {
      emiStartDate = requestedData.emiStartDate ? new Date(requestedData.emiStartDate) : new Date();
      if (isNaN(emiStartDate.getTime())) {
        emiStartDate = new Date();
      }
    } catch (error) {
      emiStartDate = new Date();
    }

    // Calculate total loan amount based on EMI type
    let totalLoanAmount;
    if (requestedData.emiType === 'custom' && requestedData.newLoanType !== 'Daily') {
      const fixedPeriods = Number(requestedData.newLoanDays) - 1;
      const fixedAmount = Number(requestedData.newEmiAmount) * fixedPeriods;
      const lastAmount = Number(requestedData.customEmiAmount || requestedData.newEmiAmount);
      totalLoanAmount = fixedAmount + lastAmount;
    } else {
      totalLoanAmount = Number(requestedData.newEmiAmount) * Number(requestedData.newLoanDays);
    }

    console.log('💰 Loan amount calculation:', {
      emiType: requestedData.emiType,
      loanType: requestedData.newLoanType,
      totalLoanAmount: totalLoanAmount,
      emiAmount: requestedData.newEmiAmount,
      loanDays: requestedData.newLoanDays
    });

    // Create new loan data
    const newLoanData = {
      customerId: customerId,
      customerName: customer.name,
      customerNumber: customer.customerNumber,
      loanNumber: newLoanNumber,
      amount: parseFloat(requestedData.newLoanAmount),
      emiAmount: parseFloat(requestedData.newEmiAmount),
      loanType: requestedData.newLoanType,
      dateApplied: new Date(requestedData.renewalDate) || new Date(),
      loanDays: parseInt(requestedData.newLoanDays) || 30,
      emiType: requestedData.emiType || 'fixed',
      customEmiAmount: requestedData.customEmiAmount ? parseFloat(requestedData.customEmiAmount) : null,
      emiStartDate: emiStartDate,
      nextEmiDate: calculateNextEmiDate(emiStartDate, requestedData.newLoanType),
      totalEmiCount: parseInt(requestedData.newLoanDays) || 30,
      emiPaidCount: 0,
      lastEmiDate: null,
      totalPaidAmount: 0,
      remainingAmount: parseFloat(requestedData.newLoanAmount),
      status: 'active',
      createdBy: requestDoc.createdBy,
      originalLoanNumber: originalLoan.loanNumber,
      totalLoanAmount: totalLoanAmount,
      // Include all fields that might be required by middleware
      dailyEMI: requestedData.newLoanType === 'Daily' ? parseFloat(requestedData.newEmiAmount) : 0,
      totalEMI: totalLoanAmount,
      emiPaid: 0,
      emiPending: totalLoanAmount,
      totalPaid: 0,
      tenure: parseInt(requestedData.newLoanDays) || 30,
      tenureType: requestedData.newLoanType.toLowerCase(),
      startDate: new Date(requestedData.renewalDate) || new Date(),
      endDate: (() => {
        const end = new Date(requestedData.renewalDate) || new Date();
        if (requestedData.newLoanType === 'Daily') {
          end.setDate(end.getDate() + (parseInt(requestedData.newLoanDays) || 30));
        } else if (requestedData.newLoanType === 'Weekly') {
          end.setDate(end.getDate() + ((parseInt(requestedData.newLoanDays) || 30) * 7));
        } else if (requestedData.newLoanType === 'Monthly') {
          end.setMonth(end.getMonth() + (parseInt(requestedData.newLoanDays) || 30));
        }
        return end;
      })(),
      interestRate: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Creating renewed loan using native MongoDB...');

    // APPROACH 1: Use MongoDB native driver to bypass Mongoose middleware
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Insert the new loan directly into the collection
    const newLoanResult = await db.collection('loans').insertOne(newLoanData);
    console.log('✅ Renewed loan created with native driver:', newLoanNumber);

    // Update the original loan using native driver as well
    await db.collection('loans').updateOne(
      { _id: new mongoose.Types.ObjectId(originalLoanId) },
      {
        $set: {
          isRenewed: true,
          status: 'renewed',
          renewedLoanNumber: newLoanNumber,
          renewedDate: new Date(),
          updatedAt: new Date()
        }
      }
    );
    console.log('✅ Original loan marked as renewed:', originalLoan.loanNumber);

    // Update the request (this can use Mongoose since Request model might not have the same middleware issue)
    requestDoc.status = 'Approved';
    requestDoc.reviewedBy = processedBy;
    requestDoc.reviewedByRole = 'admin';
    requestDoc.reviewNotes = reason || 'Loan renewal approved by admin';
    requestDoc.actionTaken = `Loan renewed: ${originalLoan.loanNumber} → ${newLoanNumber}`;
    requestDoc.reviewedAt = new Date();
    requestDoc.approvedAt = new Date();
    requestDoc.completedAt = new Date();
    requestDoc.updatedAt = new Date();
    
    await requestDoc.save();

    console.log('✅ Loan renewal completed successfully');

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
          loanId: newLoanResult.insertedId,
          loanNumber: newLoanNumber,
          customerName: customer.name,
          newLoanAmount: parseFloat(requestedData.newLoanAmount),
          newEmiAmount: parseFloat(requestedData.newEmiAmount),
          originalLoanNumber: originalLoan.loanNumber
        }
      }
    });

  } catch (error) {
    console.error('❌ Error in approveLoanRenew:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to approve loan renewal: ' + error.message 
    }, { status: 500 });
  }
}