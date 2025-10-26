import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import Request from '@/lib/models/Request';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

// POST method to create a new customer request
export async function POST(request) {
  try {
    await connectDB();
    
    console.log('🟡 Starting customer creation request...');

    // Parse form data
    const formData = await request.formData();
    
    // Extract all fields from form data
    const name = formData.get('name');
    const businessName = formData.get('businessName');
    const area = formData.get('area');
    const loanNumber = formData.get('loanNumber');
    const address = formData.get('address');
    const category = formData.get('category');
    const officeCategory = formData.get('officeCategory');
    const loanDate = formData.get('loanDate');
    const loanAmount = formData.get('loanAmount');
    const emiAmount = formData.get('emiAmount');
    const loanDays = formData.get('loanDays');
    const loanType = formData.get('loanType');
    const loginId = formData.get('loginId');
    const password = formData.get('password');
    const createdBy = formData.get('createdBy');

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

    // Extract files
    const profilePicture = formData.get('profilePicture');
    const fiDocumentShop = formData.get('fiDocumentShop');
    const fiDocumentHome = formData.get('fiDocumentHome');

    console.log('📦 Received customer data:', {
      name,
      businessName,
      area,
      loanNumber,
      address,
      category,
      officeCategory,
      phone,
      whatsappNumber,
      loanDate,
      loanAmount,
      emiAmount,
      loanDays,
      loanType,
      loginId,
      createdBy
    });

    // Validate required fields
    if (!name || !businessName || !area || !loanNumber || !address || 
        !category || !officeCategory || !loanDate || !loanAmount || 
        !emiAmount || !loanDays || !loanType || !loginId || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'All required fields must be filled'
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

    // Check if customer with same phone number already exists (including pending)
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

    // Check if customer with same loan number already exists (including pending)
    const existingCustomerByLoanNumber = await Customer.findOne({
      loanNumber
    });

    if (existingCustomerByLoanNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Loan number already exists. Please use a unique loan number',
          field: 'loanNumber'
        },
        { status: 409 }
      );
    }

    // Check if there's already a pending request for this customer
    const existingRequest = await Request.findOne({
      type: 'New Customer',
      'requestedData.loanNumber': loanNumber,
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

    // DO NOT CREATE CUSTOMER RECORD - Only create request for admin approval
    console.log('📋 Creating request only - no customer record will be created until admin approval');

    // Create request record for admin approval
    const newRequest = new Request({
      type: 'New Customer',
      customerName: name.trim(),
      loanNumber: loanNumber.trim(),
      // Store all the customer data for admin review
      requestedData: {
        name: name.trim(),
        phone: phone,
        whatsappNumber: whatsappNumber.trim(),
        businessName: businessName.trim(),
        area: area.trim(),
        loanNumber: loanNumber.trim(),
        address: address.trim(),
        category: category,
        officeCategory: officeCategory,
        loanAmount: parseFloat(loanAmount),
        emiAmount: parseFloat(emiAmount),
        loanType: loanType,
        loanDate: new Date(loanDate),
        loanDays: parseInt(loanDays),
        loginId: loginId.trim(),
        password: password, // In production, this should be hashed
        // File uploads info
        profilePicture: profilePicture ? `/uploads/profile/${profilePicture.name}` : null,
        fiDocuments: {
          shop: fiDocumentShop ? `/uploads/documents/shop/${fiDocumentShop.name}` : null,
          home: fiDocumentHome ? `/uploads/documents/home/${fiDocumentHome.name}` : null
        }
      },
      description: `New customer registration request for ${name} with loan number ${loanNumber}`,
      priority: 'High',
      status: 'Pending',
      createdBy: createdBy || 'data_entry_operator_1',
      createdByRole: 'data_entry',
      requiresCustomerNotification: true,
      estimatedImpact: 'High'
    });

    await newRequest.save();
    console.log('✅ Request created for admin approval with ID:', newRequest._id);

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
          name: name,
          loanNumber: loanNumber,
          status: 'pending_approval'
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Error creating customer request:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'phone' 
        ? 'Customer with this phone number already exists'
        : 'Loan number already exists';
      
      return NextResponse.json(
        {
          success: false,
          error: message,
          field
        },
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

// GET method for fetching customers list - ONLY ACTIVE CUSTOMERS
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const loanType = searchParams.get('loanType') || '';
    const loanNumber = searchParams.get('loanNumber') || '';

    console.log('🔍 Fetching customers with filters:', { search, status, loanType, loanNumber });

    // Build query - only show active customers for data entry
    let query = { status: 'active' }; // Data entry can only see active customers
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { loanNumber: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } }
      ];
    }

    // Add loan type filter
    if (loanType) {
      query.loanType = loanType;
    }

    // Add loan number filter
    if (loanNumber) {
      query.loanNumber = { $regex: loanNumber, $options: 'i' };
    }

    // Fetch customers with the new fields
    const customers = await Customer.find(query)
      .select('name phone businessName area loanNumber loanAmount emiAmount loanType status category officeCategory createdAt')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${customers.length} active customers for data entry`);

    // Format response with all required fields
    const formattedCustomers = customers.map(customer => ({
      _id: customer._id,
      id: customer._id, // Add id for compatibility with frontend
      name: customer.name,
      phone: customer.phone,
      businessName: customer.businessName,
      area: customer.area,
      loanNumber: customer.loanNumber,
      loanAmount: customer.loanAmount,
      emiAmount: customer.emiAmount,
      loanType: customer.loanType,
      status: customer.status,
      category: customer.category || 'A', // Include category with fallback
      officeCategory: customer.officeCategory || 'Office 1', // Include officeCategory with fallback
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