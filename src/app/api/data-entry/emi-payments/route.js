import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

// ==============================================
// DATE UTILITY FUNCTIONS (SAME AS IN MODELS)
// ==============================================

function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidYYYYMMDD(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

function parseDateString(dateString) {
  if (!isValidYYYYMMDD(dateString)) {
    console.error('Invalid date string:', dateString);
    return new Date();
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatToYYYYMMDD(dateInput) {
  if (!dateInput) return '';
  
  try {
    if (typeof dateInput === 'string' && isValidYYYYMMDD(dateInput)) {
      return dateInput;
    }
    
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error converting to YYYY-MM-DD:', error);
    return '';
  }
}

function formatToDDMMYYYY(dateString) {
  if (!isValidYYYYMMDD(dateString)) return '';
  
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function addDays(dateString, days) {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return formatToYYYYMMDD(date);
}

function cleanId(id) {
  if (!id) return id;
  return id.replace(/(_default|_temp|_new|fallback_)/, '');
}

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

function calculateNextScheduledEmiDate(lastScheduledEmiDate, loanType, emiStartDate, emiPaidCount, totalEmiCount) {
  if (emiPaidCount >= totalEmiCount) {
    return null;
  }
  
  if (!lastScheduledEmiDate) return emiStartDate || getCurrentDateString();
  
  if (!isValidYYYYMMDD(lastScheduledEmiDate)) {
    console.error('Invalid lastScheduledEmiDate:', lastScheduledEmiDate);
    return emiStartDate || getCurrentDateString();
  }
  
  let nextDate;
  
  switch(loanType) {
    case 'Daily':
      nextDate = addDays(lastScheduledEmiDate, 1);
      break;
    case 'Weekly':
      nextDate = addDays(lastScheduledEmiDate, 7);
      break;
    case 'Monthly':
      const date = parseDateString(lastScheduledEmiDate);
      date.setMonth(date.getMonth() + 1);
      nextDate = formatToYYYYMMDD(date);
      break;
    default:
      nextDate = addDays(lastScheduledEmiDate, 1);
  }
  
  return nextDate;
}

function calculateLastScheduledEmiDate(emiStartDate, loanType, totalEmisPaid) {
  if (!emiStartDate || totalEmisPaid <= 0) return emiStartDate;
  
  if (!isValidYYYYMMDD(emiStartDate)) {
    console.error('Invalid emiStartDate:', emiStartDate);
    return emiStartDate;
  }
  
  const startDate = parseDateString(emiStartDate);
  let lastScheduledDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
      break;
    case 'Weekly':
      lastScheduledDate.setDate(startDate.getDate() + ((totalEmisPaid - 1) * 7));
      break;
    case 'Monthly':
      lastScheduledDate.setMonth(startDate.getMonth() + (totalEmisPaid - 1));
      break;
    default:
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
  }
  
  return formatToYYYYMMDD(lastScheduledDate);
}

function generatePartialChainId(loanId, paymentDate) {
  if (!loanId) {
    console.error('❌ CRITICAL: Cannot generate chain ID without loanId');
    throw new Error('Loan ID is required for chain ID generation');
  }
  
  const cleanLoanId = loanId.toString().replace(/[^a-zA-Z0-9]/g, '_').slice(-12);
  const cleanDate = paymentDate.replace(/-/g, '');
  return `partial_${cleanLoanId}_${cleanDate}`;
}

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

export async function POST(request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    if (action === 'complete-partial') {
      return await handleCompletePartialPayment(request);
    }
    
    if (action === 'edit-payment') {
      return await handleEditPayment(request);
    }
    
    if (action === 'get-chain-info') {
      return await handleGetChainInfo(request);
    }
    
    const data = await request.json();
    
    console.log('🟡 EMI Payment data received:', JSON.stringify(data, null, 2));
    
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
      originalEmiAmount
    } = data;

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

    if (paymentType === 'advance') {
      if (!advanceFromDate || !advanceToDate) {
        return NextResponse.json({ 
          success: false,
          error: 'From date and to date are required for advance payments'
        }, { status: 400 });
      }

      const advanceFromStr = formatToYYYYMMDD(advanceFromDate);
      const advanceToStr = formatToYYYYMMDD(advanceToDate);
      
      if (!advanceFromStr || !advanceToStr) {
        return NextResponse.json({ 
          success: false,
          error: 'Invalid advance date format. Must be YYYY-MM-DD'
        }, { status: 400 });
      }

      if (advanceFromStr > advanceToStr) {
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

    const customerIdValidation = validateAndCleanObjectId(customerId, 'Customer ID');
    if (!customerIdValidation.isValid) {
      return NextResponse.json({ 
        success: false,
        error: customerIdValidation.error
      }, { status: 400 });
    }

    const cleanedCustomerId = customerIdValidation.cleanedId;

    if (amount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Payment amount must be greater than 0'
      }, { status: 400 });
    }

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

    // ✅ FIX 1: Calculate correct EMI amount for this payment
    let correctEmiAmount = loan?.emiAmount || 0;
    let currentInstallmentNumber = 1;

    if (loan) {
      // Calculate which installment we're on
      currentInstallmentNumber = (loan.emiPaidCount || 0) + 1;
      
      // Get correct EMI amount for this installment
      if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
        if (currentInstallmentNumber === loan.totalEmiCount) {
          correctEmiAmount = loan.customEmiAmount || loan.emiAmount || 0;
        }
      } else {
        correctEmiAmount = loan.emiAmount || 0;
      }
      
      console.log('🎯 EMI Amount Calculation:', {
        loanNumber: loan.loanNumber,
        emiType: loan.emiType,
        currentInstallment: currentInstallmentNumber,
        totalInstallments: loan.totalEmiCount,
        standardEmiAmount: loan.emiAmount,
        customEmiAmount: loan.customEmiAmount,
        correctEmiAmount: correctEmiAmount,
        paymentStatus: status
      });
    }

    if (loan) {
      console.log('🔍 Checking loan completion status:', {
        loanNumber: loan.loanNumber,
        emiPaidCount: loan.emiPaidCount,
        totalEmiCount: loan.totalEmiCount,
        status: loan.status,
        isCompleted: loan.emiPaidCount >= loan.totalEmiCount || loan.status === 'completed'
      });

      const isLoanCompleted = loan.emiPaidCount >= loan.totalEmiCount || loan.status === 'completed';
      
      if (isLoanCompleted) {
        return NextResponse.json({ 
          success: false,
          error: `Loan ${loan.loanNumber} is already completed (${loan.emiPaidCount}/${loan.totalEmiCount} payments made). No further payments can be accepted.`,
          details: {
            loanNumber: loan.loanNumber,
            emiPaidCount: loan.emiPaidCount,
            totalEmiCount: loan.totalEmiCount,
            status: loan.status,
            totalPaidAmount: loan.totalPaidAmount,
            totalLoanAmount: loan.totalLoanAmount || loan.amount
          }
        }, { status: 400 });
      }
    }

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
          error: `EMI payment for date ${formatToDDMMYYYY(paymentDateStr)} already exists. Please use a different date or edit the existing payment.`,
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
          error: `Advance payment period conflicts with existing payments on dates: ${duplicateCheck.conflictingDates.map(d => formatToDDMMYYYY(d)).join(', ')}`,
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

    let payments = [];

    if (paymentType === 'advance') {
      const advanceFromStr = formatToYYYYMMDD(advanceFromDate);
      const advanceToStr = formatToYYYYMMDD(advanceToDate);
      
      let emiCount = 1;
      let currentDateStr = advanceFromStr;
      
      if (loan) {
        switch(loan.loanType) {
          case 'Daily':
            const fromDate = parseDateString(advanceFromStr);
            const toDate = parseDateString(advanceToStr);
            const dailyDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
            emiCount = Math.max(dailyDiff, 1);
            break;
          case 'Weekly':
            const weeklyFromDate = parseDateString(advanceFromStr);
            const weeklyToDate = parseDateString(advanceToStr);
            const weeksDiff = Math.ceil((weeklyToDate - weeklyFromDate) / (1000 * 60 * 60 * 24 * 7)) + 1;
            emiCount = Math.max(weeksDiff, 1);
            break;
          case 'Monthly':
            const monthFromDate = parseDateString(advanceFromStr);
            const monthToDate = parseDateString(advanceToStr);
            const monthDiff = (monthToDate.getFullYear() - monthFromDate.getFullYear()) * 12 + 
                             (monthToDate.getMonth() - monthFromDate.getMonth()) + 1;
            emiCount = Math.max(monthDiff, 1);
            break;
          default:
            emiCount = parseInt(advanceEmiCount) || 1;
        }
      } else {
        emiCount = parseInt(advanceEmiCount) || 1;
      }
      
      console.log('📅 Advance Payment Calculation:', {
        from: advanceFromStr,
        to: advanceToStr,
        loanType: loan?.loanType,
        calculatedEmiCount: emiCount,
        providedEmiCount: advanceEmiCount,
        amountReceived: amount,
        loanEmiAmount: loan?.emiAmount,
        advanceTotalAmount: advanceTotalAmount
      });

      const singleEmiAmount = loan?.emiAmount || (parseFloat(amount) / emiCount);
      
      console.log('🔍 Single EMI Amount Calculation:', {
        usingLoanEMI: !!loan?.emiAmount,
        loanEMI: loan?.emiAmount,
        calculatedEMI: parseFloat(amount) / emiCount,
        finalSingleEmiAmount: singleEmiAmount
      });
      
      let paymentsCreated = [];
      
      currentDateStr = advanceFromStr;
      
      for (let i = 0; i < emiCount; i++) {
        // ✅ FIX: Use correct EMI amount for each advance payment
        const currentEmiAmount = originalEmiAmount || singleEmiAmount || parseFloat(amount) / emiCount;
        
        const paymentData = {
          customerId: cleanedCustomerId,
          customerName,
          paymentDate: currentDateStr,
          amount: currentEmiAmount,
          status: 'Advance',
          collectedBy,
          paymentMethod,
          transactionId: transactionId || null,
          notes: `Advance EMI ${i + 1}/${emiCount} for period ${formatToDDMMYYYY(advanceFromStr)} to ${formatToDDMMYYYY(advanceToStr)}${notes ? ` - ${notes}` : ''}`,
          isVerified: false,
          paymentType: 'advance',
          isAdvancePayment: true,
          advanceFromDate: advanceFromStr,
          advanceToDate: advanceToStr,
          advanceEmiCount: emiCount,
          advanceTotalAmount: parseFloat(amount),
          // ✅ CRITICAL FIX: Store original EMI amount
          originalEmiAmount: currentEmiAmount
        };

        if (finalLoanId) {
          paymentData.loanId = finalLoanId;
        }
        if (finalLoanNumber && finalLoanNumber !== 'N/A') {
          paymentData.loanNumber = finalLoanNumber;
        }

        if (status === 'Partial') {
          if (finalLoanId) {
            paymentData.partialChainId = generatePartialChainId(finalLoanId, currentDateStr);
          } else {
            console.error('❌ Cannot create partial chain without loan ID');
            paymentData.partialChainId = `temp_${Date.now()}_${i}`;
          }
          paymentData.isChainComplete = false;
          // ✅ FIX: Set installmentTotalAmount to FULL EMI amount, not partial amount
          paymentData.installmentTotalAmount = currentEmiAmount;
        } else {
          paymentData.isChainComplete = true;
          paymentData.installmentTotalAmount = currentEmiAmount;
          paymentData.installmentPaidAmount = currentEmiAmount;
        }

        const payment = new EMIPayment(paymentData);
        await payment.save();
        payments.push(payment);
        paymentsCreated.push({
          date: currentDateStr,
          amount: currentEmiAmount,
          paymentId: payment._id
        });
        
        if (loan) {
          switch(loan.loanType) {
            case 'Daily':
              currentDateStr = addDays(currentDateStr, 1);
              break;
            case 'Weekly':
              currentDateStr = addDays(currentDateStr, 7);
              break;
            case 'Monthly':
              const date = parseDateString(currentDateStr);
              date.setMonth(date.getMonth() + 1);
              currentDateStr = formatToYYYYMMDD(date);
              break;
            default:
              currentDateStr = addDays(currentDateStr, 1);
          }
        } else {
          currentDateStr = addDays(currentDateStr, 1);
        }
        
        if (currentDateStr > advanceToStr) {
          break;
        }
      }
      
      console.log(`✅ Created ${payments.length} advance payment records:`, paymentsCreated);
    } else {
      // ✅ FIX 2: Create paymentData with originalEmiAmount for single payments
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
        // ✅ CRITICAL FIX: Always include original EMI amount
        originalEmiAmount: originalEmiAmount || correctEmiAmount || parseFloat(amount)
      };

      if (finalLoanId) {
        paymentData.loanId = finalLoanId;
      }
      if (finalLoanNumber && finalLoanNumber !== 'N/A') {
        paymentData.loanNumber = finalLoanNumber;
      }

      if (status === 'Partial') {
        if (finalLoanId) {
          paymentData.partialChainId = generatePartialChainId(finalLoanId, paymentDateStr);
        } else {
          console.error('❌ Cannot create partial chain without loan ID');
          paymentData.partialChainId = `temp_${Date.now()}`;
        }
        paymentData.isChainComplete = false;
        // ✅ FIX: Set installmentTotalAmount to FULL EMI amount, not partial amount
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

    if (payments.length > 0) {
      const lastPaymentDate = payments[0].paymentDate;
      const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      
      await Customer.findByIdAndUpdate(cleanedCustomerId, {
        lastPaymentDate: lastPaymentDate,
        $inc: { totalPaid: totalPaymentAmount },
        updatedAt: new Date()
      });
    }

    // ✅ FIX 3: Update loan statistics with CORRECT logic for partial payments
    if (loan && finalLoanId) {
      try {
        // ✅ FIXED: Get ALL payments for total amount calculation
        const allLoanPayments = await EMIPayment.find({
          loanId: finalLoanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        // ✅ FIXED: Get ONLY FULL payments for EMI count (exclude 'Partial')
        const fullLoanPayments = await EMIPayment.find({
          loanId: finalLoanId,
          status: { $in: ['Paid', 'Advance'] }
        });
        
        // ✅ FIXED: Get partial payments that are NOT complete
        const partialPayments = await EMIPayment.find({
          loanId: finalLoanId,
          status: 'Partial'
        });
        
        const totalPaidAmount = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
        const emiPaidCount = fullLoanPayments.length;
        
        // ✅ CRITICAL FIX: Determine if current payment is partial
        const isCurrentPaymentPartial = status === 'Partial';
        
        let lastScheduledEmiDate;
        let nextScheduledEmiDate;
        
        if (isCurrentPaymentPartial) {
          // For partial payments: DON'T advance lastEmiDate
          // Keep last EMI date as the previous full payment date
          lastScheduledEmiDate = calculateLastScheduledEmiDate(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            emiPaidCount  // Use only FULL payments count
          );
          
          // ✅ CRITICAL FIX: Next EMI date should remain the SAME as current date for partial payments
          // Don't advance to next period until full payment is made
          nextScheduledEmiDate = paymentDateStr;
        } else {
          // For full payments: Advance as normal
          lastScheduledEmiDate = calculateLastScheduledEmiDate(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            emiPaidCount + 1  // +1 because we just made a full payment
          );
          
          nextScheduledEmiDate = calculateNextScheduledEmiDate(
            lastScheduledEmiDate,
            loan.loanType,
            loan.emiStartDate || loan.dateApplied,
            emiPaidCount + 1,  // +1 because we just made a full payment
            loan.totalEmiCount
          );
        }

        console.log('📊 Payment Statistics (FIXED for partial):', {
          loanNumber: loan.loanNumber,
          currentPaymentStatus: status,
          isPartial: isCurrentPaymentPartial,
          allPaymentsCount: allLoanPayments.length,
          fullPaymentsCount: fullLoanPayments.length,
          partialPaymentsCount: partialPayments.length,
          totalPaidAmount: totalPaidAmount,
          emiPaidCount: emiPaidCount,
          totalEmiCount: loan.totalEmiCount,
          lastScheduledEmiDate: lastScheduledEmiDate,
          nextScheduledEmiDate: nextScheduledEmiDate
        });

        const updateData = {
          totalPaidAmount: totalPaidAmount,
          remainingAmount: Math.max(loan.amount - totalPaidAmount, 0),
          lastPaymentDate: paymentDateStr,
          updatedAt: new Date()
        };

        // Only update EMI count and dates for FULL payments
        if (!isCurrentPaymentPartial) {
          updateData.emiPaidCount = emiPaidCount + 1;
          updateData.lastEmiDate = lastScheduledEmiDate;
          updateData.nextEmiDate = nextScheduledEmiDate;
        } else {
          // For partial payments, keep existing EMI count
          updateData.emiPaidCount = emiPaidCount;
          // Only update nextEmiDate to current date (don't advance)
          updateData.nextEmiDate = paymentDateStr;
          // Keep lastEmiDate as it was
          updateData.lastEmiDate = loan.lastEmiDate || lastScheduledEmiDate;
        }

        // Check if loan is completed (only based on FULL payments)
        if (emiPaidCount >= loan.totalEmiCount) {
          updateData.status = 'completed';
          updateData.nextEmiDate = null;
          console.log('🎉 Loan marked as COMPLETED:', loan.loanNumber);
        }

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
                createdAt: getCurrentDateString(),
                isAdvance: payment.paymentType === 'advance',
                paymentType: payment.paymentType,
                advanceFromDate: payment.advanceFromDate ? payment.advanceFromDate : null,
                advanceToDate: payment.advanceToDate ? payment.advanceToDate : null,
                advanceEmiCount: payment.advanceEmiCount,
                originalEmiAmount: payment.originalEmiAmount || payment.amount
              }))
            }
          };
        }

        await Loan.findByIdAndUpdate(finalLoanId, updateData);
        console.log('✅ Loan statistics updated correctly (FIXED partial logic)');
        
        for (const payment of payments) {
          try {
            await EMIPayment.syncWithLoanHistory(payment._id);
            console.log(`✅ Synced payment ${payment._id} with loan emiHistory`);
          } catch (syncError) {
            console.error(`⚠️ Error syncing payment ${payment._id}:`, syncError);
          }
        }
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan statistics:', loanUpdateError);
      }
    } else {
      console.log('ℹ️ No loan record to update - payment recorded without loan association');
    }

    console.log('✅ EMI payment recorded successfully:', payments.length, 'payments created');

    const responseMessage = paymentType === 'advance' 
      ? `Advance EMI payment recorded successfully as ${payments.length} payments of ₹${loan?.emiAmount || (parseFloat(amount)/payments.length)} each for ${advanceEmiCount || 1} periods (${formatToDDMMYYYY(formatToYYYYMMDD(advanceFromDate))} to ${formatToDDMMYYYY(formatToYYYYMMDD(advanceToDate))})`
      : `EMI payment of ₹${amount} recorded successfully for ${customerName}${finalLoanId ? ` (Loan: ${finalLoanNumber})` : ' (Temporary - No Loan Record)'}`;

    return NextResponse.json({ 
      success: true,
      message: responseMessage,
      data: {
        paymentIds: payments.map(p => p._id),
        customerName: customerName,
        amount: paymentType === 'advance' ? (loan?.emiAmount || (parseFloat(amount)/payments.length)) : amount,
        totalAmount: paymentType === 'advance' ? parseFloat(amount) : parseFloat(amount),
        loanNumber: finalLoanNumber,
        paymentDate: paymentDateStr,
        loanId: finalLoanId ? finalLoanId.toString() : null,
        collectedBy: collectedBy,
        hasLoanRecord: !!finalLoanId,
        paymentType: paymentType,
        isAdvance: paymentType === 'advance',
        paymentCount: payments.length,
        advanceFromDate: advanceFromDate ? formatToYYYYMMDD(advanceFromDate) : null,
        advanceToDate: advanceToDate ? formatToYYYYMMDD(advanceToDate) : null,
        advanceEmiCount: advanceEmiCount,
        advanceTotalAmount: amount,
        perEmiAmount: paymentType === 'advance' ? (loan?.emiAmount || (parseFloat(amount)/payments.length)) : parseFloat(amount),
        partialChainId: payments[0]?.partialChainId || null,
        isChainComplete: payments[0]?.isChainComplete || true,
        originalEmiAmount: payments[0]?.originalEmiAmount || (originalEmiAmount || correctEmiAmount || parseFloat(amount))
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

async function handleCompletePartialPayment(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    console.log('🟡 Completing partial payment:', JSON.stringify(data, null, 2));
    
    const {
      parentPaymentId,
      additionalAmount,
      paymentDate,
      collectedBy,
      notes = '',
      customerId,
      customerName,
      loanId,
      loanNumber
    } = data;

    if (!parentPaymentId || !additionalAmount || !collectedBy) {
      return NextResponse.json({
        success: false,
        error: 'Parent payment ID, additional amount, and collected by are required'
      }, { status: 400 });
    }

    const parentPaymentValidation = validateAndCleanObjectId(parentPaymentId, 'Parent Payment ID');
    if (!parentPaymentValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: parentPaymentValidation.error
      }, { status: 400 });
    }

    const cleanedParentPaymentId = parentPaymentValidation.cleanedId;

    const parentPayment = await EMIPayment.findById(cleanedParentPaymentId);
    if (!parentPayment) {
      return NextResponse.json({
        success: false,
        error: `Parent payment not found with ID: ${parentPaymentId}`
      }, { status: 404 });
    }

    if (parentPayment.status !== 'Partial') {
      return NextResponse.json({
        success: false,
        error: 'Cannot complete a non-partial payment',
        details: {
          currentStatus: parentPayment.status,
          paymentId: parentPayment._id
        }
      }, { status: 400 });
    }

    const chainInfo = await EMIPayment.getChainSummary(parentPayment.partialChainId || parentPayment._id.toString());
    
    if (!chainInfo) {
      return NextResponse.json({
        success: false,
        error: 'Could not retrieve payment chain information'
      }, { status: 500 });
    }

    const fullEmiAmount = chainInfo.originalEmiAmount || chainInfo.installmentTotalAmount;
    const totalPaidSoFar = chainInfo.totalPaidAmount;
    const remainingAmount = Math.max(0, fullEmiAmount - totalPaidSoFar);
    
    if (additionalAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Additional amount must be greater than 0'
      }, { status: 400 });
    }

    if (additionalAmount > remainingAmount) {
      return NextResponse.json({
        success: false,
        error: `Additional amount (₹${additionalAmount}) exceeds remaining amount (₹${remainingAmount})`,
        details: {
          fullEmiAmount,
          totalPaidSoFar,
          remainingAmount,
          installmentTotalAmount: chainInfo.installmentTotalAmount,
          totalPaidAmount: chainInfo.totalPaidAmount
        }
      }, { status: 400 });
    }

    const paymentDateStr = paymentDate || getCurrentDateString();
    if (!isValidYYYYMMDD(paymentDateStr)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment date format. Must be YYYY-MM-DD'
      }, { status: 400 });
    }

    const result = await EMIPayment.completePartialPayment(
      cleanedParentPaymentId,
      parseFloat(additionalAmount),
      paymentDateStr,
      collectedBy,
      notes
    );

    console.log('✅ Partial payment completed successfully:', {
      parentPaymentId: cleanedParentPaymentId.toString(),
      additionalAmount,
      fullEmiAmount,
      newChainStatus: result.chainInfo
    });

    if (result.chainInfo && result.chainInfo.payments) {
      for (const payment of result.chainInfo.payments) {
        try {
          await EMIPayment.syncWithLoanHistory(payment._id);
          console.log(`✅ Synced chain payment ${payment._id} with loan emiHistory`);
        } catch (syncError) {
          console.error(`⚠️ Error syncing chain payment ${payment._id}:`, syncError);
        }
      }
    }

    try {
      await EMIPayment.syncWithLoanHistory(cleanedParentPaymentId);
      console.log(`✅ Synced parent payment ${cleanedParentPaymentId} with loan emiHistory`);
    } catch (syncError) {
      console.error(`⚠️ Error syncing parent payment:`, syncError);
    }

    // ✅ FIXED: Update loan statistics with correct logic when partial payment is completed
    if (parentPayment.loanId) {
      try {
        // ✅ FIXED: Get ALL payments for total amount
        const allLoanPayments = await EMIPayment.find({
          loanId: parentPayment.loanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        // ✅ FIXED: Get ONLY FULL payments for EMI count
        const fullLoanPayments = await EMIPayment.find({
          loanId: parentPayment.loanId,
          status: { $in: ['Paid', 'Advance'] }
        });
        
        // Check if this completion makes the chain complete
        const chainComplete = (additionalAmount >= remainingAmount);
        
        const totalPaidAmount = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
        const emiPaidCount = fullLoanPayments.length;
        
        const loan = await Loan.findById(parentPayment.loanId);
        if (loan) {
          let lastScheduledEmiDate;
          let nextScheduledEmiDate;
          
          if (chainComplete) {
            // If chain is now complete, advance the dates
            const newFullPaymentsCount = emiPaidCount + 1;
            
            lastScheduledEmiDate = calculateLastScheduledEmiDate(
              loan.emiStartDate || loan.dateApplied,
              loan.loanType,
              newFullPaymentsCount
            );
            
            nextScheduledEmiDate = calculateNextScheduledEmiDate(
              lastScheduledEmiDate,
              loan.loanType,
              loan.emiStartDate || loan.dateApplied,
              newFullPaymentsCount,
              loan.totalEmiCount
            );
          } else {
            // If chain is still partial, don't advance dates
            lastScheduledEmiDate = loan.lastEmiDate;
            nextScheduledEmiDate = paymentDateStr; // Keep at current date
          }
          
          const updateData = {
            totalPaidAmount: totalPaidAmount,
            remainingAmount: Math.max(loan.amount - totalPaidAmount, 0),
            updatedAt: new Date()
          };
          
          if (chainComplete) {
            updateData.emiPaidCount = emiPaidCount + 1;
            updateData.lastEmiDate = lastScheduledEmiDate;
            updateData.nextEmiDate = nextScheduledEmiDate;
          } else {
            updateData.emiPaidCount = emiPaidCount;
            updateData.nextEmiDate = paymentDateStr;
          }
          
          if (emiPaidCount >= loan.totalEmiCount) {
            updateData.status = 'completed';
            updateData.nextEmiDate = null;
          }
          
          await Loan.findByIdAndUpdate(parentPayment.loanId, updateData);

          console.log('✅ Loan statistics updated after partial completion (FIXED logic):', {
            chainComplete,
            emiPaidCount,
            nextEmiDate: updateData.nextEmiDate
          });
        }
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan statistics after partial completion:', loanUpdateError);
      }
    }

    // Update customer total paid
    try {
      const customerPayments = await EMIPayment.find({
        customerId: parentPayment.customerId,
        status: { $in: ['Paid', 'Partial', 'Advance'] }
      });
      
      const totalCustomerPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      
      await Customer.findByIdAndUpdate(parentPayment.customerId, {
        totalPaid: totalCustomerPaid,
        updatedAt: new Date()
      });

      console.log('✅ Customer total paid updated after partial completion');
    } catch (customerUpdateError) {
      console.error('⚠️ Error updating customer total paid:', customerUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: `Partial payment completed successfully. Added ₹${additionalAmount} to payment chain.`,
      data: {
        parentPayment: result.parentPayment,
        completionPayment: result.completionPayment,
        chainInfo: result.chainInfo,
        remainingAmount: Math.max(0, remainingAmount - additionalAmount),
        isChainComplete: result.chainInfo?.isComplete || false
      }
    });

  } catch (error) {
    console.error('❌ Error completing partial payment:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to complete partial payment',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

async function handleEditPayment(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    console.log('🟡 Editing payment WITH SYNC:', JSON.stringify(data, null, 2));
    
    const {
      paymentId,
      amount,
      paymentDate,
      status,
      notes,
      collectedBy,
      updateChainTotals = true
    } = data;

    if (!paymentId || !amount || !paymentDate) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID, amount, and payment date are required'
      }, { status: 400 });
    }

    const paymentIdValidation = validateAndCleanObjectId(paymentId, 'Payment ID');
    if (!paymentIdValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: paymentIdValidation.error
      }, { status: 400 });
    }

    const cleanedPaymentId = paymentIdValidation.cleanedId;

    const paymentDateStr = formatToYYYYMMDD(paymentDate);
    if (!paymentDateStr || !isValidYYYYMMDD(paymentDateStr)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment date format. Must be YYYY-MM-DD'
      }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be a positive number'
      }, { status: 400 });
    }

    console.log('🟡 Updating EMI payment WITH SYNC:', { 
      paymentId: cleanedPaymentId, 
      updates: data 
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await EMIPayment.findById(cleanedPaymentId).session(session);
      if (!payment) {
        await session.abortTransaction();
        return NextResponse.json({
          success: false,
          error: 'Payment not found'
        }, { status: 404 });
      }

      const originalAmount = payment.amount;
      const originalPaymentDate = payment.paymentDate;
      const originalStatus = payment.status;

      payment.amount = parsedAmount;
      payment.paymentDate = paymentDateStr;
      payment.status = status || payment.status;
      payment.notes = notes || payment.notes;
      payment.collectedBy = collectedBy || payment.collectedBy;
      payment.updatedAt = new Date();

      const editNote = `Payment edited: Amount changed from ₹${originalAmount} to ₹${parsedAmount}`;
      if (originalPaymentDate !== paymentDateStr) {
        payment.notes = `${editNote}, Date changed from ${formatToDDMMYYYY(originalPaymentDate)} to ${formatToDDMMYYYY(paymentDateStr)}. ${payment.notes || ''}`;
      } else {
        payment.notes = `${editNote}. ${payment.notes || ''}`;
      }

      let chainUpdateResult = null;
      if (updateChainTotals && payment.partialChainId) {
        chainUpdateResult = await EMIPayment.updateChainTotals(payment.partialChainId);
      }

      await payment.save({ session });

      let syncResult = null;
      if (payment.loanId) {
        try {
          syncResult = await EMIPayment.syncWithLoanHistory(payment._id);
          console.log('✅ Payment synced with loan emiHistory:', syncResult);
        } catch (syncError) {
          console.error('⚠️ Error syncing with loan history:', syncError);
        }
      }

      if (originalAmount !== parsedAmount && payment.customerId) {
        try {
          const customerPayments = await EMIPayment.find({
            customerId: payment.customerId,
            status: { $in: ['Paid', 'Partial', 'Advance'] }
          });
          
          const totalCustomerPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
          
          await Customer.findByIdAndUpdate(
            payment.customerId,
            { totalPaid: totalCustomerPaid, updatedAt: new Date() },
            { session }
          );

          console.log('✅ Customer total paid updated after payment edit');
        } catch (customerUpdateError) {
          console.error('⚠️ Error updating customer total paid:', customerUpdateError);
        }
      }

      await session.commitTransaction();
      console.log('✅ Transaction committed successfully with sync');

      // ✅ FIXED: Update loan statistics with correct logic
      if (payment.loanId) {
        try {
          // ✅ FIXED: Get ALL payments for total amount
          const allLoanPayments = await EMIPayment.find({
            loanId: payment.loanId,
            status: { $in: ['Paid', 'Partial', 'Advance'] }
          });
          
          // ✅ FIXED: Get ONLY FULL payments for EMI count
          const fullLoanPayments = await EMIPayment.find({
            loanId: payment.loanId,
            status: { $in: ['Paid', 'Advance'] }
          });
          
          const totalPaidAmount = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
          const emiPaidCount = fullLoanPayments.length;
          
          const loan = await Loan.findById(payment.loanId);
          if (loan) {
            let lastScheduledEmiDate;
            let nextScheduledEmiDate;
            
            if (payment.status === 'Partial') {
              // If payment is partial, don't advance dates
              lastScheduledEmiDate = loan.lastEmiDate;
              nextScheduledEmiDate = paymentDateStr; // Keep at current date
            } else {
              // If payment is full, advance dates normally
              lastScheduledEmiDate = calculateLastScheduledEmiDate(
                loan.emiStartDate || loan.dateApplied,
                loan.loanType,
                emiPaidCount
              );
              
              nextScheduledEmiDate = calculateNextScheduledEmiDate(
                lastScheduledEmiDate,
                loan.loanType,
                loan.emiStartDate || loan.dateApplied,
                emiPaidCount,
                loan.totalEmiCount
              );
            }
            
            const updateData = {
              totalPaidAmount: totalPaidAmount,
              emiPaidCount: emiPaidCount,
              remainingAmount: Math.max(0, loan.amount - totalPaidAmount),
              updatedAt: new Date()
            };
            
            if (payment.status === 'Partial') {
              updateData.nextEmiDate = paymentDateStr;
              updateData.lastEmiDate = loan.lastEmiDate;
            } else {
              updateData.lastEmiDate = lastScheduledEmiDate;
              updateData.nextEmiDate = nextScheduledEmiDate;
            }
            
            if (emiPaidCount >= loan.totalEmiCount) {
              updateData.status = 'completed';
              updateData.nextEmiDate = null;
            }
            
            await Loan.findByIdAndUpdate(payment.loanId, updateData);

            console.log('✅ Loan statistics updated after payment edit (FIXED logic)');
          }
        } catch (loanUpdateError) {
          console.error('⚠️ Error updating loan statistics after edit:', loanUpdateError);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'EMI payment updated and synchronized successfully',
        data: {
          payment,
          syncResult,
          chainUpdate: chainUpdateResult,
          changes: {
            amount: { from: originalAmount, to: parsedAmount },
            date: { from: originalPaymentDate, to: paymentDateStr },
            status: { from: originalStatus, to: payment.status }
          }
        }
      });

    } catch (transactionError) {
      await session.abortTransaction();
      console.error('❌ Transaction aborted due to error:', transactionError);
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ Error editing payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to edit EMI payment: ' + error.message
    }, { status: 500 });
  }
}

async function handleGetChainInfo(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    const paymentId = searchParams.get('paymentId');
    const loanId = searchParams.get('loanId');
    
    if (!chainId && !paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Either chainId or paymentId is required'
      }, { status: 400 });
    }
    
    let targetChainId = chainId;
    
    if (paymentId && !chainId) {
      const paymentIdValidation = validateAndCleanObjectId(paymentId, 'Payment ID');
      if (!paymentIdValidation.isValid) {
        return NextResponse.json({
          success: false,
          error: paymentIdValidation.error
        }, { status: 400 });
      }
      
      const payment = await EMIPayment.findById(paymentIdValidation.cleanedId);
      if (!payment) {
        return NextResponse.json({
          success: false,
          error: 'Payment not found'
        }, { status: 404 });
      }
      
      targetChainId = payment.partialChainId;
      
      if (!targetChainId) {
        const chainInfo = {
          chainId: `single_${payment._id}`,
          parentPaymentId: payment._id,
          loanId: payment.loanId,
          loanNumber: payment.loanNumber,
          customerId: payment.customerId,
          customerName: payment.customerName,
          installmentTotalAmount: payment.installmentTotalAmount || payment.amount,
          originalEmiAmount: payment.originalEmiAmount || payment.installmentTotalAmount || payment.amount,
          totalPaidAmount: payment.amount,
          remainingAmount: 0,
          isComplete: payment.status === 'Paid',
          paymentCount: 1,
          payments: [{
            _id: payment._id,
            amount: payment.amount,
            status: payment.status,
            paymentDate: payment.paymentDate,
            collectedBy: payment.collectedBy,
            chainSequence: 1,
            originalEmiAmount: payment.originalEmiAmount || payment.installmentTotalAmount || payment.amount
          }]
        };
        
        return NextResponse.json({
          success: true,
          data: chainInfo
        });
      }
    }
    
    let chainInfo;
    if (loanId) {
      const payments = await EMIPayment.find({ 
        partialChainId: targetChainId,
        loanId: loanId
      });
      
      if (payments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No payments found for this chain and loan combination'
        }, { status: 404 });
      }
      
      const parentPayment = payments.find(p => !p.chainParentId) || payments[0];
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const installmentTotal = parentPayment.originalEmiAmount || parentPayment.installmentTotalAmount || parentPayment.amount;
      
      chainInfo = {
        chainId: targetChainId,
        parentPaymentId: parentPayment._id,
        loanId: parentPayment.loanId,
        loanNumber: parentPayment.loanNumber,
        customerId: parentPayment.customerId,
        customerName: parentPayment.customerName,
        installmentTotalAmount: installmentTotal,
        originalEmiAmount: parentPayment.originalEmiAmount || installmentTotal,
        totalPaidAmount: totalPaid,
        remainingAmount: Math.max(0, installmentTotal - totalPaid),
        isComplete: totalPaid >= installmentTotal,
        paymentCount: payments.length,
        payments: payments.map(p => ({
          _id: p._id,
          amount: p.amount,
          status: p.status,
          paymentDate: p.paymentDate,
          collectedBy: p.collectedBy,
          chainSequence: p.chainSequence,
          originalEmiAmount: p.originalEmiAmount || p.installmentTotalAmount || p.amount
        }))
      };
    } else {
      chainInfo = await EMIPayment.getChainSummary(targetChainId);
    }
    
    if (!chainInfo) {
      return NextResponse.json({
        success: false,
        error: 'Chain not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: chainInfo
    });
    
  } catch (error) {
    console.error('❌ Error getting chain info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get chain information: ' + error.message
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
    const chainId = searchParams.get('chainId');

    let query = {};

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

    if (chainId) {
      query.partialChainId = chainId;
    }

    if (date) {
      const dateStr = formatToYYYYMMDD(date);
      if (dateStr) {
        query.paymentDate = dateStr;
      }
    }

    if (collectedBy) {
      query.collectedBy = collectedBy;
    }

    if (paymentType) {
      query.paymentType = paymentType;
    }

    if (isAdvance !== null) {
      query.isAdvancePayment = isAdvance === 'true';
    }

    const payments = await EMIPayment.find(query)
      .select('_id customerId customerName loanId loanNumber paymentDate amount status collectedBy paymentMethod notes isVerified paymentType isAdvancePayment advanceFromDate advanceToDate advanceEmiCount advanceTotalAmount partialChainId chainParentId chainChildrenIds installmentTotalAmount installmentPaidAmount isChainComplete chainSequence originalEmiAmount createdAt updatedAt')
      .populate('customerId', 'name phone businessName area loanNumber')
      .populate('loanId', 'loanNumber loanType emiAmount amount emiPaidCount totalPaidAmount lastEmiDate nextEmiDate')
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(limit);

    const today = getCurrentDateString();
    const tomorrow = addDays(today, 1);

    const todayStats = await EMIPayment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $in: ['Paid', 'Partial', 'Advance'] }
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

    const customerWiseStats = await EMIPayment.aggregate([
      {
        $match: {
          paymentDate: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $in: ['Paid', 'Partial', 'Advance'] }
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
    const { amount, paymentDate, status, notes, collectedBy, updateChainTotals = true } = body;

    if (!amount || !paymentDate) {
      return NextResponse.json(
        { success: false, error: 'Amount and payment date are required' },
        { status: 400 }
      );
    }

    const paymentDateStr = formatToYYYYMMDD(paymentDate);
    if (!paymentDateStr || !isValidYYYYMMDD(paymentDateStr)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment date format. Must be YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const cleanedPaymentId = cleanId(paymentId);
    if (!mongoose.Types.ObjectId.isValid(cleanedPaymentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment ID format' },
        { status: 400 }
      );
    }

    console.log('🟡 Updating EMI payment:', { paymentId: cleanedPaymentId, updates: body });

    const payment = await EMIPayment.findById(cleanedPaymentId);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const originalAmount = payment.amount;
    const originalPaymentDate = payment.paymentDate;
    const originalStatus = payment.status;

    payment.amount = parseFloat(amount);
    payment.paymentDate = paymentDateStr;
    payment.status = status || payment.status;
    payment.notes = notes || payment.notes;
    payment.collectedBy = collectedBy || payment.collectedBy;
    payment.updatedAt = new Date();

    const editNote = `Payment edited: Amount changed from ₹${originalAmount} to ₹${amount}`;
    if (originalPaymentDate !== paymentDateStr) {
      payment.notes = `${editNote}, Date changed from ${formatToDDMMYYYY(originalPaymentDate)} to ${formatToDDMMYYYY(paymentDateStr)}. ${payment.notes || ''}`;
    } else {
      payment.notes = `${editNote}. ${payment.notes || ''}`;
    }

    let chainUpdateResult = null;
    if (updateChainTotals && payment.partialChainId) {
      chainUpdateResult = await EMIPayment.updateChainTotals(payment.partialChainId);
    }

    await payment.save();

    console.log('✅ EMI payment updated successfully:', cleanedPaymentId);

    if (payment.loanId) {
      try {
        await EMIPayment.syncWithLoanHistory(payment._id);
        console.log('✅ Payment synced with loan emiHistory');
      } catch (syncError) {
        console.error('⚠️ Error syncing with loan history:', syncError);
      }
    }

    // ✅ FIXED: Update loan statistics with correct logic
    if (payment.loanId) {
      try {
        // ✅ FIXED: Get ALL payments for total amount
        const allLoanPayments = await EMIPayment.find({
          loanId: payment.loanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        // ✅ FIXED: Get ONLY FULL payments for EMI count
        const fullLoanPayments = await EMIPayment.find({
          loanId: payment.loanId,
          status: { $in: ['Paid', 'Advance'] }
        });
        
        const totalPaidAmount = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
        const emiPaidCount = fullLoanPayments.length;
        
        const loan = await Loan.findById(payment.loanId);
        if (loan) {
          let lastScheduledEmiDate;
          let nextScheduledEmiDate;
          
          if (payment.status === 'Partial') {
            // If payment is partial, don't advance dates
            lastScheduledEmiDate = loan.lastEmiDate;
            nextScheduledEmiDate = paymentDateStr; // Keep at current date
          } else {
            // If payment is full, advance dates normally
            lastScheduledEmiDate = calculateLastScheduledEmiDate(
              loan.emiStartDate || loan.dateApplied,
              loan.loanType,
              emiPaidCount
            );
            
            nextScheduledEmiDate = calculateNextScheduledEmiDate(
              lastScheduledEmiDate,
              loan.loanType,
              loan.emiStartDate || loan.dateApplied,
              emiPaidCount,
              loan.totalEmiCount
            );
          }
          
          const updateData = {
            totalPaidAmount: totalPaidAmount,
            emiPaidCount: emiPaidCount,
            remainingAmount: Math.max(0, loan.amount - totalPaidAmount),
            updatedAt: new Date()
          };
          
          if (payment.status === 'Partial') {
            updateData.nextEmiDate = paymentDateStr;
            updateData.lastEmiDate = loan.lastEmiDate;
          } else {
            updateData.lastEmiDate = lastScheduledEmiDate;
            updateData.nextEmiDate = nextScheduledEmiDate;
          }
          
          if (emiPaidCount >= loan.totalEmiCount) {
            updateData.status = 'completed';
            updateData.nextEmiDate = null;
          }
          
          await Loan.findByIdAndUpdate(payment.loanId, updateData);

            console.log('✅ Loan statistics updated after payment edit (FIXED logic)');
          }
        } catch (loanUpdateError) {
          console.error('⚠️ Error updating loan statistics after edit:', loanUpdateError);
        }
      }

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
        data: {
          payment,
          chainUpdate: chainUpdateResult,
          changes: {
            amount: { from: originalAmount, to: parseFloat(amount) },
            date: { from: originalPaymentDate, to: paymentDateStr },
            status: { from: originalStatus, to: payment.status }
          }
        }
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

export async function DELETE(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const deleteChain = searchParams.get('deleteChain') === 'true';
    
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    const cleanedPaymentId = cleanId(paymentId);
    if (!mongoose.Types.ObjectId.isValid(cleanedPaymentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment ID format' },
        { status: 400 }
      );
    }

    console.log('🟡 Deleting EMI payment:', { paymentId: cleanedPaymentId, deleteChain });

    const payment = await EMIPayment.findById(cleanedPaymentId);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const { loanId, customerId, amount, partialChainId } = payment;
    let deletedPayments = [payment];
    let chainUpdateResult = null;

    if (deleteChain && partialChainId) {
      console.log('🗑️ Deleting entire chain:', partialChainId);
      
      const chainPayments = await EMIPayment.find({ partialChainId });
      deletedPayments = chainPayments;
      
      await EMIPayment.deleteMany({ partialChainId });
      
      console.log(`✅ Deleted ${chainPayments.length} payments in chain`);
    } else {
      await EMIPayment.findByIdAndDelete(cleanedPaymentId);
      
      if (partialChainId) {
        chainUpdateResult = await EMIPayment.updateChainTotals(partialChainId);
      }
    }

    console.log('✅ EMI payment deleted successfully:', cleanedPaymentId);

    // ✅ FIXED: Update loan statistics with correct logic
    if (loanId) {
      try {
        // ✅ FIXED: Get ALL payments for total amount
        const allLoanPayments = await EMIPayment.find({
          loanId: loanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        // ✅ FIXED: Get ONLY FULL payments for EMI count
        const fullLoanPayments = await EMIPayment.find({
          loanId: loanId,
          status: { $in: ['Paid', 'Advance'] }
        });
        
        const totalPaidAmount = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
        const emiPaidCount = fullLoanPayments.length;

        const loan = await Loan.findById(loanId);
        if (loan) {
          let lastScheduledEmiDate;
          let nextScheduledEmiDate;
          
          if (payment.status === 'Partial') {
            // If deleted payment was partial, recalculate dates based on remaining full payments
            lastScheduledEmiDate = calculateLastScheduledEmiDate(
              loan.emiStartDate || loan.dateApplied,
              loan.loanType,
              emiPaidCount
            );
            
            nextScheduledEmiDate = calculateNextScheduledEmiDate(
              lastScheduledEmiDate,
              loan.loanType,
              loan.emiStartDate || loan.dateApplied,
              emiPaidCount,
              loan.totalEmiCount
            );
          } else {
            // If deleted payment was full, adjust accordingly
            lastScheduledEmiDate = calculateLastScheduledEmiDate(
              loan.emiStartDate || loan.dateApplied,
              loan.loanType,
              emiPaidCount
            );
            
            nextScheduledEmiDate = calculateNextScheduledEmiDate(
              lastScheduledEmiDate,
              loan.loanType,
              loan.emiStartDate || loan.dateApplied,
              emiPaidCount,
              loan.totalEmiCount
            );
          }
          
          const updateData = {
            emiPaidCount: emiPaidCount,
            totalPaidAmount: totalPaidAmount,
            remainingAmount: Math.max(loan.amount - totalPaidAmount, 0),
            lastEmiDate: lastScheduledEmiDate,
            nextEmiDate: nextScheduledEmiDate,
            updatedAt: new Date()
          };
          
          if (emiPaidCount >= loan.totalEmiCount) {
            updateData.status = 'completed';
            updateData.nextEmiDate = null;
          }
          
          await Loan.findByIdAndUpdate(loanId, updateData);

          console.log('✅ Loan statistics updated after payment deletion (FIXED logic)');
        }
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan statistics after deletion:', loanUpdateError);
      }
    }

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
      message: deleteChain ? 'EMI payment chain deleted successfully' : 'EMI payment deleted successfully',
      data: {
        deletedPaymentId: cleanedPaymentId,
        deletedChainId: deleteChain ? partialChainId : null,
        deletedCount: deletedPayments.length,
        amount: amount,
        paymentDate: payment.paymentDate,
        chainUpdate: chainUpdateResult
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