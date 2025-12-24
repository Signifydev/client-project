import { NextResponse } from 'next/server';
import Loan from '@/lib/models/Loan';
import Customer from '@/lib/models/Customer';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

// Helper function to validate YYYY-MM-DD date string
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

// Helper function to get today's date as YYYY-MM-DD string
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to convert YYYY-MM-DD string to Date for calculation
function parseDateString(dateString) {
  if (!dateString || !isValidYYYYMMDD(dateString)) {
    return new Date(); // Return current date if invalid
  }
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper function to calculate next EMI date
const getNextEmiDateForNewLoan = (emiStartDateStr, loanType, emiPaidCount = 0) => {
  // For NEW loans with NO payments, next EMI date should be the EMI start date itself
  if (emiPaidCount === 0) {
    // Parse string to Date object
    if (typeof emiStartDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(emiStartDateStr)) {
      const [year, month, day] = emiStartDateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(emiStartDateStr); // Fallback for Date objects
  }
  
  // For loans with payments, calculate next date based on loan type
  let date;
  if (typeof emiStartDateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(emiStartDateStr)) {
    const [year, month, day] = emiStartDateStr.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(emiStartDateStr);
  }
  
  switch(loanType) {
    case 'Daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'Weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  return date;
};

// POST method to add multiple loans in a single request
export async function POST(request) {
  try {
    await connectDB();
    const batchData = await request.json();
    
    console.log('Received batch loan addition request data:', batchData);

    // Validate required fields
    if (!batchData.customerId || !batchData.loans || !Array.isArray(batchData.loans) || batchData.loans.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer ID and loans array with at least one loan are required'
      }, { status: 400 });
    }

    // Check if customer exists
    const customer = await Customer.findById(batchData.customerId);
    if (!customer) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    // Check if customer is active
    if (customer.status !== 'active') {
      return NextResponse.json({ 
        success: false,
        error: 'Customer is not active. Only active customers can have additional loans.'
      }, { status: 400 });
    }

    // Validate each loan in the batch
    const validationErrors = [];
    const loanNumbers = new Set();
    const existingLoans = await Loan.find({ customerId: batchData.customerId });
    const existingLoanNumbers = existingLoans.map(loan => loan.loanNumber.toUpperCase());
    
    batchData.loans.forEach((loan, index) => {
      // Check loan number uniqueness
      const loanNumber = loan.loanNumber?.trim().toUpperCase();
      
      if (!loanNumber) {
        validationErrors.push(`Loan ${index + 1}: Loan number is required`);
      } else if (loanNumbers.has(loanNumber)) {
        validationErrors.push(`Loan ${index + 1}: Duplicate loan number '${loanNumber}' in this batch`);
      } else if (existingLoanNumbers.includes(loanNumber)) {
        validationErrors.push(`Loan ${index + 1}: Loan number '${loanNumber}' already exists for this customer`);
      } else {
        loanNumbers.add(loanNumber);
      }
      
      // Validate required fields
      if (!loan.emiAmount || parseFloat(loan.emiAmount) <= 0) {
        validationErrors.push(`Loan ${index + 1}: EMI amount is required and must be greater than 0`);
      }
      
      if (!loan.loanDays || parseInt(loan.loanDays) <= 0) {
        validationErrors.push(`Loan ${index + 1}: Loan days is required and must be greater than 0`);
      }
      
      // Validate custom EMI
      if (loan.loanType !== 'Daily' && loan.emiType === 'custom' && 
          (!loan.customEmiAmount || parseFloat(loan.customEmiAmount) <= 0)) {
        validationErrors.push(`Loan ${index + 1}: Custom EMI amount is required for custom EMI type`);
      }
      
      // Validate date formats if provided
      if (loan.dateApplied && !isValidYYYYMMDD(loan.dateApplied)) {
        validationErrors.push(`Loan ${index + 1}: Invalid date format for dateApplied. Use YYYY-MM-DD format`);
      }
      
      if (loan.emiStartDate && !isValidYYYYMMDD(loan.emiStartDate)) {
        validationErrors.push(`Loan ${index + 1}: Invalid date format for emiStartDate. Use YYYY-MM-DD format`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Validation errors',
        details: validationErrors
      }, { status: 400 });
    }

    /*
    // Check for existing pending loan addition request for this customer
    const existingPendingRequest = await Request.findOne({
      customerId: customer._id,
      type: 'Loan Addition',
      status: 'Pending'
    });

    if (existingPendingRequest) {
      return NextResponse.json({ 
        success: false,
        error: 'A pending loan addition request already exists for this customer. Please wait for admin approval.'
      }, { status: 409 });
    }
    */

    // Prepare loan data for each loan in the batch
    const loanRequests = batchData.loans.map((loanData, index) => {
      const loanNumber = loanData.loanNumber.trim().toUpperCase();
      
      // ==============================================
      // CRITICAL FIX: USE STRING DATES, NOT DATE OBJECTS
      // ==============================================
      let dateAppliedStr;
      let emiStartDateStr;
      
      // Handle dateApplied - use string directly
      if (loanData.dateApplied && isValidYYYYMMDD(loanData.dateApplied)) {
        dateAppliedStr = loanData.dateApplied;
      } else {
        dateAppliedStr = getTodayDateString();
      }
      
      // Handle emiStartDate - use string directly
      if (loanData.emiStartDate && isValidYYYYMMDD(loanData.emiStartDate)) {
        emiStartDateStr = loanData.emiStartDate;
      } else {
        emiStartDateStr = dateAppliedStr;
      }
      
      // Ensure emiStartDate is not before dateApplied (lexical comparison)
      if (emiStartDateStr < dateAppliedStr) {
        console.log(`⚠️ Adjusting EMI start date to match loan date for loan ${loanNumber}`);
        emiStartDateStr = dateAppliedStr;
      }
      
      // Calculate end date for backward compatibility (Date object)
      const dateAppliedDate = parseDateString(dateAppliedStr);
      const endDate = new Date(dateAppliedDate);
      endDate.setDate(endDate.getDate() + parseInt(loanData.loanDays));

      // Calculate daily EMI based on loan type
      let dailyEMI = parseFloat(loanData.emiAmount);
      if (loanData.loanType === 'Weekly') {
        dailyEMI = dailyEMI / 7;
      } else if (loanData.loanType === 'Monthly') {
        dailyEMI = dailyEMI / 30;
      }

      const totalEMI = parseInt(loanData.loanDays) * dailyEMI;
      
      // Calculate total loan amount based on EMI type
      let totalLoanAmount;
      if (loanData.emiType === 'custom' && loanData.loanType !== 'Daily') {
        const fixedPeriods = parseInt(loanData.loanDays) - 1;
        const fixedAmount = parseFloat(loanData.emiAmount) * fixedPeriods;
        const lastAmount = parseFloat(loanData.customEmiAmount || loanData.emiAmount);
        totalLoanAmount = fixedAmount + lastAmount;
      } else {
        totalLoanAmount = parseFloat(loanData.emiAmount) * parseInt(loanData.loanDays);
      }
      
      // Calculate next EMI date (should be same as emiStartDate for new loans)
      const nextEmiDate = getNextEmiDateForNewLoan(emiStartDateStr, loanData.loanType || 'Monthly', 0);
      const nextEmiDateStr = nextEmiDate.toISOString().split('T')[0]; // Store as YYYY-MM-DD string

      return {
        // Basic loan info
        customerId: customer._id,
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        loanNumber: loanNumber,
        amount: parseFloat(loanData.amount || loanData.loanAmount || totalLoanAmount),
        loanAmount: parseFloat(loanData.amount || loanData.loanAmount || totalLoanAmount),
        emiAmount: parseFloat(loanData.emiAmount),
        loanType: loanData.loanType || 'Monthly',
        dateApplied: dateAppliedStr, // STORE AS STRING
        loanDays: parseInt(loanData.loanDays),
        
        // New EMI fields
        emiStartDate: emiStartDateStr, // STORE AS STRING
        emiType: loanData.emiType || 'fixed',
        customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
        
        // Additional loan fields for consistency
        totalEmiCount: parseInt(loanData.loanDays),
        emiPaidCount: 0,
        lastEmiDate: null,
        nextEmiDate: nextEmiDateStr, // STORE AS STRING
        totalPaidAmount: 0,
        remainingAmount: parseFloat(loanData.amount || loanData.loanAmount || totalLoanAmount),
        totalLoanAmount: totalLoanAmount,
        
        // Backward compatibility fields
        interestRate: loanData.interestRate || 0,
        tenure: parseInt(loanData.loanDays),
        tenureType: (loanData.loanType || 'Monthly').toLowerCase(),
        startDate: dateAppliedDate, // Date object for backward compatibility
        endDate: endDate,
        dailyEMI: dailyEMI,
        totalEMI: totalEMI,
        emiPaid: 0,
        emiPending: totalLoanAmount,
        totalPaid: 0,
        
        // System fields
        status: 'active',
        createdBy: batchData.createdBy || 'data_entry_operator'
      };
    });

    // Create batch approval request
    const approvalRequest = new Request({
      type: 'Loan Addition',
      customerName: customer.name,
      customerId: customer._id,
      customerNumber: customer.customerNumber,
      // Store all loans data in requestedData array
      requestedData: {
        loans: loanRequests,
        isBatch: true,
        loanCount: loanRequests.length,
        totalAmount: loanRequests.reduce((sum, loan) => sum + loan.amount, 0)
      },
      description: `Batch addition of ${loanRequests.length} new loans for ${customer.name} - Customer: ${customer.customerNumber} - Total Amount: ₹${loanRequests.reduce((sum, loan) => sum + loan.amount, 0)}`,
      priority: loanRequests.reduce((sum, loan) => sum + loan.amount, 0) > 50000 ? 'High' : 'Medium',
      createdBy: batchData.createdBy || 'data_entry_operator',
      status: 'Pending',
      createdByRole: 'data_entry',
      createdAt: new Date(),
      updatedAt: new Date(),
      batchDetails: {
        loanCount: loanRequests.length,
        loanNumbers: loanRequests.map(loan => loan.loanNumber),
        totalAmount: loanRequests.reduce((sum, loan) => sum + loan.amount, 0)
      }
    });

    await approvalRequest.save();

    console.log(`✅ Batch loan addition request created successfully for ${loanRequests.length} loans. Request ID:`, approvalRequest._id);
    
    // Log date information for debugging
    console.log('📅 Batch loan date details:', {
      loanCount: loanRequests.length,
      dateExamples: loanRequests.slice(0, 3).map(loan => ({
        loanNumber: loan.loanNumber,
        dateApplied: loan.dateApplied,
        emiStartDate: loan.emiStartDate,
        nextEmiDate: loan.nextEmiDate
      }))
    });

    return NextResponse.json({ 
      success: true,
      message: `Batch loan addition request for ${loanRequests.length} loan${loanRequests.length !== 1 ? 's' : ''} submitted successfully! Waiting for admin approval.`,
      data: {
        requestId: approvalRequest._id,
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        loanCount: loanRequests.length,
        loanNumbers: loanRequests.map(loan => loan.loanNumber),
        totalAmount: loanRequests.reduce((sum, loan) => sum + loan.amount, 0),
        isPendingApproval: true,
        isBatchRequest: true,
        dateDetails: {
          datesStoredAs: 'YYYY-MM-DD strings',
          exampleDate: loanRequests[0]?.dateApplied || 'N/A',
          exampleEMIStartDate: loanRequests[0]?.emiStartDate || 'N/A'
        }
      }
    });
    
  } catch (error) {
    console.error('Error in batch loan addition request API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// GET method to check batch status
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    
    if (!requestId) {
      return NextResponse.json({ 
        success: false,
        error: 'Request ID is required'
      }, { status: 400 });
    }
    
    const loanRequest = await Request.findById(requestId);
    
    if (!loanRequest) {
      return NextResponse.json({ 
        success: false,
        error: 'Request not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      data: loanRequest
    });
    
  } catch (error) {
    console.error('Error fetching batch request:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}