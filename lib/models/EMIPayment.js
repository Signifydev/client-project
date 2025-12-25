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
  
  // Convert input dates to YYYY-MM-DD strings
  const fromDateStr = advanceFromDate instanceof Date ? formatToYYYYMMDD(advanceFromDate) : advanceFromDate;
  const toDateStr = advanceToDate instanceof Date ? formatToYYYYMMDD(advanceToDate) : advanceToDate;
  
  this.advanceFromDate = fromDateStr;
  this.advanceToDate = toDateStr;
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
    // Convert new date to YYYY-MM-DD string
    this.paymentDate = newDate instanceof Date ? formatToYYYYMMDD(newDate) : newDate;
  }
  
  const editDate = formatToYYYYMMDD(new Date());
  const editTime = new Date().toLocaleTimeString('en-IN');
  
  this.notes = `${notes} | Edited: ₹${oldAmount} to ₹${newAmount} on ${editDate} ${editTime} by ${updatedBy}`;
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

// NEW: Static method to find duplicate payments
emiPaymentSchema.statics.findDuplicatePayments = function(customerId, loanId, paymentDate) {
  const paymentDateStr = typeof paymentDate === 'string' ? paymentDate : formatToYYYYMMDD(paymentDate);
  
  return this.find({
    customerId: customerId,
    loanId: loanId,
    paymentDate: paymentDateStr,
    status: { $ne: 'cancelled' }
  });
};

// NEW: Static method to get customer payment history with filters
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
    
    return ret;
  }
});

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);