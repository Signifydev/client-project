import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import { connectDB } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET method to fetch all active customers
export async function GET() {
  try {
    await connectDB();
    // Get all active customers for data entry operators
    const customers = await Customer.find({ status: 'active' })
      .select('name phone businessName area loanNumber loanAmount emiAmount loanType status category officeCategory createdAt')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST method to create a new customer REQUEST (not actual customer)
export async function POST(request) {
  try {
    await connectDB();
    
    // Handle form data for file uploads
    const formData = await request.formData();
    
    console.log('Received form data fields:', Array.from(formData.keys()));

    // Extract all form data
    const name = formData.get('name');
    const phone = formData.get('phone');
    const businessName = formData.get('businessName');
    const area = formData.get('area');
    const loanNumber = formData.get('loanNumber');
    const address = formData.get('address');
    const category = formData.get('category') || 'A'; // New field
    const officeCategory = formData.get('officeCategory') || 'Office 1'; // New field
    const loanDate = formData.get('loanDate');
    const loanAmount = formData.get('loanAmount');
    const emiAmount = formData.get('emiAmount');
    const loanDays = formData.get('loanDays');
    const loanType = formData.get('loanType');
    const loginId = formData.get('loginId');
    const password = formData.get('password');
    const createdBy = formData.get('createdBy');

    // Get files
    const profilePicture = formData.get('profilePicture');
    const fiDocumentShop = formData.get('fiDocumentShop');
    const fiDocumentHome = formData.get('fiDocumentHome');

    // Validate required fields
    if (!name || !phone || !businessName || !area || !loanNumber || !address) {
      return NextResponse.json({ 
        success: false,
        error: 'All required fields must be filled'
      }, { status: 400 });
    }

    // Validate category and office category
    if (!category || !officeCategory) {
      return NextResponse.json({ 
        success: false,
        error: 'Category and Office Category are required'
      }, { status: 400 });
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ 
        success: false,
        error: 'Please enter a valid 10-digit phone number',
        field: 'phone'
      }, { status: 400 });
    }

    // Check for duplicate phone number in ACTIVE customers
    const existingActivePhone = await Customer.findOne({
      phone: phone,
      status: 'active'
    });
    
    if (existingActivePhone) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer with this phone number already exists',
        field: 'phone'
      }, { status: 409 });
    }
    
    // Check for duplicate loan number in ACTIVE customers
    const existingActiveLoan = await Customer.findOne({
      loanNumber: loanNumber,
      status: 'active'
    });
    
    if (existingActiveLoan) {
      return NextResponse.json({ 
        success: false,
        error: 'Loan number already exists. Please use a unique loan number',
        field: 'loanNumber'
      }, { status: 409 });
    }

    // Check for pending requests with same phone or loan number
    const existingPendingRequest = await Request.findOne({
      $or: [
        { 'requestedData.phone': phone },
        { 'requestedData.loanNumber': loanNumber }
      ],
      status: 'Pending'
    });

    if (existingPendingRequest) {
      return NextResponse.json({ 
        success: false,
        error: 'A pending request already exists for this phone number or loan number'
      }, { status: 409 });
    }

    // File upload handling - store file paths in the request
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const filePaths = {
      profilePicture: null,
      fiDocuments: {
        shop: null,
        home: null
      }
    };

    // Create uploads directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.log('Upload directory already exists or cannot be created');
    }

    // Upload profile picture if provided
    if (profilePicture && profilePicture.size > 0) {
      try {
        const profilePictureBytes = await profilePicture.arrayBuffer();
        const profilePictureBuffer = Buffer.from(profilePictureBytes);
        const profilePictureExt = path.extname(profilePicture.name) || '.jpg';
        const profilePictureFilename = `profile_${Date.now()}${profilePictureExt}`;
        const profilePicturePath = path.join(uploadDir, profilePictureFilename);
        
        await writeFile(profilePicturePath, profilePictureBuffer);
        filePaths.profilePicture = `/uploads/${profilePictureFilename}`;
      } catch (error) {
        console.error('Error uploading profile picture:', error);
      }
    }

    // Upload FI Document - Shop if provided
    if (fiDocumentShop && fiDocumentShop.size > 0) {
      try {
        const fiDocumentShopBytes = await fiDocumentShop.arrayBuffer();
        const fiDocumentShopBuffer = Buffer.from(fiDocumentShopBytes);
        const fiDocumentShopExt = path.extname(fiDocumentShop.name) || '.pdf';
        const fiDocumentShopFilename = `fi_shop_${Date.now()}${fiDocumentShopExt}`;
        const fiDocumentShopPath = path.join(uploadDir, fiDocumentShopFilename);
        
        await writeFile(fiDocumentShopPath, fiDocumentShopBuffer);
        filePaths.fiDocuments.shop = `/uploads/${fiDocumentShopFilename}`;
      } catch (error) {
        console.error('Error uploading FI document - shop:', error);
      }
    }

    // Upload FI Document - Home if provided
    if (fiDocumentHome && fiDocumentHome.size > 0) {
      try {
        const fiDocumentHomeBytes = await fiDocumentHome.arrayBuffer();
        const fiDocumentHomeBuffer = Buffer.from(fiDocumentHomeBytes);
        const fiDocumentHomeExt = path.extname(fiDocumentHome.name) || '.pdf';
        const fiDocumentHomeFilename = `fi_home_${Date.now()}${fiDocumentHomeExt}`;
        const fiDocumentHomePath = path.join(uploadDir, fiDocumentHomeFilename);
        
        await writeFile(fiDocumentHomePath, fiDocumentHomeBuffer);
        filePaths.fiDocuments.home = `/uploads/${fiDocumentHomeFilename}`;
      } catch (error) {
        console.error('Error uploading FI document - home:', error);
      }
    }

    // Prepare customer data for the request
    const customerData = {
      name,
      phone,
      businessName,
      area,
      loanNumber,
      address,
      category, // Added category
      officeCategory, // Added office category
      loanAmount: parseFloat(loanAmount),
      emiAmount: parseFloat(emiAmount),
      loanType,
      loanDate: loanDate || new Date().toISOString().split('T')[0],
      loanDays: parseInt(loanDays) || 30,
      profilePicture: filePaths.profilePicture,
      fiDocuments: filePaths.fiDocuments,
      loginId: loginId,
      hasPassword: !!password,
      password: password // Store temporarily for user creation upon approval
    };

    // Validate numeric fields
    if (isNaN(customerData.loanAmount) || customerData.loanAmount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Valid loan amount is required'
      }, { status: 400 });
    }

    if (isNaN(customerData.emiAmount) || customerData.emiAmount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Valid EMI amount is required'
      }, { status: 400 });
    }

    // Create approval request for super admin
    const approvalRequest = new Request({
      type: 'New Customer',
      customerName: customerData.name,
      customerPhone: customerData.phone,
      loanNumber: customerData.loanNumber,
      loanAmount: customerData.loanAmount,
      emiAmount: customerData.emiAmount,
      loanType: customerData.loanType,
      businessName: customerData.businessName,
      area: customerData.area,
      address: customerData.address,
      category: customerData.category, // Added category
      officeCategory: customerData.officeCategory, // Added office category
      requestedData: customerData,
      status: 'Pending',
      priority: 'Medium',
      createdBy: createdBy || 'data_entry_operator',
      createdByRole: 'data_entry',
      description: `New customer registration for ${customerData.name} - Loan: ${customerData.loanNumber} (Category: ${category}, Office: ${officeCategory})`,
      requiresCustomerNotification: false,
      estimatedImpact: 'Medium'
    });

    await approvalRequest.save();
    console.log('✅ Request created successfully:', approvalRequest._id);
    
    return NextResponse.json({ 
      success: true,
      message: 'Customer request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: approvalRequest._id,
        customerName: customerData.name,
        phone: customerData.phone,
        loanNumber: customerData.loanNumber,
        category: customerData.category,
        officeCategory: customerData.officeCategory
      }
    });
    
  } catch (error) {
    console.error('Error in API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}