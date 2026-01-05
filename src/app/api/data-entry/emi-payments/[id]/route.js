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
  formatToDDMMYYYY,
  cleanId,
  validateAndCleanObjectId,
  calculateLastScheduledEmiDate,
  calculateNextScheduledEmiDate
} from '@/src/app/data-entry/utils/emiPaymentUtils';

// ✅ EDIT ANY PAYMENT (PUT /api/data-entry/emi-payments/:id)
// ✅ SIMPLIFIED: Edit payment without complex transactions
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const data = await request.json();
    
    console.log('✏️ Editing payment (Simplified):', { id, updates: data });
    
    const {
      amount,
      status,
      paymentDate,
      notes,
      collectedBy
    } = data;

    // Basic validation
    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be a positive number'
      }, { status: 400 });
    }

    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Status is required'
      }, { status: 400 });
    }

    const paymentDateStr = paymentDate ? formatToYYYYMMDD(paymentDate) : null;
    if (paymentDate && (!paymentDateStr || !isValidYYYYMMDD(paymentDateStr))) {
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

    // Get the payment
    const payment = await EMIPayment.findById(cleanedPaymentId);
    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    // Save original values
    const originalAmount = payment.amount;
    const originalStatus = payment.status;
    const originalDate = payment.paymentDate;

    // Update payment
    payment.amount = parseFloat(amount);
    if (paymentDateStr) payment.paymentDate = paymentDateStr;
    payment.status = status;
    if (notes !== undefined) payment.notes = notes;
    if (collectedBy) payment.collectedBy = collectedBy;
    payment.updatedAt = new Date();

    // Add edit note
    const editNote = `Edited: Amount ${originalAmount}→${amount}, Status ${originalStatus}→${status}`;
    if (paymentDateStr && originalDate !== paymentDateStr) {
      payment.notes = `${editNote}, Date ${formatToDDMMYYYY(originalDate)}→${formatToDDMMYYYY(paymentDateStr)}. ${payment.notes || ''}`;
    } else {
      payment.notes = `${editNote}. ${payment.notes || ''}`;
    }

    // Save the updated payment
    await payment.save();

    // Update chain totals if part of a chain
    if (payment.partialChainId) {
      try {
        const chainPayments = await EMIPayment.find({ 
          partialChainId: payment.partialChainId 
        });
        
        const totalAmount = chainPayments.reduce((sum, p) => sum + p.amount, 0);
        const parentPayment = chainPayments.find(p => !p.chainParentId) || chainPayments[0];
        const fullEmiAmount = parentPayment.originalEmiAmount || parentPayment.installmentTotalAmount;
        const isChainComplete = totalAmount >= fullEmiAmount;
        
        // Update all chain payments
        await EMIPayment.updateMany(
          { partialChainId: payment.partialChainId },
          { 
            $set: { 
              installmentPaidAmount: totalAmount,
              isChainComplete: isChainComplete,
              status: isChainComplete ? 'Paid' : { $cond: { if: { $eq: ['$status', 'Partial'] }, then: 'Partial', else: '$status' } },
              updatedAt: new Date()
            } 
          }
        );
      } catch (chainError) {
        console.error('⚠️ Error updating chain:', chainError);
      }
    }

    // Update loan and customer totals
    if (payment.loanId) {
      try {
        const allLoanPayments = await EMIPayment.find({
          loanId: payment.loanId,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        });
        
        const totalLoanPaid = allLoanPayments.reduce((sum, p) => sum + p.amount, 0);
        
        const loan = await Loan.findById(payment.loanId);
        if (loan) {
          await Loan.findByIdAndUpdate(payment.loanId, {
            totalPaidAmount: totalLoanPaid,
            remainingAmount: Math.max(0, loan.amount - totalLoanPaid),
            updatedAt: new Date()
          });
        }
      } catch (loanError) {
        console.error('⚠️ Error updating loan:', loanError);
      }
    }

    if (originalAmount !== parseFloat(amount) && payment.customerId) {
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
      } catch (customerError) {
        console.error('⚠️ Error updating customer:', customerError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        payment,
        changes: {
          amount: { from: originalAmount, to: parseFloat(amount) },
          status: { from: originalStatus, to: status },
          date: paymentDateStr ? { from: originalDate, to: paymentDateStr } : null
        }
      }
    });

  } catch (error) {
    console.error('❌ Error editing payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to edit payment: ' + error.message
    }, { status: 500 });
  }
}

// ✅ GET SINGLE PAYMENT
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    
    const paymentIdValidation = validateAndCleanObjectId(id, 'Payment ID');
    if (!paymentIdValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: paymentIdValidation.error
      }, { status: 400 });
    }

    const payment = await EMIPayment.findById(paymentIdValidation.cleanedId)
      .populate('customerId', 'name phone')
      .populate('loanId', 'loanNumber loanType emiAmount totalEmiCount');

    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('❌ Error fetching payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payment: ' + error.message
    }, { status: 500 });
  }
}

// ✅ DELETE PAYMENT
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const deleteChain = searchParams.get('deleteChain') === 'true';
    
    const paymentIdValidation = validateAndCleanObjectId(id, 'Payment ID');
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

    const { loanId, customerId, partialChainId } = payment;

    let deletedCount = 1;
    if (deleteChain && partialChainId) {
      const chainPayments = await EMIPayment.find({ partialChainId });
      deletedCount = chainPayments.length;
      await EMIPayment.deleteMany({ partialChainId });
    } else {
      await EMIPayment.findByIdAndDelete(paymentIdValidation.cleanedId);
    }

    // Update customer and loan statistics
    if (customerId) {
      await updateCustomerTotal(customerId);
    }
    
    if (loanId) {
      await updateLoanStatisticsAfterDeletion(loanId);
    }

    return NextResponse.json({
      success: true,
      message: deleteChain ? 'Payment chain deleted' : 'Payment deleted',
      data: {
        deletedCount,
        deletedChainId: deleteChain ? partialChainId : null
      }
    });

  } catch (error) {
    console.error('❌ Error deleting payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete payment: ' + error.message
    }, { status: 500 });
  }
}

// Helper functions
async function updateLoanStatisticsAfterEdit(loanId) {
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

  const updateData = {
    totalPaidAmount: totalPaidAmount,
    emiPaidCount: emiPaidCount,
    remainingAmount: Math.max(0, loan.amount - totalPaidAmount),
    updatedAt: new Date()
  };

  if (emiPaidCount >= loan.totalEmiCount) {
    updateData.status = 'completed';
    updateData.nextEmiDate = null;
  }

  await Loan.findByIdAndUpdate(loanId, updateData);
}

async function updateLoanStatisticsAfterDeletion(loanId) {
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

  const updateData = {
    totalPaidAmount: totalPaidAmount,
    emiPaidCount: emiPaidCount,
    remainingAmount: Math.max(0, loan.amount - totalPaidAmount),
    updatedAt: new Date()
  };

  if (emiPaidCount >= loan.totalEmiCount) {
    updateData.status = 'completed';
    updateData.nextEmiDate = null;
  }

  await Loan.findByIdAndUpdate(loanId, updateData);
}

async function updateCustomerTotal(customerId) {
  const customerPayments = await EMIPayment.find({
    customerId: customerId,
    status: { $in: ['Paid', 'Partial', 'Advance'] }
  });
  
  const totalCustomerPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
  
  await Customer.findByIdAndUpdate(customerId, {
    totalPaid: totalCustomerPaid,
    updatedAt: new Date()
  });
}