import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

// Helper function to clean IDs by removing suffixes
function cleanId(id) {
  if (!id) return id;
  // Remove common suffixes like "_default", "_temp", etc.
  return id.replace(/(_default|_temp|_new)$/, '');
}

// Helper function to validate and clean ObjectId
function validateAndCleanObjectId(id, fieldName = 'ID') {
  if (!id) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const cleanedId = cleanId(id);
  
  if (!mongoose.Types.ObjectId.isValid(cleanedId)) {
    return { 
      isValid: false, 
      error: `Invalid ${fieldName} format: ${id} (cleaned to: ${cleanedId})` 
    };
  }

  return { 
    isValid: true, 
    cleanedId: new mongoose.Types.ObjectId(cleanedId),
    originalId: id,
    cleanedIdString: cleanedId
  };
}

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

    // Validate and clean customerId
    const customerIdValidation = validateAndCleanObjectId(customerId, 'Customer ID');
    if (!customerIdValidation.isValid) {
      return NextResponse.json({ 
        success: false,
        error: customerIdValidation.error
      }, { status: 400 });
    }

    const cleanedCustomerId = customerIdValidation.cleanedId;

    // Validate and clean loanId if provided
    let cleanedLoanId = null;
    if (loanId) {
      const loanIdValidation = validateAndCleanObjectId(loanId, 'Loan ID');
      if (!loanIdValidation.isValid) {
        return NextResponse.json({ 
          success: false,
          error: loanIdValidation.error
        }, { status: 400 });
      }
      cleanedLoanId = loanIdValidation.cleanedId;
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Payment amount must be greater than 0'
      }, { status: 400 });
    }

    // Format payment date to YYYY-MM-DD for comparison
    const formattedPaymentDate = new Date(paymentDate).toISOString().split('T')[0];

    // Check if EMI payment already exists for this loan and date
    if (cleanedLoanId) {
      const existingPayment = await EMIPayment.findOne({
        loanId: cleanedLoanId,
        paymentDate: {
          $gte: new Date(formattedPaymentDate + 'T00:00:00.000Z'),
          $lt: new Date(formattedPaymentDate + 'T23:59:59.999Z')
        },
        status: { $ne: 'cancelled' }
      });

      if (existingPayment) {
        return NextResponse.json({ 
          success: false,
          error: `EMI payment for date ${formattedPaymentDate} already exists. Please use a different date or edit the existing payment.`,
          existingPayment: {
            id: existingPayment._id,
            amount: existingPayment.amount,
            date: existingPayment.paymentDate,
            status: existingPayment.status
          }
        }, { status: 409 });
      }
    }

    // Check if customer exists
    const customer = await Customer.findById(cleanedCustomerId);
    if (!customer) {
      return NextResponse.json({ 
        success: false,
        error: `Customer not found with ID: ${cleanedCustomerId} (original: ${customerId})`
      }, { status: 404 });
    }

    let loan = null;
    let finalLoanId = null;
    let finalLoanNumber = 'N/A';

    console.log('🔍 Loan search parameters:', { 
      originalLoanId: loanId,
      cleanedLoanId: cleanedLoanId?.toString(),
      loanNumber, 
      customerId: cleanedCustomerId.toString() 
    });

    // If cleanedLoanId is provided, verify the loan exists and belongs to customer
    if (cleanedLoanId) {
      console.log('🔍 Searching for loan by cleaned ID:', cleanedLoanId.toString());
      loan = await Loan.findOne({ 
        _id: cleanedLoanId, 
        customerId: cleanedCustomerId 
      });
      
      if (!loan) {
        console.log('❌ Loan not found by cleaned ID, trying broader search...');
        // Try without customerId constraint (in case there's a data mismatch)
        loan = await Loan.findById(cleanedLoanId);
        
        if (!loan) {
          console.log('❌ Loan not found in database with cleaned ID:', cleanedLoanId.toString());
          return NextResponse.json({ 
            success: false,
            error: `Loan not found with ID: ${cleanedLoanId} (original: ${loanId}). Please refresh and try again.`
          }, { status: 404 });
        }
        
        // Verify loan belongs to customer (security check)
        if (loan.customerId.toString() !== cleanedCustomerId.toString()) {
          console.log('❌ Loan does not belong to customer:', {
            loanCustomerId: loan.customerId.toString(),
            requestCustomerId: cleanedCustomerId.toString()
          });
          return NextResponse.json({ 
            success: false,
            error: 'Loan does not belong to this customer'
          }, { status: 400 });
        }
      }
      
      finalLoanId = loan._id;
      finalLoanNumber = loan.loanNumber;
      console.log('✅ Found loan by cleaned ID:', { 
        loanId: finalLoanId.toString(), 
        loanNumber: finalLoanNumber,
        customerName: loan.customerName 
      });
    } else {
      // AUTO-FIND: Find the main/active loan for this customer
      console.log('🔍 Auto-finding loan for customer:', cleanedCustomerId.toString());
      
      // Strategy 1: Find main loan (isMainLoan: true)
      loan = await Loan.findOne({ 
        customerId: cleanedCustomerId, 
        isMainLoan: true,
        status: 'active' 
      });

      // Strategy 2: Find any active loan
      if (!loan) {
        console.log('⚠️ No main loan found, searching for any active loan...');
        loan = await Loan.findOne({ 
          customerId: cleanedCustomerId, 
          status: 'active' 
        }).sort({ createdAt: -1 });
      }

      // Strategy 3: Find any loan for this customer (even inactive)
      if (!loan) {
        console.log('⚠️ No active loan found, searching for any loan...');
        loan = await Loan.findOne({ customerId: cleanedCustomerId }).sort({ createdAt: -1 });
      }

      // If still no loan found, we cannot proceed
      if (!loan) {
        console.log('❌ No loan found for customer:', cleanedCustomerId.toString());
        return NextResponse.json({ 
          success: false,
          error: 'No loan found for this customer. Please ensure the customer has an approved loan before recording EMI payments.'
        }, { status: 404 });
      }

      finalLoanId = loan._id;
      finalLoanNumber = loan.loanNumber;
      console.log('✅ Auto-found loan:', { 
        loanId: finalLoanId.toString(), 
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
      customerId: cleanedCustomerId,
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

    console.log('💾 Creating EMI payment with cleaned IDs:', paymentData);

    const payment = new EMIPayment(paymentData);
    await payment.save();

    // Update customer's last payment date and total paid
    await Customer.findByIdAndUpdate(cleanedCustomerId, {
      lastPaymentDate: new Date(paymentDate),
      $inc: { totalPaid: parseFloat(amount) },
      updatedAt: new Date()
    });

    // Update loan statistics with proper error handling
    try {
      // Calculate new EMI paid count and total paid amount
      const loanPayments = await EMIPayment.find({
        loanId: finalLoanId,
        status: { $in: ['Paid', 'Partial'] }
      });
      
      const totalPaidAmount = loanPayments.reduce((sum, p) => sum + p.amount, 0);
      const emiPaidCount = loanPayments.length;

      await Loan.findByIdAndUpdate(finalLoanId, {
        emiPaidCount: emiPaidCount,
        totalPaidAmount: totalPaidAmount,
        remainingAmount: loan.amount - totalPaidAmount,
        lastPaymentDate: new Date(paymentDate),
        updatedAt: new Date(),
        $push: {
          emiHistory: {
            _id: payment._id,
            paymentDate: payment.paymentDate,
            amount: payment.amount,
            status: payment.status,
            collectedBy: payment.collectedBy,
            notes: payment.notes,
            createdAt: new Date()
          }
        }
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
        loanId: finalLoanId.toString(),
        collectedBy: collectedBy,
        emiPaidCount: loan.emiPaidCount + 1,
        totalPaidAmount: loan.totalPaidAmount + parseFloat(amount)
      }
    });
    
  } catch (error) {
    console.error('❌ Error recording EMI payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    // Filter by customer ID (with cleaning)
    if (customerId) {
      const cleanedCustomerId = cleanId(customerId);
      if (mongoose.Types.ObjectId.isValid(cleanedCustomerId)) {
        query.customerId = new mongoose.Types.ObjectId(cleanedCustomerId);
      } else {
        return NextResponse.json({ 
          success: false,
          error: 'Invalid customer ID format'
        }, { status: 400 });
      }
    }

    // Filter by loan ID (with cleaning)
    if (loanId) {
      const cleanedLoanId = cleanId(loanId);
      if (mongoose.Types.ObjectId.isValid(cleanedLoanId)) {
        query.loanId = new mongoose.Types.ObjectId(cleanedLoanId);
      } else {
        return NextResponse.json({ 
          success: false,
          error: 'Invalid loan ID format'
        }, { status: 400 });
      }
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
      .populate('loanId', 'loanNumber loanType emiAmount amount emiPaidCount totalPaidAmount')
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

    // Clean payment ID
    const cleanedPaymentId = cleanId(paymentId);
    if (!mongoose.Types.ObjectId.isValid(cleanedPaymentId)) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid payment ID format'
      }, { status: 400 });
    }

    console.log('🟡 Updating EMI payment:', cleanedPaymentId);

    const payment = await EMIPayment.findById(cleanedPaymentId);
    if (!payment) {
      return NextResponse.json({ 
        success: false,
        error: 'EMI payment not found'
      }, { status: 404 });
    }

    // Clean any IDs in the update data
    const cleanedData = { ...data };
    if (cleanedData.customerId) {
      cleanedData.customerId = cleanId(cleanedData.customerId);
    }
    if (cleanedData.loanId) {
      cleanedData.loanId = cleanId(cleanedData.loanId);
    }

    // Update allowed fields
    const allowedUpdates = ['amount', 'status', 'paymentDate', 'collectedBy', 'paymentMethod', 'notes', 'isVerified'];
    allowedUpdates.forEach(field => {
      if (cleanedData[field] !== undefined) {
        payment[field] = cleanedData[field];
      }
    });

    await payment.save();

    console.log('✅ EMI payment updated successfully:', cleanedPaymentId);

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