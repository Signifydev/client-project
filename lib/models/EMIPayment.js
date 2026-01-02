import mongoose from 'mongoose';

// ==============================================
// DATE UTILITY FUNCTIONS FOR STRING DATE HANDLING
// ==============================================

/**
 * Get current date as YYYY-MM-DD string (date-only, no timezone)
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
 * Validate if string is in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid YYYY-MM-DD format
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
 * Parse YYYY-MM-DD string to Date object for calculations
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object (local time, no timezone conversion)
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
 * @param {Date} date - Date object
 * @returns {string} Date in YYYY-MM-DD format
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
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Date in DD/MM/YYYY format
 */
function formatToDDMMYYYY(dateString) {
  if (!isValidYYYYMMDD(dateString)) return '';
  
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Add days to a date string
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} days - Number of days to add
 * @returns {string} New date in YYYY-MM-DD format
 */
function addDays(dateString, days) {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return formatToYYYYMMDD(date);
}

/**
 * Add months to a date string
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} months - Number of months to add
 * @returns {string} New date in YYYY-MM-DD format
 */
function addMonths(dateString, months) {
  const date = parseDateString(dateString);
  date.setMonth(date.getMonth() + months);
  return formatToYYYYMMDD(date);
}

/**
 * Compare two date strings (YYYY-MM-DD)
 * @param {string} date1 - First date
 * @param {string} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
function compareDateStrings(date1, date2) {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

/**
 * Generate a unique payment chain ID
 * @param {string} loanNumber - Loan number
 * @param {string} paymentDate - Payment date in YYYY-MM-DD
 * @param {string} paymentId - Payment ID
 * @returns {string} Unique chain ID
 */
function generateChainId(loanNumber, paymentDate, paymentId) {
  const cleanLoanNumber = loanNumber.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanDate = paymentDate.replace(/-/g, '');
  const shortId = paymentId ? paymentId.slice(-8) : Date.now().toString(36);
  return `chain_${cleanLoanNumber}_${cleanDate}_${shortId}`;
}

/**
 * Generate a unique partial payment chain ID
 * @param {string} loanId - Loan ID
 * @param {string} installmentDate - Expected installment date
 * @returns {string} Unique partial chain ID
 */
function generatePartialChainId(loanId, installmentDate) {
  const cleanLoanId = loanId.toString().replace(/[^a-zA-Z0-9]/g, '_').slice(-12);
  const cleanDate = installmentDate.replace(/-/g, '');
  return `partial_${cleanLoanId}_${cleanDate}`;
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
    type: String, // ✅ CHANGED: Now String for YYYY-MM-DD format
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
    type: Date, // Keep as Date for timestamp
    default: null
  },
  // NEW FIELDS FOR ADVANCE PAYMENTS
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
    type: String, // ✅ CHANGED: Now String for YYYY-MM-DD format
    default: null,
    validate: {
      validator: function(v) {
        return !v || isValidYYYYMMDD(v);
      },
      message: 'Advance from date must be in YYYY-MM-DD format'
    }
  },
  advanceToDate: {
    type: String, // ✅ CHANGED: Now String for YYYY-MM-DD format
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
  // ✅ NEW FIELDS FOR PARTIAL PAYMENT CHAIN TRACKING
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
      // For new payments, default to amount
      // For partial chains, this should be set to full EMI amount
      return this.amount; 
    }
  },
  installmentPaidAmount: {
    type: Number,
    default: function() { 
      // Tracks total paid in this chain including this payment
      return this.amount; 
    }
  },
  isChainComplete: {
    type: Boolean,
    default: true  // True for single payments, false for partial chains
  },
  chainSequence: {
    type: Number,
    default: 1
  },
  originalEmiAmount: {
    type: Number,
    default: null  // Store the original EMI amount for reference
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
// ✅ NEW INDEXES FOR PARTIAL PAYMENT QUERIES
// ==============================================
emiPaymentSchema.index({ partialChainId: 1 });
emiPaymentSchema.index({ chainParentId: 1 });
emiPaymentSchema.index({ status: 1, partialChainId: 1 });
emiPaymentSchema.index({ loanId: 1, paymentDate: 1 });

// Update the updatedAt field before saving
emiPaymentSchema.pre('save', async function() {
  this.updatedAt = new Date();
  
  // Auto-set isAdvancePayment based on paymentType
  if (this.paymentType === 'advance') {
    this.isAdvancePayment = true;
    // For advance payments, automatically set status to 'Advance'
    this.status = 'Advance';
  } else {
    this.isAdvancePayment = false;
  }
  
  // Auto-calculate advanceTotalAmount if not provided
  if (this.paymentType === 'advance' && this.advanceEmiCount && this.amount && !this.advanceTotalAmount) {
    this.advanceTotalAmount = this.amount * this.advanceEmiCount;
  }
  
  // Ensure paymentDate is in YYYY-MM-DD format if it's a Date object
  if (this.paymentDate instanceof Date) {
    this.paymentDate = formatToYYYYMMDD(this.paymentDate);
  }
  
  // Ensure advance dates are in YYYY-MM-DD format if they're Date objects
  if (this.advanceFromDate instanceof Date) {
    this.advanceFromDate = formatToYYYYMMDD(this.advanceFromDate);
  }
  
  if (this.advanceToDate instanceof Date) {
    this.advanceToDate = formatToYYYYMMDD(this.advanceToDate);
  }
  
  // ==============================================
  // ✅ FIXED: AUTOMATIC PARTIAL CHAIN MANAGEMENT
  // ==============================================
  
  // If this is a new partial payment and doesn't have a chain ID
  if (this.isNew && this.status === 'Partial' && !this.partialChainId) {
    // ✅ FIXED: Throw error if no loanId instead of using customer ID
    if (!this.loanId) {
      throw new Error('Cannot create partial payment chain without loan ID');
    }
    
    // Generate a new partial chain ID using ONLY loan ID
    this.partialChainId = generatePartialChainId(this.loanId, this.paymentDate);
    this.isChainComplete = false;
    
    // ✅ CRITICAL FIX: Set installmentTotalAmount to FULL EMI amount, not payment amount
    this.installmentTotalAmount = this.originalEmiAmount || this.amount;
    this.installmentPaidAmount = this.amount;
    
    console.log('🔧 Partial payment chain created:', {
      loanId: this.loanId,
      chainId: this.partialChainId,
      installmentTotalAmount: this.installmentTotalAmount,
      paymentAmount: this.amount
    });
  }
  
  // If this payment has a parent in chain
  if (this.chainParentId) {
    this.isChainComplete = false;
  }
  
  // ✅ FIXED: Ensure originalEmiAmount is set to FULL EMI amount
  if (!this.originalEmiAmount) {
    // Try to get from parent if exists
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
    
    // If still not set, use the current amount (for non-partial payments)
    if (!this.originalEmiAmount) {
      this.originalEmiAmount = this.amount;
    }
  }
});

// ==============================================
// ✅ NEW: POST-SAVE HOOK FOR CHAIN UPDATES
// ==============================================
emiPaymentSchema.post('save', async function(doc) {
  // If this payment has children, update their chain info
  if (doc.chainChildrenIds && doc.chainChildrenIds.length > 0) {
    try {
      // Recalculate chain totals
      await doc.constructor.updateChainTotals(doc.partialChainId);
    } catch (error) {
      console.error('Error updating chain totals:', error);
    }
  }
  
  // If this payment has a parent, update parent's children list
  if (doc.chainParentId) {
    try {
      await mongoose.model('EMIPayment').findByIdAndUpdate(
        doc.chainParentId,
        { $addToSet: { chainChildrenIds: doc._id } }
      );
      
      // Recalculate parent chain totals
      await doc.constructor.updateChainTotals(doc.partialChainId);
    } catch (error) {
      console.error('Error updating parent chain:', error);
    }
  }
});

// Index for better query performance
emiPaymentSchema.index({ customerId: 1 });
emiPaymentSchema.index({ loanId: 1 });
emiPaymentSchema.index({ paymentDate: -1 });
emiPaymentSchema.index({ collectedBy: 1 });
emiPaymentSchema.index({ status: 1 });
emiPaymentSchema.index({ createdAt: -1 });
emiPaymentSchema.index({ paymentType: 1 });
emiPaymentSchema.index({ isAdvancePayment: 1 });

// Virtual for formatted payment date (DD/MM/YYYY)
emiPaymentSchema.virtual('formattedPaymentDate').get(function() {
  return formatToDDMMYYYY(this.paymentDate);
});

// Virtual for formatted amount
emiPaymentSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN')}`;
});

// Virtual for advance payment period
emiPaymentSchema.virtual('advancePeriod').get(function() {
  if (this.paymentType !== 'advance' || !this.advanceFromDate || !this.advanceToDate) {
    return null;
  }
  return {
    from: formatToDDMMYYYY(this.advanceFromDate),
    to: formatToDDMMYYYY(this.advanceToDate),
    days: Math.ceil((parseDateString(this.advanceToDate).getTime() - parseDateString(this.advanceFromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  };
});

// ✅ NEW: Virtual for remaining amount in chain
emiPaymentSchema.virtual('remainingAmount').get(function() {
  if (!this.partialChainId || this.isChainComplete) {
    return 0;
  }
  return Math.max(0, this.installmentTotalAmount - this.installmentPaidAmount);
});

// ✅ NEW: Virtual for chain payment count
emiPaymentSchema.virtual('chainPaymentCount').get(function() {
  return (this.chainChildrenIds?.length || 0) + 1; // +1 for parent
});

// ==============================================
// ✅ NEW: METHODS FOR PARTIAL PAYMENT MANAGEMENT
// ==============================================

// Method to mark payment as verified
emiPaymentSchema.methods.markAsVerified = function(verifiedBy, notes = '') {
  this.isVerified = true;
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  if (notes) this.notes = notes;
};

// Method to update payment status
emiPaymentSchema.methods.updateStatus = function(status, notes = '') {
  const oldStatus = this.status;
  this.status = status;
  
  // If changing from Partial to Paid, mark chain as complete
  if (oldStatus === 'Partial' && status === 'Paid' && this.partialChainId) {
    this.isChainComplete = true;
  }
  
  // If changing to Partial, ensure chain tracking
  if (status === 'Partial' && !this.partialChainId) {
    this.partialChainId = generatePartialChainId(this.loanId, this.paymentDate);
    this.isChainComplete = false;
  }
  
  if (notes) this.notes = notes;
  this.updatedAt = new Date();
};

// ✅ NEW: Method to add a partial payment to this chain
emiPaymentSchema.methods.addPartialPayment = async function(amount, paymentDate, collectedBy, notes = '') {
  if (this.status !== 'Partial') {
    throw new Error('Cannot add partial payment to a non-partial payment');
  }
  
  if (!this.partialChainId) {
    this.partialChainId = generatePartialChainId(this.loanId, this.paymentDate);
  }
  
  const EMIPayment = mongoose.model('EMIPayment');
  const newPayment = new EMIPayment({
    customerId: this.customerId,
    customerName: this.customerName,
    loanId: this.loanId,
    loanNumber: this.loanNumber,
    paymentDate: paymentDate || getCurrentDateString(),
    amount: amount,
    status: 'Partial',
    collectedBy: collectedBy || this.collectedBy,
    notes: notes || `Additional payment for partial chain ${this.partialChainId}`,
    partialChainId: this.partialChainId,
    chainParentId: this._id,
    installmentTotalAmount: this.installmentTotalAmount,
    originalEmiAmount: this.originalEmiAmount || this.amount
  });
  
  // Add to children array
  this.chainChildrenIds.push(newPayment._id);
  
  // Save both
  await newPayment.save();
  await this.save();
  
  // Update chain totals
  await this.constructor.updateChainTotals(this.partialChainId);
  
  return newPayment;
};

// ✅ NEW: Method to complete a partial payment chain
emiPaymentSchema.methods.completePartialChain = async function(completionAmount, paymentDate, collectedBy, notes = '') {
  if (this.status !== 'Partial') {
    throw new Error('Cannot complete a non-partial payment');
  }
  
  if (!this.partialChainId) {
    this.partialChainId = generatePartialChainId(this.loanId, this.paymentDate);
  }
  
  const remainingAmount = this.installmentTotalAmount - this.installmentPaidAmount;
  
  if (completionAmount > remainingAmount) {
    throw new Error(`Completion amount (${completionAmount}) exceeds remaining amount (${remainingAmount})`);
  }
  
  const EMIPayment = mongoose.model('EMIPayment');
  const completionPayment = new EMIPayment({
    customerId: this.customerId,
    customerName: this.customerName,
    loanId: this.loanId,
    loanNumber: this.loanNumber,
    paymentDate: paymentDate || getCurrentDateString(),
    amount: completionAmount,
    status: completionAmount >= remainingAmount ? 'Paid' : 'Partial',
    collectedBy: collectedBy || this.collectedBy,
    notes: notes || `Completion payment for partial chain ${this.partialChainId}`,
    partialChainId: this.partialChainId,
    chainParentId: this._id,
    installmentTotalAmount: this.installmentTotalAmount,
    originalEmiAmount: this.originalEmiAmount || this.amount
  });
  
  // Add to children array
  this.chainChildrenIds.push(completionPayment._id);
  
  // Save completion payment
  await completionPayment.save();
  
  // Update chain totals - this will also update isChainComplete
  await this.constructor.updateChainTotals(this.partialChainId);
  
  return completionPayment;
};

// ✅ NEW: Method to update payment amount and handle chain
emiPaymentSchema.methods.updatePayment = function(newAmount, newDate = null, updatedBy, notes = '', updateChainTotals = true) {
  const oldAmount = this.amount;
  const oldDate = this.paymentDate;
  
  this.amount = newAmount;
  if (newDate) {
    // Convert new date to YYYY-MM-DD string
    this.paymentDate = newDate instanceof Date ? formatToYYYYMMDD(newDate) : newDate;
  }
  
  const editDate = formatToYYYYMMDD(new Date());
  const editTime = new Date().toLocaleTimeString('en-IN');
  
  this.notes = `${notes} | Edited: ₹${oldAmount} to ₹${newAmount} on ${editDate} ${editTime} by ${updatedBy}`;
  this.updatedAt = new Date();
  
  // If this is part of a chain and we should update chain totals
  if (updateChainTotals && this.partialChainId) {
    // Note: Chain totals will be updated in post-save hook
    this.installmentPaidAmount = this.amount;
  }
  
  return {
    oldAmount,
    newAmount,
    oldDate,
    newDate: this.paymentDate
  };
};

// ==============================================
// ✅ NEW: STATIC METHODS FOR CHAIN MANAGEMENT
// ==============================================

// Static method to get total collection for a specific date
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

// Static method to get payments in a chain
emiPaymentSchema.statics.getPaymentsInChain = async function(chainId) {
  return this.find({ partialChainId: chainId })
    .sort({ chainSequence: 1, createdAt: 1 })
    .populate('chainParentId', 'amount status paymentDate')
    .populate('chainChildrenIds', 'amount status paymentDate');
};

// ✅ NEW: Static method to update chain totals
emiPaymentSchema.statics.updateChainTotals = async function(chainId) {
  if (!chainId) return null;
  
  // Get all payments in the chain
  const chainPayments = await this.find({ partialChainId: chainId });
  
  if (chainPayments.length === 0) return null;
  
  // Find the parent payment (payment without parent or with the earliest date)
  let parentPayment = chainPayments.find(p => !p.chainParentId);
  if (!parentPayment) {
    parentPayment = chainPayments.sort((a, b) => 
      new Date(a.paymentDate) - new Date(b.paymentDate)
    )[0];
  }
  
  // Calculate totals
  const totalAmount = chainPayments.reduce((sum, p) => sum + p.amount, 0);
  const installmentTotalAmount = parentPayment.installmentTotalAmount || parentPayment.originalEmiAmount || parentPayment.amount;
  
  // Determine if chain is complete
  const isChainComplete = totalAmount >= installmentTotalAmount;
  
  // Update all payments in the chain
  const updatePromises = chainPayments.map(payment => 
    this.findByIdAndUpdate(payment._id, {
      installmentTotalAmount: installmentTotalAmount,
      installmentPaidAmount: totalAmount,
      isChainComplete: isChainComplete,
      // If chain is complete and this is the last payment, update status to Paid
      status: isChainComplete && payment._id.equals(chainPayments[chainPayments.length - 1]._id) 
        ? 'Paid' 
        : payment.status
    }, { new: true })
  );
  
  await Promise.all(updatePromises);
  
  return {
    chainId,
    totalAmount,
    installmentTotalAmount,
    isChainComplete,
    remainingAmount: Math.max(0, installmentTotalAmount - totalAmount),
    paymentCount: chainPayments.length,
    parentPaymentId: parentPayment._id
  };
};

// ✅ NEW: Static method to complete a partial payment
emiPaymentSchema.statics.completePartialPayment = async function(parentPaymentId, additionalAmount, paymentDate, collectedBy, notes = '') {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Find the parent payment
    const parentPayment = await this.findById(parentPaymentId).session(session);
    if (!parentPayment) {
      throw new Error('Parent payment not found');
    }
    
    if (parentPayment.status !== 'Partial') {
      throw new Error('Cannot complete a non-partial payment');
    }
    
    // Calculate remaining amount
    const chainInfo = await this.getPaymentsInChain(parentPayment.partialChainId || parentPayment._id.toString());
    const totalPaid = chainInfo.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = (parentPayment.installmentTotalAmount || parentPayment.amount) - totalPaid;
    
    if (additionalAmount > remainingAmount) {
      throw new Error(`Additional amount (${additionalAmount}) exceeds remaining amount (${remainingAmount})`);
    }
    
    // Create completion payment
    const completionPayment = new this({
      customerId: parentPayment.customerId,
      customerName: parentPayment.customerName,
      loanId: parentPayment.loanId,
      loanNumber: parentPayment.loanNumber,
      paymentDate: paymentDate || getCurrentDateString(),
      amount: additionalAmount,
      status: additionalAmount >= remainingAmount ? 'Paid' : 'Partial',
      collectedBy: collectedBy,
      notes: notes || `Completion payment for ${parentPayment.partialChainId}`,
      partialChainId: parentPayment.partialChainId || generatePartialChainId(parentPayment.loanId, parentPayment.paymentDate),
      chainParentId: parentPayment._id,
      installmentTotalAmount: parentPayment.installmentTotalAmount || parentPayment.amount,
      originalEmiAmount: parentPayment.originalEmiAmount || parentPayment.amount,
      chainSequence: (parentPayment.chainChildrenIds?.length || 0) + 2
    });
    
    await completionPayment.save({ session });
    
    // Update parent's children list
    parentPayment.chainChildrenIds.push(completionPayment._id);
    await parentPayment.save({ session });
    
    // Update chain totals
    const updatedChain = await this.updateChainTotals(completionPayment.partialChainId);
    
    await session.commitTransaction();
    
    return {
      success: true,
      parentPayment,
      completionPayment,
      chainInfo: updatedChain
    };
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error completing partial payment:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// ✅ NEW: Static method to get chain summary
emiPaymentSchema.statics.getChainSummary = async function(chainId) {
  const payments = await this.find({ partialChainId: chainId });
  
  if (payments.length === 0) {
    return null;
  }
  
  const parentPayment = payments.find(p => !p.chainParentId) || payments[0];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const installmentTotal = parentPayment.installmentTotalAmount || parentPayment.amount;
  
  return {
    chainId,
    parentPaymentId: parentPayment._id,
    loanId: parentPayment.loanId,
    loanNumber: parentPayment.loanNumber,
    customerId: parentPayment.customerId,
    customerName: parentPayment.customerName,
    installmentTotalAmount: installmentTotal,
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
      chainSequence: p.chainSequence
    }))
  };
};

// ✅ NEW: Static method to synchronize payment with loan emiHistory
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

    // Find if payment exists in loan emiHistory
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
      customerNumber: payment.customerId ? undefined : undefined,
      loanNumber: payment.loanNumber,
      createdAt: payment.createdAt,
      paymentType: payment.paymentType,
      advanceFromDate: payment.advanceFromDate,
      advanceToDate: payment.advanceToDate,
      advanceEmiCount: payment.advanceEmiCount,
      advanceTotalAmount: payment.advanceTotalAmount
    };

    if (existingHistoryIndex >= 0) {
      // Update existing entry
      loan.emiHistory[existingHistoryIndex] = paymentData;
      console.log('✅ Updated existing payment in loan emiHistory');
    } else {
      // Add new entry
      loan.emiHistory.push(paymentData);
      console.log('✅ Added new payment to loan emiHistory');
    }

    // Recalculate loan totals
    const loanPayments = await this.find({
      loanId: payment.loanId,
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    });

    const totalPaidAmount = loanPayments.reduce((sum, p) => sum + p.amount, 0);
    const emiPaidCount = loanPayments.length;

    // Update loan with correct schedule dates
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

    // Update status to 'completed' if loan is now complete
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

// Static method to get total collection for a date range
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

// Static method to get payments by customer
emiPaymentSchema.statics.findByCustomerId = function(customerId, limit = 50) {
  return this.find({ customerId })
    .sort({ paymentDate: -1 })
    .limit(limit)
    .populate('loanId', 'loanNumber loanType emiAmount');
};

// Static method to get payments by loan
emiPaymentSchema.statics.findByLoanId = function(loanId, limit = 100) {
  return this.find({ loanId })
    .sort({ paymentDate: -1 })
    .limit(limit);
};

// Static method to get today's payments
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

// Static method to get payments by collector
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

// Static method to get payment summary by status
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

// Static method to get advance payments
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

// Static method to get payment summary by type
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

// Static method to validate advance payment dates
emiPaymentSchema.statics.validateAdvancePayment = function(advanceFromDate, advanceToDate, loanStartDate = null) {
  const fromDateStr = typeof advanceFromDate === 'string' ? advanceFromDate : formatToYYYYMMDD(advanceFromDate);
  const toDateStr = typeof advanceToDate === 'string' ? advanceToDate : formatToYYYYMMDD(advanceToDate);
  
  // Check if dates are valid YYYY-MM-DD
  if (!isValidYYYYMMDD(fromDateStr)) {
    return { isValid: false, error: 'Invalid from date format. Must be YYYY-MM-DD' };
  }
  
  if (!isValidYYYYMMDD(toDateStr)) {
    return { isValid: false, error: 'Invalid to date format. Must be YYYY-MM-DD' };
  }
  
  // Check if from date is before to date
  if (compareDateStrings(fromDateStr, toDateStr) > 0) {
    return { isValid: false, error: 'From date cannot be after to date' };
  }
  
  // Check if dates are in the future (optional)
  const today = getCurrentDateString();
  
  if (compareDateStrings(fromDateStr, today) < 0) {
    return { isValid: false, error: 'Advance payment cannot start from past date' };
  }
  
  // Check if advance period is within loan period (if loanStartDate provided)
  if (loanStartDate) {
    const loanStartStr = typeof loanStartDate === 'string' ? loanStartDate : formatToYYYYMMDD(loanStartDate);
    
    if (compareDateStrings(fromDateStr, loanStartStr) < 0) {
      return { isValid: false, error: 'Advance payment cannot start before loan start date' };
    }
  }
  
  return { isValid: true };
};

// Static method to find duplicate payments
emiPaymentSchema.statics.findDuplicatePayments = function(customerId, loanId, paymentDate) {
  const paymentDateStr = typeof paymentDate === 'string' ? paymentDate : formatToYYYYMMDD(paymentDate);
  
  return this.find({
    customerId: customerId,
    loanId: loanId,
    paymentDate: paymentDateStr,
    status: { $ne: 'cancelled' }
  });
};

// Static method to get customer payment history with filters
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

// Transform output to include virtuals and formatted dates
emiPaymentSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add display date fields when converting to JSON
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
    
    // ✅ NEW: Add chain info
    ret.remainingAmount = doc.remainingAmount;
    ret.chainPaymentCount = doc.chainPaymentCount;
    
    return ret;
  }
});

emiPaymentSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add display date fields when converting to Object
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
    
    // ✅ NEW: Add chain info
    ret.remainingAmount = doc.remainingAmount;
    ret.chainPaymentCount = doc.chainPaymentCount;
    
    return ret;
  }
});

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);