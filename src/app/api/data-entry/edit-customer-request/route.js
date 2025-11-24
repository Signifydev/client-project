import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('📥 Received edit customer request:', body);

    const {
      customerId,
      name,
      phone,
      whatsappNumber,
      businessName,
      area,
      customerNumber,
      address,
      category,
      officeCategory,
      requestedBy
    } = body;

    // Required fields for customer profile edit
    if (!customerId || !name || !customerNumber || !businessName || !area) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: customerId, name, customerNumber, businessName, and area are required',
          missingFields: ['customerId', 'name', 'customerNumber', 'businessName', 'area'].filter(field => !body[field])
        },
        { status: 400 }
      );
    }

    // Validate phone numbers
    if (phone && Array.isArray(phone)) {
      const validPhones = phone.filter(p => p && p.trim() !== '');
      
      if (validPhones.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'At least one phone number is required',
            field: 'phone'
          },
          { status: 400 }
        );
      }

      // Validate primary phone (index 0)
      if (!validPhones[0] || !/^\d{10}$/.test(validPhones[0])) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Valid primary phone number is required (10 digits)',
            field: 'phone'
          },
          { status: 400 }
        );
      }

      // Validate secondary phone if provided
      if (validPhones[1] && !/^\d{10}$/.test(validPhones[1])) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Secondary phone number must be a valid 10-digit number',
            field: 'phone'
          },
          { status: 400 }
        );
      }
    }

    // Validate WhatsApp number if provided
    if (whatsappNumber && !/^\d{10}$/.test(whatsappNumber)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'WhatsApp number must be a valid 10-digit number',
          field: 'whatsappNumber'
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

    // Check for duplicate phone numbers (if phone is being changed)
    if (phone && Array.isArray(phone)) {
      const validPhones = phone.filter(p => p && p.trim() !== '');
      
      for (const phoneNum of validPhones) {
        if (phoneNum) {
          const customerWithSamePhone = await Customer.findOne({
            $or: [
              { phone: phoneNum },
              { phone: { $in: [phoneNum] } }
            ],
            _id: { $ne: customerId },
            status: { $in: ['active', 'pending'] }
          });
          
          if (customerWithSamePhone) {
            return NextResponse.json(
              { 
                success: false, 
                error: `Another customer (${customerWithSamePhone.name}) with phone number ${phoneNum} already exists`,
                field: 'phone'
              },
              { status: 409 }
            );
          }
        }
      }
    }

    // Check for duplicate customer number (if customer number is being changed)
    if (customerNumber !== existingCustomer.customerNumber) {
      const customerWithSameCustomerNumber = await Customer.findOne({
        customerNumber: customerNumber,
        _id: { $ne: customerId },
        status: { $in: ['active', 'pending'] }
      });
      
      if (customerWithSameCustomerNumber) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Another customer (${customerWithSameCustomerNumber.name}) with customer number ${customerNumber} already exists`,
            field: 'customerNumber'
          },
          { status: 409 }
        );
      }
    }

    // Prepare current data for comparison
    const currentData = {
      name: existingCustomer.name,
      phone: Array.isArray(existingCustomer.phone) ? existingCustomer.phone : [existingCustomer.phone || ''],
      whatsappNumber: existingCustomer.whatsappNumber || '',
      businessName: existingCustomer.businessName,
      area: existingCustomer.area,
      customerNumber: existingCustomer.customerNumber,
      address: existingCustomer.address || '',
      category: existingCustomer.category || 'A',
      officeCategory: existingCustomer.officeCategory || 'Office 1'
    };

    // Prepare requested data
    const requestedData = {
      name: name.trim(),
      phone: phone.filter(p => p && p.trim() !== ''),
      whatsappNumber: whatsappNumber?.trim() || '',
      businessName: businessName.trim(),
      area: area.trim(),
      customerNumber: customerNumber.trim(),
      address: address?.trim() || '',
      category: category || 'A',
      officeCategory: officeCategory || 'Office 1'
    };

    // Check if there are actual changes
    const changes = identifyChanges(currentData, requestedData);
    
    if (changes.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No changes detected. Please modify at least one field before submitting.' 
        },
        { status: 400 }
      );
    }

    // Auto-generate description based on changes
    const description = generateEditDescription(changes, existingCustomer.name, customerNumber);

    // Determine priority based on changes
    const priority = calculatePriority(changes);

    // Create edit request
    const editRequest = new Request({
      type: 'Customer Edit',
      customerId: customerId,
      customerName: name,
      customerNumber: customerNumber,
      requestedData: requestedData,
      currentData: currentData, // Store current data for reference
      changes: changes, // Store the specific changes
      description: description,
      priority: priority,
      status: 'Pending',
      createdBy: requestedBy || 'data_entry_operator_1',
      createdByRole: 'data_entry'
    });

    await editRequest.save();

    console.log('✅ Edit customer request saved to database:', editRequest._id);

    return NextResponse.json({
      success: true,
      message: 'Customer edit request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: editRequest._id,
        type: 'Customer Edit',
        customerName: name,
        customerNumber: customerNumber,
        changes: changes.length,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing edit customer request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit edit request: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to identify changes between current and requested data
function identifyChanges(currentData, requestedData) {
  const changes = [];
  
  const fieldsToCompare = [
    'name', 'phone', 'whatsappNumber', 'businessName', 'area', 
    'customerNumber', 'address', 'category', 'officeCategory'
  ];
  
  for (const field of fieldsToCompare) {
    const currentValue = currentData[field];
    const requestedValue = requestedData[field];
    
    // Handle phone array comparison
    if (field === 'phone') {
      const currentPhones = Array.isArray(currentValue) ? currentValue.filter(p => p) : [currentValue].filter(p => p);
      const requestedPhones = Array.isArray(requestedValue) ? requestedValue.filter(p => p) : [requestedValue].filter(p => p);
      
      if (JSON.stringify(currentPhones) !== JSON.stringify(requestedPhones)) {
        changes.push({
          field: field,
          oldValue: currentPhones.join(', '),
          newValue: requestedPhones.join(', '),
          isSignificant: true
        });
      }
    } 
    // Handle other fields
    else if (currentValue !== requestedValue) {
      changes.push({
        field: field,
        oldValue: currentValue || 'Not set',
        newValue: requestedValue || 'Not set',
        isSignificant: isSignificantChange(field, currentValue, requestedValue)
      });
    }
  }
  
  return changes;
}

// Helper function to determine if a change is significant
function isSignificantChange(field, oldValue, newValue) {
  const significantFields = ['name', 'phone', 'customerNumber', 'category'];
  return significantFields.includes(field);
}

// Helper function to generate automatic description
function generateEditDescription(changes, customerName, customerNumber) {
  if (changes.length === 0) {
    return `Customer profile edit for ${customerName} (${customerNumber}) - No changes detected`;
  }
  
  const mainChanges = changes.slice(0, 3); // Show only top 3 changes
  const changeText = mainChanges.map(change => 
    `${change.field} from "${change.oldValue}" to "${change.newValue}"`
  ).join(', ');
  
  return `Customer profile edit for ${customerName} (${customerNumber}): ${changeText}${changes.length > 3 ? ` and ${changes.length - 3} more changes` : ''}`;
}

// Helper function to calculate priority based on changes
function calculatePriority(changes) {
  const significantChanges = changes.filter(change => change.isSignificant);
  
  if (significantChanges.length >= 3) {
    return 'High';
  } else if (significantChanges.length >= 1) {
    return 'Medium';
  }
  
  return 'Low';
}