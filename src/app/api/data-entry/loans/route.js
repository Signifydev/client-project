import { NextResponse } from 'next/server';
import Loan from '@/lib/models/Loan';
import Customer from '@/lib/models/Customer';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

// POST method to add new loan
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

    // Calculate additional loan fields for the request
    const dateApplied = new Date(loanData.dateApplied || new Date());
    const endDate = new Date(dateApplied);
    endDate.setDate(endDate.getDate() + parseInt(loanDays));

    // Calculate daily EMI based on loan type
    let dailyEMI = emiAmount;
    if (loanData.loanType === 'Weekly') {
      dailyEMI = emiAmount / 7;
    } else if (loanData.loanType === 'Monthly') {
      dailyEMI = emiAmount / 30;
    }

    const totalEMI = parseInt(loanDays) * dailyEMI;

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
        amount: parseFloat(loanAmount),
        loanAmount: parseFloat(loanAmount),
        emiAmount: parseFloat(emiAmount),
        loanType: loanData.loanType || 'Monthly',
        dateApplied: dateApplied,
        loanDays: parseInt(loanDays),
        
        // New EMI fields
        emiStartDate: loanData.emiStartDate ? new Date(loanData.emiStartDate) : dateApplied,
        emiType: loanData.emiType || 'fixed',
        customEmiAmount: loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null,
        
        // Backward compatibility fields
        interestRate: loanData.interestRate || 0,
        tenure: parseInt(loanDays),
        tenureType: (loanData.loanType || 'Monthly').toLowerCase(),
        startDate: dateApplied,
        endDate: endDate,
        dailyEMI: dailyEMI,
        totalEMI: totalEMI,
        
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

    return NextResponse.json({ 
      success: true,
      message: 'Loan addition request submitted successfully! Waiting for admin approval.',
      data: {
        requestId: approvalRequest._id,
        customerName: customer.name,
        customerNumber: finalCustomerNumber,
        proposedLoanNumber: proposedLoanNumber,
        loanAmount: parseFloat(loanAmount),
        // IMPORTANT: Return request data, not loan data
        isPendingApproval: true
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