import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

// ==============================================
// SIMPLE DATE UTILITY FUNCTIONS - STRING BASED
// ==============================================

/**
 * Validate date string is in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid YYYY-MM-DD format
 */
function isValidYYYYMMDD(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Basic validation
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // More accurate validation
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * Format date string to DD/MM/YYYY for display
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Date string in DD/MM/YYYY format
 */
function formatToDDMMYYYY(dateString) {
  if (!dateString) return '';
  
  try {
    // If it's a Date object (backward compatibility), convert to string
    if (dateString instanceof Date) {
      const year = dateString.getFullYear();
      const month = String(dateString.getMonth() + 1).padStart(2, '0');
      const day = String(dateString.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    
    // If it's a string in YYYY-MM-DD format
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`; // Direct string manipulation
    }
    
    // Try to parse other formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    
    return '';
  } catch (error) {
    console.error('❌ Error formatting date to DD/MM/YYYY:', error);
    return '';
  }
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==============================================
// MAIN API ROUTE
// ==============================================

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
        
        // Format dates for display
        if (customer.createdAt) {
          customer.createdAtDisplay = formatToDDMMYYYY(customer.createdAt);
        }
        if (customer.updatedAt) {
          customer.updatedAtDisplay = formatToDDMMYYYY(customer.updatedAt);
        }
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

// POST method for creating new customer requests - UPDATED FOR STRING DATES
export async function POST(request) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    
    console.log('📦 Received form data with fields:', Array.from(formData.keys()));
    
    // Extract all form data
    const name = formData.get('name');
    const loanSelectionType = formData.get('loanSelectionType') || 'single';
    console.log('📊 Loan selection type:', loanSelectionType);
    
    // Handle phone numbers
    let phone = [];
    const phoneArray = formData.getAll('phone[]');
    if (phoneArray.length > 0) {
      phone = phoneArray.filter(p => p && p.trim() !== '');
    } else {
      let index = 0;
      while (true) {
        const phoneNumber = formData.get(`phone[${index}]`);
        if (!phoneNumber) break;
        if (phoneNumber && phoneNumber.trim() !== '') {
          phone.push(phoneNumber);
        }
        index++;
      }
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
      return NextResponse.json(
        { 
          success: false, 
          error: 'All customer details are required',
          missingFields
        },
        { status: 400 }
      );
    }
    
    // Loan details - get as strings
    const loanDateInput = formData.get('loanDate');
    let emiStartDateInput = formData.get('emiStartDate');
    const amount = formData.get('amount');
    const loanAmount = formData.get('loanAmount');
    const emiAmount = formData.get('emiAmount');
    const loanDays = formData.get('loanDays');
    const loanType = formData.get('loanType');
    const emiType = formData.get('emiType');
    const customEmiAmount = formData.get('customEmiAmount') || '';
    const loanNumber = formData.get('loanNumber');

    // CRITICAL FIX: Date validation for Single Loan - validate as strings
    if (loanSelectionType === 'single') {
      console.log('🔍 Validating loan details for Single Loan selection');
      
      // Validate loan details
      if (!loanDateInput || !emiStartDateInput || !amount || !loanDays || !loanType || !emiType) {
        return NextResponse.json(
          { success: false, error: 'All basic loan details are required for Single Loan' },
          { status: 400 }
        );
      }
      
      // Validate date formats as strings
      if (!isValidYYYYMMDD(loanDateInput)) {
        return NextResponse.json(
          { success: false, error: 'Invalid loan date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
      
      if (!isValidYYYYMMDD(emiStartDateInput)) {
        return NextResponse.json(
          { success: false, error: 'Invalid EMI start date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
      
      // Validate amount (principal) is positive
      const principalAmount = parseFloat(amount);
      if (isNaN(principalAmount) || principalAmount <= 0) {
        return NextResponse.json(
          { success: false, error: 'Amount (principal) must be a positive number greater than 0' },
          { status: 400 }
        );
      }

      // Validate EMI amounts
      const emiAmountValue = parseFloat(emiAmount);
      if (loanType === 'Daily') {
        if (isNaN(emiAmountValue) || emiAmountValue <= 0) {
          return NextResponse.json(
            { success: false, error: 'EMI Amount is required and must be positive for Daily loans' },
            { status: 400 }
          );
        }
      } else {
        if (emiType === 'fixed') {
          if (isNaN(emiAmountValue) || emiAmountValue <= 0) {
            return NextResponse.json(
              { success: false, error: 'EMI Amount is required and must be positive for Fixed EMI type' },
              { status: 400 }
            );
          }
        } else if (emiType === 'custom') {
          const customEmiAmountValue = parseFloat(customEmiAmount);
          if (isNaN(emiAmountValue) || emiAmountValue <= 0 || 
              isNaN(customEmiAmountValue) || customEmiAmountValue <= 0) {
            return NextResponse.json(
              { success: false, error: 'Both Fixed EMI Amount and Last EMI Amount are required and must be positive for Custom EMI type' },
              { status: 400 }
            );
          }
        }
      }

      if (loanNumber && !loanNumber.toUpperCase().startsWith('L')) {
        return NextResponse.json(
          { success: false, error: 'Loan number must start with "L" prefix' },
          { status: 400 }
        );
      }
      
      // Ensure emiStartDate is not before loanDate (string comparison)
      if (emiStartDateInput < loanDateInput) {
        console.log('⚠️ EMI start date is before loan date, adjusting to loan date');
        emiStartDateInput = loanDateInput;
      }
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
    let existingPhoneCustomer = null;
    for (const phoneNumber of phone.filter(p => p && p.trim() !== '')) {
      existingPhoneCustomer = await Customer.findOne({
        phone: phoneNumber
      });
      if (existingPhoneCustomer) break;
    }

    if (existingPhoneCustomer) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Customer with phone number ${existingPhoneCustomer.phone} already exists`,
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
        { 
          'step1Data.phone': { 
            $elemMatch: { 
              $in: phone.filter(p => p && p.trim() !== '') 
            } 
          } 
        },
        { 
          'step1Data.customerNumber': { 
            $regex: new RegExp(`^${normalizedCustomerNumber}$`, 'i') 
          } 
        },
        { 'step3Data.loginId': loginId }
      ],
      status: 'Pending',
      type: 'New Customer'
    });

    if (existingRequest) {
      let errorDetails = '';
      if (existingRequest.step1Data?.customerNumber?.toUpperCase() === normalizedCustomerNumber.toUpperCase()) {
        errorDetails = `Customer number "${normalizedCustomerNumber}" is already in a pending request`;
      } else if (existingRequest.step3Data?.loginId === loginId) {
        errorDetails = `Login ID "${loginId}" is already in use in a pending request`;
      } else {
        const matchingPhones = phone.filter(p => 
          p && existingRequest.step1Data?.phone?.includes(p)
        );
        if (matchingPhones.length > 0) {
          errorDetails = `Phone number "${matchingPhones[0]}" is already in a pending request`;
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'A pending request already exists for this customer',
          details: errorDetails,
          requestId: existingRequest._id,
          field: 'request'
        },
        { status: 409 }
      );
    }

    // Cloudinary file handling
    const profilePictureUrl = formData.get('profilePictureUrl') || '';
    const shopDocumentUrl = formData.get('shopDocumentUrl') || '';
    const homeDocumentUrl = formData.get('homeDocumentUrl') || '';

    // Calculate total loan amount - ONLY for Single Loan
    let totalLoanAmount = 0;
    
    if (loanSelectionType === 'single') {
      // ✅ FIXED: No need to parse dates, we're storing them as strings
      console.log('📅 DEBUG - String dates for Single Loan:', {
        loanDate: loanDateInput,
        emiStartDate: emiStartDateInput,
        loanDateDisplay: formatToDDMMYYYY(loanDateInput),
        emiStartDateDisplay: formatToDDMMYYYY(emiStartDateInput)
      });
      
      // Calculate total loan amount based on EMI type
      const emiAmountValue = parseFloat(emiAmount);
      const loanDaysValue = parseInt(loanDays);
      
      if (emiType === 'custom' && loanType !== 'Daily') {
        const fixedPeriods = loanDaysValue - 1;
        const fixedAmount = emiAmountValue * fixedPeriods;
        const lastAmount = parseFloat(customEmiAmount) || 0;
        totalLoanAmount = fixedAmount + lastAmount;
      } else {
        totalLoanAmount = emiAmountValue * loanDaysValue;
      }
      
      console.log('💰 Loan amount calculation:', {
        emiType,
        loanType,
        emiAmount: emiAmountValue,
        loanDays: loanDaysValue,
        customEmiAmount,
        totalLoanAmount
      });
    }

    // ✅ FIXED: Create request data with STRING DATES (YYYY-MM-DD)
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
        profilePicture: profilePictureUrl ? {
          filename: profilePictureUrl.split('/').pop(),
          url: profilePictureUrl,
          originalName: profilePictureUrl.split('/').pop(),
          uploadedAt: new Date(),
          source: 'cloudinary'
        } : {
          filename: null,
          url: null,
          originalName: null,
          uploadedAt: new Date(),
          source: null
        },
        fiDocuments: {
          shop: shopDocumentUrl ? {
            filename: shopDocumentUrl.split('/').pop(),
            url: shopDocumentUrl,
            originalName: shopDocumentUrl.split('/').pop(),
            uploadedAt: new Date(),
            source: 'cloudinary'
          } : {
            filename: null,
            url: null,
            originalName: null,
            uploadedAt: new Date(),
            source: null
          },
          home: homeDocumentUrl ? {
            filename: homeDocumentUrl.split('/').pop(),
            url: homeDocumentUrl,
            originalName: homeDocumentUrl.split('/').pop(),
            uploadedAt: new Date(),
            source: 'cloudinary'
          } : {
            filename: null,
            url: null,
            originalName: null,
            uploadedAt: new Date(),
            source: null
          }
        },
        email: '',
        businessType: ''
      },
      
      // ✅ FIXED: Store dates as STRINGS (YYYY-MM-DD) - matching Request schema
      step2Data: {
        loanSelectionType: loanSelectionType,
        // Store dates as strings (from form data)
        loanDate: loanSelectionType === 'single' ? loanDateInput : null,
        emiStartDate: loanSelectionType === 'single' ? emiStartDateInput : null, 
        amount: loanSelectionType === 'single' ? parseFloat(amount) : 0, // Principal Amount
        loanAmount: loanSelectionType === 'single' ? parseFloat(loanAmount) : 0, // Total Amount
        emiAmount: loanSelectionType === 'single' ? parseFloat(emiAmount) : 0,
        loanDays: loanSelectionType === 'single' ? parseInt(loanDays) : 0,
        loanType: loanSelectionType === 'single' ? loanType : '',
        emiType: loanSelectionType === 'single' ? emiType : 'fixed',
        customEmiAmount: loanSelectionType === 'single' && customEmiAmount ? parseFloat(customEmiAmount) : null,
        totalLoanAmount: totalLoanAmount,
        // Include loan number only for Single Loan
        loanNumber: loanSelectionType === 'single' ? loanNumber || '' : '',
        // Store display dates (formatted from strings)
        loanDateDisplay: loanSelectionType === 'single' ? formatToDDMMYYYY(loanDateInput) : '',
        emiStartDateDisplay: loanSelectionType === 'single' ? formatToDDMMYYYY(emiStartDateInput) : '',
        // Store input dates as strings for reference
        loanDateInput: loanSelectionType === 'single' ? loanDateInput : '',
        emiStartDateInput: loanSelectionType === 'single' ? emiStartDateInput : ''
      },
      
      step3Data: {
        loginId,
        password,
        confirmPassword
      },
      
      description: `New customer request for ${name} - ${businessName} (${customerNumber})`,
      priority: category === 'A' ? 'High' : category === 'B' ? 'Medium' : 'Low',
      createdAt: new Date(),
      updatedAt: new Date(),
      dateHandling: {
        timezone: 'IST',
        dateFormat: 'YYYY-MM-DD',
        displayFormat: 'DD/MM/YYYY',
        createdAtDisplay: formatToDDMMYYYY(new Date()),
        fileStorage: 'cloudinary',
        note: 'Dates stored as YYYY-MM-DD strings (no timezone)'
      }
    };

    console.log('📋 Creating new customer request with STRING dates:', {
      name,
      customerNumber: normalizedCustomerNumber,
      businessName,
      loanSelectionType,
      loanDate: loanDateInput,  // String
      emiStartDate: emiStartDateInput,  // String
      loanDateDisplay: requestData.step2Data.loanDateDisplay,
      emiStartDateDisplay: requestData.step2Data.emiStartDateDisplay,
      principalAmount: requestData.step2Data.amount,
      totalLoanAmount: requestData.step2Data.loanAmount,
      fileStorage: 'Cloudinary'
    });

    // Create the request
    const newRequest = new Request(requestData);
    await newRequest.save();

    console.log('✅ New customer request created successfully with string dates');

    return NextResponse.json({
      success: true,
      message: 'Customer request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: newRequest._id,
        customerName: name,
        customerNumber: normalizedCustomerNumber,
        loanSelectionType: loanSelectionType,
        loanDateDisplay: requestData.step2Data.loanDateDisplay,
        emiStartDateDisplay: requestData.step2Data.emiStartDateDisplay,
        principalAmount: requestData.step2Data.amount,
        totalLoanAmount: requestData.step2Data.loanAmount,
        fileStorage: 'Cloudinary',
        dateFormat: 'YYYY-MM-DD (string)'
      }
    });

  } catch (error) {
    console.error('❌ Error creating customer request:', error);
    
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