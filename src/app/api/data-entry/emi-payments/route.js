import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

// Import shared utilities
import {
  getCurrentDateString,
  isValidYYYYMMDD,
  formatToYYYYMMDD,
  formatToDDMMYYYY,
  addDays,
  cleanId,
  validateAndCleanObjectId,
  calculateInstallmentNumber,
  calculateExpectedDueDate,
  generatePartialChainId,
  calculateLastScheduledEmiDate,
  calculateNextScheduledEmiDate
} from '@/src/app/data-entry/utils/emiPaymentUtils';

// Check for duplicate payments
const checkForDuplicatePayments = async (cleanedCustomerId, finalLoanId, finalLoanNumber, paymentType, paymentDate, advanceFromDate, advanceToDate) => {
  const formattedPaymentDate = formatToYYYYMMDD(paymentDate);
  
  if (paymentType === 'single') {
    const existingPayment = await EMIPayment.findOne({
      $or: [
        { loanId: finalLoanId },
        { customerId: cleanedCustomerId, loanNumber: finalLoanNumber }
      ],
      paymentDate: formattedPaymentDate,
      status: { $ne: 'cancelled' }
    });

    return existingPayment;
  } else if (paymentType === 'advance') {
    const advanceFromStr = formatToYYYYMMDD(advanceFromDate);
    const advanceToStr = formatToYYYYMMDD(advanceToDate);
    
    const existingPayments = await EMIPayment.find({
      $or: [
        { loanId: finalLoanId },
        { customerId: cleanedCustomerId, loanNumber: finalLoanNumber }
      ],
      paymentDate: {
        $gte: advanceFromStr,
        $lte: advanceToStr
      },
      status: { $ne: 'cancelled' }
    });

    if (existingPayments.length > 0) {
      const conflictingDates = existingPayments.map(p => p.paymentDate);
      
      return {
        isDuplicate: true,
        conflictingDates: [...new Set(conflictingDates)],
        existingPayments: existingPayments
      };
    }
  }
  
  return null;
};

// ✅ CREATE NEW PAYMENT
export async function POST(request) {
  try {
    await connectDB();
    
    const data = await request.json();
    
    console.log('🟡 Creating new EMI payment:', JSON.stringify(data, null, 2));
    
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
      advanceTotalAmount,
      originalEmiAmount,
      installmentNumber: providedInstallmentNumber
    } = data;

    // Basic validation
    if (!customerId || !customerName || !amount || !paymentDate || !collectedBy) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer ID, customer name, amount, payment date, and collected by are required'
      }, { status: 400 });
    }

    const paymentDateStr = formatToYYYYMMDD(paymentDate);
    if (!paymentDateStr || !isValidYYYYMMDD(paymentDateStr)) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid payment date format. Must be YYYY-MM-DD'
      }, { status: 400 });
    }

    // Advance payment validation
    if (paymentType === 'advance') {
      if (!advanceFromDate || !advanceToDate) {
        return NextResponse.json({ 
          success: false,
          error: 'From date and to date are required for advance payments'
        }, { status: 400 });
      }
    }

    // Validate customer
    const customerIdValidation = validateAndCleanObjectId(customerId, 'Customer ID');
    if (!customerIdValidation.isValid) {
      return NextResponse.json({ 
        success: false,
        error: customerIdValidation.error
      }, { status: 400 });
    }

    const cleanedCustomerId = customerIdValidation.cleanedId;
    const customer = await Customer.findById(cleanedCustomerId);
    if (!customer) {
      return NextResponse.json({ 
        success: false,
        error: `Customer not found with ID: ${cleanedCustomerId}`
      }, { status: 404 });
    }

    // Find loan
    let loan = null;
    let finalLoanId = null;
    let finalLoanNumber = loanNumber || 'N/A';

    if (loanId && !loanId.includes('fallback_')) {
      const loanIdValidation = validateAndCleanObjectId(loanId, 'Loan ID');
      if (loanIdValidation.isValid) {
        loan = await Loan.findOne({ 
          _id: loanIdValidation.cleanedId, 
          customerId: cleanedCustomerId 
        });
        
        if (loan) {
          finalLoanId = loan._id;
          finalLoanNumber = loan.loanNumber || finalLoanNumber;
        }
      }
    }

    if (!loan) {
      loan = await Loan.findOne({ 
        customerId: cleanedCustomerId,
        status: 'active'
      }).sort({ createdAt: -1 });

      if (loan) {
        finalLoanId = loan._id;
        finalLoanNumber = loan.loanNumber || finalLoanNumber;
      }
    }

    // Calculate EMI amount and installment
    let correctEmiAmount = loan?.emiAmount || 0;
    let currentInstallmentNumber = providedInstallmentNumber || 1;

    if (loan && !providedInstallmentNumber) {
      currentInstallmentNumber = calculateInstallmentNumber(
        loan.emiStartDate || loan.dateApplied,
        loan.loanType,
        paymentDateStr
      );
    }

    const expectedDueDate = calculateExpectedDueDate(
      loan?.emiStartDate || loan?.dateApplied || paymentDateStr,
      loan?.loanType || 'Daily',
      currentInstallmentNumber
    );

    // Check for duplicate payments
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
          error: `EMI payment for date ${formatToDDMMYYYY(paymentDateStr)} already exists.`,
          existingPayment: {
            id: duplicateCheck._id,
            amount: duplicateCheck.amount,
            date: duplicateCheck.paymentDate,
            status: duplicateCheck.status
          }
        }, { status: 409 });
      }
    }

    // Create payment(s)
    let payments = [];

    if (paymentType === 'advance') {
      // Handle advance payments (same as before)
      // ... keep your existing advance payment logic
    } else {
      // ✅ FIXED: Create single payment with chain info
      const paymentData = {
        customerId: cleanedCustomerId,
        customerName,
        paymentDate: paymentDateStr,
        amount: parseFloat(amount),
        status: status,
        collectedBy,
        paymentMethod,
        transactionId: transactionId || null,
        notes: notes || `EMI payment for ${customerName}`,
        isVerified: false,
        paymentType: 'single',
        isAdvancePayment: false,
        originalEmiAmount: originalEmiAmount || correctEmiAmount || parseFloat(amount),
        installmentNumber: currentInstallmentNumber,
        expectedDueDate: expectedDueDate
      };

      if (finalLoanId) {
        paymentData.loanId = finalLoanId;
      }
      if (finalLoanNumber && finalLoanNumber !== 'N/A') {
        paymentData.loanNumber = finalLoanNumber;
      }

      // ✅ FIXED: Handle partial chain creation
      if (status === 'Partial') {
        if (finalLoanId) {
          paymentData.partialChainId = generatePartialChainId(
            finalLoanId,
            expectedDueDate,
            currentInstallmentNumber
          );
        } else {
          paymentData.partialChainId = `temp_${Date.now()}`;
        }
        paymentData.isChainComplete = false;
        paymentData.installmentTotalAmount = originalEmiAmount || correctEmiAmount || parseFloat(amount);
      } else {
        paymentData.isChainComplete = true;
        paymentData.installmentTotalAmount = parseFloat(amount);
        paymentData.installmentPaidAmount = parseFloat(amount);
      }

      const payment = new EMIPayment(paymentData);
      await payment.save();
      payments.push(payment);
    }

    // Update customer total
    if (payments.length > 0) {
      const lastPaymentDate = payments[0].paymentDate;
      const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      
      await Customer.findByIdAndUpdate(cleanedCustomerId, {
        lastPaymentDate: lastPaymentDate,
        $inc: { totalPaid: totalPaymentAmount },
        updatedAt: new Date()
      });
    }

    // Update loan statistics
    if (loan && finalLoanId) {
      try {
        await updateLoanStatistics(loan._id, status, paymentDateStr);
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan statistics:', loanUpdateError);
      }
    }

    console.log('✅ EMI payment created successfully:', payments.length, 'payments created');

    return NextResponse.json({ 
      success: true,
      message: paymentType === 'advance' 
        ? `Advance EMI payment recorded successfully as ${payments.length} payments`
        : `EMI payment of ₹${amount} recorded successfully for ${customerName}`,
      data: {
        paymentIds: payments.map(p => p._id),
        partialChainId: payments[0]?.partialChainId || null,
        isChainComplete: payments[0]?.isChainComplete || true,
        originalEmiAmount: payments[0]?.originalEmiAmount || (originalEmiAmount || correctEmiAmount || parseFloat(amount)),
        installmentNumber: currentInstallmentNumber
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating EMI payment:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message
    }, { status: 500 });
  }
}

// ✅ LIST PAYMENTS
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const loanId = searchParams.get('loanId');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit')) || 50;

    let query = {};

    if (customerId) {
      const cleanedCustomerId = cleanId(customerId);
      if (mongoose.Types.ObjectId.isValid(cleanedCustomerId)) {
        query.customerId = new mongoose.Types.ObjectId(cleanedCustomerId);
      }
    }

    if (loanId) {
      const cleanedLoanId = cleanId(loanId);
      if (mongoose.Types.ObjectId.isValid(cleanedLoanId)) {
        query.loanId = new mongoose.Types.ObjectId(cleanedLoanId);
      }
    }

    if (date) {
      const dateStr = formatToYYYYMMDD(date);
      if (dateStr) {
        query.paymentDate = dateStr;
      }
    }

    const payments = await EMIPayment.find(query)
      .select('_id customerId customerName loanId loanNumber paymentDate amount status collectedBy notes paymentType partialChainId chainParentId installmentTotalAmount originalEmiAmount installmentNumber expectedDueDate')
      .populate('customerId', 'name phone')
      .populate('loanId', 'loanNumber loanType emiAmount')
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ 
      success: true,
      data: payments
    });
    
  } catch (error) {
    console.error('❌ Error fetching EMI payments:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Helper function to update loan statistics
async function updateLoanStatistics(loanId, paymentStatus, paymentDate) {
  const allLoanPayments = await EMIPayment.find({
    loanId: loanId,
    status: { $in: ['Paid', 'Partial', 'Advance'] }
  });
  
  const fullLoanPayments = await EMIPayment.find({
    loanId: loanId,
    status: { $in: ['Paid', 'Advance'] }
  });
  
  const totalPaidAmount = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
  const emiPaidCount = fullLoanPayments.length;
  
  const loan = await Loan.findById(loanId);
  if (!loan) return;

  let updateData = {
    totalPaidAmount: totalPaidAmount,
    remainingAmount: Math.max(0, loan.amount - totalPaidAmount),
    updatedAt: new Date()
  };

  if (paymentStatus === 'Partial') {
    updateData.nextEmiDate = paymentDate;
  } else {
    const lastScheduledEmiDate = calculateLastScheduledEmiDate(
      loan.emiStartDate || loan.dateApplied,
      loan.loanType,
      emiPaidCount
    );
    
    const nextScheduledEmiDate = calculateNextScheduledEmiDate(
      lastScheduledEmiDate,
      loan.loanType,
      loan.emiStartDate || loan.dateApplied,
      emiPaidCount,
      loan.totalEmiCount
    );
    
    updateData.emiPaidCount = emiPaidCount;
    updateData.lastEmiDate = lastScheduledEmiDate;
    updateData.nextEmiDate = nextScheduledEmiDate;
  }

  if (emiPaidCount >= loan.totalEmiCount) {
    updateData.status = 'completed';
    updateData.nextEmiDate = null;
  }

  await Loan.findByIdAndUpdate(loanId, updateData);
}