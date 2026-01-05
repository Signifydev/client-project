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
// ✅ SIMPLIFIED: Complete partial payment WITHOUT model methods
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const data = await request.json();
    
    console.log('🔨 Completing partial payment (Simplified):', { id, data });
    
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

    // Validate date
    const paymentDateStr = paymentDate ? formatToYYYYMMDD(paymentDate) : getCurrentDateString();
    if (!isValidYYYYMMDD(paymentDateStr)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment date format. Must be YYYY-MM-DD'
      }, { status: 400 });
    }

    // Validate payment ID
    const paymentIdValidation = validateAndCleanObjectId(id, 'Payment ID');
    if (!paymentIdValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: paymentIdValidation.error
      }, { status: 400 });
    }

    const cleanedPaymentId = paymentIdValidation.cleanedId;

    // Get parent payment
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

    // Get chain payments manually (without transactions)
    const chainPayments = await EMIPayment.find({ 
      partialChainId: parentPayment.partialChainId 
    });

    // Calculate totals manually
    const totalPaidSoFar = chainPayments.reduce((sum, p) => sum + p.amount, 0);
    const fullEmiAmount = parentPayment.originalEmiAmount || 
                         parentPayment.installmentTotalAmount || 
                         parentPayment.amount;
    
    const suggestedRemaining = Math.max(0, fullEmiAmount - totalPaidSoFar);
    const chainSequence = chainPayments.length + 1;

    console.log('📊 Chain calculation:', {
      chainPayments: chainPayments.length,
      totalPaidSoFar,
      fullEmiAmount,
      suggestedRemaining,
      chainSequence
    });

    // ✅ STEP 1: Create the completion payment
    const completionPayment = new EMIPayment({
      customerId: parentPayment.customerId,
      customerName: parentPayment.customerName,
      loanId: parentPayment.loanId,
      loanNumber: parentPayment.loanNumber,
      paymentDate: paymentDateStr,
      amount: parseFloat(additionalAmount),
      status: 'Paid',
      collectedBy: collectedBy,
      notes: notes || `Completion payment for installment ${parentPayment.installmentNumber}`,
      paymentMethod: parentPayment.paymentMethod || 'Cash',
      paymentType: 'single',
      isAdvancePayment: false,
      partialChainId: parentPayment.partialChainId,
      chainParentId: parentPayment._id,
      installmentTotalAmount: fullEmiAmount,
      originalEmiAmount: fullEmiAmount,
      chainSequence: chainSequence,
      installmentNumber: parentPayment.installmentNumber,
      expectedDueDate: parentPayment.expectedDueDate,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save completion payment
    await completionPayment.save();

    // ✅ STEP 2: Update parent payment (add child ID)
    await EMIPayment.findByIdAndUpdate(
      parentPayment._id,
      { 
        $addToSet: { chainChildrenIds: completionPayment._id },
        updatedAt: new Date()
      }
    );

    // ✅ STEP 3: Calculate new chain total
    const newTotalPaid = totalPaidSoFar + parseFloat(additionalAmount);
    const isChainComplete = newTotalPaid >= fullEmiAmount;

    // ✅ STEP 4: Update all chain payments if complete
    if (isChainComplete) {
      await EMIPayment.updateMany(
        { partialChainId: parentPayment.partialChainId },
        { 
          $set: { 
            status: 'Paid', 
            isChainComplete: true,
            installmentPaidAmount: newTotalPaid,
            updatedAt: new Date()
          } 
        }
      );
    } else {
      // Update chain totals without changing status
      await EMIPayment.updateMany(
        { partialChainId: parentPayment.partialChainId },
        { 
          $set: { 
            installmentPaidAmount: newTotalPaid,
            updatedAt: new Date()
          } 
        }
      );
    }

    // ✅ STEP 5: Update loan statistics
    if (parentPayment.loanId) {
      try {
        // Get all payments for this loan
        const allLoanPayments = await EMIPayment.find({
          loanId: parentPayment.loanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        const totalLoanPaid = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
        
        const loan = await Loan.findById(parentPayment.loanId);
        if (loan) {
          // Only update if chain is complete
          if (isChainComplete) {
            const fullLoanPayments = await EMIPayment.find({
              loanId: parentPayment.loanId,
              status: { $in: ['Paid', 'Advance'] }
            });
            
            const emiPaidCount = fullLoanPayments.length;
            
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
            
            await Loan.findByIdAndUpdate(parentPayment.loanId, {
              emiPaidCount: emiPaidCount,
              totalPaidAmount: totalLoanPaid,
              remainingAmount: Math.max(0, loan.amount - totalLoanPaid),
              lastEmiDate: lastScheduledEmiDate,
              nextEmiDate: nextScheduledEmiDate,
              updatedAt: new Date()
            });
          } else {
            // Just update total paid amount
            await Loan.findByIdAndUpdate(parentPayment.loanId, {
              totalPaidAmount: totalLoanPaid,
              remainingAmount: Math.max(0, loan.amount - totalLoanPaid),
              updatedAt: new Date()
            });
          }
        }
      } catch (loanUpdateError) {
        console.error('⚠️ Error updating loan stats:', loanUpdateError);
        // Don't fail the whole operation
      }
    }

    // ✅ STEP 6: Update customer total
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
    } catch (customerError) {
      console.error('⚠️ Error updating customer:', customerError);
    }

    console.log('✅ Partial payment completed successfully (Simplified):', {
      parentPaymentId: cleanedPaymentId,
      completionPaymentId: completionPayment._id,
      additionalAmount,
      newTotalPaid,
      isChainComplete
    });

    return NextResponse.json({
      success: true,
      message: 'Partial payment completed successfully',
      data: {
        originalPayment: parentPayment,
        completionPayment: completionPayment,
        chainId: parentPayment.partialChainId,
        totalPaid: newTotalPaid,
        remainingBefore: suggestedRemaining,
        remainingAfter: Math.max(0, suggestedRemaining - parseFloat(additionalAmount)),
        isChainComplete: isChainComplete,
        loanUpdated: !!parentPayment.loanId
      }
    });

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