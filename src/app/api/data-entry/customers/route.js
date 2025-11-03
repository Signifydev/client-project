import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET method for fetching customers list (without ID)
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const loanType = searchParams.get('loanType') || '';
    const customerNumber = searchParams.get('customerNumber') || '';
    const category = searchParams.get('category') || '';
    const officeCategory = searchParams.get('officeCategory') || '';

    console.log('🔍 Fetching customers with filters:', { 
      search, 
      status, 
      loanType, 
      customerNumber, 
      category, 
      officeCategory 
    });

    // Build query - only show active customers for data entry
    let query = { status: 'active' };
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { customerNumber: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
        { phone: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Add loan type filter
    if (loanType) {
      query.loanType = loanType;
    }

    // Add customer number filter
    if (customerNumber) {
      query.customerNumber = { $regex: customerNumber, $options: 'i' };
    }

    // Add category filter
    if (category) {
      query.category = category;
    }

    // Add office category filter
    if (officeCategory) {
      query.officeCategory = officeCategory;
    }

    // Fetch customers with the new fields
    const customers = await Customer.find(query)
      .select('name phone whatsappNumber businessName area customerNumber loanAmount emiAmount loanType status category officeCategory createdAt loanDate loanDays emiType customEmiAmount emiStartDate')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${customers.length} customers for data entry`);

    // Format response with all required fields
    const formattedCustomers = customers.map(customer => ({
      _id: customer._id,
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      whatsappNumber: customer.whatsappNumber,
      businessName: customer.businessName,
      area: customer.area,
      customerNumber: customer.customerNumber,
      loanAmount: customer.loanAmount,
      emiAmount: customer.emiAmount,
      loanType: customer.loanType,
      status: customer.status,
      category: customer.category || 'A',
      officeCategory: customer.officeCategory || 'Office 1',
      loanDate: customer.loanDate,
      loanDays: customer.loanDays,
      emiType: customer.emiType,
      customEmiAmount: customer.customEmiAmount,
      emiStartDate: customer.emiStartDate,
      createdAt: customer.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: formattedCustomers
    });

  } catch (error) {
    console.error('❌ Error fetching customers for data entry:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customers: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// POST method to create a new customer request
// POST method to create a new customer request
export async function POST(request) {
  try {
    await connectDB();
    
    console.log('🟡 Starting customer creation request...');

    // Parse form data
    const formData = await request.formData();
    
    // Extract Step 1: Customer Basic Details
    const name = formData.get('name');
    const businessName = formData.get('businessName');
    const area = formData.get('area');
    const customerNumber = formData.get('customerNumber');
    const address = formData.get('address');
    const category = formData.get('category');
    const officeCategory = formData.get('officeCategory');

    // Extract phone numbers (multiple)
    const phone = [];
    let index = 0;
    while (formData.get(`phone[${index}]`)) {
      const phoneNumber = formData.get(`phone[${index}]`);
      if (phoneNumber && phoneNumber.trim()) {
        phone.push(phoneNumber.trim());
      }
      index++;
    }

    // Extract WhatsApp number (optional)
    const whatsappNumber = formData.get('whatsappNumber') || '';

    // Extract Step 2: Loan Details
    const loanDate = formData.get('loanDate');
    const emiStartDate = formData.get('emiStartDate');
    const loanAmount = formData.get('loanAmount');
    const emiAmount = formData.get('emiAmount');
    const loanDays = formData.get('loanDays');
    const loanType = formData.get('loanType');
    const emiType = formData.get('emiType');
    const customEmiAmount = formData.get('customEmiAmount');

    // Extract Step 3: Login Credentials
    const loginId = formData.get('loginId');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const createdBy = formData.get('createdBy');

    // Extract files
    const profilePicture = formData.get('profilePicture');
    const fiDocumentShop = formData.get('fiDocumentShop');
    const fiDocumentHome = formData.get('fiDocumentHome');

    console.log('📦 Received customer data (Step 1):', {
      name,
      businessName,
      area,
      customerNumber,
      address,
      category,
      officeCategory,
      phone,
      whatsappNumber
    });

    console.log('📦 Received loan data (Step 2):', {
      loanDate,
      emiStartDate,
      loanAmount,
      emiAmount,
      loanDays,
      loanType,
      emiType,
      customEmiAmount
    });

    console.log('📦 Received login data (Step 3):', {
      loginId,
      password: password ? '***' : 'missing',
      confirmPassword: confirmPassword ? '***' : 'missing',
      createdBy
    });

    // Validate Step 1: Customer Basic Details
    if (!name || !businessName || !area || !customerNumber || !address || 
        !category || !officeCategory) {
      return NextResponse.json(
        {
          success: false,
          error: 'All customer basic details are required'
        },
        { status: 400 }
      );
    }

    // Validate phone numbers
    if (phone.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one phone number is required'
        },
        { status: 400 }
      );
    }

    // Validate phone number format
    for (const phoneNumber of phone) {
      if (!/^\d{10}$/.test(phoneNumber)) {
        return NextResponse.json(
          {
            success: false,
            error: 'All phone numbers must be valid 10-digit numbers'
          },
          { status: 400 }
        );
      }
    }

    // Validate WhatsApp number format if provided
    if (whatsappNumber && !/^\d{10}$/.test(whatsappNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: 'WhatsApp number must be a valid 10-digit number'
        },
        { status: 400 }
      );
    }

    // Validate Step 2: Loan Details
    if (!loanDate || !emiStartDate || !loanAmount || !emiAmount || !loanDays || !loanType || !emiType) {
      return NextResponse.json(
        {
          success: false,
          error: 'All loan details are required'
        },
        { status: 400 }
      );
    }

    // Validate custom EMI amount if applicable
    if (emiType === 'custom' && loanType !== 'Daily' && (!customEmiAmount || parseFloat(customEmiAmount) <= 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Custom EMI amount is required for custom EMI type with Weekly/Monthly loans'
        },
        { status: 400 }
      );
    }

    // Validate EMI start date is not before loan date
    if (new Date(emiStartDate) < new Date(loanDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'EMI start date cannot be before loan date'
        },
        { status: 400 }
      );
    }

    // Validate Step 3: Login Credentials
    if (!loginId || !password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'All login credentials are required'
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Passwords do not match'
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password must be at least 6 characters long'
        },
        { status: 400 }
      );
    }

    // Check if customer with same phone number already exists
    const existingCustomerByPhone = await Customer.findOne({
      phone: { $in: phone }
    });

    if (existingCustomerByPhone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer with this phone number already exists',
          field: 'phone'
        },
        { status: 409 }
      );
    }

    // Check if customer with same customer number already exists
    const existingCustomerByCustomerNumber = await Customer.findOne({
      customerNumber: customerNumber
    });

    if (existingCustomerByCustomerNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer number already exists. Please use a unique customer number',
          field: 'customerNumber'
        },
        { status: 409 }
      );
    }

    // Check if customer with same login ID already exists
    const existingCustomerByLoginId = await Customer.findOne({
      loginId: loginId.trim()
    });

    if (existingCustomerByLoginId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Login ID already exists. Please use a unique login ID',
          field: 'loginId'
        },
        { status: 409 }
      );
    }

    // Check if there's already a pending request for this customer
    const existingRequest = await Request.findOne({
      type: 'New Customer',
      $or: [
        { 'step1Data.customerNumber': customerNumber },
        { 'step1Data.phone': { $in: phone } }
      ],
      status: 'Pending'
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: 'A pending request already exists for this customer'
        },
        { status: 409 }
      );
    }

    // Prepare file data for storage
    const prepareFileData = (file, type) => {
      if (!file) return null;
      
      return {
        filename: `${Date.now()}_${file.name}`,
        originalName: file.name,
        uploadedAt: new Date()
      };
    };

    // Create request with step data AND include requestedData for backward compatibility
    const step1Data = {
      name: name.trim(),
      phone: phone,
      whatsappNumber: whatsappNumber.trim(),
      businessName: businessName.trim(),
      area: area.trim(),
      customerNumber: customerNumber.trim(),
      address: address.trim(),
      category,
      officeCategory,
      profilePicture: prepareFileData(profilePicture, 'profile'),
      fiDocuments: {
        shop: prepareFileData(fiDocumentShop, 'fi-shop'),
        home: prepareFileData(fiDocumentHome, 'fi-home')
      }
    };

    const step2Data = {
      loanDate: new Date(loanDate),
      emiStartDate: new Date(emiStartDate),
      loanAmount: parseFloat(loanAmount),
      emiAmount: parseFloat(emiAmount),
      loanDays: parseInt(loanDays),
      loanType,
      emiType,
      customEmiAmount: customEmiAmount ? parseFloat(customEmiAmount) : null
    };

    const step3Data = {
      loginId: loginId.trim(),
      password: password,
      confirmPassword: confirmPassword
    };

    // Create combined requestedData for backward compatibility
    const requestedData = {
      // Customer details
      name: name.trim(),
      phone: phone,
      whatsappNumber: whatsappNumber.trim(),
      businessName: businessName.trim(),
      area: area.trim(),
      customerNumber: customerNumber.trim(),
      address: address.trim(),
      category,
      officeCategory,
      profilePicture: prepareFileData(profilePicture, 'profile'),
      fiDocuments: {
        shop: prepareFileData(fiDocumentShop, 'fi-shop'),
        home: prepareFileData(fiDocumentHome, 'fi-home')
      },
      // Loan details
      loanAmount: parseFloat(loanAmount),
      emiAmount: parseFloat(emiAmount),
      loanType,
      loanDate: new Date(loanDate),
      loanDays: parseInt(loanDays),
      // Login credentials
      loginId: loginId.trim(),
      password: password
    };

    const requestData = {
      type: 'New Customer',
      customerName: name.trim(),
      customerNumber: customerNumber.trim(),
      // New multi-step data
      step1Data: step1Data,
      step2Data: step2Data,
      step3Data: step3Data,
      // Backward compatibility - include requestedData
      requestedData: requestedData,
      description: `New customer registration for ${name} - Customer Number: ${customerNumber}`,
      priority: 'Medium',
      createdBy: createdBy || 'data_entry_operator_1',
      createdByRole: 'data_entry',
      estimatedImpact: 'Medium',
      requiresCustomerNotification: true
    };

    console.log('💾 Creating customer request...');

    // Save request to database
    const newRequest = await Request.create(requestData);

    console.log('✅ Customer request created successfully with ID:', newRequest._id);

    // TODO: Handle file uploads to your storage (S3, local storage, etc.)
    // For now, we'll just log the file information
    if (profilePicture) {
      console.log('📷 Profile picture:', profilePicture.name, profilePicture.type, profilePicture.size);
    }
    if (fiDocumentShop) {
      console.log('📄 Shop FI Document:', fiDocumentShop.name, fiDocumentShop.type, fiDocumentShop.size);
    }
    if (fiDocumentHome) {
      console.log('📄 Home FI Document:', fiDocumentHome.name, fiDocumentHome.type, fiDocumentHome.size);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Customer request submitted successfully! Waiting for admin approval.',
        data: {
          requestId: newRequest._id,
          customerName: name,
          customerNumber: customerNumber,
          status: newRequest.status
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Error creating customer request:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let message = 'Duplicate entry found';
      
      if (field === 'phone') {
        message = 'Customer with this phone number already exists';
      } else if (field === 'customerNumber') {
        message = 'Customer number already exists';
      } else if (field === 'loginId') {
        message = 'Login ID already exists';
      }
      
      return NextResponse.json(
        {
          success: false,
          error: message,
          field
        },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        {
          success: false,
          error: `Validation failed: ${errors.join(', ')}`
        },
        { status: 400 }
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