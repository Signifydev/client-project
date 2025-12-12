import { NextResponse } from 'next/server';
import Loan from '@/lib/models/Loan';
import Customer from '@/lib/models/Customer';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

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
    });

    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Validation errors',
        details: validationErrors
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

    // Prepare loan data for each loan in the batch
    const loanRequests = batchData.loans.map((loanData, index) => {
      const loanNumber = loanData.loanNumber.trim().toUpperCase();
      const dateApplied = new Date(loanData.dateApplied || new Date());
      const endDate = new Date(dateApplied);
      endDate.setDate(endDate.getDate() + parseInt(loanData.loanDays));

      // Calculate daily EMI based on loan type
      let dailyEMI = parseFloat(loanData.emiAmount);
      if (loanData.loanType === 'Weekly') {
        dailyEMI = dailyEMI / 7;
      } else if (loanData.loanType === 'Monthly') {
        dailyEMI = dailyEMI / 30;
      }

      const totalEMI = parseInt(loanData.loanDays) * dailyEMI;

      return {
        // Basic loan info
        customerId: customer._id,
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        loanNumber: loanNumber,
        amount: parseFloat(loanData.amount || loanData.loanAmount),
        loanAmount: parseFloat(loanData.amount || loanData.loanAmount),
        emiAmount: parseFloat(loanData.emiAmount),
        loanType: loanData.loanType || 'Monthly',
        dateApplied: dateApplied,
        loanDays: parseInt(loanData.loanDays),
        
        // New EMI fields
        emiStartDate: loanData.emiStartDate ? new Date(loanData.emiStartDate) : dateApplied,
        emiType: loanData.emiType || 'fixed',
        customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
        
        // Backward compatibility fields
        interestRate: loanData.interestRate || 0,
        tenure: parseInt(loanData.loanDays),
        tenureType: (loanData.loanType || 'Monthly').toLowerCase(),
        startDate: dateApplied,
        endDate: endDate,
        dailyEMI: dailyEMI,
        totalEMI: totalEMI,
        
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
        isBatchRequest: true
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