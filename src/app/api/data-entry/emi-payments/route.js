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

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
function parseDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') return new Date();
  
  const [year, month, day] = dateString.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date();
  }
  
  return new Date(year, month - 1, day);
}

/**
 * Calculate number of EMIs in a date range based on loan type
 */
function calculateNumberOfEMIs(loanType, startDate, endDate) {
  if (!loanType || !startDate || !endDate) return 0;
  
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  
  if (end < start) return 0;
  
  switch(loanType) {
    case 'Daily':
      // Daily loans: count each day between dates (inclusive)
      const timeDiff = end.getTime() - start.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      return dayDiff + 1; // +1 to include both start and end dates
      
    case 'Weekly':
      // Weekly loans: count weeks
      const weeksDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff + 1;
      
    case 'Monthly':
      // Monthly loans: count months
      const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                         (end.getMonth() - start.getMonth());
      return Math.max(monthsDiff + 1, 1);
      
    default:
      const defaultDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return defaultDiff + 1;
  }
}

/**
 * Calculate correct EMI amount for an installment (considering custom EMI)
 */
function calculateCorrectEmiAmountForInstallment(loan, installmentNumber) {
  if (!loan) return 0;
  
  let emiAmount = loan.emiAmount || 0;
  
  // Check for custom EMI in last installment
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    if (installmentNumber === loan.totalEmiCount) {
      emiAmount = loan.customEmiAmount || loan.emiAmount || 0;
    }
  }
  
  return emiAmount;
}

/**
 * Check for duplicate payments
 */
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

// ==============================================
// API ROUTES
// ==============================================

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
      } else if (paymentType === 'advance' && duplicateCheck.isDuplicate) {
        return NextResponse.json({ 
          success: false,
          error: `Advance payment conflicts with existing payments on dates: ${duplicateCheck.conflictingDates.join(', ')}`,
          conflictingDates: duplicateCheck.conflictingDates
        }, { status: 409 });
      }
    }

    // Create payment(s)
    let payments = [];

    if (paymentType === 'advance') {
      // ✅ FIXED: Handle advance payments - Create individual payments for each installment
      const advanceFromStr = formatToYYYYMMDD(advanceFromDate);
      const advanceToStr = formatToYYYYMMDD(advanceToDate);
      
      if (!advanceFromStr || !advanceToStr) {
        return NextResponse.json({ 
          success: false,
          error: 'Invalid advance date format'
        }, { status: 400 });
      }
      
      // Validate advance date range
      const advanceFromDateObj = parseDateString(advanceFromStr);
      const advanceToDateObj = parseDateString(advanceToStr);
      
      if (advanceToDateObj < advanceFromDateObj) {
        return NextResponse.json({ 
          success: false,
          error: 'End date cannot be before start date'
        }, { status: 400 });
      }
      
      // Calculate number of EMIs based on loan type
      const numberOfEmis = calculateNumberOfEMIs(loan?.loanType || 'Daily', advanceFromStr, advanceToStr);
      
      if (numberOfEmis <= 0) {
        return NextResponse.json({ 
          success: false,
          error: 'Invalid date range for advance payment'
        }, { status: 400 });
      }
      
      // For each installment in the range, create a payment
      for (let i = 0; i < numberOfEmis; i++) {
        let installmentPaymentDate;
        
        // Calculate payment date for this installment
        if (loan?.loanType === 'Daily') {
          installmentPaymentDate = addDays(advanceFromStr, i);
        } else if (loan?.loanType === 'Weekly') {
          installmentPaymentDate = addDays(advanceFromStr, i * 7);
        } else if (loan?.loanType === 'Monthly') {
          const date = new Date(advanceFromDateObj);
          date.setMonth(date.getMonth() + i);
          installmentPaymentDate = formatToYYYYMMDD(date);
        } else {
          installmentPaymentDate = addDays(advanceFromStr, i);
        }
        
        // Calculate installment number
        const currentInstallmentNumber = calculateInstallmentNumber(
          loan?.emiStartDate || loan?.dateApplied || installmentPaymentDate,
          loan?.loanType || 'Daily',
          installmentPaymentDate
        );
        
        // Calculate correct EMI amount for this installment
        const correctEmiAmountForInstallment = calculateCorrectEmiAmountForInstallment(loan, currentInstallmentNumber);
        
        // Calculate expected due date
        const expectedDueDateForInstallment = calculateExpectedDueDate(
          loan?.emiStartDate || loan?.dateApplied || installmentPaymentDate,
          loan?.loanType || 'Daily',
          currentInstallmentNumber
        );
        
        const paymentData = {
          customerId: cleanedCustomerId,
          customerName,
          paymentDate: installmentPaymentDate,
          amount: correctEmiAmountForInstallment,
          status: 'Advance',
          collectedBy,
          paymentMethod,
          transactionId: transactionId || null,
          notes: notes || `Advance EMI payment for ${customerName} (${i+1}/${numberOfEmis})`,
          isVerified: false,
          paymentType: 'advance',
          isAdvancePayment: true,
          advanceFromDate: advanceFromStr,
          advanceToDate: advanceToStr,
          advanceEmiCount: numberOfEmis,
          advanceTotalAmount: correctEmiAmountForInstallment * numberOfEmis,
          originalEmiAmount: correctEmiAmountForInstallment,
          installmentNumber: currentInstallmentNumber,
          expectedDueDate: expectedDueDateForInstallment,
          isChainComplete: true
        };
        
        if (finalLoanId) {
          paymentData.loanId = finalLoanId;
        }
        if (finalLoanNumber && finalLoanNumber !== 'N/A') {
          paymentData.loanNumber = finalLoanNumber;
        }
        
        // Create the payment
        const payment = new EMIPayment(paymentData);
        await payment.save();
        payments.push(payment);
        
        console.log(`📅 Created advance payment ${i+1}/${numberOfEmis}:`, {
          date: installmentPaymentDate,
          amount: correctEmiAmountForInstallment,
          installmentNumber: currentInstallmentNumber,
          expectedDueDate: expectedDueDateForInstallment
        });
      }
      
      console.log(`✅ Created ${payments.length} advance payments for ${customerName}`);
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
        expectedDueDate: expectedDueDate,
        isChainComplete: true
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
          paymentData.isChainComplete = false;
          paymentData.installmentTotalAmount = originalEmiAmount || correctEmiAmount || parseFloat(amount);
        } else {
          paymentData.partialChainId = `temp_${Date.now()}`;
        }
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
        await updateLoanStatistics(loan._id, payments);
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

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Update loan statistics after payment
 */
async function updateLoanStatistics(loanId, payments) {
  try {
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

    // Calculate new EMI paid count based on FULL payments only
    let newEmiPaidCount = loan.emiPaidCount || 0;
    
    // For each payment, determine if it should increment the count
    payments.forEach(payment => {
      if (payment.status === 'Paid' || payment.status === 'Advance') {
        newEmiPaidCount += 1;
      }
    });

    let updateData = {
      totalPaidAmount: totalPaidAmount,
      remainingAmount: Math.max(0, loan.amount - totalPaidAmount),
      emiPaidCount: newEmiPaidCount,
      updatedAt: new Date()
    };

    // Calculate last scheduled EMI date based on FULL payments count
    if (newEmiPaidCount > 0) {
      const lastScheduledEmiDate = calculateLastScheduledEmiDate(
        loan.emiStartDate || loan.dateApplied,
        loan.loanType,
        newEmiPaidCount
      );
      
      const nextScheduledEmiDate = calculateNextScheduledEmiDate(
        lastScheduledEmiDate,
        loan.loanType,
        loan.emiStartDate || loan.dateApplied,
        newEmiPaidCount,
        loan.totalEmiCount
      );
      
      updateData.lastEmiDate = lastScheduledEmiDate;
      updateData.nextEmiDate = nextScheduledEmiDate;
    } else {
      // No payments yet, use EMI start date
      updateData.lastEmiDate = null;
      updateData.nextEmiDate = loan.emiStartDate || loan.dateApplied;
    }

    // CRITICAL FIX: Don't mark loan as "completed" when all EMIs are paid
    // Loan should remain "active" until formally closed or renewed
    // Only check for overdue status
    if (updateData.nextEmiDate) {
      const today = getCurrentDateString();
      if (updateData.nextEmiDate < today) {
        updateData.status = 'overdue';
      }
    }

    await Loan.findByIdAndUpdate(loanId, updateData);

    // Also update the loan's emiHistory with all payments
    if (payments.length > 0) {
      for (const payment of payments) {
        const existingHistoryIndex = loan.emiHistory.findIndex(
          h => h._id && h._id.toString() === payment._id.toString()
        );

        const paymentData = {
          _id: payment._id,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          status: payment.status,
          collectedBy: payment.collectedBy,
          notes: payment.notes || `Payment recorded on ${new Date().toISOString()}`,
          loanId: payment.loanId,
          loanNumber: payment.loanNumber,
          createdAt: payment.createdAt,
          paymentType: payment.paymentType,
          advanceFromDate: payment.advanceFromDate,
          advanceToDate: payment.advanceToDate,
          advanceEmiCount: payment.advanceEmiCount,
          advanceTotalAmount: payment.advanceTotalAmount,
          originalEmiAmount: payment.originalEmiAmount,
          partialChainId: payment.partialChainId,
          isChainComplete: payment.isChainComplete,
          installmentTotalAmount: payment.installmentTotalAmount,
          installmentNumber: payment.installmentNumber,
          expectedDueDate: payment.expectedDueDate
        };

        if (existingHistoryIndex >= 0) {
          loan.emiHistory[existingHistoryIndex] = paymentData;
        } else {
          loan.emiHistory.push(paymentData);
        }
      }

      await loan.save();
    }

    console.log('✅ Loan statistics updated successfully:', {
      loanId,
      emiPaidCount: newEmiPaidCount,
      totalPaidAmount,
      nextEmiDate: updateData.nextEmiDate,
      status: updateData.status || 'active'
    });

  } catch (error) {
    console.error('❌ Error updating loan statistics:', error);
    throw error;
  }
}