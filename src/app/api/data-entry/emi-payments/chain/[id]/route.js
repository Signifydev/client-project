import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

// ✅ GET CHAIN INFO (GET /api/data-entry/emi-payments/chain/:id)
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    
    let targetChainId = id;
    
    // If ID is "payment", get chain from paymentId
    if (id === 'payment' && paymentId) {
      const payment = await EMIPayment.findById(paymentId);
      if (!payment) {
        return NextResponse.json({
          success: false,
          error: 'Payment not found'
        }, { status: 404 });
      }
      targetChainId = payment.partialChainId;
      
      if (!targetChainId) {
        // Single payment (no chain)
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
          installmentNumber: payment.installmentNumber || 1,
          expectedDueDate: payment.expectedDueDate || payment.paymentDate,
          payments: [{
            _id: payment._id,
            amount: payment.amount,
            status: payment.status,
            paymentDate: payment.paymentDate,
            collectedBy: payment.collectedBy,
            chainSequence: 1,
            originalEmiAmount: payment.originalEmiAmount,
            installmentNumber: payment.installmentNumber
          }]
        };
        
        return NextResponse.json({
          success: true,
          data: chainInfo
        });
      }
    }
    
    // Get chain payments
    const chainPayments = await EMIPayment.find({ 
      partialChainId: targetChainId 
    }).sort({ chainSequence: 1 });
    
    if (chainPayments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Chain not found'
      }, { status: 404 });
    }
    
    const parentPayment = chainPayments.find(p => !p.chainParentId) || chainPayments[0];
    const totalPaid = chainPayments.reduce((sum, p) => sum + p.amount, 0);
    const installmentTotal = parentPayment.originalEmiAmount || parentPayment.installmentTotalAmount || parentPayment.amount;
    
    // Get loan info for context
    let loanInfo = null;
    if (parentPayment.loanId) {
      const loan = await Loan.findById(parentPayment.loanId)
        .select('loanNumber loanType emiAmount totalEmiCount emiPaidCount');
      if (loan) {
        loanInfo = {
          loanNumber: loan.loanNumber,
          emiAmount: loan.emiAmount,
          loanType: loan.loanType,
          totalEmiCount: loan.totalEmiCount,
          emiPaidCount: loan.emiPaidCount
        };
      }
    }
    
    const chainInfo = {
      chainId: targetChainId,
      parentPaymentId: parentPayment._id,
      loanId: parentPayment.loanId,
      loanNumber: parentPayment.loanNumber,
      customerId: parentPayment.customerId,
      customerName: parentPayment.customerName,
      installmentTotalAmount: installmentTotal,
      originalEmiAmount: parentPayment.originalEmiAmount || installmentTotal,
      totalPaidAmount: totalPaid,
      suggestedRemaining: Math.max(0, installmentTotal - totalPaid), // ✅ GUIDANCE ONLY
      isComplete: totalPaid >= installmentTotal,
      paymentCount: chainPayments.length,
      installmentNumber: parentPayment.installmentNumber || 1,
      expectedDueDate: parentPayment.expectedDueDate || parentPayment.paymentDate,
      payments: chainPayments.map(p => ({
        _id: p._id,
        amount: p.amount,
        status: p.status,
        paymentDate: p.paymentDate,
        collectedBy: p.collectedBy,
        chainSequence: p.chainSequence,
        originalEmiAmount: p.originalEmiAmount,
        installmentNumber: p.installmentNumber,
        expectedDueDate: p.expectedDueDate
      })),
      loanInfo: loanInfo // ✅ Added for reference
    };
    
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