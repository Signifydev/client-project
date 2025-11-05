import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectDB();
    const { requestId, action, reason, processedBy = 'admin' } = await request.json();

    console.log('🟡 Processing request:', { requestId, action, processedBy });

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
      customerNumber: requestDoc.customerNumber,
      status: requestDoc.status,
      hasStepData: !!(requestDoc.step1Data || requestDoc.step2Data || requestDoc.step3Data),
      hasRequestedData: !!requestDoc.requestedData
    });

    // Debug: Log the actual step data structure
    console.log('📋 Step 1 Data:', requestDoc.step1Data);
    console.log('📋 Step 2 Data:', requestDoc.step2Data);
    console.log('📋 Step 3 Data:', requestDoc.step3Data);
    console.log('📋 Requested Data:', requestDoc.requestedData);

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
  } catch (error) {
    console.error('❌ Error in approve-request:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

async function handleApproval(requestDoc, reason, processedBy) {
  try {
    switch (requestDoc.type) {
      case 'New Customer':
        return await approveNewCustomer(requestDoc, reason, processedBy);
      case 'Loan Addition':
        return await approveLoanAddition(requestDoc, reason, processedBy);
      case 'Customer Edit':
        return await approveCustomerEdit(requestDoc, reason, processedBy);
      case 'Loan Edit':
        return await approveLoanEdit(requestDoc, reason, processedBy);
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
  
  // Clean up pending data for new customer requests
  if (requestDoc.type === 'New Customer' && requestDoc.step1Data?.customerNumber) {
    try {
      await Customer.deleteMany({ 
        customerNumber: requestDoc.step1Data.customerNumber,
        status: 'pending' 
      });
      console.log('✅ Deleted pending customers');
    } catch (deleteError) {
      console.error('❌ Error deleting pending customer data:', deleteError);
    }
  }
  
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

async function approveNewCustomer(requestDoc, reason, processedBy) {
  console.log('📝 Creating new customer from multi-step request data...');
  
  // Use step data if available, otherwise fall back to requestedData
  const step1Data = requestDoc.step1Data || requestDoc.requestedData;
  const step2Data = requestDoc.step2Data || requestDoc.requestedData;
  const step3Data = requestDoc.step3Data || requestDoc.requestedData;

  console.log('🔍 Using data:', {
    step1Data: !!step1Data,
    step2Data: !!step2Data,
    step3Data: !!step3Data,
    hasStep1Data: !!requestDoc.step1Data,
    hasStep2Data: !!requestDoc.step2Data,
    hasStep3Data: !!requestDoc.step3Data,
    hasRequestedData: !!requestDoc.requestedData
  });

  // Validate step data - be more flexible in validation
  if (!step1Data && !requestDoc.requestedData) {
    return NextResponse.json({ 
      success: false,
      error: 'Missing required customer data'
    }, { status: 400 });
  }

  // Extract data from step1Data or requestedData
  const customerData = step1Data || requestDoc.requestedData;
  const loanData = step2Data || requestDoc.requestedData;
  const loginData = step3Data || requestDoc.requestedData;

  // Validate required fields with fallbacks
  if (!customerData.name || !customerData.customerNumber || !customerData.phone) {
    return NextResponse.json({ 
      success: false,
      error: 'Missing required customer fields: name, customerNumber, or phone'
    }, { status: 400 });
  }

  if (!loanData.loanAmount || !loanData.emiAmount || !loanData.loanType) {
    return NextResponse.json({ 
      success: false,
      error: 'Missing required loan fields: loanAmount, emiAmount, or loanType'
    }, { status: 400 });
  }

  if (!loginData.loginId || !loginData.password) {
    return NextResponse.json({ 
      success: false,
      error: 'Missing required login fields: loginId or password'
    }, { status: 400 });
  }

  // Check for existing customer
  const existingCustomer = await Customer.findOne({
    $or: [
      { phone: { $in: customerData.phone } },
      { customerNumber: customerData.customerNumber },
      { loginId: loginData.loginId }
    ],
    status: { $in: ['active', 'pending'] }
  });

  if (existingCustomer) {
    return NextResponse.json({ 
      success: false,
      error: 'Customer with this phone number, customer number, or login ID already exists'
    }, { status: 409 });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(loginData.password, 12);

  // Create customer with proper data extraction and file handling
  const customerDataToSave = {
    name: customerData.name,
    phone: Array.isArray(customerData.phone) ? customerData.phone : [customerData.phone],
    whatsappNumber: customerData.whatsappNumber || '',
    businessName: customerData.businessName,
    area: customerData.area,
    customerNumber: customerData.customerNumber,
    address: customerData.address,
    category: customerData.category || 'A',
    officeCategory: customerData.officeCategory || 'Office 1',
    
    // FIXED: Handle null values for file upload fields
    profilePicture: customerData.profilePicture && customerData.profilePicture !== null 
      ? customerData.profilePicture 
      : {},
    fiDocuments: {
      shop: (customerData.fiDocuments?.shop && customerData.fiDocuments.shop !== null) 
        ? customerData.fiDocuments.shop 
        : {},
      home: (customerData.fiDocuments?.home && customerData.fiDocuments.home !== null) 
        ? customerData.fiDocuments.home 
        : {}
    },
    
    loanAmount: parseFloat(loanData.loanAmount),
    emiAmount: parseFloat(loanData.emiAmount),
    loanType: loanData.loanType,
    loanDate: new Date(loanData.loanDate || loanData.dateApplied || new Date()),
    loanDays: parseInt(loanData.loanDays) || 30,
    emiType: loanData.emiType || 'fixed',
    customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
    emiStartDate: new Date(loanData.emiStartDate || loanData.loanDate || new Date()),
    loginId: loginData.loginId,
    password: hashedPassword,
    status: 'active',
    isActive: true,
    createdBy: requestDoc.createdBy,
    approvedBy: processedBy,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('💾 Creating customer with data:', {
    name: customerDataToSave.name,
    customerNumber: customerDataToSave.customerNumber,
    phone: customerDataToSave.phone,
    loanAmount: customerDataToSave.loanAmount,
    emiAmount: customerDataToSave.emiAmount,
    profilePicture: customerDataToSave.profilePicture,
    fiDocuments: customerDataToSave.fiDocuments
  });

  const customer = new Customer(customerDataToSave);
  await customer.save();
  console.log('✅ New customer created:', customer._id);

  // Create user account
  try {
    const user = new User({
      customerId: customer._id,
      loginId: loginData.loginId,
      password: hashedPassword,
      role: 'customer',
      email: loginData.loginId + '@customer.com',
      status: 'active',
      createdBy: requestDoc.createdBy
    });
    await user.save();
    console.log('✅ User created for customer');
  } catch (error) {
    console.error('❌ Error creating user:', error);
    // Continue even if user creation fails
  }

  // Create main loan
  const calculateNextEmiDate = (emiStartDate, loanType) => {
    const date = new Date(emiStartDate);
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

  const loanDataToSave = {
    customerId: customer._id,
    customerName: customer.name,
    customerNumber: customer.customerNumber,
    loanNumber: 'L1',
    amount: parseFloat(loanData.loanAmount),
    emiAmount: parseFloat(loanData.emiAmount),
    loanType: loanData.loanType,
    dateApplied: new Date(loanData.loanDate || loanData.dateApplied || new Date()),
    loanDays: parseInt(loanData.loanDays) || 30,
    emiType: loanData.emiType || 'fixed',
    customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
    emiStartDate: new Date(loanData.emiStartDate || loanData.loanDate || new Date()),
    totalEmiCount: parseInt(loanData.loanDays) || 30,
    emiPaidCount: 0,
    lastEmiDate: null,
    nextEmiDate: calculateNextEmiDate(loanData.emiStartDate || loanData.loanDate || new Date(), loanData.loanType),
    totalPaidAmount: 0,
    remainingAmount: parseFloat(loanData.loanAmount),
    status: 'active',
    createdBy: requestDoc.createdBy
  };

  const mainLoan = new Loan(loanDataToSave);
  await mainLoan.save();
  console.log('✅ Main loan created');

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.customerId = customer._id;
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Customer approved by admin';
  requestDoc.actionTaken = 'Customer account created with loan L1';
  requestDoc.reviewedAt = new Date();
  requestDoc.approvedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Request approved');

  return NextResponse.json({ 
    success: true,
    message: 'Customer approved and activated successfully!',
    data: {
      customerId: customer._id,
      customerName: customer.name,
      customerNumber: customer.customerNumber,
      loanNumber: 'L1'
    }
  });
}

async function approveLoanAddition(requestDoc, reason, processedBy) {
  console.log('📝 Approving loan addition request...');
  
  const requestedData = requestDoc.requestedData;
  
  if (!requestedData.amount || !requestedData.emiAmount || !requestedData.loanType) {
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

  const existingLoans = await Loan.find({ customerId: customer._id });
  const nextLoanNumber = `L${existingLoans.length + 1}`;

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

  const loanData = {
    customerId: customer._id,
    customerName: customer.name,
    customerNumber: customer.customerNumber,
    loanNumber: nextLoanNumber,
    amount: Number(requestedData.amount),
    emiAmount: Number(requestedData.emiAmount),
    loanType: requestedData.loanType,
    dateApplied: new Date(requestedData.dateApplied) || new Date(),
    loanDays: Number(requestedData.loanDays) || 30,
    emiType: requestedData.emiType || 'fixed',
    customEmiAmount: requestedData.customEmiAmount || null,
    emiStartDate: new Date(requestedData.emiStartDate) || new Date(),
    totalEmiCount: Number(requestedData.loanDays) || 30,
    emiPaidCount: 0,
    lastEmiDate: null,
    nextEmiDate: calculateNextEmiDate(requestedData.emiStartDate, requestedData.loanType),
    totalPaidAmount: 0,
    remainingAmount: Number(requestedData.amount),
    status: 'active',
    createdBy: requestDoc.createdBy
  };

  const newLoan = new Loan(loanData);
  await newLoan.save();
  console.log('✅ Additional loan created');

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan addition approved by admin';
  requestDoc.actionTaken = `Additional loan created: ${nextLoanNumber}`;
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
      customerName: customer.name
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
    'customerNumber', 'category', 'officeCategory', 'loginId',
    'loanAmount', 'emiAmount', 'loanType', 'loanDate', 'loanDays', 
    'emiType', 'customEmiAmount', 'emiStartDate'
  ];

  let updatedFields = [];
  updatableFields.forEach(field => {
    if (changes[field] !== undefined && changes[field] !== null) {
      customer[field] = changes[field];
      updatedFields.push(field);
    }
  });

  // Handle file upload fields separately to ensure they are objects
  if (changes.profilePicture !== undefined) {
    customer.profilePicture = changes.profilePicture && typeof changes.profilePicture === 'object' 
      ? changes.profilePicture 
      : {};
    updatedFields.push('profilePicture');
  }

  if (changes.fiDocuments !== undefined) {
    customer.fiDocuments = changes.fiDocuments && typeof changes.fiDocuments === 'object'
      ? changes.fiDocuments
      : { shop: {}, home: {} };
    updatedFields.push('fiDocuments');
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