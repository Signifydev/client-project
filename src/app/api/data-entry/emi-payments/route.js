import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EMIPayment from '@/lib/models/EMIPayment';
import Loan from '@/lib/models/Loan';
import SafeSession from '@/lib/safeSession';

// ============================================================================
// DATE UTILITY FUNCTIONS (CONSISTENT WITH MODELS)
// ============================================================================

/**
 * Get current date as YYYY-MM-DD string
 */
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate YYYY-MM-DD format (consistent with models)
 */
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

/**
 * Convert Date object to YYYY-MM-DD string
 */
function formatToYYYYMMDD(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return getCurrentDateString();
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// RATE LIMITING
// ============================================================================
async function applyRateLimiting() {
  // Placeholder for rate limiting implementation
  return Promise.resolve();
}

// ============================================================================
// ✅ 1. GET ALL PAYMENTS OR FILTERED (UPDATED FOR DATE CONSISTENCY)
// ============================================================================
export async function GET(request) {
  await applyRateLimiting();
  
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const customerId = searchParams.get('customerId');
    const customerNumber = searchParams.get('customerNumber');
    const date = searchParams.get('date');
    const partialOnly = searchParams.get('partialOnly') === 'true';
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = parseInt(searchParams.get('offset')) || 0;
    const sortBy = searchParams.get('sortBy') || 'paymentDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    await connectDB();
    
    let query = {};
    
    // Filter by loan
    if (loanId) query.loanId = loanId;
    
    // Filter by customer
    if (customerId) query.customerId = customerId;
    if (customerNumber) query.customerNumber = customerNumber;
    
    // ✅ FIXED: Filter by date using YYYY-MM-DD string comparison
    if (date && isValidYYYYMMDD(date)) {
      query.paymentDate = date;
    }
    
    // Filter for partial payments only
    if (partialOnly) {
      query.isPartial = true;
      query.status = 'Partial';
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Fetch payments with pagination
    const [payments, total] = await Promise.all([
      EMIPayment.find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .lean(),
      EMIPayment.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + payments.length < total
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payments',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ 2. CREATE NEW PAYMENT (UPDATED FOR CONSISTENCY WITH MODELS)
// ============================================================================
export async function POST(request) {
  await applyRateLimiting();
  
  try {
    const body = await request.json();
    
    console.log('📥 Payment creation request:', {
      loanId: body.loanId,
      amount: body.amount,
      paymentDate: body.paymentDate,
      collectedBy: body.collectedBy
    });
    
    // ✅ ENHANCED VALIDATION
    const requiredFields = ['loanId', 'amount', 'paymentDate', 'collectedBy'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          missingFields 
        },
        { status: 400 }
      );
    }
    
    // Validate payment date format
    if (!isValidYYYYMMDD(body.paymentDate)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payment date format',
          message: 'Payment date must be in YYYY-MM-DD format' 
        },
        { status: 400 }
      );
    }
    
    // Validate amount
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid amount',
          message: 'Amount must be a positive number' 
        },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // ✅ USE EMIPayment.createPayment METHOD FOR CONSISTENCY
    return await SafeSession.withTransaction('Create Payment', async (session) => {
      // 1. Get loan details for validation
      const loan = await Loan.findById(body.loanId).session(session);
      
      if (!loan) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Loan not found' 
          },
          { status: 404 }
        );
      }
      
      // ✅ FIXED: Check if loan is active and can accept payments
      const canAcceptPayment =
  !loan.isRenewed &&
  loan.emiPaidCount < loan.totalEmiCount;
      
      if (!canAcceptPayment) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Loan cannot accept payments',
            details: {
              status: loan.status,
              isRenewed: loan.isRenewed,
              emiPaidCount: loan.emiPaidCount,
              totalEmiCount: loan.totalEmiCount
            }
          },
          { status: 400 }
        );
      }
      
      // 2. Check for duplicate payment on same date
      const existingPayment = await EMIPayment.checkDuplicate(
        body.loanId,
        body.paymentDate
      ).session(session);
      
      if (existingPayment) {
        // Special handling for partial payment completion
        if (existingPayment.status === 'Partial') {
          const remaining = existingPayment.partialRemainingAmount || 
                           (existingPayment.originalEmiAmount - existingPayment.amount);
          
          // If amount matches remaining, complete the partial
          if (Math.abs(amount - remaining) < 0.01) {
            const completionResult = await completePartialPayment(
              existingPayment._id,
              amount,
              body.paymentDate,
              body.collectedBy,
              body.notes || 'Auto-completion via payment API',
              session
            );
            
            return completionResult;
          } else {
            return NextResponse.json(
              { 
                success: false, 
                error: 'PARTIAL_PAYMENT_EXISTS',
                message: `A partial payment already exists for this date (₹${existingPayment.amount} paid, ₹${remaining} remaining). Please complete it instead.`,
                data: {
                  partialPaymentId: existingPayment._id,
                  paidAmount: existingPayment.amount,
                  remainingAmount: remaining,
                  originalEmiAmount: existingPayment.originalEmiAmount
                }
              },
              { status: 409 }
            );
          }
        } else {
          return NextResponse.json(
            { 
              success: false, 
              error: 'DUPLICATE_PAYMENT',
              message: `Payment already exists for this date (${existingPayment.status} - ₹${existingPayment.amount})`
            },
            { status: 409 }
          );
        }
      }
      
      // 3. Prepare payment data
      const paymentData = {
        loanId: body.loanId,
        customerId: loan.customerId,
        customerName: loan.customerName,
        customerNumber: loan.customerNumber,
        loanNumber: loan.loanNumber,
        amount: amount,
        paymentDate: body.paymentDate, // YYYY-MM-DD string
        status: body.status || 'Paid',
        paymentType: body.paymentType || 'single',
        collectedBy: body.collectedBy,
        notes: body.notes || '',
        paymentMethod: body.paymentMethod || 'Cash',
        transactionId: body.transactionId
      };
      
      // 4. ✅ USE EMIPayment.createPayment FOR CONSISTENT LOGIC
      const result = await EMIPayment.createPayment(paymentData);
      
      return NextResponse.json({
        success: true,
        data: {
          payment: result.payment,
          loanUpdate: result.loanUpdateResult
        },
        message: `Payment created successfully (${result.payment.status})`
      });
    });
    
  } catch (error) {
    console.error('❌ Error creating payment:', error);
    
    // Handle specific errors with appropriate status codes
    if (error.message.includes('PARTIAL_PAYMENT_EXISTS') || 
        error.message.includes('DUPLICATE_PAYMENT')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error.details 
        },
        { status: 409 }
      );
    }
    
    if (error.message.includes('Loan not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 404 }
      );
    }
    
    if (error.message.includes('Loan cannot accept payments')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error.details 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create payment',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ 3. PATCH REQUESTS (ENHANCED)
// ============================================================================
export async function PATCH(request) {
  await applyRateLimiting();
  
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const paymentId = pathSegments[pathSegments.length - 2];
    const isCompleteEndpoint = url.pathname.endsWith('/complete');
    
    const body = await request.json();
    
    if (!paymentId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment ID required' 
        },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Handle partial payment completion
    if (isCompleteEndpoint) {
      return await handleCompletePartialPayment(paymentId, body);
    }
    
    // Handle regular payment update
    return await handleUpdatePayment(paymentId, body);
    
  } catch (error) {
    console.error('❌ Error in PATCH request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ 4. DELETE PAYMENT (NEW - FOR CANCELLATIONS)
// ============================================================================
export async function DELETE(request) {
  await applyRateLimiting();
  
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const paymentId = pathSegments[pathSegments.length - 1];
    
    if (!paymentId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment ID required' 
        },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    return await SafeSession.withTransaction('Delete Payment', async (session) => {
      // Find payment
      const payment = await EMIPayment.findById(paymentId).session(session);
      
      if (!payment) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Payment not found' 
          },
          { status: 404 }
        );
      }
      
      // Don't allow deletion of already cancelled payments
      if (payment.status === 'Cancelled') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Payment already cancelled' 
          },
          { status: 400 }
        );
      }
      
      // Store old values for loan update
      const oldAmount = payment.amount;
      const oldStatus = payment.status;
      const wasPartial = payment.isPartial;
      
      // Soft delete - mark as cancelled
      payment.status = 'Cancelled';
      payment.notes = payment.notes 
        ? `${payment.notes} | Cancelled on ${getCurrentDateString()}`
        : `Cancelled on ${getCurrentDateString()}`;
      await payment.save({ session });
      
      // Update loan by reversing the payment effects
      const loanUpdate = {
        $inc: { totalPaidAmount: -oldAmount }
      };
      
      // If it was a full payment (not partial), decrement emiPaidCount
      if (oldStatus === 'Paid' || oldStatus === 'Advance') {
        loanUpdate.$inc.emiPaidCount = -1;
      }
      
      // If it was a completed partial, also decrement emiPaidCount
      if (wasPartial && payment.isPartialCompleted) {
        loanUpdate.$inc.emiPaidCount = -1;
      }
      
      await Loan.findByIdAndUpdate(payment.loanId, loanUpdate, { session });
      
      // Recalculate loan status
      const loan = await Loan.findById(payment.loanId).session(session);
      if (loan.emiPaidCount >= loan.totalEmiCount) {
        loan.status = 'completed';
      } else if (loan.status === 'completed') {
        loan.status = 'active';
      }
      await loan.save({ session });
      
      return NextResponse.json({
        success: true,
        message: 'Payment cancelled successfully',
        data: {
          payment,
          loanUpdate: {
            emiPaidCount: loan.emiPaidCount,
            totalPaidAmount: loan.totalPaidAmount,
            status: loan.status
          }
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error deleting payment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// ✅ HELPER FUNCTIONS (UPDATED FOR CONSISTENCY)
// ============================================================================

/**
 * Handle regular payment updates
 */
async function handleUpdatePayment(paymentId, body) {
  return await SafeSession.withTransaction('Update Payment', async (session) => {
    // Find payment
    const payment = await EMIPayment.findById(paymentId).session(session);
    
    if (!payment) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment not found' 
        },
        { status: 404 }
      );
    }
    
    const oldAmount = payment.amount;
    const oldStatus = payment.status;
    const oldIsPartial = payment.isPartial;
    
    // Validate and update fields
    if (body.amount !== undefined) {
      const newAmount = parseFloat(body.amount);
      if (isNaN(newAmount) || newAmount <= 0) {
        throw new Error('Invalid amount');
      }
      payment.amount = newAmount;
      
      // Recalculate partial remaining if it's a partial payment
      if (payment.status === 'Partial' && payment.originalEmiAmount) {
        payment.partialRemainingAmount = Math.max(0, payment.originalEmiAmount - newAmount);
      }
    }
    
    if (body.paymentDate !== undefined) {
      if (!isValidYYYYMMDD(body.paymentDate)) {
        throw new Error('Invalid payment date format (YYYY-MM-DD required)');
      }
      payment.paymentDate = body.paymentDate;
    }
    
    if (body.collectedBy !== undefined) {
      payment.collectedBy = body.collectedBy;
    }
    
    if (body.notes !== undefined) {
      payment.notes = body.notes;
    }
    
    if (body.paymentMethod !== undefined) {
      payment.paymentMethod = body.paymentMethod;
    }
    
    // Handle status changes carefully
    if (body.status !== undefined && body.status !== payment.status) {
      const allowedTransitions = {
        'Partial': ['Paid', 'Cancelled'],
        'Paid': ['Partial', 'Cancelled'],
        'Advance': ['Cancelled'],
        'Cancelled': []
      };
      
      if (!allowedTransitions[payment.status]?.includes(body.status)) {
        throw new Error(`Cannot change status from ${payment.status} to ${body.status}`);
      }
      
      payment.status = body.status;
      
      // Handle Partial -> Paid transition (completion)
      if (oldStatus === 'Partial' && body.status === 'Paid') {
        payment.isPartial = false;
        payment.partialRemainingAmount = 0;
        payment.isPartialCompleted = true;
        payment.partialCompletionDate = getCurrentDateString();
      }
    }
    
    await payment.save({ session });
    
    // Update loan based on changes
    const loanUpdate = {};
    
    // Amount change
    if (body.amount !== undefined && oldAmount !== payment.amount) {
      const amountDiff = payment.amount - oldAmount;
      loanUpdate.$inc = { totalPaidAmount: amountDiff };
    }
    
    // Status change from Partial to Paid
    if (oldStatus === 'Partial' && payment.status === 'Paid') {
      if (!loanUpdate.$inc) loanUpdate.$inc = {};
      loanUpdate.$inc.emiPaidCount = 1;
    }
    
    // Status change from Paid to Partial
    if (oldStatus === 'Paid' && payment.status === 'Partial') {
      if (!loanUpdate.$inc) loanUpdate.$inc = {};
      loanUpdate.$inc.emiPaidCount = -1;
    }
    
    if (Object.keys(loanUpdate).length > 0) {
      await Loan.findByIdAndUpdate(payment.loanId, loanUpdate, { session });
      
      // Recalculate loan status
      const loan = await Loan.findById(payment.loanId).session(session);
      if (loan.emiPaidCount >= loan.totalEmiCount) {
        loan.status = 'completed';
      } else if (loan.status === 'completed') {
        loan.status = 'active';
      }
      await loan.save({ session });
    }
    
    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    });
  });
}

/**
 * Handle partial payment completion (uses EMIPayment.completePartialPayment)
 */
async function handleCompletePartialPayment(paymentId, body) {
  // Validate required fields
  if (!body.additionalAmount || body.additionalAmount <= 0) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Valid additional amount required',
        message: 'Additional amount must be greater than 0' 
      },
      { status: 400 }
    );
  }
  
  const additionalAmount = parseFloat(body.additionalAmount);
  const completionDate = body.paymentDate || getCurrentDateString();
  
  if (!isValidYYYYMMDD(completionDate)) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid completion date format',
        message: 'Completion date must be in YYYY-MM-DD format' 
      },
      { status: 400 }
    );
  }
  
  // ✅ USE EMIPayment.completePartialPayment FOR CONSISTENCY
  const result = await EMIPayment.completePartialPayment(
    paymentId,
    additionalAmount,
    completionDate,
    body.collectedBy || 'Operator',
    body.notes || 'Partial payment completion via API'
  );
  
  return NextResponse.json({
    success: true,
    data: result,
    message: result.isNowFullyPaid 
      ? 'Partial payment completed. EMI is now fully paid.' 
      : `Partial payment updated. ₹${result.remainingAmount} remaining.`
  });
}

/**
 * Helper to complete existing partial payment (used in POST)
 */
async function completePartialPayment(partialId, amount, paymentDate, collectedBy, notes, session) {
  const result = await EMIPayment.completePartialPayment(
    partialId,
    amount,
    paymentDate,
    collectedBy,
    notes
  );
  
  return NextResponse.json({
    success: true,
    data: result,
    message: result.isNowFullyPaid 
      ? 'Partial payment completed. EMI is now fully paid.' 
      : 'Partial payment updated.'
  });
}

/**
 * ✅ NEW: Get payment analytics
 */
export async function GETAnalytics(request) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    await connectDB();
    
    let query = {};
    
    if (loanId) query.loanId = loanId;
    if (customerId) query.customerId = customerId;
    
    // Date range filter
    if (startDate && endDate && isValidYYYYMMDD(startDate) && isValidYYYYMMDD(endDate)) {
      query.paymentDate = { $gte: startDate, $lte: endDate };
    } else if (startDate && isValidYYYYMMDD(startDate)) {
      query.paymentDate = { $gte: startDate };
    } else if (endDate && isValidYYYYMMDD(endDate)) {
      query.paymentDate = { $lte: endDate };
    }
    
    // Get summary using aggregation
    const analytics = await EMIPayment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          partialPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'Partial'] }, 1, 0] }
          },
          advancePayments: {
            $sum: { $cond: [{ $eq: ['$status', 'Advance'] }, 1, 0] }
          },
          fullPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalPayments: 1,
          totalAmount: 1,
          partialPayments: 1,
          advancePayments: 1,
          fullPayments: 1,
          averageAmount: { $divide: ['$totalAmount', '$totalPayments'] }
        }
      }
    ]);
    
    // Get daily breakdown
    const dailyBreakdown = await EMIPayment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentDate',
          date: { $first: '$paymentDate' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { date: -1 } },
      { $limit: 30 }
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        summary: analytics[0] || {
          totalPayments: 0,
          totalAmount: 0,
          partialPayments: 0,
          advancePayments: 0,
          fullPayments: 0,
          averageAmount: 0
        },
        dailyBreakdown,
        query
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}