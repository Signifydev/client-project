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
 * Add weeks to a date string
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} weeks - Number of weeks to add
 * @returns {string} New date in YYYY-MM-DD format
 */
function addWeeks(dateString, weeks) {
  return addDays(dateString, weeks * 7);
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
 * Generate EMI schedule array for a loan
 * @param {string} emiStartDate - Start date in YYYY-MM-DD
 * @param {string} loanType - 'Daily', 'Weekly', 'Monthly'
 * @param {number} totalInstallments - Total number of installments
 * @param {number} standardAmount - Standard EMI amount
 * @param {number} customAmount - Custom EMI amount (if any)
 * @param {number} customInstallmentNumber - Which installment has custom amount (defaults to last)
 * @returns {Array} Complete EMI schedule
 */
function generateCompleteSchedule(emiStartDate, loanType, totalInstallments, standardAmount, customAmount = null, customInstallmentNumber = null) {
  const schedule = [];
  const startDate = parseDateString(emiStartDate);
  
  // Default custom installment to last if not specified
  if (customAmount !== null && customInstallmentNumber === null) {
    customInstallmentNumber = totalInstallments;
  }
  
  for (let i = 1; i <= totalInstallments; i++) {
    let dueDate = new Date(startDate);
    
    // Calculate due date based on loan type
    if (loanType === 'Daily') {
      dueDate.setDate(startDate.getDate() + (i - 1));
    } else if (loanType === 'Weekly') {
      dueDate.setDate(startDate.getDate() + ((i - 1) * 7));
    } else if (loanType === 'Monthly') {
      dueDate.setMonth(startDate.getMonth() + (i - 1));
    }
    
    // Format date strings
    const dueDateStr = formatToYYYYMMDD(dueDate);
    const formattedDate = formatToDDMMYYYY(dueDateStr);
    
    // Determine amount for this installment
    let amount = standardAmount;
    let isCustom = false;
    
    if (customInstallmentNumber !== null && i === customInstallmentNumber) {
      amount = customAmount || standardAmount;
      isCustom = true;
    }
    
    schedule.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      amount: amount,
      isCustom: isCustom,
      formattedDate: formattedDate
    });
  }
  
  return schedule;
}

const emiHistorySchema = new mongoose.Schema({
  paymentDate: { 
    type: String, // Changed to String (YYYY-MM-DD)
    required: true,
    validate: {
      validator: isValidYYYYMMDD,
      message: 'Payment date must be in YYYY-MM-DD format'
    },
    default: getCurrentDateString
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Due', 'Advance'], 
    required: true,
    default: 'Paid'
  },
  collectedBy: { 
    type: String, 
    required: true 
  },
  notes: String,
  loanId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Loan' 
  },
  customerNumber: String,
  loanNumber: String,
  createdAt: { 
    type: Date, 
    default: Date.now // Keep as Date for timestamp
  },
  // Advance payment fields
  paymentType: {
    type: String,
    enum: ['single', 'advance'],
    default: 'single'
  },
  advanceFromDate: {
    type: String, // Changed to String (YYYY-MM-DD)
    default: null,
    validate: {
      validator: function(v) {
        return !v || isValidYYYYMMDD(v);
      },
      message: 'Advance from date must be in YYYY-MM-DD format'
    }
  },
  advanceToDate: {
    type: String, // Changed to String (YYYY-MM-DD)
    default: null,
    validate: {
      validator: function(v) {
        return !v || isValidYYYYMMDD(v);
      },
      message: 'Advance to date must be in YYYY-MM-DD format'
    }
  },
  advanceEmiCount: Number,
  advanceTotalAmount: Number,
  // ✅ FIXED: Add originalEmiAmount field for partial payments
  originalEmiAmount: {
    type: Number,
    default: null
  }
});

// Define schedule schema for reuse
const scheduleSchema = new mongoose.Schema({
  installmentNumber: {
    type: Number,
    required: true
  },
  dueDate: {
    type: String, // YYYY-MM-DD
    required: true,
    validate: {
      validator: isValidYYYYMMDD,
      message: 'Due date must be in YYYY-MM-DD format'
    }
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  isCustom: {
    type: Boolean,
    default: false
  },
  formattedDate: {
    type: String // DD/MM/YYYY for display
  }
}, { _id: false });

const LoanSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerNumber: {
      type: String,
      required: true,
      trim: true
    },
    loanNumber: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    emiAmount: {
      type: Number,
      required: true,
      min: 0
    },
    loanType: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly'],
      required: true
    },
    dateApplied: {
      type: String, // Changed to String (YYYY-MM-DD)
      required: true,
      validate: {
        validator: isValidYYYYMMDD,
        message: 'Date applied must be in YYYY-MM-DD format'
      },
      default: getCurrentDateString
    },
    loanDays: {
      type: Number,
      required: true,
      min: 1
    },
    
    // EMI Configuration Fields
    emiType: {
      type: String,
      enum: ['fixed', 'custom'],
      required: true,
      default: 'fixed'
    },
    customEmiAmount: {
      type: Number,
      default: null,
      validate: {
        validator: function(v) {
          // Custom EMI amount is only required when emiType is 'custom' and loanType is not 'Daily'
          if (this.emiType === 'custom' && this.loanType !== 'Daily') {
            return v !== null && v > 0;
          }
          return true;
        },
        message: 'Custom EMI amount is required for custom EMI type with Weekly/Monthly loans'
      }
    },
    emiStartDate: {
      type: String, // Changed to String (YYYY-MM-DD)
      required: true,
      validate: {
        validator: function(v) {
          if (!isValidYYYYMMDD(v)) return false;
          
          // EMI start date should not be before loan date
          return compareDateStrings(v, this.dateApplied) >= 0;
        },
        message: 'EMI start date must be in YYYY-MM-DD format and cannot be before loan date'
      },
      default: function() {
        return this.dateApplied; // String date
      }
    },
    
    // EMI SCHEDULE DETAILS - NEW FIELD FOR EMI CALENDAR FIX
    emiScheduleDetails: {
      emiType: {
        type: String,
        enum: ['fixed', 'custom'],
        default: 'fixed'
      },
      customEmiAmount: {
        type: Number,
        default: null
      },
      totalInstallments: {
        type: Number,
        default: 0
      },
      customInstallmentNumber: {
        type: Number,
        default: null // Which installment has custom amount (usually last)
      },
      standardAmount: {
        type: Number,
        default: 0
      },
      customAmount: {
        type: Number,
        default: null
      },
      schedule: [scheduleSchema] // Complete EMI schedule array
    },
    
    // EMI Tracking Fields
    totalEmiCount: {
      type: Number,
      required: true,
      default: function() {
        return this.loanDays;
      }
    },
    emiPaidCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastEmiDate: {
      type: String, // Changed to String (YYYY-MM-DD)
      default: null,
      validate: {
        validator: function(v) {
          return !v || isValidYYYYMMDD(v);
        },
        message: 'Last EMI date must be in YYYY-MM-DD format'
      }
    },
    nextEmiDate: {
      type: String, // Changed to String (YYYY-MM-DD)
      required: true,
      validate: {
        validator: function(v) {
          if (!isValidYYYYMMDD(v)) return false;
          
          // For new loans, ensure nextEmiDate is not before emiStartDate
          return compareDateStrings(v, this.emiStartDate) >= 0;
        },
        message: 'Next EMI date must be in YYYY-MM-DD format and cannot be before EMI start date'
      },
      default: function() {
        // For NEW loans with no payments, next EMI date should be the EMI start date itself
        return this.emiStartDate; // String date
      }
    },
    totalPaidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingAmount: {
      type: Number,
      required: true,
      default: function() {
        // ✅ FIXED: For new loans, remaining amount should equal total loan amount
        if (this.emiType === 'custom' && this.loanType !== 'Daily') {
          const regularPeriods = this.loanDays - 1;
          const lastPeriod = 1;
          return (this.emiAmount * regularPeriods) + (this.customEmiAmount * lastPeriod);
        } else {
          return this.emiAmount * this.loanDays;
        }
      }
    },
    
    // Payment History
    emiHistory: [emiHistorySchema],
    
    // Status field
    status: {
      type: String,
      enum: ['active', 'completed', 'pending', 'closed', 'defaulted', 'renewed'],
      default: 'active',
    },
    
    // createdBy field
    createdBy: {
      type: String,
      required: true,
      default: 'system'
    },
    
    // Renewal Tracking Fields
    isRenewed: {
      type: Boolean,
      default: false
    },
    renewedLoanNumber: {
      type: String,
      default: null
    },
    renewedDate: {
      type: String, // Changed to String (YYYY-MM-DD)
      default: null,
      validate: {
        validator: function(v) {
          return !v || isValidYYYYMMDD(v);
        },
        message: 'Renewed date must be in YYYY-MM-DD format'
      }
    },
    originalLoanNumber: {
      type: String,
      default: null
    },
    
    // Existing fields (optional for backward compatibility)
    interestRate: {
      type: Number,
      default: 0
    },
    tenure: {
      type: Number,
      default: function() {
        return this.loanDays;
      }
    },
    tenureType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: function() {
        return this.loanType.toLowerCase();
      }
    },
    startDate: {
      type: String, // Changed to String (YYYY-MM-DD)
      validate: {
        validator: function(v) {
          return !v || isValidYYYYMMDD(v);
        },
        message: 'Start date must be in YYYY-MM-DD format'
      },
      default: function() {
        return this.dateApplied; // String date
      }
    },
    endDate: {
      type: String, // Changed to String (YYYY-MM-DD)
      validate: {
        validator: function(v) {
          return !v || isValidYYYYMMDD(v);
        },
        message: 'End date must be in YYYY-MM-DD format'
      },
      default: function() {
        // Calculate end date from dateApplied and loanDays
        return addDays(this.dateApplied, this.loanDays);
      }
    },
    dailyEMI: {
      type: Number,
      default: function() {
        // Calculate daily EMI based on loan type
        if (this.loanType === 'Daily') return this.emiAmount;
        if (this.loanType === 'Weekly') return this.emiAmount / 7;
        if (this.loanType === 'Monthly') return this.emiAmount / 30;
        return this.emiAmount;
      }
    },
    totalEMI: {
      type: Number,
      default: function() {
        return this.totalLoanAmount;
      }
    },
    emiPaid: {
      type: Number,
      default: 0,
    },
    emiPending: {
      type: Number,
      default: function() {
        return (this.totalEMI || 0) - (this.emiPaid || 0);
      }
    },
    totalPaid: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
LoanSchema.index({ customerId: 1 });
LoanSchema.index({ customerNumber: 1 });
LoanSchema.index({ loanNumber: 1 });
LoanSchema.index({ status: 1 });
LoanSchema.index({ dateApplied: -1 });
LoanSchema.index({ nextEmiDate: 1 });
LoanSchema.index({ createdBy: 1 });
LoanSchema.index({ emiType: 1 });
LoanSchema.index({ loanType: 1 });
LoanSchema.index({ emiStartDate: 1 });
LoanSchema.index({ isRenewed: 1 });
LoanSchema.index({ originalLoanNumber: 1 });
// Index for EMI schedule details
LoanSchema.index({ 'emiScheduleDetails.emiType': 1 });
LoanSchema.index({ 'emiScheduleDetails.customInstallmentNumber': 1 });

// Compound index for unique loan per customer
LoanSchema.index({ customerId: 1, loanNumber: 1 }, { unique: true });

// Virtual for loan duration in months
LoanSchema.virtual('durationInMonths').get(function() {
  return Math.ceil(this.loanDays / 30);
});

// Virtual for progress percentage
LoanSchema.virtual('progressPercentage').get(function() {
  if (!this.totalEmiCount || this.totalEmiCount === 0) return 0;
  return Math.round((this.emiPaidCount / this.totalEmiCount) * 100);
});

// Virtual for remaining EMIs
LoanSchema.virtual('remainingEmis').get(function() {
  return this.totalEmiCount - this.emiPaidCount;
});

// Virtual for total loan amount calculation (supports both fixed and custom EMI)
LoanSchema.virtual('totalLoanAmount').get(function() {
  if (this.emiType === 'custom' && this.loanType !== 'Daily') {
    const regularPeriods = this.loanDays - 1;
    const lastPeriod = 1;
    return (this.emiAmount * regularPeriods) + (this.customEmiAmount * lastPeriod);
  } else {
    return this.emiAmount * this.loanDays;
  }
});

// Virtual for checking if custom EMI is applicable
LoanSchema.virtual('isCustomEMI').get(function() {
  return this.emiType === 'custom' && this.loanType !== 'Daily';
});

// Virtual for regular EMI amount
LoanSchema.virtual('regularEmiAmount').get(function() {
  return this.emiAmount;
});

// Virtual for last EMI amount (for custom EMI)
LoanSchema.virtual('lastEmiAmount').get(function() {
  if (this.emiType === 'custom' && this.loanType !== 'Daily') {
    return this.customEmiAmount;
  }
  return this.emiAmount;
});

// Virtual for EMI breakdown
LoanSchema.virtual('emiBreakdown').get(function() {
  if (this.emiType === 'custom' && this.loanType !== 'Daily') {
    return {
      regularPeriods: this.loanDays - 1,
      regularEmiAmount: this.emiAmount,
      lastPeriod: 1,
      lastEmiAmount: this.customEmiAmount
    };
  }
  return {
    regularPeriods: this.loanDays,
    regularEmiAmount: this.emiAmount,
    lastPeriod: 0,
    lastEmiAmount: 0
  };
});

// Virtual to check if loan is renewed
LoanSchema.virtual('isRenewedLoan').get(function() {
  return this.isRenewed || this.status === 'renewed';
});

// ==============================================
// DATE DISPLAY VIRTUALS FOR FRONTEND
// ==============================================

// Virtual for dateApplied in DD/MM/YYYY format
LoanSchema.virtual('dateAppliedDisplay').get(function() {
  return formatToDDMMYYYY(this.dateApplied);
});

// Virtual for emiStartDate in DD/MM/YYYY format
LoanSchema.virtual('emiStartDateDisplay').get(function() {
  return formatToDDMMYYYY(this.emiStartDate);
});

// Virtual for nextEmiDate in DD/MM/YYYY format
LoanSchema.virtual('nextEmiDateDisplay').get(function() {
  return formatToDDMMYYYY(this.nextEmiDate);
});

// Virtual for lastEmiDate in DD/MM/YYYY format
LoanSchema.virtual('lastEmiDateDisplay').get(function() {
  return formatToDDMMYYYY(this.lastEmiDate);
});

// Virtual for endDate in DD/MM/YYYY format
LoanSchema.virtual('endDateDisplay').get(function() {
  return formatToDDMMYYYY(this.endDate);
});

// Virtual for renewedDate in DD/MM/YYYY format
LoanSchema.virtual('renewedDateDisplay').get(function() {
  return formatToDDMMYYYY(this.renewedDate);
});

// Virtual for createdAt in DD/MM/YYYY format
LoanSchema.virtual('createdAtDisplay').get(function() {
  return this.createdAt ? formatToYYYYMMDD(this.createdAt) : '';
});

// Virtual for updatedAt in DD/MM/YYYY format
LoanSchema.virtual('updatedAtDisplay').get(function() {
  return this.updatedAt ? formatToYYYYMMDD(this.updatedAt) : '';
});


// ✅ FIXED: Method to calculate next due date (using string dates)
LoanSchema.methods.getNextDueDate = function() {
  // CRITICAL FIX #1: If loan is completed, return null
  const isCompleted = this.status === 'completed' || 
                     (this.emiPaidCount >= this.totalEmiCount);
  
  if (isCompleted) {
    return null; // No next EMI date for completed loans
  }
  
  // CRITICAL FIX #2: If no payments yet, return EMI start date
  if (this.emiPaidCount === 0 || !this.lastEmiDate) {
    return this.emiStartDate;
  }
  
  // If payments exist and loan is not completed, calculate based on last EMI date
  let nextDue;
  const lastDate = this.lastEmiDate;
  
  switch (this.loanType) {
    case 'Daily':
      nextDue = addDays(lastDate, 1);
      break;
    case 'Weekly':
      nextDue = addDays(lastDate, 7);
      break;
    case 'Monthly':
      nextDue = addMonths(lastDate, 1);
      break;
    default:
      nextDue = addDays(lastDate, 1);
  }
  
  return nextDue;
};

// Method to generate and update EMI schedule details
LoanSchema.methods.generateEMISchedule = function() {
  if (!this.emiStartDate || !this.loanType || !this.loanDays || !this.emiAmount) {
    return null;
  }
  
  const customAmount = (this.emiType === 'custom' && this.loanType !== 'Daily') 
    ? this.customEmiAmount 
    : null;
  
  const customInstallmentNumber = (this.emiType === 'custom' && this.loanType !== 'Daily') 
    ? this.loanDays 
    : null;
  
  const schedule = generateCompleteSchedule(
    this.emiStartDate,
    this.loanType,
    this.loanDays,
    this.emiAmount,
    customAmount,
    customInstallmentNumber
  );
  
  this.emiScheduleDetails = {
    emiType: this.emiType,
    customEmiAmount: customAmount,
    totalInstallments: this.loanDays,
    customInstallmentNumber: customInstallmentNumber,
    standardAmount: this.emiAmount,
    customAmount: customAmount,
    schedule: schedule
  };
  
  return this.emiScheduleDetails;
};

// Method to get amount for a specific installment
LoanSchema.methods.getInstallmentAmount = function(installmentNumber) {
  if (!installmentNumber || installmentNumber < 1 || installmentNumber > this.totalEmiCount) {
    return this.emiAmount;
  }
  
  // First check if we have schedule details
  if (this.emiScheduleDetails && this.emiScheduleDetails.schedule && this.emiScheduleDetails.schedule.length > 0) {
    const scheduleItem = this.emiScheduleDetails.schedule.find(item => 
      item.installmentNumber === installmentNumber
    );
    if (scheduleItem) {
      return scheduleItem.amount;
    }
  }
  
  // Fallback to old logic
  if (this.emiType === 'custom' && this.loanType !== 'Daily' && installmentNumber === this.totalEmiCount) {
    return this.customEmiAmount;
  }
  
  return this.emiAmount;
};

// Method to get schedule item for a specific date
LoanSchema.methods.getScheduleItemByDate = function(dateString) {
  if (!dateString || !isValidYYYYMMDD(dateString)) {
    return null;
  }
  
  if (this.emiScheduleDetails && this.emiScheduleDetails.schedule && this.emiScheduleDetails.schedule.length > 0) {
    return this.emiScheduleDetails.schedule.find(item => 
      item.dueDate === dateString
    );
  }
  
  return null;
};

// ✅ CRITICAL FIX: Method to update EMI payment (using string dates) - ENHANCED VERSION
LoanSchema.methods.updateEMIPayment = function(amountPaid, paymentDate, collectedBy = 'system', notes = '', paymentType = 'single', originalEmiAmount = null) {
  // Don't allow payments on renewed loans
  if (this.isRenewed || this.status === 'renewed') {
    throw new Error('Cannot process payment for a renewed loan');
  }

  // Validate payment date
  const paymentDateStr = paymentDate || getCurrentDateString();
  if (!isValidYYYYMMDD(paymentDateStr)) {
    throw new Error('Invalid payment date format');
  }

  // Get the expected amount for this installment
  const nextInstallmentNumber = this.emiPaidCount + 1;
  const expectedAmount = this.getInstallmentAmount ? this.getInstallmentAmount(nextInstallmentNumber) : this.emiAmount;
  
  // ✅ FIXED: Store original EMI amount for partial payments
  const actualOriginalAmount = originalEmiAmount || expectedAmount;

  // ✅ FIXED: Determine payment status correctly
  const isPartialPayment = amountPaid < expectedAmount;
  const paymentStatus = isPartialPayment ? 'Partial' : 'Paid';

  // ✅ FIXED: Create payment record with originalEmiAmount for partial payments
  const payment = {
    paymentDate: paymentDateStr,
    amount: amountPaid,
    status: paymentStatus,
    collectedBy,
    notes,
    loanId: this._id,
    customerNumber: this.customerNumber,
    loanNumber: this.loanNumber,
    paymentType: paymentType,
    originalEmiAmount: isPartialPayment ? actualOriginalAmount : null // Store original amount for partials
  };

  this.emiHistory.push(payment);
  
  // ✅ CRITICAL FIX: Only increment emiPaidCount for FULL payments, not partial
  if (paymentStatus === 'Paid') {
    this.emiPaidCount += 1;
    this.emiPaid += amountPaid;
  }
  
  this.totalPaidAmount += amountPaid;
  this.remainingAmount = Math.max(0, this.totalLoanAmount - this.totalPaidAmount);
  
  // ✅ FIXED: Only update lastEmiDate for FULL payments
  if (paymentStatus === 'Paid') {
    this.lastEmiDate = paymentDateStr;
  }
  
  // Update next EMI date
  this.nextEmiDate = this.getNextDueDate();
  
  // Update backward compatibility fields
  this.emiPaid = this.totalPaidAmount;
  this.totalPaid = this.totalPaidAmount;
  
  // ✅ FIXED: Update status if completed (only count FULL payments)
  if (this.emiPaidCount >= this.totalEmiCount) {
    this.status = 'completed';
    // CRITICAL: Clear nextEmiDate when loan is completed
    this.nextEmiDate = null;
    this.lastEmiDate = paymentDateStr;
  }
  
  // ✅ FIXED: Log payment details for debugging
  console.log('📊 Payment Processed (FIXED ENHANCED):', {
    loanNumber: this.loanNumber,
    customerNumber: this.customerNumber,
    expectedAmount: expectedAmount,
    paidAmount: amountPaid,
    status: paymentStatus,
    isPartial: isPartialPayment,
    emiPaidCountBefore: this.emiPaidCount - (paymentStatus === 'Paid' ? 1 : 0),
    emiPaidCountAfter: this.emiPaidCount,
    totalEmiCount: this.totalEmiCount,
    nextEmiDate: this.nextEmiDate,
    lastEmiDate: this.lastEmiDate,
    loanStatus: this.status,
    originalEmiAmountStored: payment.originalEmiAmount
  });
  
  return {
    success: true,
    paymentStatus: paymentStatus,
    isLoanCompleted: this.emiPaidCount >= this.totalEmiCount,
    emiPaidCount: this.emiPaidCount,
    remainingEmis: this.totalEmiCount - this.emiPaidCount
  };
};

// ✅ NEW: Method to process partial payment completion
LoanSchema.methods.completePartialPayment = function(paymentId, additionalAmount, paymentDate = null) {
  // Find the partial payment
  const partialPaymentIndex = this.emiHistory.findIndex(payment => 
    payment._id.toString() === paymentId.toString() && payment.status === 'Partial'
  );
  
  if (partialPaymentIndex === -1) {
    throw new Error('Partial payment not found or already completed');
  }
  
  const partialPayment = this.emiHistory[partialPaymentIndex];
  const totalPaidNow = partialPayment.amount + additionalAmount;
  const originalAmount = partialPayment.originalEmiAmount || this.getInstallmentAmount(this.emiPaidCount + 1);
  
  // Check if payment is now complete
  if (totalPaidNow >= originalAmount) {
    // Mark as full payment
    this.emiHistory[partialPaymentIndex].status = 'Paid';
    this.emiHistory[partialPaymentIndex].amount = totalPaidNow;
    this.emiHistory[partialPaymentIndex].originalEmiAmount = null; // Clear since it's now full
    
    // Update counts (this is effectively a full payment)
    this.emiPaidCount += 1;
    this.totalPaidAmount += additionalAmount;
    this.remainingAmount = Math.max(0, this.totalLoanAmount - this.totalPaidAmount);
    this.lastEmiDate = paymentDate || getCurrentDateString();
    
    // Update status if completed
    if (this.emiPaidCount >= this.totalEmiCount) {
      this.status = 'completed';
      this.nextEmiDate = null;
    }
    
    return {
      success: true,
      status: 'Completed',
      emiPaidCount: this.emiPaidCount
    };
  } else {
    // Still partial, just update amount
    this.emiHistory[partialPaymentIndex].amount = totalPaidNow;
    this.totalPaidAmount += additionalAmount;
    this.remainingAmount = Math.max(0, this.totalLoanAmount - this.totalPaidAmount);
    
    return {
      success: true,
      status: 'Still Partial',
      remainingAmount: originalAmount - totalPaidNow
    };
  }
};

// Method to get expected EMI amount for a specific period
LoanSchema.methods.getExpectedEMIAmount = function(periodNumber) {
  return this.getInstallmentAmount ? this.getInstallmentAmount(periodNumber) : this.emiAmount;
};

// ✅ ENHANCED: Method to validate EMI configuration
LoanSchema.methods.validateEMIConfig = function() {
  const errors = [];
  
  // Validate date strings
  if (!isValidYYYYMMDD(this.dateApplied)) {
    errors.push('Invalid loan date format (YYYY-MM-DD required)');
  }
  
  if (!isValidYYYYMMDD(this.emiStartDate)) {
    errors.push('Invalid EMI start date format (YYYY-MM-DD required)');
  }
  
  if (this.nextEmiDate && !isValidYYYYMMDD(this.nextEmiDate)) {
    errors.push('Invalid next EMI date format (YYYY-MM-DD required)');
  }
  
  // Date comparisons
  if (compareDateStrings(this.emiStartDate, this.dateApplied) < 0) {
    errors.push('EMI start date cannot be before loan date');
  }
  
  if (this.nextEmiDate && compareDateStrings(this.nextEmiDate, this.emiStartDate) < 0) {
    errors.push('Next EMI date cannot be before EMI start date');
  }
  
  // Custom EMI validation
  if (this.emiType === 'custom' && this.loanType !== 'Daily' && !this.customEmiAmount) {
    errors.push('Custom EMI amount is required for custom EMI type with Weekly/Monthly loans');
  }
  
  if (this.loanDays <= 0) {
    errors.push('Loan days must be greater than 0');
  }
  
  // Validate emiPaidCount consistency
  if (this.emiPaidCount > this.totalEmiCount) {
    errors.push('Paid EMI count cannot exceed total EMI count');
  }
  
  return errors;
};

// ✅ FIXED: Method to check if loan is completed
LoanSchema.methods.isCompleted = function() {
  // Only count FULL payments (emiPaidCount) for completion
  return this.emiPaidCount >= this.totalEmiCount;
};

// Method to mark loan as renewed
LoanSchema.methods.markAsRenewed = function(renewedLoanNumber) {
  this.isRenewed = true;
  this.status = 'renewed';
  this.renewedLoanNumber = renewedLoanNumber;
  this.renewedDate = getCurrentDateString();
  return this;
};

// Method to get payment behavior analysis
LoanSchema.methods.getPaymentBehavior = function() {
  const totalPayments = this.emiHistory.length;
  const onTimePayments = this.emiHistory.filter(payment => {
    // For simplicity, consider payment on-time if within 3 days of due date
    // In real implementation, you'd need to track scheduled dates
    return true; // Simplified for now
  }).length;
  
  const punctualityScore = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100;
  
  let behaviorRating = 'EXCELLENT';
  if (punctualityScore >= 90) behaviorRating = 'EXCELLENT';
  else if (punctualityScore >= 75) behaviorRating = 'GOOD';
  else if (punctualityScore >= 60) behaviorRating = 'AVERAGE';
  else behaviorRating = 'RISKY';
  
  return {
    punctualityScore,
    behaviorRating,
    totalPayments,
    onTimePayments,
    latePayments: totalPayments - onTimePayments
  };
};

// Static method for atomic loan number generation
LoanSchema.statics.generateLoanNumber = async function(customerId) {
  try {
    const lastLoan = await this.findOne(
      { customerId: customerId },
      { loanNumber: 1 },
      { sort: { loanNumber: -1 } }
    );
    
    let nextNumber = 1;
    if (lastLoan && lastLoan.loanNumber) {
      const match = lastLoan.loanNumber.match(/L(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    const loanNumber = `L${nextNumber}`;
    
    // Double-check for duplicates
    const existingLoan = await this.findOne({
      customerId: customerId,
      loanNumber: loanNumber
    });
    
    if (existingLoan) {
      return await this.generateLoanNumber(customerId, nextNumber + 1);
    }
    
    return loanNumber;
  } catch (error) {
    console.error('Error generating loan number:', error);
    return `L${Date.now()}`;
  }
};

// Static method to validate loan uniqueness
LoanSchema.statics.validateLoanUniqueness = async function(customerId, loanNumber, excludeId = null) {
  let query = {
    customerId: customerId,
    loanNumber: loanNumber
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const existingLoan = await this.findOne(query);
  return !existingLoan;
};

// ✅ FIXED: Static method to find active loans (matching frontend logic)
LoanSchema.statics.findActiveLoans = function(customerId = null) {
  const query = { 
    status: 'active',
    isRenewed: false,
    // Only include loans that are not completed (based on FULL payments)
    $expr: { $lt: ['$emiPaidCount', '$totalEmiCount'] }
  };
  
  if (customerId) {
    query.customerId = customerId;
  }
  
  return this.find(query).sort({ loanNumber: 1 });
};

// ✅ NEW: Static method to find ACTIVE loans for EMI update (critical fix)
LoanSchema.statics.findActiveLoansForEMIUpdate = function(customerId) {
  const query = { 
    customerId: customerId,
    status: { $in: ['active', 'overdue'] },
    isRenewed: false,
    $expr: { $lt: ['$emiPaidCount', '$totalEmiCount'] }
  };
  
  return this.find(query).sort({ loanNumber: 1 });
};


// ✅ NEW: Static method to find loans that appear active but might have partial payments
LoanSchema.statics.findLoansWithPartialPayments = function(customerId = null) {
  const query = { 
    status: 'active',
    isRenewed: false,
    // Loans with payment history containing partial payments
    'emiHistory.status': 'Partial',
    // But not completed (emiPaidCount < totalEmiCount)
    $expr: { $lt: ['$emiPaidCount', '$totalEmiCount'] }
  };
  
  if (customerId) {
    query.customerId = customerId;
  }
  
  return this.find(query).sort({ loanNumber: 1 });
};


// Static method to find loans by customer
LoanSchema.statics.findByCustomerId = function(customerId) {
  return this.find({ customerId }).sort({ loanNumber: 1 });
};

// Static method to find loans by customer number
LoanSchema.statics.findByCustomerNumber = function(customerNumber) {
  return this.find({ customerNumber }).sort({ loanNumber: 1 });
};

// Static method to find loans by loan number
LoanSchema.statics.findByLoanNumber = function(loanNumber) {
  return this.findOne({ loanNumber });
};

// Static method to find renewed loans
LoanSchema.statics.findRenewedLoans = function(customerId = null) {
  const query = { 
    $or: [
      { isRenewed: true },
      { status: 'renewed' }
    ]
  };
  
  if (customerId) {
    query.customerId = customerId;
  }
  
  return this.find(query).sort({ loanNumber: 1 });
};

// Static method to find loans by EMI type
LoanSchema.statics.findByEMIType = function(emiType) {
  return this.find({ emiType, status: 'active' });
};

// Static method to find loans by loan type
LoanSchema.statics.findByLoanType = function(loanType) {
  return this.find({ loanType, status: 'active' });
};

// Static method to find loans with custom EMI
LoanSchema.statics.findCustomEMILoans = function() {
  return this.find({ emiType: 'custom', status: 'active' });
};

// Static method to get loan statistics by EMI type
LoanSchema.statics.getEMITypeStats = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$emiType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalLoanAmount: { $sum: '$totalLoanAmount' }
      }
    }
  ]);
};

// Static method to get customer loan summary
LoanSchema.statics.getCustomerLoanSummary = async function(customerId) {
  const loans = await this.find({ customerId });
  
  const summary = {
    totalLoans: loans.length,
    totalLoanAmount: 0,
    totalPaidAmount: 0,
    totalRemainingAmount: 0,
    activeLoans: 0,
    completedLoans: 0,
    overdueLoans: 0,
    renewedLoans: 0,
    partialPaymentLoans: 0
  };
  
  loans.forEach(loan => {
    summary.totalLoanAmount += loan.totalLoanAmount || loan.amount;
    summary.totalPaidAmount += loan.totalPaidAmount || 0;
    summary.totalRemainingAmount += loan.remainingAmount || loan.amount;
    
    if (loan.status === 'active' && !loan.isRenewed) {
      summary.activeLoans++;
      // Check for partial payments
      const hasPartial = loan.emiHistory.some(payment => payment.status === 'Partial');
      if (hasPartial) {
        summary.partialPaymentLoans++;
      }
    }
    if (loan.status === 'completed') summary.completedLoans++;
    if (loan.isRenewed || loan.status === 'renewed') summary.renewedLoans++;
  });
  
  return summary;
};

// Pre-save middleware to update calculated fields including EMI schedule
LoanSchema.pre('save', function(next) {
  try {
    // Ensure all numeric fields have safe defaults
    this.amount = this.amount || 0;
    this.emiAmount = this.emiAmount || 0;
    this.loanDays = this.loanDays || 30;
    this.emiPaidCount = this.emiPaidCount || 0;
    this.totalPaidAmount = this.totalPaidAmount || 0;

  
    
    // Set totalEmiCount based on loanDays
    if (!this.totalEmiCount) {
      this.totalEmiCount = this.loanDays;
    }
    
    // Set remainingAmount if not set
    if (this.remainingAmount === undefined || this.remainingAmount === null) {
      this.remainingAmount = Math.max(0, this.totalLoanAmount - this.totalPaidAmount);
    }

    // Update end date if loanDays or dateApplied changes
    if (this.isModified('loanDays') || this.isModified('dateApplied')) {
      this.endDate = addDays(this.dateApplied, this.loanDays);
    }
    
    // Update tenure for backward compatibility
    if (this.isModified('loanDays')) {
      this.tenure = this.loanDays;
    }
    
    // Update tenureType for backward compatibility
    if (this.isModified('loanType')) {
      this.tenureType = this.loanType.toLowerCase();
    }
    
    // Update calculated fields
    if (this.isModified('emiAmount') || this.isModified('loanType')) {
      if (this.loanType === 'Daily') this.dailyEMI = this.emiAmount;
      else if (this.loanType === 'Weekly') this.dailyEMI = this.emiAmount / 7;
      else if (this.loanType === 'Monthly') this.dailyEMI = this.emiAmount / 30;
      else this.dailyEMI = this.emiAmount;
      
      this.totalEMI = this.totalLoanAmount;
    }
    
    // ✅ FIXED: Update next EMI date logic
    if (this.isModified('emiStartDate') || !this.nextEmiDate) {
      // For NEW loans or when emiStartDate changes, set nextEmiDate to emiStartDate
      this.nextEmiDate = this.emiStartDate;
    } else if (this.isModified('lastEmiDate') && this.lastEmiDate) {
      // When a full payment is made, calculate next EMI date based on last EMI date
      this.nextEmiDate = this.getNextDueDate();
    } else if (this.isModified('emiPaidCount') && this.emiPaidCount === 0) {
      // If emiPaidCount resets to 0 (shouldn't happen), use emiStartDate
      this.nextEmiDate = this.emiStartDate;
    }
    
    // Update pending amounts for backward compatibility
    if (this.isModified('emiPaidCount') || this.isModified('totalPaidAmount')) {
      this.emiPaid = this.totalPaidAmount;
      this.emiPending = Math.max(0, (this.totalEMI || 0) - this.totalPaidAmount);
    }
    
    if (this.isModified('totalPaidAmount')) {
      this.totalPaid = this.totalPaidAmount;
      this.totalPending = Math.max(0, this.amount - this.totalPaidAmount);
    }
    
    // Generate EMI schedule details if needed
    if (this.isNew || 
        this.isModified('emiStartDate') || 
        this.isModified('loanType') || 
        this.isModified('loanDays') || 
        this.isModified('emiAmount') || 
        this.isModified('emiType') || 
        this.isModified('customEmiAmount')) {
      
      // Generate or update EMI schedule
      this.generateEMISchedule();
    }
    
    // ✅ FIXED: Update status based on completion (only FULL payments count)
    if (this.isModified('emiPaidCount')) {
      if (this.emiPaidCount >= this.totalEmiCount) {
        this.status = 'completed';
        this.nextEmiDate = null;
      } else if (this.status === 'completed' && this.emiPaidCount < this.totalEmiCount) {
        // Revert to active if not actually completed
        this.status = 'active';
        this.nextEmiDate = this.getNextDueDate();
      }
    }
    
    // Validate EMI configuration
    if (this.isNew || this.isModified('emiType') || this.isModified('loanType') || this.isModified('customEmiAmount')) {
      const validationErrors = this.validateEMIConfig();
      if (validationErrors.length > 0) {
        return next(new Error(validationErrors.join(', ')));
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to ensure schedule is populated
LoanSchema.post('save', function(doc) {
  // Ensure schedule exists for frontend
  if (!doc.emiScheduleDetails || !doc.emiScheduleDetails.schedule || doc.emiScheduleDetails.schedule.length === 0) {
    // This is a fallback - in practice the pre-save should handle it
    doc.generateEMISchedule();
  }
});

// Transform output to include virtuals and schedule details
LoanSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add display date fields when converting to JSON
    ret.dateAppliedDisplay = formatToDDMMYYYY(doc.dateApplied);
    ret.emiStartDateDisplay = formatToDDMMYYYY(doc.emiStartDate);
    ret.nextEmiDateDisplay = formatToDDMMYYYY(doc.nextEmiDate);
    ret.lastEmiDateDisplay = formatToDDMMYYYY(doc.lastEmiDate);
    ret.endDateDisplay = formatToDDMMYYYY(doc.endDate);
    ret.renewedDateDisplay = formatToDDMMYYYY(doc.renewedDate);
    ret.createdAtDisplay = doc.createdAt ? formatToYYYYMMDD(doc.createdAt) : '';
    ret.updatedAtDisplay = doc.updatedAt ? formatToYYYYMMDD(doc.updatedAt) : '';
    
    // Ensure emiScheduleDetails exists
    if (!ret.emiScheduleDetails && doc.emiScheduleDetails) {
      ret.emiScheduleDetails = doc.emiScheduleDetails;
    }
    
    // ✅ NEW: Add isActive flag for frontend consistency
    ret.isActive = ret.status === 'active' && 
                  !ret.isRenewed && 
                  (ret.emiPaidCount < ret.totalEmiCount);
    
    // ✅ NEW: Add hasPartialPayments flag
    if (doc.emiHistory) {
      ret.hasPartialPayments = doc.emiHistory.some(payment => 
        payment.status === 'Partial'
      );
    }
    
    return ret;
  }
});

LoanSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add display date fields when converting to Object
    ret.dateAppliedDisplay = formatToDDMMYYYY(doc.dateApplied);
    ret.emiStartDateDisplay = formatToDDMMYYYY(doc.emiStartDate);
    ret.nextEmiDateDisplay = formatToDDMMYYYY(doc.nextEmiDate);
    ret.lastEmiDateDisplay = formatToDDMMYYYY(doc.lastEmiDate);
    ret.endDateDisplay = formatToDDMMYYYY(doc.endDate);
    ret.renewedDateDisplay = formatToDDMMYYYY(doc.renewedDate);
    ret.createdAtDisplay = doc.createdAt ? formatToYYYYMMDD(doc.createdAt) : '';
    ret.updatedAtDisplay = doc.updatedAt ? formatToYYYYMMDD(doc.updatedAt) : '';
    
    // Ensure emiScheduleDetails exists
    if (!ret.emiScheduleDetails && doc.emiScheduleDetails) {
      ret.emiScheduleDetails = doc.emiScheduleDetails;
    }
    
    // ✅ NEW: Add isActive flag for frontend consistency
    ret.isActive = ret.status === 'active' && 
                  !ret.isRenewed && 
                  (ret.emiPaidCount < ret.totalEmiCount);
    
    // ✅ NEW: Add hasPartialPayments flag
    if (doc.emiHistory) {
      ret.hasPartialPayments = doc.emiHistory.some(payment => 
        payment.status === 'Partial'
      );
    }
    
    return ret;
  }
});

export default mongoose.models.Loan || mongoose.model('Loan', LoanSchema);