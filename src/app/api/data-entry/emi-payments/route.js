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

    console.log('🔍 Loan search parameters:', { loanId, loanNumber, customerId });

    // If loanId is provided, verify the loan exists and belongs to customer
    if (loanId) {
      console.log('🔍 Searching for loan by ID:', loanId);
      loan = await Loan.findOne({ 
        _id: loanId, 
        customerId: customerId 
      });
      
      if (!loan) {
        console.log('❌ Loan not found by ID, trying broader search...');
        // Try without customerId constraint (in case there's a data mismatch)
        loan = await Loan.findById(loanId);
        
        if (!loan) {
          console.log('❌ Loan not found in database with ID:', loanId);
          return NextResponse.json({ 
            success: false,
            error: 'Loan not found. Please refresh and try again.'
          }, { status: 404 });
        }
        
        // Verify loan belongs to customer (security check)
        if (loan.customerId.toString() !== customerId.toString()) {
          console.log('❌ Loan does not belong to customer:', {
            loanCustomerId: loan.customerId,
            requestCustomerId: customerId
          });
          return NextResponse.json({ 
            success: false,
            error: 'Loan does not belong to this customer'
          }, { status: 400 });
        }
      }
      
      finalLoanId = loan._id;
      finalLoanNumber = loan.loanNumber;
      console.log('✅ Found loan by ID:', { 
        loanId: finalLoanId, 
        loanNumber: finalLoanNumber,
        customerName: loan.customerName 
      });
    } else {
      // AUTO-FIND: Find the main/active loan for this customer
      console.log('🔍 Auto-finding loan for customer:', customerId);
      
      // Strategy 1: Find main loan (isMainLoan: true)
      loan = await Loan.findOne({ 
        customerId, 
        isMainLoan: true,
        status: 'active' 
      });

      // Strategy 2: Find any active loan
      if (!loan) {
        console.log('⚠️ No main loan found, searching for any active loan...');
        loan = await Loan.findOne({ 
          customerId, 
          status: 'active' 
        }).sort({ createdAt: -1 });
      }

      // Strategy 3: Find any loan for this customer (even inactive)
      if (!loan) {
        console.log('⚠️ No active loan found, searching for any loan...');
        loan = await Loan.findOne({ customerId }).sort({ createdAt: -1 });
      }

      // If still no loan found, we cannot proceed
      if (!loan) {
        console.log('❌ No loan found for customer:', customerId);
        return NextResponse.json({ 
          success: false,
          error: 'No loan found for this customer. Please ensure the customer has an approved loan before recording EMI payments.'
        }, { status: 404 });
      }

      finalLoanId = loan._id;
      finalLoanNumber = loan.loanNumber;
      console.log('✅ Auto-found loan:', { 
        loanId: finalLoanId, 
        loanNumber: finalLoanNumber,
        customerName: loan.customerName,
        isMainLoan: loan.isMainLoan,
        status: loan.status
      });
    }

    // Use provided loanNumber or fallback to found loan's number
    finalLoanNumber = loanNumber || finalLoanNumber;

    // Validate that we have a valid loan ID
    if (!finalLoanId) {
      console.error('❌ No valid loan ID found after all search attempts');
      return NextResponse.json({ 
        success: false,
        error: 'Unable to identify loan for payment. Please contact administrator.'
      }, { status: 500 });
    }

    // Create EMI payment record
    const paymentData = {
      customerId,
      customerName,
      loanId: finalLoanId,
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
    await Customer.findByIdAndUpdate(customerId, {
      lastPaymentDate: new Date(paymentDate),
      $inc: { totalPaid: parseFloat(amount) },
      updatedAt: new Date()
    });

    // Update loan statistics with proper error handling
    try {
      await Loan.findByIdAndUpdate(finalLoanId, {
        $inc: {
          emiPaid: 1, // Count of EMI payments
          totalPaid: parseFloat(amount) // Total amount paid
        },
        lastPaymentDate: new Date(paymentDate),
        updatedAt: new Date()
      });
      console.log('✅ Loan statistics updated successfully');
    } catch (loanUpdateError) {
      console.error('⚠️ Error updating loan statistics:', loanUpdateError);
      // Continue even if loan update fails - payment is already recorded
    }

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
        loanId: finalLoanId,
        collectedBy: collectedBy
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
    const loanId = searchParams.get('loanId');
    const date = searchParams.get('date');
    const collectedBy = searchParams.get('collectedBy');
    const limit = parseInt(searchParams.get('limit')) || 50;

    let query = {};

    // Filter by customer ID
    if (customerId) {
      query.customerId = customerId;
    }

    // Filter by loan ID
    if (loanId) {
      query.loanId = loanId;
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
      .populate('customerId', 'name phone businessName area loanNumber')
      .populate('loanId', 'loanNumber loanType emiAmount amount')
      .sort({ paymentDate: -1, createdAt: -1 })
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

    // Get customer-wise today's collection
    const customerWiseStats = await EMIPayment.aggregate([
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
          _id: '$customerId',
          totalAmount: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $unwind: '$customer'
      },
      {
        $project: {
          customerName: '$customer.name',
          loanNumber: '$customer.loanNumber',
          totalAmount: 1,
          paymentCount: 1
        }
      }
    ]);

    return NextResponse.json({ 
      success: true,
      data: {
        payments,
        statistics: {
          todayCollection: todayStats[0]?.totalAmount || 0,
          todayPayments: todayStats[0]?.paymentCount || 0,
          customerWise: customerWiseStats
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching EMI payments:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// PUT method to update EMI payment (optional)
export async function PUT(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const data = await request.json();

    if (!paymentId) {
      return NextResponse.json({ 
        success: false,
        error: 'Payment ID is required'
      }, { status: 400 });
    }

    console.log('🟡 Updating EMI payment:', paymentId);

    const payment = await EMIPayment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ 
        success: false,
        error: 'EMI payment not found'
      }, { status: 404 });
    }

    // Update allowed fields
    const allowedUpdates = ['amount', 'status', 'paymentDate', 'collectedBy', 'paymentMethod', 'notes', 'isVerified'];
    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        payment[field] = data[field];
      }
    });

    await payment.save();

    console.log('✅ EMI payment updated successfully:', paymentId);

    return NextResponse.json({ 
      success: true,
      message: 'EMI payment updated successfully',
      data: payment
    });
    
  } catch (error) {
    console.error('❌ Error updating EMI payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}