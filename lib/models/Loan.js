import mongoose from 'mongoose';

const emiHistorySchema = new mongoose.Schema({
  paymentDate: { 
    type: Date, 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Due', 'Overdue'], 
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
    default: Date.now 
  }
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
      default: Date.now
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
        return this.dateApplied;
      },
      validate: {
        validator: function(v) {
          // EMI start date should not be before loan date
          return v >= this.dateApplied;
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
      default: null
    },
    nextEmiDate: {
      type: Date,
      required: true,
      default: function() {
        // Calculate next EMI date based on EMI start date and loan type
        const nextDate = new Date(this.emiStartDate);
        switch(this.loanType) {
          case 'Daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case 'Weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case 'Monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        }
        return nextDate;
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
    
    // Status field
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'pending', 'closed', 'defaulted'],
      default: 'active',
    },
    
    // createdBy field
    createdBy: {
      type: String,
      required: true,
      default: 'system'
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
      }
    },
    endDate: {
      type: Date,
      default: function() {
        const endDate = new Date(this.dateApplied);
        endDate.setDate(endDate.getDate() + this.loanDays);
        return endDate;
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

// Method to check if loan is overdue
LoanSchema.methods.isOverdue = function() {
  const today = new Date();
  return this.nextEmiDate && today > this.nextEmiDate && this.status === 'active' && this.emiPaidCount < this.totalEmiCount;
};

// Method to calculate next due date
LoanSchema.methods.getNextDueDate = function() {
  if (this.lastEmiDate) {
    const nextDue = new Date(this.lastEmiDate);
    switch (this.loanType) {
      case 'Daily':
        nextDue.setDate(nextDue.getDate() + 1);
        break;
      case 'Weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case 'Monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
    }
    return nextDue;
  }
  return this.nextEmiDate;
};

// Method to update EMI payment (Enhanced for custom EMI)
LoanSchema.methods.updateEMIPayment = function(amountPaid, paymentDate, collectedBy = 'system', notes = '') {
  const payment = {
    paymentDate: paymentDate || new Date(),
    amount: amountPaid,
    status: amountPaid >= this.getExpectedEMIAmount(this.emiPaidCount + 1) ? 'Paid' : 'Partial',
    collectedBy,
    notes,
    loanId: this._id,
    customerNumber: this.customerNumber,
    loanNumber: this.loanNumber
  };

  this.emiHistory.push(payment);
  this.emiPaidCount += 1;
  this.totalPaidAmount += amountPaid;
  this.remainingAmount = Math.max(0, this.totalLoanAmount - this.totalPaidAmount);
  this.lastEmiDate = paymentDate || new Date();
  
  // Update next EMI date
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

// NEW: Method to validate EMI configuration
LoanSchema.methods.validateEMIConfig = function() {
  const errors = [];
  
  if (this.emiType === 'custom' && this.loanType !== 'Daily' && !this.customEmiAmount) {
    errors.push('Custom EMI amount is required for custom EMI type with Weekly/Monthly loans');
  }
  
  if (this.emiStartDate < this.dateApplied) {
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

// NEW: Method to get payment behavior analysis
LoanSchema.methods.getPaymentBehavior = function() {
  const totalPayments = this.emiHistory.length;
  const onTimePayments = this.emiHistory.filter(payment => {
    const paymentDate = new Date(payment.paymentDate);
    const dueDate = new Date(this.getNextDueDate());
    return paymentDate <= dueDate;
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

// Static method to find active loans
LoanSchema.statics.findActiveLoans = function() {
  return this.find({ status: 'active' });
};

// Static method to find overdue loans
LoanSchema.statics.findOverdueLoans = function() {
  const today = new Date();
  return this.find({ 
    status: 'active',
    nextEmiDate: { $lt: today },
    emiPaidCount: { $lt: '$totalEmiCount' }
  });
};

// Static method to find loans by customer
LoanSchema.statics.findByCustomerId = function(customerId) {
  return this.find({ customerId }).sort({ dateApplied: -1 });
};

// Static method to find loans by customer number
LoanSchema.statics.findByCustomerNumber = function(customerNumber) {
  return this.find({ customerNumber }).sort({ loanNumber: 1 });
};

// Static method to find loans by loan number
LoanSchema.statics.findByLoanNumber = function(loanNumber) {
  return this.findOne({ loanNumber });
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

// Pre-save middleware to update calculated fields
LoanSchema.pre('save', function(next) {
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
    this.remainingAmount = this.amount - this.totalPaidAmount;
  }

  // Update end date if loanDays or dateApplied changes
  if (this.isModified('loanDays') || this.isModified('dateApplied')) {
    this.endDate = new Date(this.dateApplied);
    this.endDate.setDate(this.endDate.getDate() + this.loanDays);
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
  
  // Update next EMI date if EMI start date changes
  if (this.isModified('emiStartDate') || !this.nextEmiDate) {
    this.nextEmiDate = new Date(this.emiStartDate);
    switch(this.loanType) {
      case 'Daily':
        this.nextEmiDate.setDate(this.nextEmiDate.getDate() + 1);
        break;
      case 'Weekly':
        this.nextEmiDate.setDate(this.nextEmiDate.getDate() + 7);
        break;
      case 'Monthly':
        this.nextEmiDate.setMonth(this.nextEmiDate.getMonth() + 1);
        break;
    }
  }
  
  // Update pending amounts for backward compatibility
  if (this.isModified('emiPaidCount')) {
    this.emiPaid = this.totalPaidAmount;
    this.emiPending = this.totalEMI - this.totalPaidAmount;
  }
  
  if (this.isModified('totalPaidAmount')) {
    this.totalPaid = this.totalPaidAmount;
    this.totalPending = this.amount - this.totalPaidAmount;
  }
  
  // Validate EMI configuration
  const validationErrors = this.validateEMIConfig();
  if (validationErrors.length > 0) {
    return next(new Error(validationErrors.join(', ')));
  }
  
  next();
});

// Transform output to include virtuals
LoanSchema.set('toJSON', { virtuals: true });
LoanSchema.set('toObject', { virtuals: true });

export default mongoose.models.Loan || mongoose.model('Loan', LoanSchema);