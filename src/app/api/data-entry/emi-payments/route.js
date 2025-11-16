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
  return id.replace(/(_default|_temp|_new|fallback_)/, '');
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
      notes = '',
      paymentType = 'single',
      advanceFromDate,
      advanceToDate,
      advanceEmiCount,
      advanceTotalAmount
    } = data;

    // Validate required fields
    if (!customerId || !customerName || !amount || !paymentDate || !collectedBy) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer ID, customer name, amount, payment date, and collected by are required'
      }, { status: 400 });
    }

    // Handle advance payments validation
    if (paymentType === 'advance') {
      if (!advanceFromDate || !advanceToDate) {
        return NextResponse.json({ 
          success: false,
          error: 'From date and to date are required for advance payments'
        }, { status: 400 });
      }

      if (new Date(advanceFromDate) > new Date(advanceToDate)) {
        return NextResponse.json({ 
          success: false,
          error: 'From date cannot be after to date for advance payments'
        }, { status: 400 });
      }

      // Validate advance EMI count
      if (!advanceEmiCount || advanceEmiCount < 1) {
        return NextResponse.json({ 
          success: false,
          error: 'Valid EMI count is required for advance payments'
        }, { status: 400 });
      }
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

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Payment amount must be greater than 0'
      }, { status: 400 });
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
    let finalLoanNumber = loanNumber || 'N/A';

    console.log('🔍 Loan search parameters:', { 
      originalLoanId: loanId,
      loanNumber, 
      customerId: cleanedCustomerId.toString(),
      customerName: customerName
    });

    // STRATEGY 1: Try to find loan by provided loanId (if valid)
    if (loanId && !loanId.includes('fallback_')) {
      const loanIdValidation = validateAndCleanObjectId(loanId, 'Loan ID');
      if (loanIdValidation.isValid) {
        console.log('🔍 Searching for loan by provided ID:', loanIdValidation.cleanedId.toString());
        loan = await Loan.findOne({ 
          _id: loanIdValidation.cleanedId, 
          customerId: cleanedCustomerId 
        });
        
        if (loan) {
          finalLoanId = loan._id;
          finalLoanNumber = loan.loanNumber || finalLoanNumber;
          console.log('✅ Found loan by provided ID:', { 
            loanId: finalLoanId.toString(), 
            loanNumber: finalLoanNumber
          });
        }
      }
    }

    // STRATEGY 2: If no loan found by ID, try to find any loan for this customer
    if (!loan) {
      console.log('🔍 No loan found by ID, searching for any loan for customer...');
      
      // Try to find the most recent active loan
      loan = await Loan.findOne({ 
        customerId: cleanedCustomerId,
        status: 'active'
      }).sort({ createdAt: -1 });

      if (!loan) {
        // Try to find any loan (even inactive)
        console.log('⚠️ No active loan found, searching for any loan...');
        loan = await Loan.findOne({ 
          customerId: cleanedCustomerId 
        }).sort({ createdAt: -1 });
      }

      if (loan) {
        finalLoanId = loan._id;
        finalLoanNumber = loan.loanNumber || finalLoanNumber;
        console.log('✅ Found existing loan for customer:', { 
          loanId: finalLoanId.toString(), 
          loanNumber: finalLoanNumber,
          status: loan.status
        });
      }
    }

    // STRATEGY 3: If still no loan found, check if we should create a temporary loan record
    if (!loan) {
      console.log('❌ No existing loan found for customer. Checking if we can proceed...');
      
      // Check if customer has loan data that suggests a loan should exist
      if (customer.loanAmount && customer.emiAmount) {
        console.log('⚠️ Customer has loan data but no loan record. Creating temporary payment...');
        
        // We'll proceed without a loan ID but with a note
        finalLoanNumber = loanNumber || `TEMP-${customer.customerNumber}`;
        console.log('🟡 Proceeding with temporary loan reference:', finalLoanNumber);
      } else {
        console.log('❌ Customer has no loan data and no loan record');
        return NextResponse.json({ 
          success: false,
          error: `No loan found for customer ${customerName}. Please ensure the customer has an approved loan in the system before recording EMI payments.`,
          details: {
            customerId: cleanedCustomerId.toString(),
            customerName: customerName,
            hasLoanData: !!(customer.loanAmount && customer.emiAmount)
          }
        }, { status: 404 });
      }
    }

    // Format payment date to YYYY-MM-DD for comparison
    const formattedPaymentDate = new Date(paymentDate).toISOString().split('T')[0];

    // Check if EMI payment already exists for this date (only if we have a loan ID and it's single payment)
    if (finalLoanId && paymentType === 'single') {
      const existingPayment = await EMIPayment.findOne({
        $or: [
          { loanId: finalLoanId },
          { customerId: cleanedCustomerId, loanNumber: finalLoanNumber }
        ],
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

    // Create EMI payment record(s)
    let payments = [];
    const paymentDateObj = new Date(paymentDate);

    if (paymentType === 'advance') {
      // For advance payments, create multiple payment records
      const advanceFrom = new Date(advanceFromDate);
      const advanceTo = new Date(advanceToDate);
      const emiCount = parseInt(advanceEmiCount) || 1;
      const singleEmiAmount = parseFloat(amount) / emiCount;
      
      // Create payment for each date in the advance period
      let currentDate = new Date(advanceFrom);
      const paymentsCreated = [];
      
      for (let i = 0; i < emiCount; i++) {
        const paymentData = {
          customerId: cleanedCustomerId,
          customerName,
          paymentDate: new Date(currentDate),
          amount: singleEmiAmount,
          status: 'Advance',
          collectedBy,
          paymentMethod,
          transactionId: transactionId || null,
          notes: `Advance EMI ${i + 1}/${emiCount} for period ${new Date(advanceFrom).toLocaleDateString()} to ${new Date(advanceTo).toLocaleDateString()}${notes ? ` - ${notes}` : ''}`,
          isVerified: false,
          paymentType: 'advance',
          isAdvancePayment: true,
          advanceFromDate: new Date(advanceFrom),
          advanceToDate: new Date(advanceTo),
          advanceEmiCount: emiCount,
          advanceTotalAmount: parseFloat(amount)
        };

        // Only add loan data if we have it
        if (finalLoanId) {
          paymentData.loanId = finalLoanId;
        }
        if (finalLoanNumber && finalLoanNumber !== 'N/A') {
          paymentData.loanNumber = finalLoanNumber;
        }

        const payment = new EMIPayment(paymentData);
        await payment.save();
        payments.push(payment);
        paymentsCreated.push(payment._id);
        
        // Move to next date based on loan type
        switch(loan?.loanType) {
          case 'Daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'Weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'Monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          default:
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Stop if we've exceeded the advance to date
        if (currentDate > new Date(advanceTo)) {
          break;
        }
      }
      
      console.log(`✅ Created ${payments.length} advance payment records:`, paymentsCreated);
      
    } else {
      // Single payment (existing logic)
      const paymentData = {
        customerId: cleanedCustomerId,
        customerName,
        paymentDate: paymentDateObj,
        amount: parseFloat(amount),
        status: status,
        collectedBy,
        paymentMethod,
        transactionId: transactionId || null,
        notes: notes || `EMI payment for ${customerName}`,
        isVerified: false,
        paymentType: 'single',
        isAdvancePayment: false
      };

      // Only add loan data if we have it
      if (finalLoanId) {
        paymentData.loanId = finalLoanId;
      }
      if (finalLoanNumber && finalLoanNumber !== 'N/A') {
        paymentData.loanNumber = finalLoanNumber;
      }

      const payment = new EMIPayment(paymentData);
      await payment.save();
      payments.push(payment);
    }

    // Update customer's last payment date and total paid
    // Use the first payment for customer updates
    if (payments.length > 0) {
      await Customer.findByIdAndUpdate(cleanedCustomerId, {
        lastPaymentDate: payments[0].paymentDate,
        $inc: { totalPaid: payments.reduce((sum, p) => sum + p.amount, 0) },
        updatedAt: new Date()
      });
    }

    // Update loan statistics if we have a loan
    if (loan && finalLoanId) {
      try {
        const loanPayments = await EMIPayment.find({
          loanId: finalLoanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        const totalPaidAmount = loanPayments.reduce((sum, p) => sum + p.amount, 0);
        const emiPaidCount = loanPayments.length;

        // Update loan with all payment history
        const updateData = {
          emiPaidCount: emiPaidCount,
          totalPaidAmount: totalPaidAmount,
          remainingAmount: Math.max(loan.amount - totalPaidAmount, 0),
          lastPaymentDate: new Date(paymentDate),
          updatedAt: new Date()
        };

        // Add all payments to emiHistory
        if (payments.length > 0) {
          updateData.$push = {
            emiHistory: {
              $each: payments.map(payment => ({
                _id: payment._id,
                paymentDate: payment.paymentDate,
                amount: payment.amount,
                status: payment.status,
                collectedBy: payment.collectedBy,
                notes: payment.notes,
                createdAt: new Date(),
                isAdvance: payment.paymentType === 'advance',
                paymentType: payment.paymentType,
                advanceFromDate: payment.advanceFromDate,
                advanceToDate: payment.advanceToDate,
                advanceEmiCount: payment.advanceEmiCount
              }))
            }
          };
        }

        await Loan.findByIdAndUpdate(finalLoanId, updateData);
        console.log('✅ Loan statistics updated successfully with', payments.length, 'payments');
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan statistics:', loanUpdateError);
      }
    } else {
      console.log('ℹ️ No loan record to update - payment recorded without loan association');
    }

    console.log('✅ EMI payment recorded successfully:', payments.length, 'payments created');

    const responseMessage = paymentType === 'advance' 
      ? `Advance EMI payment of ₹${amount} recorded successfully as ${payments.length} payments for ${advanceEmiCount || 1} periods (${new Date(advanceFromDate).toLocaleDateString()} to ${new Date(advanceToDate).toLocaleDateString()})`
      : `EMI payment of ₹${amount} recorded successfully for ${customerName}${finalLoanId ? ` (Loan: ${finalLoanNumber})` : ' (Temporary - No Loan Record)'}`;

    return NextResponse.json({ 
      success: true,
      message: responseMessage,
      data: {
        paymentIds: payments.map(p => p._id),
        customerName: customerName,
        amount: amount,
        loanNumber: finalLoanNumber,
        paymentDate: paymentDate,
        loanId: finalLoanId ? finalLoanId.toString() : null,
        collectedBy: collectedBy,
        hasLoanRecord: !!finalLoanId,
        paymentType: paymentType,
        isAdvance: paymentType === 'advance',
        paymentCount: payments.length,
        // Include advance payment details in response
        advanceFromDate: advanceFromDate,
        advanceToDate: advanceToDate,
        advanceEmiCount: advanceEmiCount,
        advanceTotalAmount: amount
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
    const paymentType = searchParams.get('paymentType');
    const isAdvance = searchParams.get('isAdvance');
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

    // Filter by payment type
    if (paymentType) {
      query.paymentType = paymentType;
    }

    // Filter by advance payments
    if (isAdvance !== null) {
      query.isAdvancePayment = isAdvance === 'true';
    }

    const payments = await EMIPayment.find(query)
      .populate('customerId', 'name phone businessName area loanNumber')
      .populate('loanId', 'loanNumber loanType emiAmount amount emiPaidCount totalPaidAmount')
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(limit);

    // Get today's total collection - INCLUDE 'Advance' status
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
          status: { $in: ['Paid', 'Partial', 'Advance'] } // INCLUDED 'Advance'
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

    // Get customer-wise today's collection - INCLUDE 'Advance' status
    const customerWiseStats = await EMIPayment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $in: ['Paid', 'Partial', 'Advance'] } // INCLUDED 'Advance'
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

// PUT method to update EMI payment
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

    // Update allowed fields - INCLUDED NEW FIELDS
    const allowedUpdates = [
      'amount', 'status', 'paymentDate', 'collectedBy', 'paymentMethod', 
      'notes', 'isVerified', 'paymentType', 'isAdvancePayment',
      'advanceFromDate', 'advanceToDate', 'advanceEmiCount', 'advanceTotalAmount'
    ];
    
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