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

// CORRECTED: Calculate next scheduled EMI date based on last scheduled EMI date
function calculateNextScheduledEmiDate(lastScheduledEmiDate, loanType, emiStartDate) {
  if (!lastScheduledEmiDate) return emiStartDate;
  
  const date = new Date(lastScheduledEmiDate);
  date.setHours(0, 0, 0, 0);
  
  switch(loanType) {
    case 'Daily':
      // For Daily loans, next scheduled EMI is always next calendar day
      date.setDate(date.getDate() + 1);
      break;
    case 'Weekly':
      // For Weekly loans, next scheduled EMI is exactly 7 days after last scheduled EMI
      // NOT 7 days after payment date
      date.setDate(date.getDate() + 7);
      break;
    case 'Monthly':
      // For Monthly loans, same day next month
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split('T')[0];
}

// NEW: Calculate last scheduled EMI date (not payment date)
function calculateLastScheduledEmiDate(emiStartDate, loanType, totalEmisPaid) {
  if (!emiStartDate || totalEmisPaid <= 0) return emiStartDate;
  
  const startDate = new Date(emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  let lastScheduledDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      // For Daily loans, last scheduled EMI is startDate + (totalEmisPaid - 1) days
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
      break;
    case 'Weekly':
      // For Weekly loans, last scheduled EMI is startDate + ((totalEmisPaid - 1) * 7) days
      lastScheduledDate.setDate(startDate.getDate() + ((totalEmisPaid - 1) * 7));
      break;
    case 'Monthly':
      // For Monthly loans, last scheduled EMI is startDate + (totalEmisPaid - 1) months
      lastScheduledDate.setMonth(startDate.getMonth() + (totalEmisPaid - 1));
      break;
    default:
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
  }
  
  return lastScheduledDate.toISOString().split('T')[0];
}

// Enhanced duplicate payment check for both single and advance payments
const checkForDuplicatePayments = async (cleanedCustomerId, finalLoanId, finalLoanNumber, paymentType, paymentDate, advanceFromDate, advanceToDate) => {
  const formattedPaymentDate = new Date(paymentDate).toISOString().split('T')[0];
  
  if (paymentType === 'single') {
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

    return existingPayment;
  } else if (paymentType === 'advance') {
    const advanceFrom = new Date(advanceFromDate);
    const advanceTo = new Date(advanceToDate);
    
    const existingPayments = await EMIPayment.find({
      $or: [
        { loanId: finalLoanId },
        { customerId: cleanedCustomerId, loanNumber: finalLoanNumber }
      ],
      paymentDate: {
        $gte: advanceFrom,
        $lte: advanceTo
      },
      status: { $ne: 'cancelled' }
    });

    if (existingPayments.length > 0) {
      const conflictingDates = existingPayments.map(p => 
        new Date(p.paymentDate).toISOString().split('T')[0]
      );
      
      return {
        isDuplicate: true,
        conflictingDates: [...new Set(conflictingDates)],
        existingPayments: existingPayments
      };
    }
  }
  
  return null;
};

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

    // Try to find loan by provided loanId
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

    // If no loan found by ID, try to find any loan for this customer
    if (!loan) {
      console.log('🔍 No loan found by ID, searching for any loan for customer...');
      
      loan = await Loan.findOne({ 
        customerId: cleanedCustomerId,
        status: 'active'
      }).sort({ createdAt: -1 });

      if (!loan) {
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

    // If still no loan found, check if we should create a temporary loan record
    if (!loan) {
      console.log('❌ No existing loan found for customer. Checking if we can proceed...');
      
      if (customer.loanAmount && customer.emiAmount) {
        console.log('⚠️ Customer has loan data but no loan record. Creating temporary payment...');
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

    // Enhanced duplicate payment check
    const duplicateCheck = await checkForDuplicatePayments(
      cleanedCustomerId, 
      finalLoanId, 
      finalLoanNumber, 
      paymentType, 
      paymentDate, 
      advanceFromDate, 
      advanceToDate
    );

    if (duplicateCheck) {
      if (paymentType === 'single') {
        return NextResponse.json({ 
          success: false,
          error: `EMI payment for date ${new Date(paymentDate).toISOString().split('T')[0]} already exists. Please use a different date or edit the existing payment.`,
          existingPayment: {
            id: duplicateCheck._id,
            amount: duplicateCheck.amount,
            date: duplicateCheck.paymentDate,
            status: duplicateCheck.status
          }
        }, { status: 409 });
      } else if (paymentType === 'advance' && duplicateCheck.isDuplicate) {
        return NextResponse.json({ 
          success: false,
          error: `Advance payment period conflicts with existing payments on dates: ${duplicateCheck.conflictingDates.join(', ')}`,
          conflictingDates: duplicateCheck.conflictingDates,
          existingPayments: duplicateCheck.existingPayments.map(p => ({
            id: p._id,
            date: p.paymentDate,
            amount: p.amount,
            status: p.status
          }))
        }, { status: 409 });
      }
    }

    // Create EMI payment record(s)
    let payments = [];
    const paymentDateObj = new Date(paymentDate);

    if (paymentType === 'advance') {
      const advanceFrom = new Date(advanceFromDate);
      const advanceTo = new Date(advanceToDate);
      
      let emiCount = 1;
      let currentDate = new Date(advanceFrom);
      
      if (loan) {
        switch(loan.loanType) {
          case 'Daily':
            const dailyDiff = Math.ceil((advanceTo - advanceFrom) / (1000 * 60 * 60 * 24)) + 1;
            emiCount = Math.max(dailyDiff, 1);
            break;
          case 'Weekly':
            const weeklyDiff = Math.ceil((advanceTo - advanceFrom) / (1000 * 60 * 60 * 24 * 7)) + 1;
            emiCount = Math.max(weeklyDiff, 1);
            break;
          case 'Monthly':
            const monthDiff = (advanceTo.getFullYear() - advanceFrom.getFullYear()) * 12 + 
                             (advanceTo.getMonth() - advanceFrom.getMonth()) + 1;
            emiCount = Math.max(monthDiff, 1);
            break;
          default:
            emiCount = parseInt(advanceEmiCount) || 1;
        }
      } else {
        emiCount = parseInt(advanceEmiCount) || Math.ceil((advanceTo - advanceFrom) / (1000 * 60 * 60 * 24)) + 1;
      }
      
      console.log('📅 Advance Payment Calculation:', {
        from: advanceFrom.toISOString(),
        to: advanceTo.toISOString(),
        loanType: loan?.loanType,
        calculatedEmiCount: emiCount,
        providedEmiCount: advanceEmiCount
      });

      const singleEmiAmount = parseFloat(amount) / emiCount;
      let paymentsCreated = [];
      
      currentDate = new Date(advanceFrom);
      
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

        if (finalLoanId) {
          paymentData.loanId = finalLoanId;
        }
        if (finalLoanNumber && finalLoanNumber !== 'N/A') {
          paymentData.loanNumber = finalLoanNumber;
        }

        const payment = new EMIPayment(paymentData);
        await payment.save();
        payments.push(payment);
        paymentsCreated.push({
          date: currentDate.toISOString().split('T')[0],
          amount: singleEmiAmount
        });
        
        // Move to next EMI date based on loan type
        if (loan) {
          switch(loan.loanType) {
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
        } else {
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (currentDate > new Date(advanceTo)) {
          break;
        }
      }
      
      console.log(`✅ Created ${payments.length} advance payment records:`, paymentsCreated);
    } else {
      // Single payment
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

        // CRITICAL FIX: Calculate last scheduled EMI date and next scheduled EMI date
        const lastScheduledEmiDate = calculateLastScheduledEmiDate(
          loan.emiStartDate || loan.dateApplied,
          loan.loanType,
          emiPaidCount
        );
        
        const nextScheduledEmiDate = calculateNextScheduledEmiDate(
          lastScheduledEmiDate,
          loan.loanType,
          loan.emiStartDate || loan.dateApplied
        );

        console.log('📅 EMI Schedule Calculation:', {
          emiStartDate: loan.emiStartDate || loan.dateApplied,
          loanType: loan.loanType,
          emiPaidCount: emiPaidCount,
          lastScheduledEmiDate: lastScheduledEmiDate,
          nextScheduledEmiDate: nextScheduledEmiDate,
          lastPaymentDate: new Date(paymentDate) // This is when payment was made
        });

        // Update loan with CORRECT dates
        const updateData = {
          emiPaidCount: emiPaidCount,
          totalPaidAmount: totalPaidAmount,
          remainingAmount: Math.max(loan.amount - totalPaidAmount, 0),
          // IMPORTANT: lastEmiDate should be the last scheduled EMI date, not payment date
          lastEmiDate: lastScheduledEmiDate,
          // IMPORTANT: nextEmiDate should be the next scheduled EMI date
          nextEmiDate: nextScheduledEmiDate,
          // Keep payment date separately if needed
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
        console.log('✅ Loan statistics updated correctly with:', {
          payments: payments.length,
          lastEmiDate: updateData.lastEmiDate,
          nextEmiDate: updateData.nextEmiDate,
          emiPaidCount: updateData.emiPaidCount
        });
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
      .populate('loanId', 'loanNumber loanType emiAmount amount emiPaidCount totalPaidAmount lastEmiDate nextEmiDate')
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
    
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, paymentDate, status, notes, collectedBy } = body;

    // Validate required fields
    if (!amount || !paymentDate) {
      return NextResponse.json(
        { success: false, error: 'Amount and payment date are required' },
        { status: 400 }
      );
    }

    // Clean payment ID
    const cleanedPaymentId = cleanId(paymentId);
    if (!mongoose.Types.ObjectId.isValid(cleanedPaymentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment ID format' },
        { status: 400 }
      );
    }

    console.log('🟡 Updating EMI payment:', { paymentId: cleanedPaymentId, updates: body });

    // Find the payment first to get original data
    const payment = await EMIPayment.findById(cleanedPaymentId);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Store original values for comparison
    const originalAmount = payment.amount;
    const originalPaymentDate = payment.paymentDate;
    const originalStatus = payment.status;

    // Update payment fields
    payment.amount = parseFloat(amount);
    payment.paymentDate = new Date(paymentDate);
    payment.status = status || payment.status;
    payment.notes = notes || payment.notes;
    payment.collectedBy = collectedBy || payment.collectedBy;
    payment.updatedAt = new Date();

    // Add edit history note
    const editNote = `Payment edited: Amount changed from ₹${originalAmount} to ₹${amount}`;
    if (originalPaymentDate.toISOString() !== new Date(paymentDate).toISOString()) {
      payment.notes = `${editNote}, Date changed from ${originalPaymentDate.toLocaleDateString()} to ${new Date(paymentDate).toLocaleDateString()}. ${payment.notes || ''}`;
    } else {
      payment.notes = `${editNote}. ${payment.notes || ''}`;
    }

    await payment.save();

    console.log('✅ EMI payment updated successfully:', cleanedPaymentId);

    // Update loan statistics if payment has a loan ID
    if (payment.loanId) {
      try {
        const loanPayments = await EMIPayment.find({
          loanId: payment.loanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        const totalPaidAmount = loanPayments.reduce((sum, p) => sum + p.amount, 0);
        const emiPaidCount = loanPayments.length;
        
        // Update loan with correct schedule dates
        const loan = await Loan.findById(payment.loanId);
        if (loan) {
          const lastScheduledEmiDate = calculateLastScheduledEmiDate(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            emiPaidCount
          );
          
          const nextScheduledEmiDate = calculateNextScheduledEmiDate(
            lastScheduledEmiDate,
            loan.loanType,
            loan.emiStartDate || loan.dateApplied
          );
          
          await Loan.findByIdAndUpdate(payment.loanId, {
            totalPaidAmount: totalPaidAmount,
            emiPaidCount: emiPaidCount,
            remainingAmount: Math.max(loan.amount - totalPaidAmount, 0),
            lastEmiDate: lastScheduledEmiDate,
            nextEmiDate: nextScheduledEmiDate,
            updatedAt: new Date()
          });

          console.log('✅ Loan statistics updated after payment edit:', {
            lastEmiDate: lastScheduledEmiDate,
            nextEmiDate: nextScheduledEmiDate
          });
        }
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan statistics after edit:', loanUpdateError);
      }
    }

    // Update customer total paid if needed
    if (originalAmount !== parseFloat(amount)) {
      try {
        const customerPayments = await EMIPayment.find({
          customerId: payment.customerId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        const totalCustomerPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
        
        await Customer.findByIdAndUpdate(payment.customerId, {
          totalPaid: totalCustomerPaid,
          updatedAt: new Date()
        });

        console.log('✅ Customer total paid updated after payment edit');
      } catch (customerUpdateError) {
        console.error('⚠️ Error updating customer total paid:', customerUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'EMI payment updated successfully',
      data: payment
    });

  } catch (error) {
    console.error('❌ Error updating EMI payment:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update EMI payment: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE method to delete EMI payment
export async function DELETE(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Clean payment ID
    const cleanedPaymentId = cleanId(paymentId);
    if (!mongoose.Types.ObjectId.isValid(cleanedPaymentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment ID format' },
        { status: 400 }
      );
    }

    console.log('🟡 Deleting EMI payment:', cleanedPaymentId);

    // Find the payment first to get related data
    const payment = await EMIPayment.findById(cleanedPaymentId);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Store related data before deletion
    const { loanId, customerId, amount } = payment;

    // Delete the payment
    await EMIPayment.findByIdAndDelete(cleanedPaymentId);

    console.log('✅ EMI payment deleted successfully:', cleanedPaymentId);

    // Update loan statistics if payment had a loan ID
    if (loanId) {
      try {
        const loanPayments = await EMIPayment.find({
          loanId: loanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        const totalPaidAmount = loanPayments.reduce((sum, p) => sum + p.amount, 0);
        const emiPaidCount = loanPayments.length;

        // Get loan to calculate remaining amount and update dates
        const loan = await Loan.findById(loanId);
        if (loan) {
          const lastScheduledEmiDate = calculateLastScheduledEmiDate(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            emiPaidCount
          );
          
          const nextScheduledEmiDate = calculateNextScheduledEmiDate(
            lastScheduledEmiDate,
            loan.loanType,
            loan.emiStartDate || loan.dateApplied
          );
          
          await Loan.findByIdAndUpdate(loanId, {
            emiPaidCount: emiPaidCount,
            totalPaidAmount: totalPaidAmount,
            remainingAmount: Math.max(loan.amount - totalPaidAmount, 0),
            lastEmiDate: lastScheduledEmiDate,
            nextEmiDate: nextScheduledEmiDate,
            updatedAt: new Date()
          });

          console.log('✅ Loan statistics updated after payment deletion:', {
            lastEmiDate: lastScheduledEmiDate,
            nextEmiDate: nextScheduledEmiDate
          });
        }
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan statistics after deletion:', loanUpdateError);
      }
    }

    // Update customer total paid
    if (customerId) {
      try {
        const customerPayments = await EMIPayment.find({
          customerId: customerId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        const totalCustomerPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
        
        await Customer.findByIdAndUpdate(customerId, {
          totalPaid: totalCustomerPaid,
          updatedAt: new Date()
        });

        console.log('✅ Customer total paid updated after payment deletion');
      } catch (customerUpdateError) {
        console.error('⚠️ Error updating customer total paid:', customerUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'EMI payment deleted successfully',
      data: {
        deletedPaymentId: cleanedPaymentId,
        amount: amount,
        paymentDate: payment.paymentDate
      }
    });

  } catch (error) {
    console.error('❌ Error deleting EMI payment:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete EMI payment: ' + error.message 
      },
      { status: 500 }
    );
  }
}