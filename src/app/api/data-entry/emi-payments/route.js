import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    console.log('🟡 EMI Payment data received:', data);
    
    const {
      customerId,
      customerName,
      loanId,
      loanNumber,
      paymentDate,
      amount,
      status = 'Paid',
      collectedBy,
      paymentMethod = 'Cash',
      transactionId,
      notes = ''
    } = data;

    // Validate required fields
    if (!customerId || !customerName || !amount || !paymentDate || !collectedBy) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer ID, customer name, amount, payment date, and collected by are required'
      }, { status: 400 });
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Payment amount must be greater than 0'
      }, { status: 400 });
    }

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer not found'
      }, { status: 404 });
    }

    let loan = null;
    let finalLoanId = null;
    let finalLoanNumber = 'N/A';

    // If loanId is provided, verify the loan exists and belongs to customer
    if (loanId) {
      loan = await Loan.findOne({ 
        _id: loanId, 
        customerId: customerId 
      });
      if (!loan) {
        return NextResponse.json({ 
          success: false,
          error: 'Loan not found or does not belong to this customer'
        }, { status: 404 });
      }
      finalLoanId = loan._id;
      finalLoanNumber = loan.loanNumber;
    } else {
      // AUTO-FIND: Find the main/active loan for this customer
      console.log('🔍 Auto-finding loan for customer:', customerId);
      
      // First try to find active loan
      loan = await Loan.findOne({ 
        customerId, 
        status: 'active' 
      }).sort({ createdAt: -1 });

      // If no active loan, find any loan for this customer
      if (!loan) {
        console.log('⚠️ No active loan found, searching for any loan...');
        loan = await Loan.findOne({ customerId }).sort({ createdAt: -1 });
      }

      // If still no loan found, we cannot proceed
      if (!loan) {
        return NextResponse.json({ 
          success: false,
          error: 'No loan found for this customer. Please ensure the customer has an approved loan before recording EMI payments.'
        }, { status: 404 });
      }

      finalLoanId = loan._id;
      finalLoanNumber = loan.loanNumber;
      console.log('✅ Found loan:', { 
        loanId: finalLoanId, 
        loanNumber: finalLoanNumber,
        customerName: loan.customerName 
      });
    }

    // Use provided loanNumber or fallback to found loan's number
    finalLoanNumber = loanNumber || finalLoanNumber;

    // Create EMI payment record - NOW WITH GUARANTEED loanId
    const paymentData = {
      customerId,
      customerName,
      loanId: finalLoanId, // This will never be null now
      loanNumber: finalLoanNumber,
      paymentDate: new Date(paymentDate),
      amount: parseFloat(amount),
      status,
      collectedBy,
      paymentMethod,
      transactionId: transactionId || null,
      notes,
      isVerified: false
    };

    console.log('💾 Creating EMI payment:', paymentData);

    const payment = new EMIPayment(paymentData);
    await payment.save();

    // Update customer's last payment date and total paid
    const updateCustomer = Customer.findByIdAndUpdate(customerId, {
      lastPaymentDate: new Date(paymentDate),
      totalPaid: (customer.totalPaid || 0) + parseFloat(amount),
      updatedAt: new Date()
    });

    // Update loan EMI paid amount
    const updateLoan = Loan.findByIdAndUpdate(finalLoanId, {
      $inc: {
        emiPaid: parseFloat(amount),
        totalPaid: parseFloat(amount)
      },
      lastPaymentDate: new Date(paymentDate),
      updatedAt: new Date()
    });

    // Execute both updates in parallel
    await Promise.all([updateCustomer, updateLoan]);

    console.log('✅ EMI payment recorded successfully:', payment._id);

    return NextResponse.json({ 
      success: true,
      message: `EMI payment of ₹${amount} recorded successfully for ${customerName}`,
      data: {
        paymentId: payment._id,
        customerName: customerName,
        amount: amount,
        loanNumber: finalLoanNumber,
        paymentDate: payment.paymentDate,
        loanId: finalLoanId
      }
    });
    
  } catch (error) {
    console.error('❌ Error recording EMI payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const date = searchParams.get('date');
    const collectedBy = searchParams.get('collectedBy');
    const limit = parseInt(searchParams.get('limit')) || 50;

    let query = {};

    // Filter by customer ID
    if (customerId) {
      query.customerId = customerId;
    }

    // Filter by collection date
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query.paymentDate = {
        $gte: startDate,
        $lt: endDate
      };
    }

    // Filter by collector
    if (collectedBy) {
      query.collectedBy = collectedBy;
    }

    const payments = await EMIPayment.find(query)
      .populate('customerId', 'name phone businessName area')
      .populate('loanId', 'loanNumber loanType emiAmount')
      .sort({ paymentDate: -1 })
      .limit(limit);

    // Get today's total collection
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await EMIPayment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $in: ['Paid', 'Partial'] }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({ 
      success: true,
      data: payments,
      stats: {
        todayCollection: todayStats[0]?.totalAmount || 0,
        todayPayments: todayStats[0]?.paymentCount || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching EMI payments:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}