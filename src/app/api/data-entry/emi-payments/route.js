import { NextResponse } from 'next/server';
import connectDB from '@/lib/db'; // ✅ Now this works with default export
import EMIPayment from '@/lib/models/EMIPayment';
import Loan from '@/lib/models/Loan';
import SafeSession from '@/lib/safeSession';

// ============================================================================
// ✅ SIMPLE RATE LIMITING (Placeholder - can be enhanced later)
// ============================================================================
async function applyRateLimiting() {
  // For now, just a stub. Can implement proper rate limiting later.
  return Promise.resolve();
}

// ============================================================================
// ✅ 1. GET ALL PAYMENTS OR FILTERED
// ============================================================================
export async function GET(request) {
  await applyRateLimiting();
  
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const customerId = searchParams.get('customerId');
    const date = searchParams.get('date');
    const partialOnly = searchParams.get('partialOnly') === 'true';
    const limit = parseInt(searchParams.get('limit')) || 100;
    
    await connectDB(); // ✅ Now using imported function
    
    let query = {};
    
    // Filter by loan
    if (loanId) query.loanId = loanId;
    
    // Filter by customer
    if (customerId) query.customerId = customerId;
    
    // Filter by date (exact date match)
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.paymentDate = { $gte: startDate, $lte: endDate };
    }
    
    // Filter for partial payments only
    if (partialOnly) {
      query.isPartial = true;
      query.status = 'Partial';
    }
    
    // Fetch payments
    const payments = await EMIPayment.find(query)
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(limit);
    
    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length
    });
    
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ 2. CREATE NEW PAYMENT (Single/Partial/Advance)
// ============================================================================
export async function POST(request) {
  await applyRateLimiting();
  
  try {
    const body = await request.json();
    
    // Validation
    if (!body.loanId || !body.amount || !body.paymentDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    return await SafeSession.withTransaction(async (session) => {
      const {
        loanId,
        customerId,
        customerName,
        loanNumber,
        amount,
        paymentDate,
        status = 'Paid',
        paymentType = 'single',
        collectedBy,
        notes,
        isPartial = false,
        fullEmiAmount,
        partialRemainingAmount
      } = body;
      
      // ✅ CHECK: If trying to create payment on same date for same loan
      const existingPaymentOnDate = await EMIPayment.findOne({
        loanId,
        paymentDate: {
          $gte: new Date(new Date(paymentDate).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(paymentDate).setHours(23, 59, 59, 999))
        },
        status: { $in: ['Paid', 'Partial'] }
      }).session(session);
      
      // 🚨 CRITICAL FIX: If partial exists and user is trying to pay remaining amount
      if (existingPaymentOnDate && existingPaymentOnDate.isPartial) {
        const remaining = existingPaymentOnDate.partialRemainingAmount || 
                         (existingPaymentOnDate.fullEmiAmount - existingPaymentOnDate.amount);
        
        // If amount matches remaining, auto-complete
        if (Math.abs(amount - remaining) < 1) {
          // Complete the existing partial
          const result = await completeExistingPartial(
            existingPaymentOnDate._id,
            amount,
            paymentDate,
            collectedBy,
            notes || 'Auto-completed via payment creation',
            session
          );
          
          return result;
        } else {
          // Amount doesn't match remaining
          return NextResponse.json({
            success: false,
            error: 'PARTIAL_EXISTS',
            message: `Partial payment already exists (₹${existingPaymentOnDate.amount}). Please complete it instead.`,
            existingPartial: {
              id: existingPaymentOnDate._id,
              amount: existingPaymentOnDate.amount,
              fullEmiAmount: existingPaymentOnDate.fullEmiAmount,
              remaining: remaining
            }
          }, { status: 409 });
        }
      }
      
      // 🚨 Prevent duplicate full payments on same date
      if (existingPaymentOnDate && !existingPaymentOnDate.isPartial && status === 'Paid') {
        return NextResponse.json({
          success: false,
          error: 'DUPLICATE_PAYMENT',
          message: `Payment already exists for this date (${existingPaymentOnDate.amount} - ${existingPaymentOnDate.status}). Please check existing payments.`
        }, { status: 409 });
      }
      
      // Create payment
      const paymentData = {
        loanId,
        customerId,
        customerName,
        loanNumber,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        status,
        paymentType,
        collectedBy: collectedBy || 'Operator',
        notes,
        isPartial: isPartial || status === 'Partial',
        fullEmiAmount: fullEmiAmount || parseFloat(amount),
        partialRemainingAmount: isPartial ? 
          (partialRemainingAmount || (fullEmiAmount ? fullEmiAmount - amount : 0)) : 
          0
      };
      
      const payment = new EMIPayment(paymentData);
      await payment.save({ session });
      
      // Update loan stats
      const loanUpdate = {
        $inc: { totalPaidAmount: parseFloat(amount) }
      };
      
      // If this is a full payment (not partial), increment emiPaidCount
      if (status === 'Paid' || status === 'Advance') {
        loanUpdate.$inc.emiPaidCount = 1;
      }
      
      await Loan.findByIdAndUpdate(loanId, loanUpdate, { session });
      
      return NextResponse.json({
        success: true,
        data: payment,
        message: `Payment created successfully (${status})`
      });
    });
    
  } catch (error) {
    console.error('Error creating payment:', error);
    
    // Handle specific errors
    if (error.message.includes('PARTIAL_EXISTS') || error.message.includes('DUPLICATE_PAYMENT')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ 3. HANDLE ALL PATCH REQUESTS (Single endpoint for all PATCH operations)
// ============================================================================
export async function PATCH(request) {
  await applyRateLimiting();
  
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const paymentId = pathSegments[pathSegments.length - 2]; // Second last segment
    const isCompleteEndpoint = url.pathname.endsWith('/complete');
    
    const body = await request.json();
    
    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // 🚨 DECISION: If it's /complete endpoint, handle completion
    if (isCompleteEndpoint) {
      return await handleCompletePartial(paymentId, body);
    }
    
    // Otherwise, handle regular PATCH update
    return await handleUpdatePayment(paymentId, body);
    
  } catch (error) {
    console.error('Error in PATCH request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ HELPER FUNCTIONS
// ============================================================================

// Helper to handle regular payment updates
async function handleUpdatePayment(paymentId, body) {
  return await SafeSession.withTransaction(async (session) => {
    // Find payment
    const payment = await EMIPayment.findById(paymentId).session(session);
    
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }
    
    const oldAmount = payment.amount;
    const oldStatus = payment.status;
    
    // Update fields
    if (body.amount !== undefined) {
      payment.amount = parseFloat(body.amount);
    }
    
    if (body.status !== undefined) {
      payment.status = body.status;
      
      // If changing from Partial to Paid, mark as complete
      if (oldStatus === 'Partial' && body.status === 'Paid') {
        payment.isPartial = false;
        payment.partialRemainingAmount = 0;
      }
    }
    
    if (body.paymentDate !== undefined) {
      payment.paymentDate = new Date(body.paymentDate);
    }
    
    if (body.collectedBy !== undefined) {
      payment.collectedBy = body.collectedBy;
    }
    
    if (body.notes !== undefined) {
      payment.notes = body.notes;
    }
    
    await payment.save({ session });
    
    // Update loan stats based on changes
    if (body.amount !== undefined && oldAmount !== payment.amount) {
      const amountDiff = payment.amount - oldAmount;
      
      await Loan.findByIdAndUpdate(
        payment.loanId,
        {
          $inc: { totalPaidAmount: amountDiff }
        },
        { session }
      );
    }
    
    // If changing from Partial to Paid, increment emiPaidCount
    if (oldStatus === 'Partial' && payment.status === 'Paid') {
      await Loan.findByIdAndUpdate(
        payment.loanId,
        {
          $inc: { emiPaidCount: 1 }
        },
        { session }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });
  });
}

// Helper to handle partial completion
async function handleCompletePartial(paymentId, body) {
  if (!body.additionalAmount || body.additionalAmount <= 0) {
    return NextResponse.json(
      { success: false, error: 'Valid additional amount required' },
      { status: 400 }
    );
  }
  
  return await SafeSession.withTransaction(async (session) => {
    // Find the partial payment
    const partialPayment = await EMIPayment.findById(paymentId).session(session);
    
    if (!partialPayment || !partialPayment.isPartial) {
      return NextResponse.json(
        { success: false, error: 'Partial payment not found' },
        { status: 404 }
      );
    }
    
    const additionalAmount = parseFloat(body.additionalAmount);
    const newTotal = partialPayment.amount + additionalAmount;
    const fullEmiAmount = partialPayment.fullEmiAmount || newTotal;
    
    // Calculate remaining after this addition
    const remainingAfter = Math.max(0, fullEmiAmount - newTotal);
    
    // Update partial payment
    partialPayment.amount = newTotal;
    partialPayment.partialRemainingAmount = remainingAfter;
    
    // Check if now fully paid
    const isNowComplete = remainingAfter <= 0;
    
    if (isNowComplete) {
      partialPayment.status = 'Paid';
      partialPayment.isPartial = false;
      partialPayment.partialRemainingAmount = 0;
      
      // Count as one EMI paid
      await Loan.findByIdAndUpdate(
        partialPayment.loanId,
        {
          $inc: {
            totalPaidAmount: additionalAmount,
            emiPaidCount: 1
          }
        },
        { session }
      );
    } else {
      // Still partial - just update total
      await Loan.findByIdAndUpdate(
        partialPayment.loanId,
        {
          $inc: { totalPaidAmount: additionalAmount }
        },
        { session }
      );
    }
    
    await partialPayment.save({ session });
    
    // Create completion record for audit trail
    const completionRecord = new EMIPayment({
      loanId: partialPayment.loanId,
      customerId: partialPayment.customerId,
      loanNumber: partialPayment.loanNumber,
      customerName: partialPayment.customerName,
      amount: additionalAmount,
      paymentDate: new Date(body.paymentDate || new Date()),
      collectedBy: body.collectedBy || partialPayment.collectedBy || 'Operator',
      status: 'Paid',
      paymentType: 'completion',
      isPartialCompletion: true,
      completedPartialId: partialPayment._id,
      notes: body.notes || `Completion payment for partial on ${partialPayment.paymentDate}`
    });
    
    await completionRecord.save({ session });
    
    return NextResponse.json({
      success: true,
      data: {
        partialPayment,
        completionRecord,
        isComplete: isNowComplete,
        newTotal: newTotal,
        remainingAfter: remainingAfter,
        loanUpdated: true
      },
      message: `Partial payment completed. ${isNowComplete ? 'EMI is now fully paid.' : 'EMI is still partial.'}`
    });
  });
}

// Helper to complete existing partial
async function completeExistingPartial(partialId, amount, paymentDate, collectedBy, notes, session) {
  const partialPayment = await EMIPayment.findById(partialId).session(session);
  
  if (!partialPayment) {
    throw new Error('Partial payment not found');
  }
  
  const newTotal = partialPayment.amount + amount;
  const fullEmiAmount = partialPayment.fullEmiAmount || newTotal;
  const remainingAfter = Math.max(0, fullEmiAmount - newTotal);
  
  // Update partial payment
  partialPayment.amount = newTotal;
  partialPayment.partialRemainingAmount = remainingAfter;
  
  const isNowComplete = remainingAfter <= 0;
  
  if (isNowComplete) {
    partialPayment.status = 'Paid';
    partialPayment.isPartial = false;
    partialPayment.partialRemainingAmount = 0;
    
    await Loan.findByIdAndUpdate(
      partialPayment.loanId,
      {
        $inc: {
          totalPaidAmount: amount,
          emiPaidCount: 1
        }
      },
      { session }
    );
  } else {
    await Loan.findByIdAndUpdate(
      partialPayment.loanId,
      {
        $inc: { totalPaidAmount: amount }
      },
      { session }
    );
  }
  
  await partialPayment.save({ session });
  
  // Create completion record
  const completionRecord = new EMIPayment({
    loanId: partialPayment.loanId,
    customerId: partialPayment.customerId,
    loanNumber: partialPayment.loanNumber,
    customerName: partialPayment.customerName,
    amount: amount,
    paymentDate: new Date(paymentDate),
    collectedBy: collectedBy || 'Operator',
    status: 'Paid',
    paymentType: 'completion',
    isPartialCompletion: true,
    completedPartialId: partialPayment._id,
    notes: notes || 'Auto-completed'
  });
  
  await completionRecord.save({ session });
  
  return NextResponse.json({
    success: true,
    data: {
      partialPayment,
      completionRecord,
      isComplete: isNowComplete,
      newTotal: newTotal
    }
  });
}