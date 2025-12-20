import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET method for fetching all customers
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const officeCategory = searchParams.get('officeCategory');

    console.log('🔍 Fetching customers with filters:', { search, status, officeCategory });

    let query = {};

    // FIXED: Better handling of officeCategory filter
    if (officeCategory && officeCategory.trim() !== '' && officeCategory !== 'all') {
      query.officeCategory = officeCategory;
      console.log('✅ Applying officeCategory filter:', officeCategory);
    } else {
      console.log('ℹ️ No officeCategory filter applied');
    }

    // FIXED: Handle status filter properly
    if (status && status !== 'all') {
      query.status = status;
      console.log('✅ Applying status filter:', status);
    } else {
      // Default to active customers only
      query.status = { $in: ['active', 'pending'] };
    }

    // FIXED: Improved search functionality
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { customerNumber: searchRegex },
        { businessName: searchRegex },
        { area: searchRegex },
        { phone: { $in: [searchRegex] } }
      ];
      console.log('✅ Applying search filter:', search);
    }

    console.log('📋 Final query:', JSON.stringify(query, null, 2));

    // FIXED: Add proper error handling for database query
    let customers;
    try {
      customers = await Customer.find(query)
        .sort({ createdAt: -1 })
        .select('-password -loginId') // Exclude sensitive fields
        .lean(); // Convert to plain objects
      
      console.log(`✅ Found ${customers.length} customers`);
      
      // Enhance customers with loan summary
      for (const customer of customers) {
        const loans = await Loan.find({ customerId: customer._id, status: 'active' });
        customer.totalLoans = loans.length;
        customer.totalLoanAmount = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
        customer.activeLoan = loans.find(loan => loan.status === 'active');
      }
      
    } catch (dbError) {
      console.error('❌ Database query error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    return NextResponse.json({
      success: true,
      count: customers.length,
      data: customers
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customers',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// POST method for creating new customer requests
export async function POST(request) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    
    console.log('📦 Received form data with fields:', Array.from(formData.keys()));

    // Extract all form data
    const name = formData.get('name');
    
    // FIXED: Moved these lines from global scope to here
    const loanSelectionType = formData.get('loanSelectionType') || 'single';
    console.log('📊 Loan selection type:', loanSelectionType);
    
    // Handle phone numbers
    let phone = [];
    const phoneArray = formData.getAll('phone[]');
    if (phoneArray.length > 0) {
      phone = phoneArray.filter(p => p && p.trim() !== '');
      console.log('📞 Using phone[] format:', phone);
    } else {
      // Fallback to indexed format
      let index = 0;
      while (true) {
        const phoneNumber = formData.get(`phone[${index}]`);
        if (!phoneNumber) break;
        if (phoneNumber && phoneNumber.trim() !== '') {
          phone.push(phoneNumber);
        }
        index++;
      }
      console.log('📞 Extracted phone numbers:', phone);
    }
    
    const whatsappNumber = formData.get('whatsappNumber') || '';
    const businessName = formData.get('businessName');
    const area = formData.get('area');
    const customerNumber = formData.get('customerNumber');
    const address = formData.get('address');
    const category = formData.get('category');
    const officeCategory = formData.get('officeCategory');

    // Normalize customer number
    let normalizedCustomerNumber = customerNumber;
    if (normalizedCustomerNumber && !normalizedCustomerNumber.toUpperCase().startsWith('CN')) {
      normalizedCustomerNumber = `CN${normalizedCustomerNumber.replace(/^CN/gi, '')}`;
    }
    normalizedCustomerNumber = normalizedCustomerNumber.toUpperCase();

    console.log('🔍 Field analysis:', {
      name: !!name?.trim(),
      phone: phone.length,
      businessName: !!businessName?.trim(),
      area: !!area?.trim(),
      customerNumber: normalizedCustomerNumber,
      address: !!address?.trim(),
      category,
      officeCategory
    });

    // Validate required fields
    const missingFields = [];
    if (!name?.trim()) missingFields.push('name');
    if (phone.length === 0) missingFields.push('phone');
    if (!businessName?.trim()) missingFields.push('businessName');
    if (!area?.trim()) missingFields.push('area');
    if (!normalizedCustomerNumber?.trim()) missingFields.push('customerNumber');
    if (!address?.trim()) missingFields.push('address');
    if (!category?.trim()) missingFields.push('category');
    if (!officeCategory?.trim()) missingFields.push('officeCategory');

    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: 'All customer details are required',
          missingFields
        },
        { status: 400 }
      );
    }
    
    // Loan details - CRITICAL: Only validate for Single Loan
    const loanDate = formData.get('loanDate');
    const emiStartDate = formData.get('emiStartDate');
    const amount = formData.get('amount');
    const loanAmount = formData.get('loanAmount');
    const emiAmount = formData.get('emiAmount');
    const loanDays = formData.get('loanDays');
    const loanType = formData.get('loanType');
    const emiType = formData.get('emiType');
    const customEmiAmount = formData.get('customEmiAmount') || '';

    // CRITICAL FIX: Only validate loan details for Single Loan selection
    if (loanSelectionType === 'single') {
  console.log('🔍 Validating loan details for Single Loan selection');
  
  // Validate loan details
  if (!loanDate || !emiStartDate || !amount || !loanDays || !loanType || !emiType) { // ← Added amount validation
    return NextResponse.json(
      { success: false, error: 'All basic loan details are required for Single Loan' },
      { status: 400 }
    );
  }
  
  // Validate amount (principal) is positive
  if (parseFloat(amount) <= 0) {
    return NextResponse.json(
      { success: false, error: 'Amount (principal) must be greater than 0' },
      { status: 400 }
    );
  }

      // Validate EMI amounts
      if (loanType === 'Daily') {
        if (!emiAmount) {
          return NextResponse.json(
            { success: false, error: 'EMI Amount is required for Daily loans' },
            { status: 400 }
          );
        }
      } else {
        if (emiType === 'fixed') {
          if (!emiAmount) {
            return NextResponse.json(
              { success: false, error: 'EMI Amount is required for Fixed EMI type' },
              { status: 400 }
            );
          }
        } else if (emiType === 'custom') {
          if (!emiAmount || !customEmiAmount) {
            return NextResponse.json(
              { success: false, error: 'Both Fixed EMI Amount and Last EMI Amount are required for Custom EMI type' },
              { status: 400 }
            );
          }
        }
      }

      const loanNumber = formData.get('loanNumber');
      if (loanNumber && !loanNumber.toUpperCase().startsWith('L')) {
        return NextResponse.json(
          { success: false, error: 'Loan number must start with "L" prefix' },
          { status: 400 }
        );
      }
    } else {
      // For Multiple Loans, set default/empty values but don't validate
      console.log('ℹ️ Multiple Loan selection - skipping loan validation');
    }

    // Login credentials
    const loginId = formData.get('loginId');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const createdBy = formData.get('createdBy') || 'data_entry_operator_1';

    if (!loginId || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Login credentials are required' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate phone numbers
    for (const phoneNumber of phone) {
      if (!/^\d{10}$/.test(phoneNumber)) {
        return NextResponse.json(
          { success: false, error: 'All phone numbers must be valid 10-digit numbers' },
          { status: 400 }
        );
      }
    }

    // Validate WhatsApp number if provided
    if (whatsappNumber && !/^\d{10}$/.test(whatsappNumber)) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp number must be a valid 10-digit number' },
        { status: 400 }
      );
    }

    // Check for duplicate phone numbers
    const existingPhoneCustomer = await Customer.findOne({
      phone: { $in: phone }
    });
    
    if (existingPhoneCustomer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Customer with this phone number already exists',
          field: 'phone'
        },
        { status: 409 }
      );
    }

    // Check for duplicate customer number
    const existingCustomerNumber = await Customer.findOne({
      customerNumber: { $regex: new RegExp(`^${normalizedCustomerNumber}$`, 'i') }
    });

    if (existingCustomerNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Customer number already exists',
          field: 'customerNumber'
        },
        { status: 409 }
      );
    }

    // Check for existing pending request
    const existingRequest = await Request.findOne({
      $or: [
        { 'step1Data.phone': { $in: phone } },
        { 'step1Data.customerNumber': { $regex: new RegExp(`^${normalizedCustomerNumber}$`, 'i') } },
        { 'step3Data.loginId': loginId }
      ],
      status: 'Pending',
      type: 'New Customer'
    });

    if (existingRequest) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A pending request already exists for this customer',
          field: 'request'
        },
        { status: 409 }
      );
    }

    // Handle file uploads
    let profilePicturePath = '';
    let fiDocumentShopPath = '';
    let fiDocumentHomePath = '';

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.log('Uploads directory already exists or cannot be created');
    }

    // Upload profile picture - ONLY IF A VALID FILE WAS SENT
    const profilePicture = formData.get('profilePicture');
    if (profilePicture && profilePicture !== 'null' && profilePicture.size > 0) {
      const bytes = await profilePicture.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `profile_${Date.now()}_${profilePicture.name}`;
      profilePicturePath = `/uploads/${fileName}`;
      
      await writeFile(path.join(uploadsDir, fileName), buffer);
      console.log('✅ Profile picture uploaded:', profilePicturePath);
    } else {
      console.log('ℹ️ No profile picture provided');
    }

    // Upload FI Shop document - ONLY IF A VALID FILE WAS SENT
    const fiDocumentShop = formData.get('fiDocumentShop');
    if (fiDocumentShop && fiDocumentShop !== 'null' && fiDocumentShop.size > 0) {
      const bytes = await fiDocumentShop.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `fi_shop_${Date.now()}_${fiDocumentShop.name}`;
      fiDocumentShopPath = `/uploads/${fileName}`;
      
      await writeFile(path.join(uploadsDir, fileName), buffer);
      console.log('✅ FI Shop document uploaded:', fiDocumentShopPath);
    } else {
      console.log('ℹ️ No FI Shop document provided');
    }

    // Upload FI Home document - ONLY IF A VALID FILE WAS SENT
    const fiDocumentHome = formData.get('fiDocumentHome');
    if (fiDocumentHome && fiDocumentHome !== 'null' && fiDocumentHome.size > 0) {
      const bytes = await fiDocumentHome.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `fi_home_${Date.now()}_${fiDocumentHome.name}`;
      fiDocumentHomePath = `/uploads/${fileName}`;
      
      await writeFile(path.join(uploadsDir, fileName), buffer);
      console.log('✅ FI Home document uploaded:', fiDocumentHomePath);
    } else {
      console.log('ℹ️ No FI Home document provided');
    }

    // Calculate total loan amount - ONLY for Single Loan
    let totalLoanAmount = 0;
    if (loanSelectionType === 'single') {
      if (emiType === 'custom' && loanType !== 'Daily') {
        const fixedPeriods = parseInt(loanDays) - 1;
        const fixedAmount = parseFloat(emiAmount) * fixedPeriods;
        const lastAmount = parseFloat(customEmiAmount) || 0;
        totalLoanAmount = fixedAmount + lastAmount;
      } else {
        totalLoanAmount = parseFloat(emiAmount) * parseInt(loanDays);
      }
    }

    // Create request data
    const requestData = {
      type: 'New Customer',
      customerName: name,
      customerNumber: normalizedCustomerNumber,
      status: 'Pending',
      createdBy: createdBy,
      createdByRole: 'data_entry',
      
      step1Data: {
        name,
        phone,
        whatsappNumber: whatsappNumber || '',
        businessName,
        area,
        customerNumber: normalizedCustomerNumber,
        address,
        category,
        officeCategory,
        profilePicture: profilePicturePath ? {
          filename: path.basename(profilePicturePath),
          url: profilePicturePath,
          originalName: profilePicture.name || path.basename(profilePicturePath),
          uploadedAt: new Date()
        } : {
          filename: null,
          url: null,
          originalName: null,
          uploadedAt: new Date()
        },
        fiDocuments: {
          shop: fiDocumentShopPath ? {
            filename: path.basename(fiDocumentShopPath),
            url: fiDocumentShopPath,
            originalName: fiDocumentShop.name || path.basename(fiDocumentShopPath),
            uploadedAt: new Date()
          } : {
            filename: null,
            url: null,
            originalName: null,
            uploadedAt: new Date()
          },
          home: fiDocumentHomePath ? {
            filename: path.basename(fiDocumentHomePath),
            url: fiDocumentHomePath,
            originalName: fiDocumentHome.name || path.basename(fiDocumentHomePath),
            uploadedAt: new Date()
          } : {
            filename: null,
            url: null,
            originalName: null,
            uploadedAt: new Date()
          }
        },
        email: '',
        businessType: ''
      },
      
      step2Data: {
  loanSelectionType: loanSelectionType,
  // CRITICAL FIX: For Single Loan use actual values; for Multiple Loan use defaults
  loanDate: loanSelectionType === 'single' ? loanDate : '',
  emiStartDate: loanSelectionType === 'single' ? emiStartDate : '',
  amount: loanSelectionType === 'single' ? parseFloat(amount) : 0, // ← ADD THIS LINE (Principal)
  loanAmount: loanSelectionType === 'single' ? parseFloat(loanAmount) : 0, // Total Amount
  emiAmount: loanSelectionType === 'single' ? parseFloat(emiAmount) : 0,
  loanDays: loanSelectionType === 'single' ? parseInt(loanDays) : 0,
  loanType: loanSelectionType === 'single' ? loanType : '',
  emiType: loanSelectionType === 'single' ? emiType : 'fixed',
  customEmiAmount: loanSelectionType === 'single' && customEmiAmount ? parseFloat(customEmiAmount) : null,
  totalLoanAmount: totalLoanAmount,
  // Include loan number only for Single Loan
  loanNumber: loanSelectionType === 'single' ? formData.get('loanNumber') || '' : ''
},
      
      step3Data: {
        loginId,
        password,
        confirmPassword
      },
      
      description: `New customer request for ${name} - ${businessName} (${customerNumber})`,
      priority: category === 'A' ? 'High' : category === 'B' ? 'Medium' : 'Low',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📋 Creating new customer request:', {
      name,
      customerNumber,
      businessName,
      loanSelectionType,
      loanAmount: requestData.step2Data.loanAmount,
      emiAmount: requestData.step2Data.emiAmount
    });

    // Create the request
    const newRequest = new Request(requestData);
    await newRequest.save();

    console.log('✅ New customer request created successfully:', newRequest._id);

    return NextResponse.json({
      success: true,
      message: 'Customer request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: newRequest._id,
        customerName: name,
        customerNumber: normalizedCustomerNumber,
        loanSelectionType: loanSelectionType
      }
    });

  } catch (error) {
    console.error('❌ Error creating customer request:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let errorMessage = 'Duplicate entry found';
      
      if (field === 'phone') {
        errorMessage = 'Customer with this phone number already exists';
      } else if (field === 'customerNumber') {
        errorMessage = 'Customer number already exists';
      } else if (field === 'loginId') {
        errorMessage = 'Login ID already exists';
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage, field },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create customer request: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// PUT method for updating customer requests
export async function PUT(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const action = searchParams.get('action');

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    const requestDoc = await Request.findById(requestId);
    if (!requestDoc) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      requestDoc.status = 'Approved';
      requestDoc.reviewedAt = new Date();
      requestDoc.updatedAt = new Date();
      
      await requestDoc.save();
      
      return NextResponse.json({
        success: true,
        message: 'Customer request approved successfully'
      });
    } else if (action === 'reject') {
      requestDoc.status = 'Rejected';
      requestDoc.reviewedAt = new Date();
      requestDoc.updatedAt = new Date();
      
      await requestDoc.save();
      
      return NextResponse.json({
        success: true,
        message: 'Customer request rejected successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "approve" or "reject".' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Error updating customer request:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update customer request: ' + error.message 
      },
      { status: 500 }
    );
  }
}