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

  // Validate step data
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

  // Create customer WITHOUT loanNumber field
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
    
    // File fields
    profilePicture: {
      filename: null,
      url: null,
      originalName: null,
      uploadedAt: new Date()
    },
    fiDocuments: {
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
    },
    
    // Loan-related fields (but NOT loanNumber)
    loanAmount: parseFloat(loanData.loanAmount),
    emiAmount: parseFloat(loanData.emiAmount),
    loanType: loanData.loanType,
    loanDate: new Date(loanData.loanDate || loanData.dateApplied || new Date()),
    loanDays: parseInt(loanData.loanDays) || 30,
    emiType: loanData.emiType || 'fixed',
    customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
    emiStartDate: new Date(loanData.emiStartDate || loanData.loanDate || new Date()),
    
    // Login credentials
    loginId: loginData.loginId,
    password: hashedPassword,
    
    // Status and metadata
    status: 'active',
    isActive: true,
    createdBy: requestDoc.createdBy,
    approvedBy: processedBy,
    approvedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // REMOVE loanNumber from customer data if it exists
  delete customerDataToSave.loanNumber;

  console.log('💾 Creating customer with data:', {
    name: customerDataToSave.name,
    customerNumber: customerDataToSave.customerNumber,
    phone: customerDataToSave.phone,
    loanAmount: customerDataToSave.loanAmount,
    emiAmount: customerDataToSave.emiAmount
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

  // Create main loan with proper loan number
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

  // Generate unique loan number for this customer
  const existingLoans = await Loan.find({ customerId: customer._id });
  const loanNumber = `L${existingLoans.length + 1}`;

  const loanDataToSave = {
    customerId: customer._id,
    customerName: customer.name,
    customerNumber: customer.customerNumber,
    loanNumber: loanNumber, // This should be unique per customer, not globally
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
  console.log('✅ Main loan created:', loanNumber);

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.customerId = customer._id;
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Customer approved by admin';
  requestDoc.actionTaken = `Customer account created with loan ${loanNumber}`;
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
      loanNumber: loanNumber
    }
  });
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

  // Fix date handling for emiStartDate
  let emiStartDate;
  try {
    emiStartDate = requestedData.emiStartDate ? new Date(requestedData.emiStartDate) : new Date();
    if (isNaN(emiStartDate.getTime())) {
      emiStartDate = new Date();
    }
  } catch (error) {
    emiStartDate = new Date();
  }

  // Fix date handling for loanDate
  let loanDate;
  try {
    loanDate = requestedData.loanDate ? new Date(requestedData.loanDate) : new Date();
    if (isNaN(loanDate.getTime())) {
      loanDate = new Date();
    }
  } catch (error) {
    loanDate = new Date();
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
    loanNumber: nextLoanNumber,
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
    totalLoanAmount: totalLoanAmount // Store calculated total
  };

  const newLoan = new Loan(loanData);
  await newLoan.save();
  console.log('✅ Additional loan created with enhanced details');

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan addition approved by admin';
  requestDoc.actionTaken = `Additional loan created: ${nextLoanNumber} with ${requestedData.loanType} EMI`;
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
  console.log('🔄 Processing Loan Renew request...');
  
  const requestedData = requestDoc.requestedData || requestDoc;
  
  if (!requestedData.newLoanAmount || !requestedData.newEmiAmount || !requestedData.newLoanType) {
    return NextResponse.json({ 
      success: false,
      error: 'Missing required renewal data' 
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

  // Fix date handling for emiStartDate
  let emiStartDate;
  try {
    emiStartDate = requestedData.emiStartDate ? new Date(requestedData.emiStartDate) : new Date();
    if (isNaN(emiStartDate.getTime())) {
      emiStartDate = new Date();
    }
  } catch (error) {
    emiStartDate = new Date();
  }

  const loanData = {
    customerId: customer._id,
    customerName: customer.name,
    customerNumber: customer.customerNumber,
    loanNumber: nextLoanNumber,
    amount: Number(requestedData.newLoanAmount),
    emiAmount: Number(requestedData.newEmiAmount),
    loanType: requestedData.newLoanType,
    dateApplied: new Date(requestedData.renewalDate) || new Date(),
    loanDays: Number(requestedData.newLoanDays) || 30,
    emiType: requestedData.emiType || 'fixed',
    customEmiAmount: requestedData.customEmiAmount || null,
    emiStartDate: emiStartDate,
    totalEmiCount: Number(requestedData.newLoanDays) || 30,
    emiPaidCount: 0,
    lastEmiDate: null,
    nextEmiDate: calculateNextEmiDate(emiStartDate, requestedData.newLoanType),
    totalPaidAmount: 0,
    remainingAmount: Number(requestedData.newLoanAmount),
    status: 'active',
    createdBy: requestDoc.createdBy,
    isRenewal: true,
    originalLoanId: requestedData.loanId,
    renewalRemarks: requestedData.remarks
  };

  const newLoan = new Loan(loanData);
  await newLoan.save();
  console.log('✅ Renewed loan created');

  // Update request
  requestDoc.status = 'Approved';
  requestDoc.reviewedBy = processedBy;
  requestDoc.reviewedByRole = 'admin';
  requestDoc.reviewNotes = reason || 'Loan renewal approved by admin';
  requestDoc.actionTaken = `Loan renewed: ${nextLoanNumber}`;
  requestDoc.reviewedAt = new Date();
  requestDoc.approvedAt = new Date();
  requestDoc.completedAt = new Date();
  requestDoc.updatedAt = new Date();
  
  await requestDoc.save();
  console.log('✅ Loan renewal approved');

  return NextResponse.json({ 
    success: true,
    message: 'Loan renewed successfully!',
    data: {
      loanId: newLoan._id,
      loanNumber: newLoan.loanNumber,
      customerName: customer.name
    }
  });
}