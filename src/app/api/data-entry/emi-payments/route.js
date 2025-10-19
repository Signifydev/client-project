import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
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

    // If loanId is provided, verify the loan exists
    let loan = null;
    if (loanId) {
      loan = await Loan.findById(loanId);
      if (!loan) {
        return NextResponse.json({ 
          success: false,
          error: 'Loan not found'
        }, { status: 404 });
      }
    } else {
      // Find the main loan for this customer
      loan = await Loan.findOne({ 
        customerId, 
        status: 'active' 
      }).sort({ createdAt: -1 });
    }

    // Create EMI payment record
    const paymentData = {
      customerId,
      customerName,
      loanId: loan ? loan._id : null,
      loanNumber: loanNumber || (loan ? loan.loanNumber : 'N/A'),
      paymentDate: new Date(paymentDate),
      amount: parseFloat(amount),
      status,
      collectedBy,
      paymentMethod,
      transactionId: transactionId || null,
      notes,
      isVerified: false // Default to unverified
    };

    const payment = new EMIPayment(paymentData);
    await payment.save();

    // Update customer's last payment date and total paid
    await Customer.findByIdAndUpdate(customerId, {
      lastPaymentDate: new Date(paymentDate),
      totalPaid: (customer.totalPaid || 0) + parseFloat(amount),
      updatedAt: new Date()
    });

    // Update loan EMI paid amount if loan exists
    if (loan) {
      await Loan.findByIdAndUpdate(loan._id, {
        emiPaid: (loan.emiPaid || 0) + parseFloat(amount),
        totalPaid: (loan.totalPaid || 0) + parseFloat(amount),
        updatedAt: new Date()
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'EMI payment recorded successfully!',
      data: payment
    });
    
  } catch (error) {
    console.error('Error recording EMI payment:', error);
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