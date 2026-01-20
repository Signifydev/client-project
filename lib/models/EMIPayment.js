import mongoose from 'mongoose';
import SafeSession from '../safeSession';

// ==============================================
// DATE UTILITY FUNCTIONS (CONSISTENT WITH LOAN.JS)
// ==============================================

/**
 * Get current date as YYYY-MM-DD string
 * @returns {string} Current date in YYYY-MM-DD format
 */
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate YYYY-MM-DD format (identical to Loan.js)
 */
function isValidYYYYMMDD(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Basic validation
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // More accurate validation
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * Format date to DD/MM/YYYY for display (consistent with frontend)
 */
function formatToDDMMYYYY(dateString) {
  if (!isValidYYYYMMDD(dateString)) return '';
  
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
function parseDateString(dateString) {
  if (!isValidYYYYMMDD(dateString)) {
    console.error('Invalid date string:', dateString);
    return new Date();
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculate next date based on loan type (consistent with Loan.js)
 */
function calculateNextDate(currentDate, loanType) {
  if (!isValidYYYYMMDD(currentDate)) return currentDate;
  
  const date = parseDateString(currentDate);
  
  switch(loanType) {
    case 'Daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'Weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return formatToYYYYMMDD(date);
}

/**
 * Format Date object to YYYY-MM-DD string (consistent with Loan.js)
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

// ==============================================
// EMI PAYMENT SCHEMA (ALIGNED WITH LOAN.JS LOGIC)
// ==============================================

const emiPaymentSchema = new mongoose.Schema({
  // Basic payment info
  customerId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  customerName: { 
    type: String, 
    required: true,
    trim: true
  },
  customerNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true,
    index: true
  },
  loanNumber: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Payment details
  paymentDate: { 
    type: String, // YYYY-MM-DD (consistent with Loan.js)
    required: true,
    validate: {
      validator: isValidYYYYMMDD,
      message: 'Payment date must be in YYYY-MM-DD format'
    },
    index: true,
    default: getCurrentDateString
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0.01 // Minimum payment amount
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Advance', 'Cancelled'], // Added Cancelled for consistency
    required: true,
    default: 'Paid',
    index: true
  },
  collectedBy: { 
    type: String, 
    required: true 
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Other'],
    default: 'Cash'
  },
  transactionId: {
    type: String,
    trim: true,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  
  // ✅ ENHANCED PARTIAL PAYMENT TRACKING (Aligned with Loan.js)
  isPartial: {
    type: Boolean,
    default: false,
    index: true
  },
  originalEmiAmount: { // ✅ Renamed from fullEmiAmount for consistency
    type: Number,
    default: null
  },
  partialRemainingAmount: {
    type: Number,
    default: 0
  },
  installmentNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  isPartialCompleted: {
    type: Boolean,
    default: false,
    index: true
  },
  partialCompletionDate: {
    type: String, // YYYY-MM-DD
    default: null,
    validate: {
      validator: function(v) {
        return !v || isValidYYYYMMDD(v);
      },
      message: 'Partial completion date must be in YYYY-MM-DD format'
    }
  },
  
  // Advance payment tracking
  paymentType: {
    type: String,
    enum: ['single', 'advance', 'partial_completion'], // Added partial_completion
    default: 'single',
    index: true
  },
  isAdvancePayment: {
    type: Boolean,
    default: false
  },
  advanceFromDate: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || isValidYYYYMMDD(v);
      },
      message: 'Advance from date must be in YYYY-MM-DD format'
    }
  },
  advanceToDate: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || isValidYYYYMMDD(v);
      },
      message: 'Advance to date must be in YYYY-MM-DD format'
    }
  },
  advanceEmiCount: {
    type: Number,
    default: 1
  },
  
  // ✅ NEW: Link to parent partial payment (for completion tracking)
  parentPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EMIPayment',
    default: null
  },
  
  // ✅ NEW: Loan reference fields for easier queries
  loanType: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly'],
    default: 'Weekly'
  },
  emiType: {
    type: String,
    enum: ['fixed', 'custom'],
    default: 'fixed'
  },
  
  // Audit fields
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// ==============================================
// INDEXES (ENHANCED FOR PERFORMANCE)
// ==============================================
emiPaymentSchema.index({ loanId: 1, paymentDate: 1 }); // Duplicate check
emiPaymentSchema.index({ customerId: 1, status: 1 }); // Customer queries
emiPaymentSchema.index({ customerNumber: 1, paymentDate: -1 }); // Customer by number
emiPaymentSchema.index({ paymentDate: -1 }); // Recent payments
emiPaymentSchema.index({ loanId: 1, isPartial: 1, status: 1 }); // Partial lookup
emiPaymentSchema.index({ collectedBy: 1, paymentDate: -1 }); // Operator reports
emiPaymentSchema.index({ loanNumber: 1, paymentDate: -1 }); // Loan-specific queries
emiPaymentSchema.index({ parentPaymentId: 1 }); // Partial completion tracking
emiPaymentSchema.index({ loanId: 1, installmentNumber: 1 }); // Installment tracking

// ==============================================
// PRE-SAVE HOOK (ENHANCED)
// ==============================================
emiPaymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-set fields based on payment type
  if (this.paymentType === 'advance') {
    this.isAdvancePayment = true;
    this.status = 'Advance';
  }
  
  // ✅ FIXED: Set partial tracking correctly
  if (this.status === 'Partial' || this.paymentType === 'partial_completion') {
    this.isPartial = true;
    if (this.status === 'Partial') {
      // This is an original partial payment
      if (!this.originalEmiAmount) {
        // Will be updated in createPayment method with loan info
        this.originalEmiAmount = this.amount; // Temporary
      }
      this.partialRemainingAmount = Math.max(0, (this.originalEmiAmount || 0) - this.amount);
    } else if (this.paymentType === 'partial_completion') {
      // This is a completion payment for a partial
      this.isPartial = false;
      this.status = 'Paid';
    }
  } else {
    // Full payments
    this.isPartial = false;
    this.partialRemainingAmount = 0;
  }
  
  next();
});

// ==============================================
// ✅ CRITICAL FIX: STATIC METHODS (ALIGNED WITH LOAN.JS)
// ==============================================

/**
 * Create a new payment with duplicate check and loan update
 * ✅ UPDATED: Aligned with Loan.js updateEMIPayment logic
 */
emiPaymentSchema.statics.createPayment = async function(paymentData) {
  return SafeSession.withTransaction('Create Payment', async (session) => {
    console.log('🔄 Creating payment:', {
      loanId: paymentData.loanId,
      amount: paymentData.amount,
      status: paymentData.status,
      paymentDate: paymentData.paymentDate
    });
    
    // 1. Check for duplicate payment (same loan, same date, same status)
    const existingPayment = await this.findOne({
      loanId: paymentData.loanId,
      paymentDate: paymentData.paymentDate,
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    }).session(session);
    
    if (existingPayment) {
      throw new Error(`Payment already exists for date ${paymentData.paymentDate}`);
    }
    
    // 2. Get loan to validate and get EMI amount
    const Loan = mongoose.model('Loan');
    const loan = await Loan.findById(paymentData.loanId).session(session);
    
    if (!loan) {
      throw new Error('Loan not found');
    }
    
    // 3. Determine expected EMI amount for this installment
    const nextInstallmentNumber = loan.emiPaidCount + 1;
    const expectedAmount = loan.getInstallmentAmount ? 
      loan.getInstallmentAmount(nextInstallmentNumber) : 
      loan.emiAmount;
    
    // ✅ FIXED: Determine payment status (matching Loan.js logic)
    const isPartialPayment = paymentData.amount < expectedAmount;
    const paymentStatus = isPartialPayment ? 'Partial' : (paymentData.status || 'Paid');
    
    console.log('📊 Payment validation:', {
      expectedAmount,
      paidAmount: paymentData.amount,
      isPartial: isPartialPayment,
      status: paymentStatus,
      installmentNumber: nextInstallmentNumber
    });
    
    // 4. Create payment record
    const payment = new this({
      ...paymentData,
      customerNumber: loan.customerNumber,
      loanType: loan.loanType,
      emiType: loan.emiType,
      status: paymentStatus,
      isPartial: isPartialPayment,
      originalEmiAmount: isPartialPayment ? expectedAmount : null,
      partialRemainingAmount: isPartialPayment ? Math.max(0, expectedAmount - paymentData.amount) : 0,
      installmentNumber: nextInstallmentNumber
    });
    
    await payment.save({ session });
    
    // 5. ✅ CRITICAL: Update loan using Loan.js updateEMIPayment method
    // This ensures consistent logic between Loan and EMIPayment models
    const loanUpdateResult = await loan.updateEMIPayment(
      paymentData.amount,
      paymentData.paymentDate,
      paymentData.collectedBy || 'system',
      paymentData.notes || '',
      paymentData.paymentType || 'single',
      expectedAmount // Pass original EMI amount
    );
    
    await loan.save({ session });
    
    console.log('✅ Payment created and loan updated:', {
      paymentId: payment._id,
      amount: payment.amount,
      status: payment.status,
      loanNumber: payment.loanNumber,
      isPartial: payment.isPartial,
      remaining: payment.partialRemainingAmount,
      loanUpdate: {
        emiPaidCountAfter: loan.emiPaidCount,
        nextEmiDate: loan.nextEmiDate,
        status: loan.status
      }
    });
    
    return {
      payment,
      loanUpdateResult
    };
  });
};

/**
 * ✅ FIXED: Create multiple advance payments (bulk operation)
 * Now properly handles duplicates and loan updates
 */
emiPaymentSchema.statics.createAdvancePayments = async function(advanceData) {
  return SafeSession.withTransaction('Create Advance Payments', async (session) => {
    const { loanId, fromDate, toDate, amountPerEmi, collectedBy, customerId, customerName, loanNumber, notes } = advanceData;
    
    console.log('🔄 Creating advance payments:', {
      loanId,
      fromDate,
      toDate,
      amountPerEmi,
      loanNumber
    });
    
    // Validate dates
    if (!isValidYYYYMMDD(fromDate) || !isValidYYYYMMDD(toDate)) {
      throw new Error('Invalid date format for advance payment (YYYY-MM-DD required)');
    }
    
    if (fromDate > toDate) {
      throw new Error('From date cannot be after to date');
    }
    
    if (amountPerEmi <= 0) {
      throw new Error('EMI amount must be greater than 0');
    }
    
    // Get loan to calculate installment numbers
    const Loan = mongoose.model('Loan');
    const loan = await Loan.findById(loanId).session(session);
    
    if (!loan) {
      throw new Error('Loan not found');
    }
    
    // ✅ Check if loan can accept advance payments
    const isCompleted = loan.emiPaidCount >= loan.totalEmiCount;
    if (isCompleted || loan.isRenewed || loan.status === 'completed') {
      throw new Error('Cannot create advance payments for completed or renewed loans');
    }
    
    // Calculate payment dates based on loan type
    const paymentDates = [];
    let currentDate = fromDate;
    let currentInstallment = loan.emiPaidCount + 1;
    
    while (currentDate <= toDate && currentInstallment <= loan.totalEmiCount) {
      paymentDates.push({
        date: currentDate,
        installmentNumber: currentInstallment
      });
      
      // Move to next date based on loan type
      currentDate = calculateNextDate(currentDate, loan.loanType);
      currentInstallment++;
      
      // Safety break - max 365 payments (1 year)
      if (paymentDates.length > 365) {
        console.warn('⚠️ Safety break: Exceeded 365 payments');
        break;
      }
    }
    
    if (paymentDates.length === 0) {
      throw new Error('No valid payment dates in the specified range or loan is already completed');
    }
    
    console.log(`📅 Will create ${paymentDates.length} advance payments from ${fromDate} to ${toDate}`);
    
    // ✅ Check for existing payments in this date range
    const existingDates = await this.find({
      loanId,
      paymentDate: { 
        $gte: fromDate, 
        $lte: toDate 
      },
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    }).session(session);
    
    if (existingDates.length > 0) {
      const existingDateList = existingDates.map(p => p.paymentDate).join(', ');
      throw new Error(`Payments already exist for some dates: ${existingDateList}`);
    }
    
    // ✅ CRITICAL: Prepare batch of payments
    const payments = [];
    const now = new Date();
    
    for (const item of paymentDates) {
      const payment = new this({
        customerId,
        customerName,
        customerNumber: loan.customerNumber,
        loanId,
        loanNumber,
        loanType: loan.loanType,
        emiType: loan.emiType,
        paymentDate: item.date,
        amount: amountPerEmi,
        status: 'Advance',
        collectedBy,
        paymentType: 'advance',
        isAdvancePayment: true,
        advanceFromDate: fromDate,
        advanceToDate: toDate,
        advanceEmiCount: paymentDates.length,
        installmentNumber: item.installmentNumber,
        notes: notes || `Advance payment installment ${item.installmentNumber} of ${paymentDates.length} (${fromDate} to ${toDate})`,
        createdAt: now,
        updatedAt: now
      });
      
      payments.push(payment);
    }
    
    // ✅ CRITICAL: Insert all payments in bulk (within transaction)
    const createdPayments = await this.insertMany(payments, { session });
    
    // ✅ CRITICAL: Update loan with all payments at once
    // Calculate total amount and installments
    const totalAmount = amountPerEmi * paymentDates.length;
    
    // Update loan counters
    loan.emiPaidCount += paymentDates.length;
    loan.totalPaidAmount += totalAmount;
    loan.remainingAmount = Math.max(0, loan.totalLoanAmount - loan.totalPaidAmount);
    
    // Update last EMI date to the last date in the range
    loan.lastEmiDate = toDate;
    
    // Calculate next EMI date
    const lastDate = parseDateString(toDate);
    let nextDueDate = new Date(lastDate);
    
    switch (loan.loanType) {
      case 'Daily':
        nextDueDate.setDate(nextDueDate.getDate() + 1);
        break;
      case 'Weekly':
        nextDueDate.setDate(nextDueDate.getDate() + 7);
        break;
      case 'Monthly':
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
    }
    
    loan.nextEmiDate = formatToYYYYMMDD(nextDueDate);
    
    // Update status if completed
    if (loan.emiPaidCount >= loan.totalEmiCount) {
      loan.status = 'completed';
      loan.nextEmiDate = null;
    }
    
    // Update backward compatibility fields
    loan.emiPaid = loan.totalPaidAmount;
    loan.totalPaid = loan.totalPaidAmount;
    
    await loan.save({ session });
    
    // ✅ Add payments to loan's emiHistory
    for (const payment of createdPayments) {
      loan.emiHistory.push({
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        status: payment.status,
        collectedBy: payment.collectedBy,
        notes: payment.notes,
        loanId: payment.loanId,
        customerNumber: payment.customerNumber,
        loanNumber: payment.loanNumber,
        paymentType: payment.paymentType,
        originalEmiAmount: null // Not partial, so no original amount needed
      });
    }
    
    await loan.save({ session });
    
    const totalInstallments = paymentDates.length;
    
    console.log(`✅ Created ${createdPayments.length} advance payments, total: ₹${totalAmount}`, {
      loanUpdate: {
        emiPaidCountBefore: loan.emiPaidCount - totalInstallments,
        emiPaidCountAfter: loan.emiPaidCount,
        totalEmiCount: loan.totalEmiCount,
        totalPaidAmount: loan.totalPaidAmount,
        nextEmiDate: loan.nextEmiDate,
        status: loan.status
      }
    });
    
    return {
      payments: createdPayments,
      totalAmount,
      totalInstallments
    };
  });
};

/**
 * ✅ ENHANCED: Complete a partial payment (aligned with Loan.js method)
 */
emiPaymentSchema.statics.completePartialPayment = async function(partialPaymentId, additionalAmount, completionDate, collectedBy, notes = '') {
  return SafeSession.withTransaction('Complete Partial Payment', async (session) => {
    console.log('🔄 Completing partial payment:', {
      partialPaymentId,
      additionalAmount,
      completionDate
    });
    
    // 1. Find the partial payment
    const partialPayment = await this.findById(partialPaymentId).session(session);
    
    if (!partialPayment || partialPayment.status !== 'Partial') {
      throw new Error('Partial payment not found or already completed');
    }
    
    if (additionalAmount <= 0) {
      throw new Error('Additional amount must be greater than 0');
    }
    
    // 2. Calculate if this will complete the payment
    const totalPaidNow = partialPayment.amount + additionalAmount;
    const originalAmount = partialPayment.originalEmiAmount || 0;
    
    if (additionalAmount > (originalAmount - partialPayment.amount)) {
      throw new Error(`Additional amount (₹${additionalAmount}) exceeds remaining amount (₹${originalAmount - partialPayment.amount})`);
    }
    
    // 3. ✅ Use Loan.js method to handle completion properly
    const Loan = mongoose.model('Loan');
    const loan = await Loan.findById(partialPayment.loanId).session(session);
    
    if (!loan) {
      throw new Error('Loan not found');
    }
    
    // 4. Create completion payment record
    const completionPayment = new this({
      customerId: partialPayment.customerId,
      customerName: partialPayment.customerName,
      customerNumber: partialPayment.customerNumber,
      loanId: partialPayment.loanId,
      loanNumber: partialPayment.loanNumber,
      loanType: partialPayment.loanType || loan.loanType,
      emiType: partialPayment.emiType || loan.emiType,
      paymentDate: completionDate || getCurrentDateString(),
      amount: additionalAmount,
      status: 'Paid',
      collectedBy: collectedBy,
      paymentMethod: partialPayment.paymentMethod || 'Cash',
      notes: notes || `Completion payment for partial payment ${partialPaymentId}`,
      installmentNumber: partialPayment.installmentNumber,
      paymentType: 'partial_completion',
      parentPaymentId: partialPaymentId,
      isPartial: false
    });
    
    await completionPayment.save({ session });
    
    // 5. Update partial payment record
    partialPayment.amount = totalPaidNow;
    
    const isNowFullyPaid = totalPaidNow >= originalAmount;
    if (isNowFullyPaid) {
      partialPayment.status = 'Paid';
      partialPayment.isPartial = false;
      partialPayment.isPartialCompleted = true;
      partialPayment.partialCompletionDate = completionDate || getCurrentDateString();
      partialPayment.partialRemainingAmount = 0;
      
      // ✅ Update loan for completed partial
      loan.emiPaidCount += 1;
      loan.totalPaidAmount += additionalAmount;
      loan.remainingAmount = Math.max(0, loan.totalLoanAmount - loan.totalPaidAmount);
      loan.lastEmiDate = completionDate || getCurrentDateString();
      loan.nextEmiDate = loan.getNextDueDate();
      
      // Update status if completed
      if (loan.emiPaidCount >= loan.totalEmiCount) {
        loan.status = 'completed';
        loan.nextEmiDate = null;
      }
    } else {
      partialPayment.partialRemainingAmount = Math.max(0, originalAmount - totalPaidNow);
      // Update loan amount only (no emiPaidCount increment)
      loan.totalPaidAmount += additionalAmount;
      loan.remainingAmount = Math.max(0, loan.totalLoanAmount - loan.totalPaidAmount);
    }
    
    // Update partial payment notes
    partialPayment.notes = partialPayment.notes 
      ? `${partialPayment.notes} | Completed: ₹${additionalAmount} on ${completionDate}`
      : `Partial completed: ₹${additionalAmount} on ${completionDate}`;
    
    await partialPayment.save({ session });
    await loan.save({ session });
    
    console.log('✅ Partial payment completion processed:', {
      partialId: partialPaymentId,
      additionalAmount,
      newTotal: totalPaidNow,
      originalAmount,
      isNowFullyPaid,
      loanUpdate: {
        emiPaidCount: loan.emiPaidCount,
        totalPaidAmount: loan.totalPaidAmount,
        status: loan.status
      }
    });
    
    return {
      partialPayment,
      completionPayment,
      isNowFullyPaid,
      remainingAmount: isNowFullyPaid ? 0 : (originalAmount - totalPaidNow)
    };
  });
};

/**
 * ✅ NEW: Find and process multiple partial completions
 */
emiPaymentSchema.statics.completeAllPartialPayments = async function(loanId, completionDate, collectedBy, notes = '') {
  const partialPayments = await this.find({
    loanId,
    status: 'Partial',
    isPartial: true
  }).sort({ paymentDate: 1 });
  
  if (partialPayments.length === 0) {
    return { success: true, message: 'No partial payments found', completed: 0 };
  }
  
  const results = [];
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    for (const partialPayment of partialPayments) {
      const remainingAmount = partialPayment.partialRemainingAmount || 
                             (partialPayment.originalEmiAmount - partialPayment.amount);
      
      if (remainingAmount > 0) {
        const result = await this.completePartialPayment(
          partialPayment._id,
          remainingAmount,
          completionDate,
          collectedBy,
          notes || `Bulk completion for loan ${loanId}`
        );
        
        results.push(result);
      }
    }
    
    await session.commitTransaction();
    
    console.log(`✅ Completed ${results.length} partial payments for loan ${loanId}`);
    
    return {
      success: true,
      completed: results.length,
      results: results
    };
    
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error completing partial payments:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * ✅ NEW: Find partial payments for a loan that can be completed
 */
emiPaymentSchema.statics.findPartialPayments = function(loanId, includeCompleted = false) {
  const query = {
    loanId,
    isPartial: true
  };
  
  if (!includeCompleted) {
    query.status = 'Partial';
  }
  
  return this.find(query)
    .sort({ paymentDate: 1, installmentNumber: 1 })
    .select('_id amount originalEmiAmount partialRemainingAmount paymentDate installmentNumber notes status isPartialCompleted customerName loanNumber');
};

/**
 * ✅ NEW: Get payment summary for a loan
 */
emiPaymentSchema.statics.getPaymentSummary = async function(loanId) {
  const payments = await this.find({ loanId }).sort({ paymentDate: 1 });
  
  const summary = {
    totalPayments: payments.length,
    totalAmount: 0,
    partialPayments: 0,
    advancePayments: 0,
    fullPayments: 0,
    byStatus: {},
    byMonth: {},
    remainingPartialAmount: 0
  };
  
  payments.forEach(payment => {
    summary.totalAmount += payment.amount;
    
    // Count by status
    summary.byStatus[payment.status] = (summary.byStatus[payment.status] || 0) + 1;
    
    // Count by type
    if (payment.status === 'Partial') {
      summary.partialPayments++;
      summary.remainingPartialAmount += payment.partialRemainingAmount || 0;
    } else if (payment.status === 'Advance') {
      summary.advancePayments++;
    } else if (payment.status === 'Paid') {
      summary.fullPayments++;
    }
    
    // Group by month
    if (payment.paymentDate) {
      const month = payment.paymentDate.substring(0, 7); // YYYY-MM
      summary.byMonth[month] = (summary.byMonth[month] || 0) + payment.amount;
    }
  });
  
  return summary;
};

/**
 * ✅ NEW: Get customer payment history
 */
emiPaymentSchema.statics.getCustomerPaymentHistory = async function(customerId, limit = 50) {
  return this.find({ customerId })
    .sort({ paymentDate: -1 })
    .limit(limit)
    .select('paymentDate amount status loanNumber paymentMethod collectedBy notes installmentNumber')
    .lean();
};

/**
 * Check for duplicate payment
 */
emiPaymentSchema.statics.checkDuplicate = function(loanId, paymentDate, status = null) {
  const query = {
    loanId,
    paymentDate,
    status: { $ne: 'Cancelled' }
  };
  
  if (status) {
    query.status = status;
  }
  
  return this.findOne(query);
};

/**
 * ✅ NEW: Validate payment amount against loan
 */
emiPaymentSchema.statics.validatePaymentAmount = async function(loanId, amount, paymentDate) {
  const Loan = mongoose.model('Loan');
  const loan = await Loan.findById(loanId);
  
  if (!loan) {
    throw new Error('Loan not found');
  }
  
  // Get expected amount for next installment
  const nextInstallmentNumber = loan.emiPaidCount + 1;
  const expectedAmount = loan.getInstallmentAmount ? 
    loan.getInstallmentAmount(nextInstallmentNumber) : 
    loan.emiAmount;
  
  return {
    isValid: amount > 0 && amount <= (expectedAmount * 2), // Allow up to 2x EMI for advance
    expectedAmount,
    nextInstallmentNumber,
    isPartial: amount < expectedAmount,
    loanStatus: loan.status,
    canAcceptPayment: loan.status === 'active' && !loan.isRenewed && loan.emiPaidCount < loan.totalEmiCount
  };
};

// ==============================================
// VIRTUAL FIELDS (ENHANCED)
// ==============================================
emiPaymentSchema.virtual('formattedPaymentDate').get(function() {
  return formatToDDMMYYYY(this.paymentDate);
});

emiPaymentSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN')}`;
});

emiPaymentSchema.virtual('isComplete').get(function() {
  return this.status === 'Paid' || this.status === 'Advance';
});

emiPaymentSchema.virtual('isPendingCompletion').get(function() {
  return this.status === 'Partial' && this.partialRemainingAmount > 0;
});

emiPaymentSchema.virtual('originalAmountFormatted').get(function() {
  if (this.originalEmiAmount) {
    return `₹${this.originalEmiAmount.toLocaleString('en-IN')}`;
  }
  return 'N/A';
});

emiPaymentSchema.virtual('remainingAmountFormatted').get(function() {
  if (this.partialRemainingAmount > 0) {
    return `₹${this.partialRemainingAmount.toLocaleString('en-IN')}`;
  }
  return '₹0';
});

// ==============================================
// OUTPUT TRANSFORM (ENHANCED)
// ==============================================
emiPaymentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.formattedPaymentDate = doc.formattedPaymentDate;
    ret.formattedAmount = doc.formattedAmount;
    ret.isComplete = doc.isComplete;
    ret.isPendingCompletion = doc.isPendingCompletion;
    ret.originalAmountFormatted = doc.originalAmountFormatted;
    ret.remainingAmountFormatted = doc.remainingAmountFormatted;
    
    // ✅ Add calculated fields for frontend
    ret.isPartialPayment = doc.status === 'Partial';
    ret.canBeCompleted = doc.status === 'Partial' && doc.partialRemainingAmount > 0;
    ret.completionPercentage = doc.originalEmiAmount ? 
      Math.round((doc.amount / doc.originalEmiAmount) * 100) : 
      100;
    
    return ret;
  }
});

emiPaymentSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.formattedPaymentDate = doc.formattedPaymentDate;
    ret.formattedAmount = doc.formattedAmount;
    ret.isComplete = doc.isComplete;
    ret.isPendingCompletion = doc.isPendingCompletion;
    ret.originalAmountFormatted = doc.originalAmountFormatted;
    ret.remainingAmountFormatted = doc.remainingAmountFormatted;
    
    // ✅ Add calculated fields for frontend
    ret.isPartialPayment = doc.status === 'Partial';
    ret.canBeCompleted = doc.status === 'Partial' && doc.partialRemainingAmount > 0;
    ret.completionPercentage = doc.originalEmiAmount ? 
      Math.round((doc.amount / doc.originalEmiAmount) * 100) : 
      100;
    
    return ret;
  }
});

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);