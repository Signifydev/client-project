import { NextResponse } from 'next/server';
import Loan from '@/lib/models/Loan';
import Customer from '@/lib/models/Customer';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

// ==============================================
// SIMPLE DATE UTILITY FUNCTIONS - STRING BASED
// ==============================================

/**
 * Validate date string is in YYYY-MM-DD format
 */
function isValidYYYYMMDD(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate EMI schedule for a loan
 */
function generateEMISchedule(emiStartDate, loanType, totalInstallments, standardAmount, customAmount = null, customInstallmentNumber = null) {
  const schedule = [];
  
  // Parse start date
  const startDate = new Date(emiStartDate + 'T00:00:00');
  
  // Default custom installment to last if not specified
  if (customAmount !== null && customInstallmentNumber === null) {
    customInstallmentNumber = totalInstallments;
  }
  
  for (let i = 1; i <= totalInstallments; i++) {
    const dueDate = new Date(startDate);
    
    // Calculate due date based on loan type
    if (loanType === 'Daily') {
      dueDate.setDate(startDate.getDate() + (i - 1));
    } else if (loanType === 'Weekly') {
      dueDate.setDate(startDate.getDate() + ((i - 1) * 7));
    } else if (loanType === 'Monthly') {
      dueDate.setMonth(startDate.getMonth() + (i - 1));
    }
    
    // Format date strings
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    const dueDateStr = `${year}-${month}-${day}`;
    const formattedDate = `${day}/${month}/${year}`;
    
    // Determine amount for this installment
    let amount = standardAmount;
    let isCustom = false;
    
    if (customInstallmentNumber !== null && i === customInstallmentNumber) {
      amount = customAmount || standardAmount;
      isCustom = true;
    }
    
    schedule.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      amount: amount,
      isCustom: isCustom,
      formattedDate: formattedDate
    });
  }
  
  return schedule;
}

// POST method to add new loan REQUEST (not create loan directly)
export async function POST(request) {
  try {
    await connectDB();
    const loanData = await request.json();
    
    console.log('Received loan addition request data:', loanData);

    // Handle both 'amount' and 'loanAmount' fields for backward compatibility
    const loanAmount = loanData.loanAmount || loanData.amount;
    const emiAmount = loanData.emiAmount;
    const loanDays = loanData.loanDays;

    // Validate required fields
    if (!loanData.customerId || !loanAmount || !emiAmount || !loanDays) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer ID, loan amount, EMI amount, and loan days are required'
      }, { status: 400 });
    }

    // Validate numeric fields
    if (loanAmount <= 0 || emiAmount <= 0 || loanDays <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Loan amount, EMI amount, and loan days must be greater than 0'
      }, { status: 400 });
    }

    // Check if customer exists and get customer details
    const customer = await Customer.findById(loanData.customerId);
    if (!customer) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    // DEBUG: Check customer data
    console.log('🔍 CUSTOMER DATA DEBUG:');
    console.log('Customer from DB:', {
      _id: customer._id,
      name: customer.name,
      customerNumber: customer.customerNumber,
      hasCustomerNumber: !!customer.customerNumber
    });

    console.log('🔍 LOAN DATA DEBUG:');
    console.log('Received loanData:', {
      customerId: loanData.customerId,
      customerName: loanData.customerName,
      customerNumber: loanData.customerNumber,
      hasCustomerNumberInRequest: !!loanData.customerNumber
    });

    // Ensure customerNumber is set
    const finalCustomerNumber = loanData.customerNumber || customer.customerNumber;

    if (!finalCustomerNumber) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer number not found for customer'
      }, { status: 400 });
    }

    console.log('✅ Using customerNumber:', finalCustomerNumber);

    // Check if customer is active
    if (customer.status !== 'active') {
      return NextResponse.json({ 
        success: false,
        error: 'Customer is not active. Only active customers can have additional loans.'
      }, { status: 400 });
    }

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

    // Generate proposed loan number (but don't create the loan yet)
    const existingLoans = await Loan.find({ customerId: loanData.customerId });
    const loanCount = existingLoans.length;
    const proposedLoanNumber = `L${loanCount + 1}`;

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
      console.log('⚠️ Adjusting EMI start date to match loan date');
      emiStartDateStr = dateAppliedStr;
    }
    
    console.log('📅 DEBUG - Date strings for loan addition:', {
      dateAppliedStr,
      emiStartDateStr,
      isValidDateApplied: isValidYYYYMMDD(dateAppliedStr),
      isValidEmiStartDate: isValidYYYYMMDD(emiStartDateStr)
    });

    // Calculate end date for backward compatibility (Date object)
    const dateAppliedDate = new Date(dateAppliedStr + 'T00:00:00');
    const endDate = new Date(dateAppliedDate);
    endDate.setDate(endDate.getDate() + parseInt(loanDays));

    // Calculate daily EMI based on loan type
    let dailyEMI = emiAmount;
    if (loanData.loanType === 'Weekly') {
      dailyEMI = emiAmount / 7;
    } else if (loanData.loanType === 'Monthly') {
      dailyEMI = emiAmount / 30;
    }

    const totalEMI = parseInt(loanDays) * dailyEMI;
    
    // Calculate total loan amount based on EMI type
    let totalLoanAmount;
    if (loanData.emiType === 'custom' && loanData.loanType !== 'Daily') {
      const fixedPeriods = parseInt(loanDays) - 1;
      const fixedAmount = emiAmount * fixedPeriods;
      const lastAmount = parseFloat(loanData.customEmiAmount || emiAmount);
      totalLoanAmount = fixedAmount + lastAmount;
    } else {
      totalLoanAmount = emiAmount * parseInt(loanDays);
    }

    // ==============================================
    // EMI SCHEDULE GENERATION FOR CALENDAR FIX
    // ==============================================
    
    let emiScheduleDetails = null;
    
    // Generate EMI schedule for the loan
    if (emiStartDateStr && loanData.loanType && loanDays && emiAmount) {
      const customAmount = (loanData.emiType === 'custom' && loanData.loanType !== 'Daily') 
        ? parseFloat(loanData.customEmiAmount || emiAmount) 
        : null;
      
      const customInstallmentNumber = (loanData.emiType === 'custom' && loanData.loanType !== 'Daily') 
        ? parseInt(loanDays) 
        : null;
      
      const schedule = generateEMISchedule(
        emiStartDateStr,
        loanData.loanType || 'Monthly',
        parseInt(loanDays),
        parseFloat(emiAmount),
        customAmount,
        customInstallmentNumber
      );
      
      emiScheduleDetails = {
        emiType: loanData.emiType || 'fixed',
        customEmiAmount: customAmount,
        totalInstallments: parseInt(loanDays),
        customInstallmentNumber: customInstallmentNumber,
        standardAmount: parseFloat(emiAmount),
        customAmount: customAmount,
        schedule: schedule
      };
      
      console.log('📅 Generated EMI Schedule:', {
        totalInstallments: emiScheduleDetails.totalInstallments,
        customInstallmentNumber: emiScheduleDetails.customInstallmentNumber,
        standardAmount: emiScheduleDetails.standardAmount,
        customAmount: emiScheduleDetails.customAmount,
        scheduleLength: emiScheduleDetails.schedule.length,
        firstInstallment: emiScheduleDetails.schedule[0],
        lastInstallment: emiScheduleDetails.schedule[emiScheduleDetails.schedule.length - 1]
      });
    }

    // Create approval request for the new loan (DO NOT CREATE LOAN YET)
    const approvalRequest = new Request({
      type: 'Loan Addition',
      customerName: customer.name,
      customerId: customer._id,
      customerNumber: finalCustomerNumber,
      // Store all loan data in requestedData - this will be used to create the loan after approval
      requestedData: {
        // Basic loan info
        customerId: customer._id,
        customerName: customer.name,
        customerNumber: finalCustomerNumber,
        loanNumber: proposedLoanNumber,
        amount: parseFloat(loanAmount), // Principal amount
        loanAmount: parseFloat(loanAmount), // Total amount
        emiAmount: parseFloat(emiAmount),
        loanType: loanData.loanType || 'Monthly',
        dateApplied: dateAppliedStr, // ✅ STORE AS STRING
        loanDays: parseInt(loanDays),
        
        // New EMI fields
        emiStartDate: emiStartDateStr, // ✅ STORE AS STRING
        emiType: loanData.emiType || 'fixed',
        customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
        
        // EMI SCHEDULE DETAILS - ADDED FOR CALENDAR FIX
        emiScheduleDetails: emiScheduleDetails,
        
        // Additional loan fields for consistency
        totalEmiCount: parseInt(loanDays),
        emiPaidCount: 0,
        lastEmiDate: null,
        nextEmiDate: emiStartDateStr, // ✅ STORE AS STRING (same as emiStartDate for new loans)
        totalPaidAmount: 0,
        remainingAmount: parseFloat(loanAmount),
        totalLoanAmount: totalLoanAmount,
        
        // Backward compatibility fields
        interestRate: loanData.interestRate || 0,
        tenure: parseInt(loanDays),
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
        createdBy: loanData.createdBy || 'data_entry_operator'
      },
      description: `New ${loanData.loanType || 'Monthly'} loan addition for ${customer.name} - Customer: ${finalCustomerNumber} - Amount: ₹${loanAmount}`,
      priority: parseFloat(loanAmount) > 50000 ? 'High' : 'Medium',
      createdBy: loanData.createdBy || 'data_entry_operator',
      status: 'Pending',
      createdByRole: 'data_entry',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await approvalRequest.save();

    console.log('✅ Loan addition request created successfully. Waiting for admin approval. Request ID:', approvalRequest._id);
    
    console.log('📅 Loan request date details:', {
      dateApplied: dateAppliedStr,
      emiStartDate: emiStartDateStr,
      nextEmiDate: emiStartDateStr,
      storedAs: 'YYYY-MM-DD strings'
    });
    
    console.log('📅 EMI Schedule stored:', emiScheduleDetails ? 'Yes' : 'No');
    if (emiScheduleDetails) {
      console.log('   - Total installments:', emiScheduleDetails.totalInstallments);
      console.log('   - Custom installment:', emiScheduleDetails.customInstallmentNumber);
      console.log('   - Standard amount:', emiScheduleDetails.standardAmount);
      console.log('   - Custom amount:', emiScheduleDetails.customAmount);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Loan addition request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: approvalRequest._id,
        customerName: customer.name,
        customerNumber: finalCustomerNumber,
        proposedLoanNumber: proposedLoanNumber,
        loanAmount: parseFloat(loanAmount),
        dateApplied: dateAppliedStr,
        emiStartDate: emiStartDateStr,
        emiScheduleGenerated: emiScheduleDetails ? true : false,
        // IMPORTANT: Return request data, not loan data
        isPendingApproval: true,
        dateFormat: 'YYYY-MM-DD strings'
      }
    });
    
  } catch (error) {
    console.error('Error in loan addition request API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// GET method to fetch loans
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit')) || 100;
    
    let query = { status };
    
    if (customerId) {
      query.customerId = customerId;
    }
    
    const loans = await Loan.find(query)
      .populate('customerId', 'name phone businessName area status')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    // Get loan statistics
    const stats = await Loan.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: '$loanType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    const totalStats = await Loan.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          totalLoanAmount: { $sum: '$amount' },
          totalActiveEMI: { $sum: '$emiAmount' }
        }
      }
    ]);

    return NextResponse.json({ 
      success: true, 
      data: loans,
      stats: {
        byType: stats,
        total: totalStats[0] || { totalLoans: 0, totalLoanAmount: 0, totalActiveEMI: 0 }
      }
    });
    
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT method to update loan status (for admin approval)
export async function PUT(request) {
  try {
    await connectDB();
    const { loanId, status, updatedBy } = await request.json();

    if (!loanId || !status) {
      return NextResponse.json({ 
        success: false,
        error: 'Loan ID and status are required'
      }, { status: 400 });
    }

    const loan = await Loan.findByIdAndUpdate(
      loanId,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!loan) {
      return NextResponse.json({ 
        success: false,
        error: 'Loan not found'
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Loan ${status} successfully`,
      data: loan
    });
    
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}