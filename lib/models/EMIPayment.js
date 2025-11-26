import mongoose from 'mongoose';

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
    type: Date, 
    required: true,
    default: Date.now
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
    type: Date,
    default: null
  },
  advanceToDate: {
    type: Date,
    default: null
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
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
emiPaymentSchema.pre('save', async function() {
  this.updatedAt = Date.now();
  
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
  
  
});

// Index for better query performance
emiPaymentSchema.index({ customerId: 1 });
emiPaymentSchema.index({ loanId: 1 });
emiPaymentSchema.index({ paymentDate: -1 });
emiPaymentSchema.index({ collectedBy: 1 });
emiPaymentSchema.index({ status: 1 });
emiPaymentSchema.index({ createdAt: -1 });
emiPaymentSchema.index({ paymentType: 1 }); // NEW index for payment type
emiPaymentSchema.index({ isAdvancePayment: 1 }); // NEW index for advance payments

// Virtual for formatted payment date
emiPaymentSchema.virtual('formattedPaymentDate').get(function() {
  return this.paymentDate.toLocaleDateString('en-IN');
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
    from: this.advanceFromDate.toLocaleDateString('en-IN'),
    to: this.advanceToDate.toLocaleDateString('en-IN'),
    days: Math.ceil((this.advanceToDate - this.advanceFromDate) / (1000 * 60 * 60 * 24)) + 1
  };
});

// Method to mark payment as verified
emiPaymentSchema.methods.markAsVerified = function(verifiedBy, notes = '') {
  this.isVerified = true;
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  if (notes) this.notes = notes;
};

// Method to update payment status
emiPaymentSchema.methods.updateStatus = function(status, notes = '') {
  this.status = status;
  if (notes) this.notes = notes;
  this.updatedAt = new Date();
};

// Method to convert to advance payment
emiPaymentSchema.methods.convertToAdvance = function(advanceFromDate, advanceToDate, advanceEmiCount, notes = '') {
  this.paymentType = 'advance';
  this.isAdvancePayment = true;
  this.status = 'Advance';
  this.advanceFromDate = new Date(advanceFromDate);
  this.advanceToDate = new Date(advanceToDate);
  this.advanceEmiCount = advanceEmiCount;
  this.advanceTotalAmount = this.amount * advanceEmiCount;
  if (notes) this.notes = notes;
  this.updatedAt = new Date();
};

// NEW: Method to update payment amount and date
emiPaymentSchema.methods.updatePayment = function(newAmount, newDate = null, updatedBy, notes = '') {
  const oldAmount = this.amount;
  const oldDate = this.paymentDate;
  
  this.amount = newAmount;
  if (newDate) {
    this.paymentDate = new Date(newDate);
  }
  this.notes = `${notes} | Edited: ₹${oldAmount} to ₹${newAmount} on ${new Date().toLocaleString()} by ${updatedBy}`;
  this.updatedAt = new Date();
  
  return {
    oldAmount,
    newAmount,
    oldDate,
    newDate: this.paymentDate
  };
};

// Static method to get total collection for a specific date
emiPaymentSchema.statics.getTotalCollectionByDate = async function(date) {
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);
  
  const result = await this.aggregate([
    {
      $match: {
        paymentDate: {
          $gte: startDate,
          $lt: endDate
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

// Static method to get total collection for a date range
emiPaymentSchema.statics.getTotalCollectionByDateRange = async function(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);
  
  const result = await this.aggregate([
    {
      $match: {
        paymentDate: {
          $gte: start,
          $lt: end
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
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
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    query.paymentDate = {
      $gte: startDate,
      $lt: endDate
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

// NEW: Static method to get advance payments
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

// NEW: Static method to get payment summary by payment type
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

// NEW: Static method to validate advance payment dates
emiPaymentSchema.statics.validateAdvancePayment = function(advanceFromDate, advanceToDate, loanStartDate = null) {
  const fromDate = new Date(advanceFromDate);
  const toDate = new Date(advanceToDate);
  
  // Check if from date is before to date
  if (fromDate > toDate) {
    return { isValid: false, error: 'From date cannot be after to date' };
  }
  
  // Check if dates are in the future (optional)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (fromDate < today) {
    return { isValid: false, error: 'Advance payment cannot start from past date' };
  }
  
  // Check if advance period is within loan period (if loanStartDate provided)
  if (loanStartDate) {
    const loanStart = new Date(loanStartDate);
    if (fromDate < loanStart) {
      return { isValid: false, error: 'Advance payment cannot start before loan start date' };
    }
  }
  
  return { isValid: true };
};

// NEW: Static method to find duplicate payments
emiPaymentSchema.statics.findDuplicatePayments = function(customerId, loanId, paymentDate) {
  const startDate = new Date(paymentDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(paymentDate);
  endDate.setHours(23, 59, 59, 999);
  
  return this.find({
    customerId: customerId,
    loanId: loanId,
    paymentDate: {
      $gte: startDate,
      $lte: endDate
    },
    status: { $ne: 'cancelled' }
  });
};

// NEW: Static method to get customer payment history with filters
emiPaymentSchema.statics.getCustomerPaymentHistory = function(customerId, startDate = null, endDate = null, limit = 100) {
  let query = { customerId: customerId };
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    
    query.paymentDate = {
      $gte: start,
      $lt: end
    };
  }
  
  return this.find(query)
    .populate('loanId', 'loanNumber loanType emiAmount')
    .sort({ paymentDate: -1 })
    .limit(limit);
};

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);