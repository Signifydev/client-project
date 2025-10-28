import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    console.log('📨 Received edit request:', body);

    const {
      customerId,
      name,
      phone,
      businessName,
      area,
      loanNumber,
      loanAmount,
      emiAmount,
      loanType,
      address,
      requestedBy,
      description = '',
      priority = 'Medium'
    } = body;

    // Validate required fields
    if (!customerId || !name || !phone || !area || !loanNumber || !requestedBy) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Customer ID, name, phone, area, loan number, and requested by are required fields' 
        },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Please enter a valid 10-digit phone number',
          field: 'phone'
        },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (loanAmount && (isNaN(loanAmount) || parseFloat(loanAmount) <= 0)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Loan amount must be a valid positive number',
          field: 'loanAmount'
        },
        { status: 400 }
      );
    }

    if (emiAmount && (isNaN(emiAmount) || parseFloat(emiAmount) <= 0)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMI amount must be a valid positive number',
          field: 'emiAmount'
        },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await Customer.findById(customerId);
    if (!existingCustomer) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Customer not found' 
        },
        { status: 404 }
      );
    }

    console.log('✅ Existing customer found:', existingCustomer.name);

    // Check for duplicate phone number (if phone is being changed)
    if (phone !== existingCustomer.phone) {
      const customerWithSamePhone = await Customer.findOne({
        phone: phone,
        _id: { $ne: customerId }, // Exclude current customer
        status: { $in: ['active', 'pending'] }
      });
      
      if (customerWithSamePhone) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Another customer with this phone number already exists',
            field: 'phone'
          },
          { status: 409 }
        );
      }
    }

    // Check for duplicate loan number (if loan number is being changed)
    if (loanNumber !== existingCustomer.loanNumber) {
      const customerWithSameLoanNumber = await Customer.findOne({
        loanNumber: loanNumber,
        _id: { $ne: customerId }, // Exclude current customer
        status: { $in: ['active', 'pending'] }
      });
      
      if (customerWithSameLoanNumber) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Another customer with this loan number already exists',
            field: 'loanNumber'
          },
          { status: 409 }
        );
      }
    }

    // Prepare current and requested data
    const currentData = {
      name: existingCustomer.name,
      phone: existingCustomer.phone,
      businessName: existingCustomer.businessName,
      area: existingCustomer.area,
      loanNumber: existingCustomer.loanNumber,
      loanAmount: existingCustomer.loanAmount,
      emiAmount: existingCustomer.emiAmount,
      loanType: existingCustomer.loanType,
      address: existingCustomer.address,
      email: existingCustomer.email,
      businessType: existingCustomer.businessType
    };

    const requestedData = {
      name,
      phone,
      businessName: businessName || existingCustomer.businessName,
      area,
      loanNumber,
      loanAmount: loanAmount ? parseFloat(loanAmount) : existingCustomer.loanAmount,
      emiAmount: emiAmount ? parseFloat(emiAmount) : existingCustomer.emiAmount,
      loanType: loanType || existingCustomer.loanType,
      address: address || existingCustomer.address,
      email: existingCustomer.email, // Keep existing if not provided
      businessType: existingCustomer.businessType // Keep existing if not provided
    };

    // Auto-generate description if not provided
    const autoDescription = description || generateEditDescription(currentData, requestedData);

    // Determine priority based on changes
    const calculatedPriority = calculatePriority(currentData, requestedData, priority);

    // Create edit request using the enhanced Request model
    const editRequest = new Request({
  type: 'EDIT', // Use 'EDIT' instead of 'Customer Edit'
  customerId: existingCustomer._id,
  customerName: existingCustomer.name,
  changes: requestedData, // Send changes in 'changes' field for consistency
  originalData: currentData, // Include original data for reference
  description: autoDescription,
  priority: calculatedPriority,
  status: 'Pending',
  createdBy: requestedBy,
  createdByRole: 'data_entry',
  estimatedImpact: calculateImpact(currentData, requestedData),
  requiresCustomerNotification: checkIfNotificationRequired(currentData, requestedData)
});

    await editRequest.save();

    console.log('✅ Edit request saved successfully with ID:', editRequest._id);

    // Populate the request for response
    const populatedRequest = await Request.findById(editRequest._id)
      .populate('customerId', 'name phone businessName area loanNumber');

    return NextResponse.json({
      success: true,
      message: 'Edit request submitted successfully. Waiting for admin approval.',
      data: populatedRequest,
      changes: identifyChanges(currentData, requestedData)
    });

  } catch (error) {
    console.error('❌ Error creating edit request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit edit request: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to generate automatic description
function generateEditDescription(currentData, requestedData) {
  const changes = identifyChanges(currentData, requestedData);
  
  if (changes.length === 0) {
    return 'No significant changes detected';
  }
  
  const mainChanges = changes.slice(0, 3); // Show only top 3 changes
  const changeText = mainChanges.map(change => 
    `${change.field} from "${change.oldValue}" to "${change.newValue}"`
  ).join(', ');
  
  return `Update: ${changeText}${changes.length > 3 ? ` and ${changes.length - 3} more changes` : ''}`;
}

// Helper function to identify changes between current and requested data
function identifyChanges(currentData, requestedData) {
  const changes = [];
  
  for (const key in requestedData) {
    if (currentData[key] !== requestedData[key]) {
      changes.push({
        field: key,
        oldValue: currentData[key],
        newValue: requestedData[key],
        isSignificant: isSignificantChange(key, currentData[key], requestedData[key])
      });
    }
  }
  
  return changes.sort((a, b) => b.isSignificant - a.isSignificant);
}

// Helper function to determine if a change is significant
function isSignificantChange(field, oldValue, newValue) {
  const significantFields = ['name', 'phone', 'loanNumber', 'loanAmount', 'emiAmount'];
  
  if (significantFields.includes(field)) {
    return true;
  }
  
  // Consider numeric changes significant if they change by more than 10%
  if (typeof oldValue === 'number' && typeof newValue === 'number') {
    const percentageChange = Math.abs((newValue - oldValue) / oldValue) * 100;
    return percentageChange > 10;
  }
  
  return false;
}

// Helper function to calculate priority based on changes
function calculatePriority(currentData, requestedData, userPriority) {
  if (userPriority && userPriority !== 'Medium') {
    return userPriority;
  }
  
  const changes = identifyChanges(currentData, requestedData);
  const significantChanges = changes.filter(change => change.isSignificant);
  
  if (significantChanges.length >= 3) {
    return 'High';
  } else if (significantChanges.length >= 1) {
    return 'Medium';
  }
  
  return 'Low';
}

// Helper function to estimate impact
function calculateImpact(currentData, requestedData) {
  const changes = identifyChanges(currentData, requestedData);
  const significantChanges = changes.filter(change => change.isSignificant);
  
  if (significantChanges.length >= 3) {
    return 'High';
  } else if (significantChanges.length >= 1) {
    return 'Medium';
  }
  
  return 'Low';
}

// Helper function to check if customer notification is required
function checkIfNotificationRequired(currentData, requestedData) {
  const notificationFields = ['phone', 'loanAmount', 'emiAmount', 'loanType'];
  const changes = identifyChanges(currentData, requestedData);
  
  return changes.some(change => 
    notificationFields.includes(change.field) && change.isSignificant
  );
}