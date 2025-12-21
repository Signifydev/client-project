import mongoose from 'mongoose';

// ==============================================
// DATE UTILITY FUNCTIONS FOR IST TIMEZONE
// ==============================================

/**
 * Get current date in IST timezone (Asia/Kolkata, UTC+5:30)
 * @returns {Date} Current date in IST
 */
function getCurrentISTDate() {
  const now = new Date();
  const istDate = new Date(now.getTime() + (5 * 60 * 60 * 1000) + (30 * 60 * 1000));
  return istDate;
}

/**
 * Convert IST date to UTC for database storage
 * @param {Date} istDate - Date in IST timezone
 * @returns {Date} Date in UTC
 */
function convertISTToUTC(istDate) {
  if (!istDate) return new Date();
  
  try {
    const utcDate = new Date(istDate);
    utcDate.setHours(utcDate.getHours() - 5);
    utcDate.setMinutes(utcDate.getMinutes() - 30);
    return utcDate;
  } catch (error) {
    console.error('❌ Error converting IST to UTC:', error);
    return new Date();
  }
}

/**
 * Convert UTC date to IST for display/calculations
 * @param {Date} utcDate - Date in UTC
 * @returns {Date} Date in IST
 */
function convertUTCToIST(utcDate) {
  if (!utcDate) return new Date();
  
  try {
    const istDate = new Date(utcDate);
    istDate.setHours(istDate.getHours() + 5);
    istDate.setMinutes(istDate.getMinutes() + 30);
    return istDate;
  } catch (error) {
    console.error('❌ Error converting UTC to IST:', error);
    return new Date();
  }
}

/**
 * Format date to DD/MM/YYYY for display
 * @param {Date} date - Date object
 * @returns {string} Date in DD/MM/YYYY format
 */
function formatToDDMMYYYY(date) {
  if (!date) return '';
  
  try {
    let displayDate = new Date(date);
    
    // If date is stored as UTC, convert to IST
    if (date.toISOString().includes('Z')) {
      displayDate = convertUTCToIST(date);
    }
    
    const day = String(displayDate.getDate()).padStart(2, '0');
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    const year = displayDate.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('❌ Error formatting date to DD/MM/YYYY:', error);
    return '';
  }
}

const emiHistorySchema = new mongoose.Schema({
  paymentDate: { 
    type: Date, 
    required: true,
    default: () => convertISTToUTC(getCurrentISTDate()) // Store as UTC
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Due', 'Overdue', 'Advance'], 
    required: true 
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
    default: () => convertISTToUTC(getCurrentISTDate()) // Store as UTC
  },
  // Advance payment fields
  paymentType: {
    type: String,
    enum: ['single', 'advance'],
    default: 'single'
  },
  advanceFromDate: {
    type: Date,
    default: null,
    set: function(date) {
      // Convert IST date to UTC for storage
      if (date && date instanceof Date) {
        return convertISTToUTC(date);
      }
      return date;
    }
  },
  advanceToDate: {
    type: Date,
    default: null,
    set: function(date) {
      // Convert IST date to UTC for storage
      if (date && date instanceof Date) {
        return convertISTToUTC(date);
      }
      return date;
    }
  },
  advanceEmiCount: Number,
  advanceTotalAmount: Number
});

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
      type: Date,
      required: true,
      default: () => convertISTToUTC(getCurrentISTDate()), // Store as UTC
      set: function(date) {
        // Convert IST date to UTC for storage when set from application
        if (date && date instanceof Date) {
          return convertISTToUTC(date);
        }
        return date;
      }
    },
    loanDays: {
      type: Number,
      required: true,
      min: 1
    },
    
    // NEW: EMI Configuration Fields
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
      type: Date,
      required: true,
      default: function() {
        // Default to dateApplied (already in UTC)
        return this.dateApplied;
      },
      set: function(date) {
        // Convert IST date to UTC for storage when set from application
        if (date && date instanceof Date) {
          return convertISTToUTC(date);
        }
        return date;
      },
      validate: {
        validator: function(v) {
          // EMI start date should not be before loan date
          // Convert both to IST for comparison
          const emiStartDateIST = convertUTCToIST(new Date(v));
          const dateAppliedIST = convertUTCToIST(new Date(this.dateApplied));
          return emiStartDateIST >= dateAppliedIST;
        },
        message: 'EMI start date cannot be before loan date'
      }
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
      type: Date,
      default: null,
      set: function(date) {
        // Convert IST date to UTC for storage
        if (date && date instanceof Date) {
          return convertISTToUTC(date);
        }
        return date;
      }
    },
    nextEmiDate: {
      type: Date,
      required: true,
      default: function() {
        // For NEW loans with no payments, next EMI date should be the EMI start date itself
        // Don't add any increment for the first EMI
        return new Date(this.emiStartDate);
      },
      set: function(date) {
        // Convert IST date to UTC for storage
        if (date && date instanceof Date) {
          return convertISTToUTC(date);
        }
        return date;
      },
      validate: {
        validator: function(v) {
          // For new loans, ensure nextEmiDate is not before emiStartDate
          // Convert both to IST for comparison
          const nextEmiDateIST = convertUTCToIST(new Date(v));
          const emiStartDateIST = convertUTCToIST(new Date(this.emiStartDate));
          return nextEmiDateIST >= emiStartDateIST;
        },
        message: 'Next EMI date cannot be before EMI start date'
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
        return this.amount;
      }
    },
    
    // Payment History
    emiHistory: [emiHistorySchema],
    
    // Status field - UPDATED to include 'renewed'
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'pending', 'closed', 'defaulted', 'renewed'],
      default: 'active',
    },
    
    // createdBy field
    createdBy: {
      type: String,
      required: true,
      default: 'system'
    },
    
    // NEW: Renewal Tracking Fields
    isRenewed: {
      type: Boolean,
      default: false
    },
    renewedLoanNumber: {
      type: String,
      default: null
    },
    renewedDate: {
      type: Date,
      default: null,
      set: function(date) {
        // Convert IST date to UTC for storage
        if (date && date instanceof Date) {
          return convertISTToUTC(date);
        }
        return date;
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
      type: Date,
      default: function() {
        return this.dateApplied;
      },
      set: function(date) {
        // Convert IST date to UTC for storage
        if (date && date instanceof Date) {
          return convertISTToUTC(date);
        }
        return date;
      }
    },
    endDate: {
      type: Date,
      default: function() {
        // Calculate end date in IST, then convert to UTC for storage
        const dateAppliedIST = convertUTCToIST(new Date(this.dateApplied));
        const endDateIST = new Date(dateAppliedIST);
        endDateIST.setDate(endDateIST.getDate() + this.loanDays);
        return convertISTToUTC(endDateIST);
      },
      set: function(date) {
        // Convert IST date to UTC for storage
        if (date && date instanceof Date) {
          return convertISTToUTC(date);
        }
        return date;
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

// Index for better query performance - UPDATED with renewal fields
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
LoanSchema.index({ isRenewed: 1 }); // NEW: Index for renewal status
LoanSchema.index({ originalLoanNumber: 1 }); // NEW: Index for original loan tracking

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

// Virtual for regular EMI amount (for custom EMI, this is the fixed period amount)
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

// Virtual for EMI breakdown (for custom EMI)
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

// NEW: Virtual to check if loan is renewed
LoanSchema.virtual('isRenewedLoan').get(function() {
  return this.isRenewed || this.status === 'renewed';
});

// ==============================================
// NEW: DATE DISPLAY VIRTUALS FOR FRONTEND
// ==============================================

// Virtual for dateApplied in DD/MM/YYYY format (IST)
LoanSchema.virtual('dateAppliedDisplay').get(function() {
  return formatToDDMMYYYY(this.dateApplied);
});

// Virtual for emiStartDate in DD/MM/YYYY format (IST)
LoanSchema.virtual('emiStartDateDisplay').get(function() {
  return formatToDDMMYYYY(this.emiStartDate);
});

// Virtual for nextEmiDate in DD/MM/YYYY format (IST)
LoanSchema.virtual('nextEmiDateDisplay').get(function() {
  return formatToDDMMYYYY(this.nextEmiDate);
});

// Virtual for lastEmiDate in DD/MM/YYYY format (IST)
LoanSchema.virtual('lastEmiDateDisplay').get(function() {
  return formatToDDMMYYYY(this.lastEmiDate);
});

// Virtual for endDate in DD/MM/YYYY format (IST)
LoanSchema.virtual('endDateDisplay').get(function() {
  return formatToDDMMYYYY(this.endDate);
});

// Virtual for renewedDate in DD/MM/YYYY format (IST)
LoanSchema.virtual('renewedDateDisplay').get(function() {
  return formatToDDMMYYYY(this.renewedDate);
});

// Virtual for createdAt in DD/MM/YYYY format (IST)
LoanSchema.virtual('createdAtDisplay').get(function() {
  return formatToDDMMYYYY(this.createdAt);
});

// Virtual for updatedAt in DD/MM/YYYY format (IST)
LoanSchema.virtual('updatedAtDisplay').get(function() {
  return formatToDDMMYYYY(this.updatedAt);
});

// Method to check if loan is overdue (using IST dates)
LoanSchema.methods.isOverdue = function() {
  const todayIST = getCurrentISTDate();
  const nextEmiDateIST = this.nextEmiDate ? convertUTCToIST(new Date(this.nextEmiDate)) : null;
  
  return nextEmiDateIST && todayIST > nextEmiDateIST && 
         this.status === 'active' && 
         this.emiPaidCount < this.totalEmiCount;
};

// Method to calculate next due date (FIXED: Proper calculation using IST dates)
LoanSchema.methods.getNextDueDate = function() {
  // If this is a NEW loan with no payments, next due date is the EMI start date
  if (this.emiPaidCount === 0 || !this.lastEmiDate) {
    return new Date(this.emiStartDate);
  }
  
  // If payments exist, calculate based on last EMI date
  // Convert last EMI date to IST for calculation
  const lastEmiDateIST = convertUTCToIST(new Date(this.lastEmiDate));
  const nextDueIST = new Date(lastEmiDateIST);
  
  switch (this.loanType) {
    case 'Daily':
      nextDueIST.setDate(nextDueIST.getDate() + 1);
      break;
    case 'Weekly':
      nextDueIST.setDate(nextDueIST.getDate() + 7);
      break;
    case 'Monthly':
      nextDueIST.setMonth(nextDueIST.getMonth() + 1);
      break;
  }
  
  // Convert back to UTC for storage
  return convertISTToUTC(nextDueIST);
};

// Method to update EMI payment (Enhanced for custom EMI, using IST dates)
LoanSchema.methods.updateEMIPayment = function(amountPaid, paymentDate, collectedBy = 'system', notes = '', paymentType = 'single') {
  // Don't allow payments on renewed loans
  if (this.isRenewed || this.status === 'renewed') {
    throw new Error('Cannot process payment for a renewed loan');
  }

  // Convert payment date to UTC for storage
  let paymentDateUTC = paymentDate || getCurrentISTDate();
  if (paymentDateUTC instanceof Date) {
    paymentDateUTC = convertISTToUTC(paymentDateUTC);
  }

  const payment = {
    paymentDate: paymentDateUTC,
    amount: amountPaid,
    status: amountPaid >= this.getExpectedEMIAmount(this.emiPaidCount + 1) ? 'Paid' : 'Partial',
    collectedBy,
    notes,
    loanId: this._id,
    customerNumber: this.customerNumber,
    loanNumber: this.loanNumber,
    paymentType: paymentType
  };

  this.emiHistory.push(payment);
  this.emiPaidCount += 1;
  this.totalPaidAmount += amountPaid;
  this.remainingAmount = Math.max(0, this.totalLoanAmount - this.totalPaidAmount);
  this.lastEmiDate = paymentDateUTC;
  
  // FIXED: Update next EMI date correctly based on payments (using IST dates)
  this.nextEmiDate = this.getNextDueDate();
  
  // Update backward compatibility fields
  this.emiPaid = this.totalPaidAmount;
  this.totalPaid = this.totalPaidAmount;
  
  // Update status if completed
  if (this.emiPaidCount >= this.totalEmiCount) {
    this.status = 'completed';
  } else if (this.isOverdue()) {
    this.status = 'overdue';
  }
  
  return this;
};

// NEW: Method to get expected EMI amount for a specific period (for custom EMI)
LoanSchema.methods.getExpectedEMIAmount = function(periodNumber) {
  if (this.emiType === 'custom' && this.loanType !== 'Daily') {
    // For custom EMI, last period has different amount
    if (periodNumber === this.totalEmiCount) {
      return this.customEmiAmount;
    }
  }
  return this.emiAmount;
};

// NEW: Method to validate EMI configuration (using IST dates)
LoanSchema.methods.validateEMIConfig = function() {
  const errors = [];
  
  if (this.emiType === 'custom' && this.loanType !== 'Daily' && !this.customEmiAmount) {
    errors.push('Custom EMI amount is required for custom EMI type with Weekly/Monthly loans');
  }
  
  // Compare dates in IST
  const emiStartDateIST = convertUTCToIST(new Date(this.emiStartDate));
  const dateAppliedIST = convertUTCToIST(new Date(this.dateApplied));
  
  if (emiStartDateIST < dateAppliedIST) {
    errors.push('EMI start date cannot be before loan date');
  }
  
  if (this.loanDays <= 0) {
    errors.push('Loan days must be greater than 0');
  }
  
  return errors;
};

// Method to check if loan is completed
LoanSchema.methods.isCompleted = function() {
  return this.emiPaidCount >= this.totalEmiCount;
};

// NEW: Method to mark loan as renewed (using IST dates)
LoanSchema.methods.markAsRenewed = function(renewedLoanNumber) {
  this.isRenewed = true;
  this.status = 'renewed';
  this.renewedLoanNumber = renewedLoanNumber;
  this.renewedDate = convertISTToUTC(getCurrentISTDate());
  return this;
};

// NEW: Method to get payment behavior analysis (using IST dates)
LoanSchema.methods.getPaymentBehavior = function() {
  const totalPayments = this.emiHistory.length;
  const onTimePayments = this.emiHistory.filter(payment => {
    const paymentDateIST = convertUTCToIST(new Date(payment.paymentDate));
    const dueDate = this.getNextDueDate();
    const dueDateIST = convertUTCToIST(new Date(dueDate));
    return paymentDateIST <= dueDateIST;
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

// NEW: Static method for atomic loan number generation
LoanSchema.statics.generateLoanNumber = async function(customerId) {
  try {
    // Find the highest loan number for this customer
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
    
    // Double-check for duplicates (safety net)
    const existingLoan = await this.findOne({
      customerId: customerId,
      loanNumber: loanNumber
    });
    
    if (existingLoan) {
      // If duplicate found, try again with incremented number
      return await this.generateLoanNumber(customerId, nextNumber + 1);
    }
    
    return loanNumber;
  } catch (error) {
    console.error('Error generating loan number:', error);
    // Fallback: use timestamp-based loan number
    return `L${Date.now()}`;
  }
};

// NEW: Static method to validate loan uniqueness
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

// NEW: Static method to renew a loan - FIXED VERSION with IST dates
LoanSchema.statics.renewLoan = async function(originalLoanId, newLoanData, requestedBy = 'system') {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // 1. Find the original loan
    const originalLoan = await this.findById(originalLoanId).session(session);
    if (!originalLoan) {
      throw new Error('Original loan not found');
    }
    
    // 2. Generate new loan number
    const newLoanNumber = await this.generateLoanNumber(originalLoan.customerId);
    
    // 3. Parse dates as IST, then convert to UTC
    const renewalDate = newLoanData.renewalDate ? convertISTToUTC(new Date(newLoanData.renewalDate)) : convertISTToUTC(getCurrentISTDate());
    const emiStartDate = newLoanData.emiStartDate ? convertISTToUTC(new Date(newLoanData.emiStartDate)) : renewalDate;
    
    // 4. Create new loan with proper IST date handling
    const newLoan = new this({
      customerId: originalLoan.customerId,
      customerName: originalLoan.customerName,
      customerNumber: originalLoan.customerNumber,
      loanNumber: newLoanNumber,
      amount: parseFloat(newLoanData.newLoanAmount),
      emiAmount: parseFloat(newLoanData.newEmiAmount),
      loanType: newLoanData.newLoanType,
      dateApplied: renewalDate, // Already in UTC
      loanDays: parseInt(newLoanData.newLoanDays),
      emiType: newLoanData.emiType || 'fixed',
      customEmiAmount: newLoanData.customEmiAmount ? parseFloat(newLoanData.customEmiAmount) : null,
      emiStartDate: emiStartDate, // Already in UTC
      status: 'active',
      createdBy: requestedBy,
      // Track the original loan
      originalLoanNumber: originalLoan.loanNumber,
      // FIXED: For new renewed loan, nextEmiDate should be emiStartDate
      nextEmiDate: emiStartDate
    });
    
    // Save with session but skip validation to avoid middleware issues
    await newLoan.save({ session, validateBeforeSave: false });
    
    // 5. Mark original loan as renewed - FIXED: Direct assignment
    originalLoan.isRenewed = true;
    originalLoan.status = 'renewed';
    originalLoan.renewedLoanNumber = newLoanNumber;
    originalLoan.renewedDate = convertISTToUTC(getCurrentISTDate());
    
    await originalLoan.save({ session, validateBeforeSave: false });
    
    await session.commitTransaction();
    
    return {
      success: true,
      originalLoan: originalLoan,
      newLoan: newLoan
    };
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in renewLoan:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// Static method to find active loans
LoanSchema.statics.findActiveLoans = function() {
  return this.find({ status: 'active' });
};

// Static method to find overdue loans (using IST date comparison)
LoanSchema.statics.findOverdueLoans = function() {
  const todayIST = getCurrentISTDate();
  const todayUTC = convertISTToUTC(todayIST);
  
  return this.find({ 
    status: 'active',
    nextEmiDate: { $lt: todayUTC },
    emiPaidCount: { $lt: '$totalEmiCount' }
  });
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

// NEW: Static method to find renewed loans
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

// NEW: Static method to find loans by EMI type
LoanSchema.statics.findByEMIType = function(emiType) {
  return this.find({ emiType, status: 'active' });
};

// NEW: Static method to find loans by loan type
LoanSchema.statics.findByLoanType = function(loanType) {
  return this.find({ loanType, status: 'active' });
};

// NEW: Static method to find loans with custom EMI
LoanSchema.statics.findCustomEMILoans = function() {
  return this.find({ emiType: 'custom', status: 'active' });
};

// NEW: Static method to get loan statistics by EMI type
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

// NEW: Static method to get customer loan summary
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
    renewedLoans: 0
  };
  
  loans.forEach(loan => {
    summary.totalLoanAmount += loan.totalLoanAmount || loan.amount;
    summary.totalPaidAmount += loan.totalPaidAmount || 0;
    summary.totalRemainingAmount += loan.remainingAmount || loan.amount;
    
    if (loan.status === 'active' && !loan.isRenewed) summary.activeLoans++;
    if (loan.status === 'completed') summary.completedLoans++;
    if (loan.isOverdue()) summary.overdueLoans++;
    if (loan.isRenewed || loan.status === 'renewed') summary.renewedLoans++;
  });
  
  return summary;
};

// Pre-save middleware to update calculated fields - FIXED VERSION with IST dates
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

    // Update end date if loanDays or dateApplied changes (using IST dates)
    if (this.isModified('loanDays') || this.isModified('dateApplied')) {
      const dateAppliedIST = convertUTCToIST(new Date(this.dateApplied));
      const endDateIST = new Date(dateAppliedIST);
      endDateIST.setDate(endDateIST.getDate() + this.loanDays);
      this.endDate = convertISTToUTC(endDateIST);
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
    
    // FIXED: Update next EMI date logic with IST dates
    if (this.isModified('emiStartDate') || !this.nextEmiDate) {
      // For NEW loans or when emiStartDate changes, set nextEmiDate to emiStartDate
      this.nextEmiDate = new Date(this.emiStartDate);
    } else if (this.isModified('lastEmiDate') && this.emiPaidCount > 0) {
      // When a payment is made, calculate next EMI date based on last EMI date in IST
      const lastEmiDateIST = convertUTCToIST(new Date(this.lastEmiDate));
      const nextEmiDateIST = new Date(lastEmiDateIST);
      
      switch(this.loanType) {
        case 'Daily':
          nextEmiDateIST.setDate(nextEmiDateIST.getDate() + 1);
          break;
        case 'Weekly':
          nextEmiDateIST.setDate(nextEmiDateIST.getDate() + 7);
          break;
        case 'Monthly':
          nextEmiDateIST.setMonth(nextEmiDateIST.getMonth() + 1);
          break;
      }
      
      // Convert back to UTC for storage
      this.nextEmiDate = convertISTToUTC(nextEmiDateIST);
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
    
    // Validate EMI configuration - only for new loans or when relevant fields change
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

// Transform output to include virtuals
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
    ret.createdAtDisplay = formatToDDMMYYYY(doc.createdAt);
    ret.updatedAtDisplay = formatToDDMMYYYY(doc.updatedAt);
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
    ret.createdAtDisplay = formatToDDMMYYYY(doc.createdAt);
    ret.updatedAtDisplay = formatToDDMMYYYY(doc.updatedAt);
    return ret;
  }
});

export default mongoose.models.Loan || mongoose.model('Loan', LoanSchema);