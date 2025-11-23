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

    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by office category if provided
    if (officeCategory && officeCategory !== 'all') {
      query.officeCategory = officeCategory;
    }

    // Search across multiple fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { customerNumber: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
        { phone: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });
    
    console.log(`✅ Found ${customers.length} customers`);

    return NextResponse.json({
      success: true,
      data: customers
    });

  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customers: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// POST method for creating new customer requests
export async function POST(request) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    
    console.log('📦 Received form data with fields:', Array.from(formData.keys()));

    // Extract all form data with detailed logging
    const name = formData.get('name');
    const phone = formData.getAll('phone[]').filter(p => p && p.trim() !== '');
    const whatsappNumber = formData.get('whatsappNumber') || '';
    const businessName = formData.get('businessName');
    const area = formData.get('area');
    const customerNumber = formData.get('customerNumber');
    const address = formData.get('address');
    const category = formData.get('category');
    const officeCategory = formData.get('officeCategory');

    // DEBUG: Log each extracted value with type and length
    console.log('🔍 EXTRACTED FIELD ANALYSIS:');
    const fieldAnalysis = {
      name: { value: name, type: typeof name, length: name?.length, empty: !name?.trim() },
      phone: { value: phone, type: 'array', length: phone.length, empty: phone.length === 0 },
      whatsappNumber: { value: whatsappNumber, type: typeof whatsappNumber, length: whatsappNumber?.length },
      businessName: { value: businessName, type: typeof businessName, length: businessName?.length, empty: !businessName?.trim() },
      area: { value: area, type: typeof area, length: area?.length, empty: !area?.trim() },
      customerNumber: { value: customerNumber, type: typeof customerNumber, length: customerNumber?.length, empty: !customerNumber?.trim() },
      address: { value: address, type: typeof address, length: address?.length, empty: !address?.trim() },
      category: { value: category, type: typeof category, length: category?.length, empty: !category?.trim() },
      officeCategory: { value: officeCategory, type: typeof officeCategory, length: officeCategory?.length, empty: !officeCategory?.trim() }
    };
    
    console.log('Field analysis:', JSON.stringify(fieldAnalysis, null, 2));

    // Check for empty required fields
    const requiredFields = {
      name: name?.trim(),
      phone: phone.length > 0,
      businessName: businessName?.trim(),
      area: area?.trim(),
      customerNumber: customerNumber?.trim(),
      address: address?.trim(),
      category: category?.trim(),
      officeCategory: officeCategory?.trim()
    };

    console.log('✅ REQUIRED FIELDS VALIDATION:');
    const missingFields = [];
    Object.entries(requiredFields).forEach(([field, value]) => {
      const isValid = !!value;
      console.log(`  ${field}: ${isValid ? '✅' : '❌ MISSING'} (value: "${value}")`);
      if (!isValid) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      console.log('❌ MISSING REQUIRED FIELDS:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: 'All customer details are required',
          missingFields: missingFields,
          fieldAnalysis: fieldAnalysis
        },
        { status: 400 }
      );
    }
    
    // Loan details
    const loanDate = formData.get('loanDate');
    const emiStartDate = formData.get('emiStartDate');
    const loanAmount = formData.get('loanAmount');
    const emiAmount = formData.get('emiAmount');
    const loanDays = formData.get('loanDays');
    const loanType = formData.get('loanType');
    const emiType = formData.get('emiType');
    const customEmiAmount = formData.get('customEmiAmount') || '';

    console.log('🔍 LOAN DATA ANALYSIS:');
    const loanFieldAnalysis = {
      loanDate: { value: loanDate, empty: !loanDate },
      emiStartDate: { value: emiStartDate, empty: !emiStartDate },
      loanAmount: { value: loanAmount, empty: !loanAmount },
      emiAmount: { value: emiAmount, empty: !emiAmount },
      loanDays: { value: loanDays, empty: !loanDays },
      loanType: { value: loanType, empty: !loanType },
      emiType: { value: emiType, empty: !emiType },
      customEmiAmount: { value: customEmiAmount, empty: !customEmiAmount }
    };
    console.log('Loan field analysis:', JSON.stringify(loanFieldAnalysis, null, 2));

    // Login credentials
    const loginId = formData.get('loginId');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const createdBy = formData.get('createdBy') || 'data_entry_operator_1';

    // File uploads
    const profilePicture = formData.get('profilePicture');
    const fiDocumentShop = formData.get('fiDocumentShop');
    const fiDocumentHome = formData.get('fiDocumentHome');

    // Validate required loan fields
    if (!loanDate || !emiStartDate || !loanAmount || !loanDays || !loanType || !emiType) {
      return NextResponse.json(
        { success: false, error: 'All basic loan details are required' },
        { status: 400 }
      );
    }

    // Validate EMI amounts based on loan type and EMI type
    if (loanType === 'Daily') {
      // Daily loans only need emiAmount
      if (!emiAmount) {
        return NextResponse.json(
          { success: false, error: 'EMI Amount is required for Daily loans' },
          { status: 400 }
        );
      }
    } else {
      // Weekly/Monthly loans
      if (emiType === 'fixed') {
        if (!emiAmount) {
          return NextResponse.json(
            { success: false, error: 'EMI Amount is required for Fixed EMI type' },
            { status: 400 }
          );
        }
      } else if (emiType === 'custom') {
        // Custom EMI requires both fixed EMI amount and last EMI amount
        if (!emiAmount || !customEmiAmount) {
          return NextResponse.json(
            { success: false, error: 'Both Fixed EMI Amount and Last EMI Amount are required for Custom EMI type' },
            { status: 400 }
          );
        }
      }
    }

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
      customerNumber: customerNumber
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

    // Check for duplicate login ID
    const existingLoginId = await Customer.findOne({
      loginId: loginId
    });
    
    if (existingLoginId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Login ID already exists',
          field: 'loginId'
        },
        { status: 409 }
      );
    }

    // Check if there's already a pending request for this customer
    const existingRequest = await Request.findOne({
      $or: [
        { 'step1Data.phone': { $in: phone } },
        { 'step1Data.customerNumber': customerNumber },
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

    // Upload profile picture
    if (profilePicture && profilePicture.size > 0) {
      const bytes = await profilePicture.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `profile_${Date.now()}_${profilePicture.name}`;
      profilePicturePath = `/uploads/${fileName}`;
      
      await writeFile(path.join(uploadsDir, fileName), buffer);
      console.log('✅ Profile picture uploaded:', profilePicturePath);
    }

    // Upload FI Shop document
    if (fiDocumentShop && fiDocumentShop.size > 0) {
      const bytes = await fiDocumentShop.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `fi_shop_${Date.now()}_${fiDocumentShop.name}`;
      fiDocumentShopPath = `/uploads/${fileName}`;
      
      await writeFile(path.join(uploadsDir, fileName), buffer);
      console.log('✅ FI Shop document uploaded:', fiDocumentShopPath);
    }

    // Upload FI Home document
    if (fiDocumentHome && fiDocumentHome.size > 0) {
      const bytes = await fiDocumentHome.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `fi_home_${Date.now()}_${fiDocumentHome.name}`;
      fiDocumentHomePath = `/uploads/${fileName}`;
      
      await writeFile(path.join(uploadsDir, fileName), buffer);
      console.log('✅ FI Home document uploaded:', fiDocumentHomePath);
    }

    // Calculate total loan amount based on EMI type
    let totalLoanAmount = 0;
    if (emiType === 'custom' && loanType !== 'Daily') {
      const fixedPeriods = parseInt(loanDays) - 1;
      const fixedAmount = parseFloat(emiAmount) * fixedPeriods;
      const lastAmount = parseFloat(customEmiAmount) || 0;
      totalLoanAmount = fixedAmount + lastAmount;
    } else {
      totalLoanAmount = parseFloat(emiAmount) * parseInt(loanDays);
    }

    // ✅ FIXED: Create request data in MULTI-STEP STRUCTURE
    const requestData = {
      type: 'New Customer',
      customerName: name,
      customerNumber: customerNumber,
      status: 'Pending',
      createdBy: createdBy,
      createdByRole: 'data_entry',
      
      // ✅ STORE DATA IN STEP STRUCTURE (this is what the approval logic expects)
      step1Data: {
        // Customer details
        name,
        phone,
        whatsappNumber: whatsappNumber || '',
        businessName,
        area,
        customerNumber,
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
        // Loan details
        loanDate,
        emiStartDate,
        loanAmount: parseFloat(loanAmount),
        emiAmount: parseFloat(emiAmount),
        loanDays: parseInt(loanDays),
        loanType,
        emiType,
        customEmiAmount: customEmiAmount ? parseFloat(customEmiAmount) : null,
        totalLoanAmount: totalLoanAmount
      },
      
      step3Data: {
        // Login credentials
        loginId,
        password,
        confirmPassword
      },
      
      description: `New customer request for ${name} - ${businessName} (${customerNumber})`,
      priority: category === 'A' ? 'High' : category === 'B' ? 'Medium' : 'Low',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📋 Creating new customer request with multi-step data:', {
      name,
      customerNumber,
      businessName,
      loanAmount,
      emiAmount,
      loanType,
      emiType,
      hasStep1Data: !!requestData.step1Data,
      hasStep2Data: !!requestData.step2Data,
      hasStep3Data: !!requestData.step3Data
    });

    // Create the request
    const newRequest = new Request(requestData);
    await newRequest.save();

    console.log('✅ New customer request created successfully with multi-step data:', newRequest._id);

    return NextResponse.json({
      success: true,
      message: 'Customer request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: newRequest._id,
        customerName: name,
        customerNumber: customerNumber
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
    const action = searchParams.get('action'); // 'approve' or 'reject'

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
      // Update request status to approved
      requestDoc.status = 'Approved';
      requestDoc.reviewedAt = new Date();
      requestDoc.updatedAt = new Date();
      
      await requestDoc.save();
      
      return NextResponse.json({
        success: true,
        message: 'Customer request approved successfully'
      });
    } else if (action === 'reject') {
      // Update request status to rejected
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