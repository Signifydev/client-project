import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    console.log('📥 Received edit loan request:', body);

    const { 
      type, 
      customerId, 
      customerName, 
      customerNumber, 
      loanId, 
      loanNumber, 
      requestedData, 
      description,
      originalData 
    } = body;

    // Enhanced validation for all required loan fields
    if (!type || !customerId || !customerName || !loanId || !loanNumber || !requestedData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: type, customerId, customerName, loanId, loanNumber, requestedData are required' 
        },
        { status: 400 }
      );
    }

    // Validate loan number is one of the allowed values
    const validLoanNumbers = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12', 'L13', 'L14', 'L15'];
    if (!validLoanNumbers.includes(requestedData.loanNumber)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid loan number. Must be one of L1 to L15',
          field: 'loanNumber'
        },
        { status: 400 }
      );
    }

    // REMOVE THE DUPLICATE requiredLoanFields declaration
    // Validate requestedData contains all necessary loan information
    const requiredLoanFields = ['amount', 'emiAmount', 'loanType', 'loanDays', 'dateApplied'];
    const missingFields = requiredLoanFields.filter(field => !requestedData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing loan fields: ${missingFields.join(', ')}`,
          missingFields: missingFields
        },
        { status: 400 }
      );
    }

    // Validate numeric fields
    if (isNaN(requestedData.amount) || parseFloat(requestedData.amount) <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Loan amount must be a valid positive number',
          field: 'amount'
        },
        { status: 400 }
      );
    }

    if (isNaN(requestedData.emiAmount) || parseFloat(requestedData.emiAmount) <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMI amount must be a valid positive number',
          field: 'emiAmount'
        },
        { status: 400 }
      );
    }

    if (isNaN(requestedData.loanDays) || parseInt(requestedData.loanDays) <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Loan days must be a valid positive number',
          field: 'loanDays'
        },
        { status: 400 }
      );
    }

    // Validate loan type
    const validLoanTypes = ['Daily', 'Weekly', 'Monthly'];
    if (!validLoanTypes.includes(requestedData.loanType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid loan type. Must be Daily, Weekly, or Monthly',
          field: 'loanType'
        },
        { status: 400 }
      );
    }

    // Validate EMI type for Weekly/Monthly loans
    if (requestedData.loanType !== 'Daily') {
      if (!requestedData.emiType || !['fixed', 'custom'].includes(requestedData.emiType)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'EMI type is required for Weekly/Monthly loans and must be fixed or custom',
            field: 'emiType'
          },
          { status: 400 }
        );
      }

      // Validate custom EMI fields if EMI type is custom
      if (requestedData.emiType === 'custom') {
        if (!requestedData.customEmiAmount || isNaN(requestedData.customEmiAmount) || parseFloat(requestedData.customEmiAmount) <= 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Custom EMI amount is required and must be a valid positive number',
              field: 'customEmiAmount'
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate EMI start date
    if (!requestedData.emiStartDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMI start date is required',
          field: 'emiStartDate'
        },
        { status: 400 }
      );
    }

    // Validate that EMI start date is not before loan date
    if (new Date(requestedData.emiStartDate) < new Date(requestedData.dateApplied)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMI start date cannot be before loan date',
          field: 'emiStartDate'
        },
        { status: 400 }
      );
    }

    // Auto-generate description if not provided
    const autoDescription = generateEditDescription(originalData, requestedData, customerName, loanNumber);

    // Calculate priority based on changes
    const priority = calculatePriority(originalData, requestedData);

    const editRequest = new Request({
      type: type,
      customerId: customerId,
      customerName: customerName,
      customerNumber: customerNumber,
      loanId: loanId,
      loanNumber: loanNumber,
      requestedData: requestedData,
      originalData: originalData, // Store original data for comparison
      description: description || autoDescription,
      priority: priority,
      status: 'Pending',
      createdBy: 'data_entry_operator_1',
      createdByRole: 'data_entry'
    });

    await editRequest.save();
    
    console.log('✅ Edit loan request saved to database:', editRequest._id);

    return NextResponse.json({
      success: true,
      message: 'Loan edit request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: editRequest._id,
        type: type,
        customerName: customerName,
        loanNumber: loanNumber,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error processing edit loan request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit edit request: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate automatic description
function generateEditDescription(originalData, requestedData, customerName, loanNumber) {
  const changes = identifyChanges(originalData, requestedData);
  
  if (changes.length === 0) {
    return `Loan edit request for ${customerName} - Loan ${loanNumber} - No significant changes detected`;
  }
  
  const mainChanges = changes.slice(0, 3);
  const changeText = mainChanges.map(change => 
    `${change.field} from "${change.oldValue}" to "${change.newValue}"`
  ).join(', ');
  
  return `Loan edit for ${customerName} - ${loanNumber}: ${changeText}${changes.length > 3 ? ` and ${changes.length - 3} more changes` : ''}`;
}

// Helper function to identify changes
function identifyChanges(originalData, requestedData) {
  const changes = [];
  
  const fieldsToCompare = [
    'loanNumber', 'amount', 'emiAmount', 'loanType', 'loanDays', 'dateApplied', 
    'emiStartDate', 'emiType', 'customEmiAmount'
  ];
  
  for (const field of fieldsToCompare) {
    const currentValue = originalData[field];
    const requestedValue = requestedData[field];
    
    if (currentValue !== requestedValue) {
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
  const significantFields = ['loanNumber', 'amount', 'emiAmount', 'loanType', 'loanDays'];
  return significantFields.includes(field);
}

// Helper function to calculate priority based on changes
function calculatePriority(originalData, requestedData) {
  const changes = identifyChanges(originalData, requestedData);
  const significantChanges = changes.filter(change => change.isSignificant);
  
  if (significantChanges.length >= 3) {
    return 'High';
  } else if (significantChanges.length >= 1) {
    return 'Medium';
  }
  
  return 'Low';
}