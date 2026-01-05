import mongoose from 'mongoose';

// ==============================================
// DATE UTILITY FUNCTIONS FOR STRING DATE HANDLING
// ==============================================

/**
 * Get current date as YYYY-MM-DD string (date-only, no timezone)
 */
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate if string is in YYYY-MM-DD format
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
 * Parse YYYY-MM-DD string to Date object for calculations
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
 * Format Date object to YYYY-MM-DD string
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

/**
 * Format date to DD/MM/YYYY for display
 */
function formatToDDMMYYYY(dateString) {
  if (!isValidYYYYMMDD(dateString)) return '';
  
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Add days to a date string
 */
function addDays(dateString, days) {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return formatToYYYYMMDD(date);
}

/**
 * Add months to a date string
 */
function addMonths(dateString, months) {
  const date = parseDateString(dateString);
  date.setMonth(date.getMonth() + months);
  return formatToYYYYMMDD(date);
}

/**
 * Calculate expected due date for a specific installment
 */
function calculateExpectedDueDate(emiStartDate, loanType, installmentNumber) {
  if (!emiStartDate || !installmentNumber || installmentNumber < 1) {
    return emiStartDate;
  }
  
  const startDate = parseDateString(emiStartDate);
  const dueDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      dueDate.setDate(startDate.getDate() + (installmentNumber - 1));
      break;
    case 'Weekly':
      dueDate.setDate(startDate.getDate() + ((installmentNumber - 1) * 7));
      break;
    case 'Monthly':
      dueDate.setMonth(startDate.getMonth() + (installmentNumber - 1));
      break;
    default:
      dueDate.setDate(startDate.getDate() + (installmentNumber - 1));
  }
  
  return formatToYYYYMMDD(dueDate);
}

/**
 * Calculate which installment number this payment date corresponds to
 */
function calculateInstallmentNumber(emiStartDate, loanType, paymentDate) {
  if (!emiStartDate || !paymentDate) return 1;
  
  const startDate = parseDateString(emiStartDate);
  const payDate = parseDateString(paymentDate);
  
  // Calculate days difference
  const timeDiff = payDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  switch(loanType) {
    case 'Daily':
      return Math.max(1, daysDiff + 1);
    case 'Weekly':
      return Math.max(1, Math.floor(daysDiff / 7) + 1);
    case 'Monthly':
      const monthsDiff = (payDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (payDate.getMonth() - startDate.getMonth());
      return Math.max(1, monthsDiff + 1);
    default:
      return Math.max(1, daysDiff + 1);
  }
}

/**
 * Generate partial chain ID with installment number
 */
function generatePartialChainId(loanId, expectedDueDate, installmentNumber) {
  if (!loanId) {
    console.error('❌ CRITICAL: Cannot generate chain ID without loanId');
    throw new Error('Loan ID is required for chain ID generation');
  }
  
  const cleanLoanId = loanId.toString().replace(/[^a-zA-Z0-9]/g, '_').slice(-12);
  const cleanDate = expectedDueDate.replace(/-/g, '');
  return `partial_${cleanLoanId}_${cleanDate}_${installmentNumber}`;
}

/**
 * Calculate next scheduled EMI date
 */
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

/**
 * Calculate last scheduled EMI date
 */
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

const emiPaymentSchema = new mongoose.Schema({
  customerId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true 
  },
  customerName: { 
    type: String, 
    required: true,
    trim: true
  },
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  loanNumber: {
    type: String,
    required: true,
    trim: true
  },
  paymentDate: { 
    type: String,
    required: true,
    validate: {
      validator: isValidYYYYMMDD,
      message: 'Payment date must be in YYYY-MM-DD format'
    },
    default: getCurrentDateString
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Due', 'Overdue', 'Pending', 'Advance'],
    required: true,
    default: 'Paid'
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
  paymentType: {
    type: String,
    enum: ['single', 'advance'],
    default: 'single'
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
    default: 1,
    min: 1
  },
  advanceTotalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // ==============================================
  // PARTIAL PAYMENT CHAIN TRACKING
  // ==============================================
  partialChainId: {
    type: String,
    default: null,
    index: true
  },
  chainParentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EMIPayment',
    default: null
  },
  chainChildrenIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EMIPayment'
  }],
  installmentTotalAmount: {
    type: Number,
    default: function() { 
      return this.amount; 
    }
  },
  installmentPaidAmount: {
    type: Number,
    default: function() { 
      return this.amount; 
    }
  },
  isChainComplete: {
    type: Boolean,
    default: true
  },
  chainSequence: {
    type: Number,
    default: 1
  },
  originalEmiAmount: {
    type: Number,
    default: null
  },
  installmentNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  expectedDueDate: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return !v || isValidYYYYMMDD(v);
      },
      message: 'Expected due date must be in YYYY-MM-DD format'
    }
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
// INDEXES
// ==============================================
emiPaymentSchema.index({ partialChainId: 1 });
emiPaymentSchema.index({ chainParentId: 1 });
emiPaymentSchema.index({ status: 1, partialChainId: 1 });
emiPaymentSchema.index({ loanId: 1, installmentNumber: 1 });
emiPaymentSchema.index({ loanId: 1, expectedDueDate: 1 });
emiPaymentSchema.index({ loanId: 1, installmentNumber: 1, expectedDueDate: 1 });
emiPaymentSchema.index({ customerId: 1 });
emiPaymentSchema.index({ loanId: 1 });
emiPaymentSchema.index({ paymentDate: -1 });
emiPaymentSchema.index({ collectedBy: 1 });
emiPaymentSchema.index({ status: 1 });
emiPaymentSchema.index({ createdAt: -1 });
emiPaymentSchema.index({ paymentType: 1 });
emiPaymentSchema.index({ isAdvancePayment: 1 });

// ==============================================
// PRE-SAVE HOOK
// ==============================================
emiPaymentSchema.pre('save', async function() {
  this.updatedAt = new Date();
  
  // Auto-set isAdvancePayment based on paymentType
  if (this.paymentType === 'advance') {
    this.isAdvancePayment = true;
    this.status = 'Advance';
  } else {
    this.isAdvancePayment = false;
  }
  
  // Auto-calculate advanceTotalAmount if not provided
  if (this.paymentType === 'advance' && this.advanceEmiCount && this.amount && !this.advanceTotalAmount) {
    this.advanceTotalAmount = this.amount * this.advanceEmiCount;
  }
  
  // Ensure dates are in YYYY-MM-DD format
  if (this.paymentDate instanceof Date) {
    this.paymentDate = formatToYYYYMMDD(this.paymentDate);
  }
  
  if (this.advanceFromDate instanceof Date) {
    this.advanceFromDate = formatToYYYYMMDD(this.advanceFromDate);
  }
  
  if (this.advanceToDate instanceof Date) {
    this.advanceToDate = formatToYYYYMMDD(this.advanceToDate);
  }
  
  // If this is a new payment, fetch loan details for installment calculation
  if (this.isNew && this.loanId) {
    try {
      const Loan = mongoose.model('Loan');
      const loan = await Loan.findById(this.loanId);
      
      if (loan) {
        // Calculate installment number for this payment
        if (!this.installmentNumber || this.installmentNumber < 1) {
          this.installmentNumber = calculateInstallmentNumber(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            this.paymentDate
          );
        }
        
        // Calculate expected due date for this installment
        this.expectedDueDate = calculateExpectedDueDate(
          loan.emiStartDate || loan.dateApplied,
          loan.loanType,
          this.installmentNumber
        );
        
        console.log('📅 Installment Calculation:', {
          loanNumber: loan.loanNumber,
          emiStartDate: loan.emiStartDate,
          loanType: loan.loanType,
          paymentDate: this.paymentDate,
          installmentNumber: this.installmentNumber,
          expectedDueDate: this.expectedDueDate
        });
      }
    } catch (error) {
      console.error('Error fetching loan for installment calculation:', error);
    }
  }
  
  // If this is a new partial payment, create chain with installment number
  if (this.isNew && this.status === 'Partial' && !this.partialChainId) {
    if (!this.loanId) {
      throw new Error('Cannot create partial payment chain without loan ID');
    }
    
    if (!this.expectedDueDate) {
      throw new Error('Expected due date is required for partial chain');
    }
    
    if (!this.installmentNumber || this.installmentNumber < 1) {
      throw new Error('Installment number is required for partial chain');
    }
    
    // Generate chain ID with installment number
    this.partialChainId = generatePartialChainId(
      this.loanId,
      this.expectedDueDate,
      this.installmentNumber
    );
    
    this.isChainComplete = false;
    
    // Set installmentTotalAmount to FULL EMI amount
    if (this.originalEmiAmount && this.originalEmiAmount > this.amount) {
      this.installmentTotalAmount = this.originalEmiAmount;
    } else {
      this.installmentTotalAmount = this.amount;
    }
    
    this.installmentPaidAmount = this.amount;
    
    console.log('🔗 Partial Payment Chain Created:', {
      chainId: this.partialChainId,
      loanId: this.loanId,
      installmentNumber: this.installmentNumber,
      expectedDueDate: this.expectedDueDate,
      paymentDate: this.paymentDate,
      originalEmiAmount: this.originalEmiAmount,
      paymentAmount: this.amount
    });
  }
  
  // If this payment has a parent in chain
  if (this.chainParentId) {
    this.isChainComplete = false;
  }
  
  // Ensure originalEmiAmount is set
  if (!this.originalEmiAmount) {
    if (this.chainParentId) {
      try {
        const parentPayment = await this.constructor.findById(this.chainParentId);
        if (parentPayment && parentPayment.originalEmiAmount) {
          this.originalEmiAmount = parentPayment.originalEmiAmount;
        }
      } catch (error) {
        console.error('Error fetching parent payment:', error);
      }
    }
    
    if (!this.originalEmiAmount && this.installmentTotalAmount && this.installmentTotalAmount !== this.amount) {
      this.originalEmiAmount = this.installmentTotalAmount;
    }
    
    if (!this.originalEmiAmount) {
      this.originalEmiAmount = this.amount;
    }
  }
  
  // Ensure installmentTotalAmount matches originalEmiAmount for partial payments
  if (this.status === 'Partial' && this.originalEmiAmount && this.originalEmiAmount !== this.installmentTotalAmount) {
    this.installmentTotalAmount = this.originalEmiAmount;
  }
});

// ==============================================
// POST-SAVE HOOK
// ==============================================
emiPaymentSchema.post('save', async function(doc) {
  try {
    // If this is a partial payment and originalEmiAmount is missing/incorrect
    if (doc.status === 'Partial' && (!doc.originalEmiAmount || doc.originalEmiAmount <= doc.amount)) {
      const loan = await mongoose.model('Loan').findById(doc.loanId);
      if (loan) {
        // Get correct EMI amount for this installment
        let correctEmiAmount = loan.emiAmount || 0;
        if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
          if (doc.installmentNumber === loan.totalEmiCount) {
            correctEmiAmount = loan.customEmiAmount || loan.emiAmount || 0;
          }
        }
        
        if (correctEmiAmount > 0 && correctEmiAmount !== doc.originalEmiAmount) {
          await mongoose.model('EMIPayment').findByIdAndUpdate(doc._id, {
            originalEmiAmount: correctEmiAmount,
            installmentTotalAmount: correctEmiAmount
          });
          
          console.log('✅ Fixed partial payment EMI amount:', {
            paymentId: doc._id,
            installmentNumber: doc.installmentNumber,
            correctEmiAmount,
            was: doc.originalEmiAmount
          });
        }
      }
    }
    
    // Update chain totals if this payment has children
    if (doc.chainChildrenIds && doc.chainChildrenIds.length > 0) {
      try {
        await doc.constructor.updateChainTotals(doc.partialChainId);
      } catch (error) {
        console.error('Error updating chain totals:', error);
      }
    }
    
    // Update parent's children list
    if (doc.chainParentId) {
      try {
        await mongoose.model('EMIPayment').findByIdAndUpdate(
          doc.chainParentId,
          { $addToSet: { chainChildrenIds: doc._id } }
        );
        
        await doc.constructor.updateChainTotals(doc.partialChainId);
      } catch (error) {
        console.error('Error updating parent chain:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error in EMIPayment post-save hook:', error);
  }
});

// ==============================================
// VIRTUALS
// ==============================================
emiPaymentSchema.virtual('formattedPaymentDate').get(function() {
  return formatToDDMMYYYY(this.paymentDate);
});

emiPaymentSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN')}`;
});

emiPaymentSchema.virtual('suggestedRemaining').get(function() {
  if (!this.partialChainId || this.isChainComplete) {
    return 0;
  }
  return Math.max(0, this.installmentTotalAmount - this.installmentPaidAmount);
});

emiPaymentSchema.virtual('chainPaymentCount').get(function() {
  return (this.chainChildrenIds?.length || 0) + 1;
});

emiPaymentSchema.virtual('isPartialChainComplete').get(function() {
  if (!this.partialChainId || this.status !== 'Partial') {
    return true;
  }
  return this.installmentPaidAmount >= this.installmentTotalAmount;
});


// ✅ FIXED: Complete partial payment WITHOUT transaction (using atomic updates)
emiPaymentSchema.statics.completePartialPayment = async function(
  parentPaymentId, 
  additionalAmount, 
  paymentDate, 
  collectedBy, 
  notes = ''
) {
  try {
    const parentPayment = await this.findById(parentPaymentId);
    if (!parentPayment) {
      throw new Error('Parent payment not found');
    }
    
    if (parentPayment.status !== 'Partial') {
      throw new Error('Cannot complete a non-partial payment');
    }
    
    // Get chain info for reference
    const chainInfo = await this.getChainSummary(parentPayment.partialChainId || parentPayment._id.toString());
    
    const fullEmiAmount = chainInfo?.originalEmiAmount || chainInfo?.installmentTotalAmount || parentPayment.amount;
    const totalPaidSoFar = chainInfo?.totalPaidAmount || parentPayment.amount;
    
    console.log('🔨 Completing partial payment (Without Transaction):', {
      parentPaymentId,
      additionalAmount,
      fullEmiAmount,
      totalPaidSoFar,
      paymentDate
    });
    
    // Determine chain sequence
    let chainSequence = 1;
    if (chainInfo && chainInfo.payments) {
      chainSequence = chainInfo.payments.length + 1;
    } else {
      const existingChildren = await this.countDocuments({ 
        chainParentId: parentPayment._id 
      });
      chainSequence = existingChildren + 2;
    }
    
    // Create completion payment WITHOUT session/transaction
    const completionPayment = new this({
      customerId: parentPayment.customerId,
      customerName: parentPayment.customerName,
      loanId: parentPayment.loanId,
      loanNumber: parentPayment.loanNumber,
      paymentDate: paymentDate || getCurrentDateString(),
      amount: additionalAmount,
      status: 'Paid', // Completion payments are always 'Paid'
      collectedBy: collectedBy,
      notes: notes || `Completion payment for installment ${parentPayment.installmentNumber}`,
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
    
    // Update parent's children list using $addToSet (atomic operation)
    await this.findByIdAndUpdate(
      parentPayment._id,
      { 
        $addToSet: { chainChildrenIds: completionPayment._id },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Update chain totals WITHOUT transaction
    const updatedChain = await this.updateChainTotals(completionPayment.partialChainId);
    
    // Mark chain as complete if full amount reached
    if (updatedChain?.isComplete) {
      await this.updateMany(
        { partialChainId: parentPayment.partialChainId },
        { 
          $set: { 
            status: 'Paid', 
            isChainComplete: true,
            updatedAt: new Date()
          } 
        }
      );
    }
    
    console.log('✅ Partial payment completed (Without Transaction):', {
      parentPaymentId,
      completionPaymentId: completionPayment._id,
      additionalAmount,
      newTotalPaid: (totalPaidSoFar + additionalAmount),
      isChainComplete: updatedChain?.isComplete || false
    });
    
    return {
      success: true,
      parentPayment,
      completionPayment,
      chainInfo: updatedChain,
      details: {
        additionalAmount,
        previousTotal: totalPaidSoFar,
        newTotal: totalPaidSoFar + additionalAmount,
        suggestedRemainingBefore: Math.max(0, fullEmiAmount - totalPaidSoFar),
        suggestedRemainingAfter: Math.max(0, fullEmiAmount - (totalPaidSoFar + additionalAmount)),
        isChainComplete: updatedChain?.isComplete || false
      }
    };
    
  } catch (error) {
    console.error('❌ Error completing partial payment:', error);
    throw error;
  }
};

// ✅ UPDATED: Get chain summary with suggestedRemaining (guidance only)
emiPaymentSchema.statics.getChainSummary = async function(chainId) {
  const payments = await this.find({ partialChainId: chainId });
  
  if (payments.length === 0) {
    return null;
  }
  
  const parentPayment = payments.find(p => !p.chainParentId) || payments[0];
  
  const fullEmiAmount = parentPayment.originalEmiAmount || 
                       parentPayment.installmentTotalAmount || 
                       parentPayment.amount;
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const suggestedRemaining = Math.max(0, fullEmiAmount - totalPaid);
  
  // Get loan info for reference
  let loanInfo = null;
  try {
    const Loan = mongoose.model('Loan');
    const loan = await Loan.findById(parentPayment.loanId)
      .select('loanNumber loanType emiAmount totalEmiCount emiPaidCount emiStartDate');
    
    if (loan) {
      loanInfo = {
        loanNumber: loan.loanNumber,
        emiAmount: loan.emiAmount,
        loanType: loan.loanType,
        totalEmiCount: loan.totalEmiCount,
        emiPaidCount: loan.emiPaidCount,
        emiStartDate: loan.emiStartDate
      };
    }
  } catch (error) {
    console.error('Error fetching loan info:', error);
  }
  
  return {
    chainId,
    parentPaymentId: parentPayment._id,
    loanId: parentPayment.loanId,
    loanNumber: parentPayment.loanNumber,
    customerId: parentPayment.customerId,
    customerName: parentPayment.customerName,
    installmentTotalAmount: fullEmiAmount,
    originalEmiAmount: fullEmiAmount,
    totalPaidAmount: totalPaid,
    suggestedRemaining: suggestedRemaining, // ✅ CHANGED: Guidance only, not for validation
    isComplete: totalPaid >= fullEmiAmount,
    paymentCount: payments.length,
    installmentNumber: parentPayment.installmentNumber,
    expectedDueDate: parentPayment.expectedDueDate,
    payments: payments.map(p => ({
      _id: p._id,
      amount: p.amount,
      status: p.status,
      paymentDate: p.paymentDate,
      collectedBy: p.collectedBy,
      chainSequence: p.chainSequence,
      originalEmiAmount: p.originalEmiAmount,
      installmentTotalAmount: p.installmentTotalAmount,
      installmentNumber: p.installmentNumber,
      expectedDueDate: p.expectedDueDate
    })),
    loanInfo // ✅ Added for reference
  };
};

// ✅ UPDATED: Update chain totals (supports manual amounts)
emiPaymentSchema.statics.updateChainTotals = async function(chainId) {
  if (!chainId) return null;
  
  const chainPayments = await this.find({ partialChainId: chainId });
  
  if (chainPayments.length === 0) return null;
  
  // Find the parent payment
  let parentPayment = chainPayments.find(p => !p.chainParentId);
  if (!parentPayment) {
    parentPayment = chainPayments.sort((a, b) => 
      new Date(a.paymentDate) - new Date(b.paymentDate)
    )[0];
  }
  
  const totalAmount = chainPayments.reduce((sum, p) => sum + p.amount, 0);
  
  // Use originalEmiAmount if available
  const installmentTotalAmount = parentPayment.originalEmiAmount || 
                                parentPayment.installmentTotalAmount || 
                                parentPayment.amount;
  
  // Chain is complete based on actual total vs expected
  const isChainComplete = totalAmount >= installmentTotalAmount;
  
  const updatePromises = chainPayments.map(payment => 
    this.findByIdAndUpdate(payment._id, {
      installmentTotalAmount: installmentTotalAmount,
      installmentPaidAmount: totalAmount,
      isChainComplete: isChainComplete,
      originalEmiAmount: payment.originalEmiAmount || installmentTotalAmount,
      // Only update status if chain is complete
      status: isChainComplete ? 'Paid' : payment.status
    }, { new: true })
  );
  
  await Promise.all(updatePromises);
  
  console.log('🔗 Chain totals updated (Manual Control):', {
    chainId,
    installmentTotalAmount,
    totalPaid: totalAmount,
    isChainComplete,
    suggestedRemaining: Math.max(0, installmentTotalAmount - totalAmount),
    paymentCount: chainPayments.length,
    installmentNumber: parentPayment.installmentNumber,
    expectedDueDate: parentPayment.expectedDueDate
  });
  
  return {
    chainId,
    totalAmount,
    installmentTotalAmount,
    originalEmiAmount: installmentTotalAmount,
    isChainComplete,
    suggestedRemaining: Math.max(0, installmentTotalAmount - totalAmount),
    paymentCount: chainPayments.length,
    parentPaymentId: parentPayment._id,
    installmentNumber: parentPayment.installmentNumber,
    expectedDueDate: parentPayment.expectedDueDate
  };
};

// ✅ FIXED: Edit payment without transaction
emiPaymentSchema.statics.editPaymentWithManualControl = async function(paymentId, updates) {
  try {
    const payment = await this.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    const originalData = {
      amount: payment.amount,
      status: payment.status,
      paymentDate: payment.paymentDate,
      notes: payment.notes
    };
    
    // Apply updates
    if (updates.amount !== undefined) {
      payment.amount = updates.amount;
    }
    
    if (updates.status !== undefined) {
      payment.status = updates.status;
    }
    
    if (updates.paymentDate !== undefined) {
      payment.paymentDate = updates.paymentDate;
    }
    
    if (updates.notes !== undefined) {
      payment.notes = updates.notes;
    }
    
    if (updates.collectedBy !== undefined) {
      payment.collectedBy = updates.collectedBy;
    }
    
    // Add edit note
    const editNote = `Edited: ${new Date().toISOString()}`;
    if (updates.amount !== undefined && updates.amount !== originalData.amount) {
      payment.notes = `${payment.notes ? payment.notes + ' | ' : ''}${editNote} - Amount: ₹${originalData.amount} → ₹${updates.amount}`;
    }
    
    if (updates.status !== undefined && updates.status !== originalData.status) {
      payment.notes = `${payment.notes ? payment.notes + ' | ' : ''}${editNote} - Status: ${originalData.status} → ${updates.status}`;
    }
    
    payment.updatedAt = new Date();
    await payment.save();
    
    // Update chain totals if this is part of a chain
    let chainUpdateResult = null;
    if (payment.partialChainId && updates.updateChainTotals !== false) {
      chainUpdateResult = await this.updateChainTotals(payment.partialChainId);
    }
    
    console.log('✅ Payment edited (Without Transaction):', {
      paymentId,
      changes: {
        amount: { from: originalData.amount, to: payment.amount },
        status: { from: originalData.status, to: payment.status }
      },
      chainUpdated: !!chainUpdateResult
    });
    
    return {
      success: true,
      payment,
      chainUpdate: chainUpdateResult,
      changes: {
        amount: { from: originalData.amount, to: payment.amount },
        status: { from: originalData.status, to: payment.status }
      }
    };
    
  } catch (error) {
    console.error('❌ Error editing payment:', error);
    throw error;
  }
};

// ✅ NEW: Get payments in a chain
emiPaymentSchema.statics.getPaymentsInChain = async function(chainId) {
  return this.find({ partialChainId: chainId })
    .sort({ chainSequence: 1, createdAt: 1 })
    .populate('chainParentId', 'amount status paymentDate originalEmiAmount installmentNumber expectedDueDate')
    .populate('chainChildrenIds', 'amount status paymentDate originalEmiAmount installmentNumber expectedDueDate');
};

// ✅ NEW: Find existing partial chain for an installment
emiPaymentSchema.statics.findPartialChainForInstallment = async function(loanId, installmentNumber, expectedDueDate) {
  if (!loanId || !installmentNumber) return null;
  
  // Try to find existing partial chain for this installment
  const payments = await this.find({
    loanId: loanId,
    installmentNumber: installmentNumber,
    status: 'Partial',
    isChainComplete: false
  });
  
  if (payments.length === 0) return null;
  
  // Return the chain ID from the first payment
  return payments[0].partialChainId;
};

// ✅ NEW: Get or create partial chain for an installment
emiPaymentSchema.statics.getOrCreatePartialChain = async function(loanId, installmentNumber, expectedDueDate) {
  const existingChainId = await this.findPartialChainForInstallment(loanId, installmentNumber, expectedDueDate);
  
  if (existingChainId) {
    console.log('🔗 Found existing chain for installment:', {
      loanId,
      installmentNumber,
      expectedDueDate,
      chainId: existingChainId
    });
    return existingChainId;
  }
  
  // Create new chain ID
  const newChainId = generatePartialChainId(loanId, expectedDueDate, installmentNumber);
  console.log('🔗 Creating new chain for installment:', {
    loanId,
    installmentNumber,
    expectedDueDate,
    chainId: newChainId
  });
  
  return newChainId;
};

// ==============================================
// EXISTING METHODS (unchanged)
// ==============================================

emiPaymentSchema.statics.syncWithLoanHistory = async function(paymentId) {
  try {
    const payment = await this.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!payment.loanId) {
      console.log('⚠️ Payment has no loanId, skipping sync');
      return null;
    }

    const loan = await mongoose.model('Loan').findById(payment.loanId);
    if (!loan) {
      console.log('⚠️ Loan not found for payment, skipping sync');
      return null;
    }

    const existingHistoryIndex = loan.emiHistory.findIndex(
      h => h._id && h._id.toString() === payment._id.toString()
    );

    const paymentData = {
      _id: payment._id,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      status: payment.status,
      collectedBy: payment.collectedBy,
      notes: payment.notes || `Synced from EMIPayment ${new Date().toISOString()}`,
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
      console.log('✅ Updated existing payment in loan emiHistory');
    } else {
      loan.emiHistory.push(paymentData);
      console.log('✅ Added new payment to loan emiHistory');
    }

    const loanPayments = await this.find({
      loanId: payment.loanId,
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    });

    const totalPaidAmount = loanPayments.reduce((sum, p) => sum + p.amount, 0);
    const emiPaidCount = loanPayments.length;

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

    loan.totalPaidAmount = totalPaidAmount;
    loan.emiPaidCount = emiPaidCount;
    loan.remainingAmount = Math.max(0, loan.amount - totalPaidAmount);
    loan.lastEmiDate = lastScheduledEmiDate;
    loan.nextEmiDate = nextScheduledEmiDate;

    if (emiPaidCount >= loan.totalEmiCount) {
      loan.status = 'completed';
      loan.nextEmiDate = null;
    }

    await loan.save();
    console.log('✅ Successfully synced payment with loan emiHistory');
    
    return {
      paymentId: payment._id,
      loanId: loan._id,
      synced: true,
      action: existingHistoryIndex >= 0 ? 'updated' : 'added'
    };
  } catch (error) {
    console.error('❌ Error syncing payment with loan history:', error);
    throw error;
  }
};

emiPaymentSchema.statics.getTotalCollectionByDate = async function(date) {
  const dateStr = typeof date === 'string' ? date : formatToYYYYMMDD(date);
  const startDate = parseDateString(dateStr);
  const endDate = parseDateString(dateStr);
  endDate.setDate(endDate.getDate() + 1);
  
  const result = await this.aggregate([
    {
      $match: {
        paymentDate: {
          $gte: dateStr,
          $lt: formatToYYYYMMDD(endDate)
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
  
  return result[0] || { totalAmount: 0, paymentCount: 0 };
};

emiPaymentSchema.statics.getTotalCollectionByDateRange = async function(startDate, endDate) {
  const startDateStr = typeof startDate === 'string' ? startDate : formatToYYYYMMDD(startDate);
  const endDateStr = typeof endDate === 'string' ? endDate : formatToYYYYMMDD(endDate);
  const endDatePlusOne = parseDateString(endDateStr);
  endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
  const endDateStrPlusOne = formatToYYYYMMDD(endDatePlusOne);
  
  const result = await this.aggregate([
    {
      $match: {
        paymentDate: {
          $gte: startDateStr,
          $lt: endDateStrPlusOne
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
  
  return result[0] || { totalAmount: 0, paymentCount: 0 };
};

emiPaymentSchema.statics.findByCustomerId = function(customerId, limit = 50) {
  return this.find({ customerId })
    .sort({ paymentDate: -1 })
    .limit(limit)
    .populate('loanId', 'loanNumber loanType emiAmount');
};

emiPaymentSchema.statics.findByLoanId = function(loanId, limit = 100) {
  return this.find({ loanId })
    .sort({ paymentDate: -1 })
    .limit(limit);
};

emiPaymentSchema.statics.getTodaysPayments = function() {
  const today = getCurrentDateString();
  const tomorrow = addDays(today, 1);
  
  return this.find({
    paymentDate: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ paymentDate: -1 });
};

emiPaymentSchema.statics.findByCollector = function(collectedBy, date = null) {
  let query = { collectedBy };
  
  if (date) {
    const dateStr = typeof date === 'string' ? date : formatToYYYYMMDD(date);
    const tomorrow = addDays(dateStr, 1);
    
    query.paymentDate = {
      $gte: dateStr,
      $lt: tomorrow
    };
  }
  
  return this.find(query).sort({ paymentDate: -1 });
};

emiPaymentSchema.statics.getPaymentSummary = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  return result;
};

emiPaymentSchema.statics.findAdvancePayments = function(customerId = null, loanId = null) {
  let query = { 
    paymentType: 'advance',
    isAdvancePayment: true
  };
  
  if (customerId) {
    query.customerId = customerId;
  }
  
  if (loanId) {
    query.loanId = loanId;
  }
  
  return this.find(query)
    .sort({ advanceFromDate: 1 })
    .populate('loanId', 'loanNumber loanType emiAmount');
};

emiPaymentSchema.statics.getPaymentSummaryByType = async function() {
  const result = await this.aggregate([
    {
      $group: {
        _id: '$paymentType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
  
  return result;
};

emiPaymentSchema.statics.validateAdvancePayment = function(advanceFromDate, advanceToDate, loanStartDate = null) {
  const fromDateStr = typeof advanceFromDate === 'string' ? advanceFromDate : formatToYYYYMMDD(advanceFromDate);
  const toDateStr = typeof advanceToDate === 'string' ? advanceToDate : formatToYYYYMMDD(advanceToDate);
  
  if (!isValidYYYYMMDD(fromDateStr)) {
    return { isValid: false, error: 'Invalid from date format. Must be YYYY-MM-DD' };
  }
  
  if (!isValidYYYYMMDD(toDateStr)) {
    return { isValid: false, error: 'Invalid to date format. Must be YYYY-MM-DD' };
  }
  
  if (fromDateStr > toDateStr) {
    return { isValid: false, error: 'From date cannot be after to date' };
  }
  
  const today = getCurrentDateString();
  
  if (fromDateStr < today) {
    return { isValid: false, error: 'Advance payment cannot start from past date' };
  }
  
  if (loanStartDate) {
    const loanStartStr = typeof loanStartDate === 'string' ? loanStartDate : formatToYYYYMMDD(loanStartDate);
    
    if (fromDateStr < loanStartStr) {
      return { isValid: false, error: 'Advance payment cannot start before loan start date' };
    }
  }
  
  return { isValid: true };
};

emiPaymentSchema.statics.findDuplicatePayments = function(customerId, loanId, paymentDate) {
  const paymentDateStr = typeof paymentDate === 'string' ? paymentDate : formatToYYYYMMDD(paymentDate);
  
  return this.find({
    customerId: customerId,
    loanId: loanId,
    paymentDate: paymentDateStr,
    status: { $ne: 'cancelled' }
  });
};

emiPaymentSchema.statics.getCustomerPaymentHistory = function(customerId, startDate = null, endDate = null, limit = 100) {
  let query = { customerId: customerId };
  
  if (startDate && endDate) {
    const startDateStr = typeof startDate === 'string' ? startDate : formatToYYYYMMDD(startDate);
    const endDateStr = typeof endDate === 'string' ? endDate : formatToYYYYMMDD(endDate);
    const endDatePlusOne = addDays(endDateStr, 1);
    
    query.paymentDate = {
      $gte: startDateStr,
      $lt: endDatePlusOne
    };
  }
  
  return this.find(query)
    .populate('loanId', 'loanNumber loanType emiAmount')
    .sort({ paymentDate: -1 })
    .limit(limit);
};

// ==============================================
// TRANSFORM OUTPUT
// ==============================================
emiPaymentSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.paymentDate) {
      ret.paymentDateDisplay = formatToDDMMYYYY(ret.paymentDate);
    }
    
    if (ret.advanceFromDate) {
      ret.advanceFromDateDisplay = formatToDDMMYYYY(ret.advanceFromDate);
    }
    
    if (ret.advanceToDate) {
      ret.advanceToDateDisplay = formatToDDMMYYYY(ret.advanceToDate);
    }
    
    if (ret.createdAt) {
      ret.createdAtDisplay = formatToYYYYMMDD(ret.createdAt);
    }
    
    if (ret.updatedAt) {
      ret.updatedAtDisplay = formatToYYYYMMDD(ret.updatedAt);
    }
    
    if (ret.expectedDueDate) {
      ret.expectedDueDateDisplay = formatToDDMMYYYY(ret.expectedDueDate);
    }
    
    ret.suggestedRemaining = doc.suggestedRemaining; // ✅ CHANGED: From remainingAmount
    ret.chainPaymentCount = doc.chainPaymentCount;
    ret.isPartialChainComplete = doc.isPartialChainComplete;
    ret.fullEmiAmount = doc.originalEmiAmount || doc.installmentTotalAmount;
    
    return ret;
  }
});

emiPaymentSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.paymentDate) {
      ret.paymentDateDisplay = formatToDDMMYYYY(ret.paymentDate);
    }
    
    if (ret.advanceFromDate) {
      ret.advanceFromDateDisplay = formatToDDMMYYYY(ret.advanceFromDate);
    }
    
    if (ret.advanceToDate) {
      ret.advanceToDateDisplay = formatToDDMMYYYY(ret.advanceToDate);
    }
    
    if (ret.createdAt) {
      ret.createdAtDisplay = formatToYYYYMMDD(ret.createdAt);
    }
    
    if (ret.updatedAt) {
      ret.updatedAtDisplay = formatToYYYYMMDD(ret.updatedAt);
    }
    
    if (ret.expectedDueDate) {
      ret.expectedDueDateDisplay = formatToDDMMYYYY(ret.expectedDueDate);
    }
    
    ret.suggestedRemaining = doc.suggestedRemaining; // ✅ CHANGED: From remainingAmount
    ret.chainPaymentCount = doc.chainPaymentCount;
    ret.isPartialChainComplete = doc.isPartialChainComplete;
    ret.fullEmiAmount = doc.originalEmiAmount || doc.installmentTotalAmount;
    
    return ret;
  }
});

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);