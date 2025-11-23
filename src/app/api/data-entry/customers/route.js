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

    // Extract all form data
    const name = formData.get('name');
    const phone = formData.getAll('phone[]').filter(p => p.trim() !== '');
    const whatsappNumber = formData.get('whatsappNumber') || '';
    const businessName = formData.get('businessName');
    const area = formData.get('area');
    const customerNumber = formData.get('customerNumber');
    const address = formData.get('address');
    const category = formData.get('category');
    const officeCategory = formData.get('officeCategory');
    
    // Loan details
    const loanDate = formData.get('loanDate');
    const emiStartDate = formData.get('emiStartDate');
    const loanAmount = formData.get('loanAmount');
    const emiAmount = formData.get('emiAmount');
    const loanDays = formData.get('loanDays');
    const loanType = formData.get('loanType');
    const emiType = formData.get('emiType');
    const customEmiAmount = formData.get('customEmiAmount') || '';
    
    // Login credentials
    const loginId = formData.get('loginId');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const createdBy = formData.get('createdBy') || 'data_entry_operator_1';

    // File uploads
    const profilePicture = formData.get('profilePicture');
    const fiDocumentShop = formData.get('fiDocumentShop');
    const fiDocumentHome = formData.get('fiDocumentHome');

    // Validate required fields
    if (!name || !phone || phone.length === 0 || !businessName || !area || !customerNumber || !address || !category || !officeCategory) {
      return NextResponse.json(
        { success: false, error: 'All customer details are required' },
        { status: 400 }
      );
    }

    if (!loanDate || !emiStartDate || !loanAmount || !emiAmount || !loanDays || !loanType || !emiType) {
      return NextResponse.json(
        { success: false, error: 'All loan details are required' },
        { status: 400 }
      );
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
        { 'data.phone': { $in: phone } },
        { 'data.customerNumber': customerNumber },
        { 'data.loginId': loginId }
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

    // Create request data
    const requestData = {
      type: 'New Customer',
      customerName: name,
      customerNumber: customerNumber,
      status: 'Pending',
      createdBy: createdBy,
      createdByRole: 'data_entry',
      data: {
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
        profilePicture: profilePicturePath,
        fiDocuments: {
          shop: fiDocumentShopPath,
          home: fiDocumentHomePath
        },
        
        // Loan details
        loanDate,
        emiStartDate,
        loanAmount: parseFloat(loanAmount),
        emiAmount: parseFloat(emiAmount),
        loanDays: parseInt(loanDays),
        loanType,
        emiType,
        customEmiAmount: customEmiAmount ? parseFloat(customEmiAmount) : null,
        totalLoanAmount: totalLoanAmount,
        
        // Login credentials
        loginId,
        password,
        
        // Metadata
        createdBy,
        createdAt: new Date()
      },
      description: `New customer request for ${name} - ${businessName} (${customerNumber})`,
      priority: category === 'A' ? 'High' : category === 'B' ? 'Medium' : 'Low'
    };

    console.log('📋 Creating new customer request:', {
      name,
      customerNumber,
      businessName,
      loanAmount,
      emiAmount,
      loanType,
      emiType
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