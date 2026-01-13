import mongoose from 'mongoose';
import SafeSession from '../safeSession';

// ==============================================
// SIMPLIFIED DATE UTILITIES
// ==============================================

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
 * Validate YYYY-MM-DD format
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
 * Calculate next date based on loan type
 */
function calculateNextDate(currentDate, loanType) {
  if (!isValidYYYYMMDD(currentDate)) return currentDate;
  
  const [year, month, day] = currentDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
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
  
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ==============================================
// SIMPLIFIED EMI PAYMENT SCHEMA
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
    type: String, // YYYY-MM-DD
    required: true,
    validate: {
      validator: isValidYYYYMMDD,
      message: 'Payment date must be in YYYY-MM-DD format'
    },
    index: true
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Advance'],
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
  
  // SIMPLE PARTIAL PAYMENT TRACKING (No complex chains)
  isPartial: {
    type: Boolean,
    default: false,
    index: true
  },
  fullEmiAmount: {
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
  
  // Advance payment tracking
  paymentType: {
    type: String,
    enum: ['single', 'advance'],
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
// ESSENTIAL INDEXES ONLY (M0 TIER OPTIMIZED)
// ==============================================
emiPaymentSchema.index({ loanId: 1, paymentDate: 1 }); // Duplicate check
emiPaymentSchema.index({ customerId: 1, status: 1 }); // Customer queries
emiPaymentSchema.index({ paymentDate: -1 }); // Recent payments
emiPaymentSchema.index({ loanId: 1, isPartial: 1, status: 1 }); // Partial lookup
emiPaymentSchema.index({ collectedBy: 1, paymentDate: -1 }); // Operator reports

// ==============================================
// PRE-SAVE HOOK
// ==============================================
emiPaymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-set fields based on payment type
  if (this.paymentType === 'advance') {
    this.isAdvancePayment = true;
    this.status = 'Advance';
  }
  
  // Set partial tracking for partial payments
  if (this.status === 'Partial') {
    this.isPartial = true;
    if (!this.fullEmiAmount) {
      this.fullEmiAmount = this.amount; // Will be updated when loan info is available
    }
    this.partialRemainingAmount = Math.max(0, this.fullEmiAmount - this.amount);
  } else {
    this.isPartial = false;
    this.partialRemainingAmount = 0;
  }
  
  next();
});

// ==============================================
// STATIC METHODS - SIMPLIFIED
// ==============================================

/**
 * Create a new payment with duplicate check and loan update
 */
emiPaymentSchema.statics.createPayment = async function(paymentData) {
  return SafeSession.withTransaction('Create Payment', async (session) => {
    // 1. Check for duplicate payment (same loan, same date)
    const existingPayment = await this.findOne({
      loanId: paymentData.loanId,
      paymentDate: paymentData.paymentDate,
      status: { $ne: 'cancelled' }
    }).session(session);
    
    if (existingPayment) {
      throw new Error(`Payment already exists for date ${paymentData.paymentDate}`);
    }
    
    // 2. Create payment
    const payment = new this(paymentData);
    await payment.save({ session });
    
    // 3. Update loan based on payment type
    const Loan = mongoose.model('Loan');
    const loan = await Loan.findById(paymentData.loanId).session(session);
    
    if (!loan) {
      throw new Error('Loan not found');
    }
    
    let updateData = {
      $inc: { totalPaidAmount: paymentData.amount }
    };
    
    // Only increment emiPaidCount for FULL payments (Paid or Advance)
    if (paymentData.status === 'Paid' || paymentData.status === 'Advance') {
      updateData.$inc.emiPaidCount = 1;
      updateData.$set = {
        lastEmiDate: paymentData.paymentDate,
        nextEmiDate: calculateNextDate(paymentData.paymentDate, loan.loanType)
      };
    }
    
    // For partial payments, update fullEmiAmount if needed
    if (paymentData.status === 'Partial' && loan) {
      // Get correct EMI amount for this installment
      const installmentNumber = payment.installmentNumber || 1;
      const correctEmiAmount = loan.getInstallmentAmount ? 
        loan.getInstallmentAmount(installmentNumber) : 
        loan.emiAmount;
      
      payment.fullEmiAmount = correctEmiAmount;
      payment.partialRemainingAmount = Math.max(0, correctEmiAmount - paymentData.amount);
      await payment.save({ session });
    }
    
    await Loan.findByIdAndUpdate(paymentData.loanId, updateData, { session });
    
    console.log('✅ Payment created:', {
      id: payment._id,
      amount: payment.amount,
      status: payment.status,
      loanNumber: payment.loanNumber,
      isPartial: payment.isPartial,
      remaining: payment.partialRemainingAmount
    });
    
    return payment;
  });
};

/**
 * Complete a partial payment (add remaining amount)
 */
emiPaymentSchema.statics.completePartialPayment = async function(partialPaymentId, additionalAmount, completionDate, collectedBy, notes = '') {
  return SafeSession.withTransaction('Complete Partial Payment', async (session) => {
    // 1. Find the partial payment
    const partialPayment = await this.findById(partialPaymentId).session(session);
    
    if (!partialPayment || partialPayment.status !== 'Partial') {
      throw new Error('Partial payment not found or already completed');
    }
    
    if (additionalAmount > partialPayment.partialRemainingAmount) {
      throw new Error(`Additional amount (₹${additionalAmount}) exceeds remaining amount (₹${partialPayment.partialRemainingAmount})`);
    }
    
    // 2. Create completion payment
    const completionPayment = new this({
      customerId: partialPayment.customerId,
      customerName: partialPayment.customerName,
      loanId: partialPayment.loanId,
      loanNumber: partialPayment.loanNumber,
      paymentDate: completionDate || getCurrentDateString(),
      amount: additionalAmount,
      status: 'Paid', // Completion is always full payment
      collectedBy: collectedBy,
      notes: notes || `Completion payment for partial ${partialPaymentId}`,
      installmentNumber: partialPayment.installmentNumber
    });
    
    await completionPayment.save({ session });
    
    // 3. Update partial payment
    partialPayment.amount += additionalAmount;
    
    // Check if now fully paid
    const newTotalPaid = partialPayment.amount;
    const fullEmiAmount = partialPayment.fullEmiAmount || newTotalPaid;
    
    if (newTotalPaid >= fullEmiAmount) {
      partialPayment.status = 'Paid';
      partialPayment.isPartial = false;
      partialPayment.partialRemainingAmount = 0;
    } else {
      partialPayment.partialRemainingAmount = Math.max(0, fullEmiAmount - newTotalPaid);
    }
    
    // Add completion note
    partialPayment.notes = partialPayment.notes 
      ? `${partialPayment.notes} | Completed: ₹${additionalAmount} on ${completionDate}`
      : `Completed: ₹${additionalAmount} on ${completionDate}`;
    
    await partialPayment.save({ session });
    
    // 4. Update loan
    const Loan = mongoose.model('Loan');
    const updateData = {
      $inc: { totalPaidAmount: additionalAmount }
    };
    
    // Only increment emiPaidCount if now fully paid
    if (partialPayment.status === 'Paid') {
      updateData.$inc.emiPaidCount = 1;
      updateData.$set = {
        lastEmiDate: completionDate || getCurrentDateString(),
        nextEmiDate: calculateNextDate(completionDate || getCurrentDateString(), loan.loanType)
      };
    }
    
    await Loan.findByIdAndUpdate(partialPayment.loanId, updateData, { session });
    
    console.log('✅ Partial payment completed:', {
      partialId: partialPaymentId,
      additionalAmount,
      newTotal: newTotalPaid,
      newStatus: partialPayment.status,
      remaining: partialPayment.partialRemainingAmount
    });
    
    return {
      partialPayment,
      completionPayment,
      isNowFullyPaid: partialPayment.status === 'Paid'
    };
  });
};

/**
 * Create multiple advance payments (bulk operation)
 */
emiPaymentSchema.statics.createAdvancePayments = async function(advanceData) {
  const { loanId, fromDate, toDate, amountPerEmi, collectedBy, customerId, customerName, loanNumber } = advanceData;
  
  // Validate dates
  if (!isValidYYYYMMDD(fromDate) || !isValidYYYYMMDD(toDate)) {
    throw new Error('Invalid date format for advance payment');
  }
  
  if (fromDate > toDate) {
    throw new Error('From date cannot be after to date');
  }
  
  // Get loan to calculate installment numbers
  const Loan = mongoose.model('Loan');
  const loan = await Loan.findById(loanId);
  
  if (!loan) {
    throw new Error('Loan not found');
  }
  
  // Calculate payment dates based on loan type
  const paymentDates = [];
  let currentDate = fromDate;
  
  while (currentDate <= toDate) {
    paymentDates.push(currentDate);
    
    // Move to next date based on loan type
    currentDate = calculateNextDate(currentDate, loan.loanType);
    
    // Safety break (max 365 payments)
    if (paymentDates.length > 365) break;
  }
  
  if (paymentDates.length === 0) {
    throw new Error('No valid payment dates in the specified range');
  }
  
  console.log(`📅 Creating ${paymentDates.length} advance payments from ${fromDate} to ${toDate}`);
  
  // Prepare bulk operations
  const payments = paymentDates.map((date, index) => ({
    customerId,
    customerName,
    loanId,
    loanNumber,
    paymentDate: date,
    amount: amountPerEmi,
    status: 'Advance',
    collectedBy,
    paymentType: 'advance',
    isAdvancePayment: true,
    installmentNumber: (loan.emiPaidCount || 0) + index + 1
  }));
  
  // Use bulk insert for efficiency
  const createdPayments = await this.insertMany(payments, { ordered: false });
  
  // Update loan totals in one operation
  const totalAmount = amountPerEmi * paymentDates.length;
  await Loan.findByIdAndUpdate(loanId, {
    $inc: {
      totalPaidAmount: totalAmount,
      emiPaidCount: paymentDates.length
    },
    $set: {
      lastEmiDate: paymentDates[paymentDates.length - 1],
      nextEmiDate: calculateNextDate(paymentDates[paymentDates.length - 1], loan.loanType)
    }
  });
  
  console.log(`✅ Created ${createdPayments.length} advance payments, total: ₹${totalAmount}`);
  
  return createdPayments;
};

/**
 * Find partial payments for a loan that can be completed
 */
emiPaymentSchema.statics.findPartialPayments = function(loanId) {
  return this.find({
    loanId,
    status: 'Partial',
    isPartial: true
  })
  .sort({ paymentDate: 1 })
  .select('_id amount fullEmiAmount partialRemainingAmount paymentDate installmentNumber notes');
};

/**
 * Check for duplicate payment
 */
emiPaymentSchema.statics.checkDuplicate = function(loanId, paymentDate) {
  return this.findOne({
    loanId,
    paymentDate,
    status: { $ne: 'cancelled' }
  });
};

// ==============================================
// VIRTUAL FIELDS (Display only)
// ==============================================
emiPaymentSchema.virtual('formattedPaymentDate').get(function() {
  if (!this.paymentDate) return '';
  const [year, month, day] = this.paymentDate.split('-');
  return `${day}/${month}/${year}`;
});

emiPaymentSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN')}`;
});

emiPaymentSchema.virtual('isComplete').get(function() {
  return this.status === 'Paid' || this.status === 'Advance';
});

// ==============================================
// OUTPUT TRANSFORM
// ==============================================
emiPaymentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.formattedPaymentDate = doc.formattedPaymentDate;
    ret.formattedAmount = doc.formattedAmount;
    ret.isComplete = doc.isComplete;
    return ret;
  }
});

emiPaymentSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.formattedPaymentDate = doc.formattedPaymentDate;
    ret.formattedAmount = doc.formattedAmount;
    ret.isComplete = doc.isComplete;
    return ret;
  }
});

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);