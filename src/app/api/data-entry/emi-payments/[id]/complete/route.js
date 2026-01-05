import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

// Import shared utilities
import {
  isValidYYYYMMDD,
  formatToYYYYMMDD,
  validateAndCleanObjectId,
  calculateLastScheduledEmiDate,
  calculateNextScheduledEmiDate
} from '@/src/app/data-entry/utils/emiPaymentUtils';

// ✅ COMPLETE PARTIAL PAYMENT (POST /api/data-entry/emi-payments/:id/complete)
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const data = await request.json();
    
    console.log('🟡 Completing partial payment with CUSTOM date:', { id, data });
    
    const {
      additionalAmount,
      paymentDate,
      collectedBy,
      notes = ''
    } = data;

    if (!additionalAmount || additionalAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Additional amount must be greater than 0'
      }, { status: 400 });
    }

    if (!collectedBy) {
      return NextResponse.json({
        success: false,
        error: 'Collected by is required'
      }, { status: 400 });
    }

    // ✅ CRITICAL: Validate date but DON'T validate amount against remaining
    const paymentDateStr = paymentDate ? formatToYYYYMMDD(paymentDate) : formatToYYYYMMDD(new Date());
    if (!isValidYYYYMMDD(paymentDateStr)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment date format. Must be YYYY-MM-DD'
      }, { status: 400 });
    }

    const paymentIdValidation = validateAndCleanObjectId(id, 'Payment ID');
    if (!paymentIdValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: paymentIdValidation.error
      }, { status: 400 });
    }

    const cleanedPaymentId = paymentIdValidation.cleanedId;

    const parentPayment = await EMIPayment.findById(cleanedPaymentId);
    if (!parentPayment) {
      return NextResponse.json({
        success: false,
        error: 'Parent payment not found'
      }, { status: 404 });
    }

    if (parentPayment.status !== 'Partial') {
      return NextResponse.json({
        success: false,
        error: 'Cannot complete a non-partial payment'
      }, { status: 400 });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get chain info for reference (NOT for validation)
      const chainPayments = await EMIPayment.find({
        partialChainId: parentPayment.partialChainId
      }).session(session);

      const totalPaidSoFar = chainPayments.reduce((sum, p) => sum + p.amount, 0);
      const fullEmiAmount = parentPayment.installmentTotalAmount || parentPayment.originalEmiAmount || 0;
      
      // ✅ CRITICAL: Show remaining but DON'T restrict amount
      const remainingAmount = Math.max(0, fullEmiAmount - totalPaidSoFar);
      
      console.log('📊 Chain reference info:', {
        fullEmiAmount,
        totalPaidSoFar,
        remainingAmount,
        additionalAmount: parseFloat(additionalAmount)
      });

      // Create completion payment
      const completionPayment = new EMIPayment({
        customerId: parentPayment.customerId,
        customerName: parentPayment.customerName,
        loanId: parentPayment.loanId,
        loanNumber: parentPayment.loanNumber,
        paymentDate: paymentDateStr,
        amount: parseFloat(additionalAmount),
        status: 'Paid',
        collectedBy: collectedBy,
        paymentMethod: parentPayment.paymentMethod || 'Cash',
        notes: notes || `Completion payment for partial chain`,
        paymentType: 'single',
        isAdvancePayment: false,
        partialChainId: parentPayment.partialChainId,
        chainParentId: parentPayment._id,
        originalEmiAmount: parentPayment.originalEmiAmount,
        installmentNumber: parentPayment.installmentNumber,
        expectedDueDate: parentPayment.expectedDueDate,
        chainSequence: (chainPayments.length || 1) + 1
      });

      await completionPayment.save({ session });

      // Update chain status if complete
      const newTotalPaid = totalPaidSoFar + parseFloat(additionalAmount);
      const isChainComplete = newTotalPaid >= fullEmiAmount;

      if (isChainComplete) {
        await EMIPayment.updateMany(
          { partialChainId: parentPayment.partialChainId },
          { 
            $set: { 
              isChainComplete: true,
              status: 'Paid'
            } 
          },
          { session }
        );
      }

      // Update customer total
      const customerPayments = await EMIPayment.find({
        customerId: parentPayment.customerId,
        status: { $in: ['Paid', 'Partial', 'Advance'] }
      }).session(session);
      
      const totalCustomerPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      
      await Customer.findByIdAndUpdate(
        parentPayment.customerId,
        { totalPaid: totalCustomerPaid, updatedAt: new Date() },
        { session }
      );

      // Update loan if chain is complete
      let loanUpdateResult = null;
      if (isChainComplete && parentPayment.loanId) {
        loanUpdateResult = await updateLoanForCompletedChain(parentPayment.loanId, session);
      }

      await session.commitTransaction();

      // Get updated chain info
      const updatedChain = await EMIPayment.find({
        partialChainId: parentPayment.partialChainId
      }).sort({ chainSequence: 1 });

      return NextResponse.json({
        success: true,
        message: 'Partial payment completed successfully',
        data: {
          originalPayment: parentPayment,
          completionPayment: completionPayment,
          chainId: parentPayment.partialChainId,
          totalPaid: newTotalPaid,
          remainingBefore: remainingAmount,
          remainingAfter: Math.max(0, remainingAmount - parseFloat(additionalAmount)),
          isChainComplete: isChainComplete,
          loanUpdated: !!loanUpdateResult,
          chainPayments: updatedChain
        }
      });

    } catch (transactionError) {
      await session.abortTransaction();
      console.error('❌ Transaction error:', transactionError);
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ Error completing partial payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to complete partial payment: ' + error.message
    }, { status: 500 });
  }
}

async function updateLoanForCompletedChain(loanId, session) {
  const allLoanPayments = await EMIPayment.find({
    loanId: loanId,
    status: { $in: ['Paid', 'Partial', 'Advance'] }
  }).session(session);
  
  const fullLoanPayments = await EMIPayment.find({
    loanId: loanId,
    status: { $in: ['Paid', 'Advance'] }
  }).session(session);
  
  const totalPaidAmount = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
  const emiPaidCount = fullLoanPayments.length;
  
  const loan = await Loan.findById(loanId).session(session);
  if (!loan) return null;

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

  const updateData = {
    emiPaidCount: emiPaidCount,
    totalPaidAmount: totalPaidAmount,
    remainingAmount: Math.max(0, loan.amount - totalPaidAmount),
    lastEmiDate: lastScheduledEmiDate,
    nextEmiDate: nextScheduledEmiDate,
    updatedAt: new Date()
  };

  if (emiPaidCount >= loan.totalEmiCount) {
    updateData.status = 'completed';
    updateData.nextEmiDate = null;
  }

  await Loan.findByIdAndUpdate(loanId, updateData, { session });
  return updateData;
}