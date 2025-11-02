import mongoose from 'mongoose';

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
    customerNumber: { // ADDED: To link with customerNumber from Customer model
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
    emiAmount: { // FIXED: Changed from String to Number
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
    
    // EMI Tracking Fields (ADDED: To match API expectations)
    totalEmiCount: {
      type: Number,
      required: true,
      default: function() {
        return this.loanDays; // For daily loans, each day is one EMI
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
        // Calculate next EMI date based on loan type
        const nextDate = new Date(this.dateApplied);
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
    
    // Status field
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'pending', 'closed', 'defaulted'],
      default: 'active', // Changed to 'active' for approved loans
    },
    
    // REMOVED: isMainLoan field since we're treating all loans equally
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
        return this.emiAmount * this.totalEmiCount;
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
LoanSchema.index({ customerNumber: 1 }); // ADDED: Index for customerNumber
LoanSchema.index({ loanNumber: 1 });
LoanSchema.index({ status: 1 });
LoanSchema.index({ dateApplied: -1 });
LoanSchema.index({ nextEmiDate: 1 }); // ADDED: Index for next EMI date
LoanSchema.index({ createdBy: 1 });

// Compound index for unique loan per customer
LoanSchema.index({ customerId: 1, loanNumber: 1 }, { unique: true });

// Virtual for loan duration in months
LoanSchema.virtual('durationInMonths').get(function() {
  return Math.ceil(this.loanDays / 30);
});

// Virtual for progress percentage (using new EMI tracking)
LoanSchema.virtual('progressPercentage').get(function() {
  if (!this.totalEmiCount || this.totalEmiCount === 0) return 0;
  return Math.round((this.emiPaidCount / this.totalEmiCount) * 100);
});

// Virtual for remaining EMIs
LoanSchema.virtual('remainingEmis').get(function() {
  return this.totalEmiCount - this.emiPaidCount;
});

// Virtual for total loan amount (emiAmount * totalEmiCount)
LoanSchema.virtual('totalLoanAmount').get(function() {
  return this.emiAmount * this.totalEmiCount;
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

// Method to update EMI payment (NEW)
LoanSchema.methods.updateEMIPayment = function(amountPaid, paymentDate) {
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
  }
  
  return this;
};

// Method to check if loan is completed
LoanSchema.methods.isCompleted = function() {
  return this.emiPaidCount >= this.totalEmiCount;
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

// Static method to find loans by customer number (NEW)
LoanSchema.statics.findByCustomerNumber = function(customerNumber) {
  return this.find({ customerNumber }).sort({ loanNumber: 1 });
};

// Static method to find loans by loan number
LoanSchema.statics.findByLoanNumber = function(loanNumber) {
  return this.findOne({ loanNumber });
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
    
    this.totalEMI = this.emiAmount * this.totalEmiCount;
  }
  
  // Update next EMI date if not set
  if (!this.nextEmiDate) {
    this.nextEmiDate = new Date(this.dateApplied);
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
  
  next();
});

export default mongoose.models.Loan || mongoose.model('Loan', LoanSchema);