import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Request from '@/lib/models/Request';
import User from '@/lib/models/User';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET method to fetch all active customers
export async function GET() {
  try {
    await connectDB();
    // Get all active customers for data entry operators
    const customers = await Customer.find({ status: 'active' }).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST method to add new customer with step-by-step data and file uploads
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

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json({ 
        success: false,
        error: 'Please enter a valid 10-digit phone number',
        field: 'phone'
      }, { status: 400 });
    }

    // Check for duplicate phone number
    const existingPhone = await Customer.findOne({
      phone: phone,
      status: { $in: ['active', 'pending'] }
    });
    
    if (existingPhone) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer with this phone number already exists',
        field: 'phone'
      }, { status: 409 });
    }
    
    // Check for duplicate loan number
    const existingLoan = await Customer.findOne({
      loanNumber: loanNumber,
      status: { $in: ['active', 'pending'] }
    });
    
    if (existingLoan) {
      return NextResponse.json({ 
        success: false,
        error: 'Loan number already exists. Please use a unique loan number',
        field: 'loanNumber'
      }, { status: 409 });
    }

    // Check if loginId already exists
    const existingUser = await User.findOne({ loginId });
    if (existingUser) {
      return NextResponse.json({ 
        success: false,
        error: 'Login ID already exists. Please choose a different one.',
        field: 'loginId'
      }, { status: 409 });
    }

    // File upload handling
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

    // Create customer with pending status
    const customerData = {
      name,
      phone,
      businessName,
      area,
      loanNumber,
      address,
      loanAmount: parseFloat(loanAmount),
      emiAmount: parseFloat(emiAmount),
      loanType,
      profilePicture: filePaths.profilePicture,
      fiDocuments: filePaths.fiDocuments,
      status: 'pending',
      isActive: true,
      createdBy: createdBy || 'data_entry_operator'
    };

    const customer = new Customer(customerData);
    await customer.save();

    // Create user account for customer login
    if (loginId && password) {
  try {
    // Hash the password before saving
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = {
      customerId: customer._id,
      loginId,
      password: hashedPassword,
      role: 'customer',
      email: loginId + '@customer.com', // Add a unique email
      status: 'active',
      createdBy: createdBy || 'data_entry_operator'
    };

    const user = new User(userData);
    await user.save();
    console.log('✅ User created successfully for customer');
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    console.log('🟡 Customer created but user account failed - continuing...');
  }
} else {
  console.log('🟡 User creation skipped - no loginId or password provided');
}

    // Create main loan record
    const loanData = {
      customerId: customer._id,
      customerName: name,
      loanNumber: loanNumber,
      loanAmount: parseFloat(loanAmount) || 0,
      emiAmount: parseFloat(emiAmount) || 0,
      loanType: loanType || 'Monthly',
      dateApplied: new Date(loanDate) || new Date(),
      loanDays: parseInt(loanDays) || 30,
      status: 'active',
      createdBy: createdBy || 'data_entry_operator'
    };

    // Add validation to ensure numeric fields are valid
    if (isNaN(loanData.loanAmount) || loanData.loanAmount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Valid loan amount is required'
      }, { status: 400 });
    }

    if (isNaN(loanData.emiAmount) || loanData.emiAmount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Valid EMI amount is required'
      }, { status: 400 });
    }

    const loan = new Loan(loanData);
    await loan.save();

    // DEBUG: Check what enum values are allowed in Request model
    console.log('🔍 DEBUG - Request model enum values:');
    console.log('Type enum:', Request.schema.path('type')?.enumValues);
    console.log('Priority enum:', Request.schema.path('priority')?.enumValues);
    console.log('Status enum:', Request.schema.path('status')?.enumValues);

    // Create approval request for super admin - Try most common enum values
    const approvalRequest = new Request({
  type: 'New Customer',  // Exact match from enum
  customerName: customer.name,
  customerId: customer._id,
  customerPhone: customer.phone,
  loanNumber: customer.loanNumber,
  loanAmount: customer.loanAmount,
  emiAmount: customer.emiAmount,
  loanType: customer.loanType,
  businessName: customer.businessName,
  area: customer.area,
  address: customer.address,
  requestedData: {
    name: customer.name,
    phone: customer.phone,
    businessName: customer.businessName,
    area: customer.area,
    loanNumber: customer.loanNumber,
    loanAmount: customer.loanAmount,
    emiAmount: customer.emiAmount,
    loanType: customer.loanType,
    address: customer.address,
    loginId: loginId,
    hasPassword: !!password
  },
  status: 'Pending',      // Exact match from enum (capital P)
  priority: 'Medium',     // Exact match from enum (capital M)
  createdBy: createdBy || 'data_entry_operator',
  description: `New customer registration for ${customer.name} - Loan: ${customer.loanNumber}`,
  createdAt: new Date(),
  updatedAt: new Date()
});

    await approvalRequest.save();
    console.log('✅ Request created successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Customer added successfully! Waiting for admin approval.',
      data: {
        customerId: customer._id,
        name: customer.name,
        phone: customer.phone,
        loanNumber: customer.loanNumber,
        loginId: loginId || 'Not generated'
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