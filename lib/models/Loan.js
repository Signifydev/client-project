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
    loanNumber: {
      type: String,
      required: true,
      trim: true
    },
    loanAmount: {
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
    
    // Existing fields (optional for backward compatibility)
    interestRate: {
      type: Number,
      default: 0
    },
    tenure: {
      type: Number,
      default: 0
    },
    tenureType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: function() {
        const endDate = new Date(this.startDate || this.dateApplied);
        endDate.setDate(endDate.getDate() + (this.loanDays || this.tenure || 0));
        return endDate;
      }
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue', 'pending', 'closed', 'defaulted'],
      default: 'active',
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
        return (this.loanDays || 0) * (this.dailyEMI || 0);
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
    },
    totalPending: {
      type: Number,
      default: function() {
        return (this.loanAmount || 0) - (this.totalPaid || 0);
      }
    },
    
    // New field for tracking who created the loan
    createdBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
LoanSchema.index({ customerId: 1 });
LoanSchema.index({ loanNumber: 1 });
LoanSchema.index({ status: 1 });
LoanSchema.index({ dateApplied: -1 });
LoanSchema.index({ createdBy: 1 });

// Virtual for loan duration in months
LoanSchema.virtual('durationInMonths').get(function() {
  return Math.ceil((this.loanDays || 0) / 30);
});

// Virtual for progress percentage
LoanSchema.virtual('progressPercentage').get(function() {
  if (!this.totalEMI || this.totalEMI === 0) return 0;
  return Math.round(((this.emiPaid || 0) / this.totalEMI) * 100);
});

// Method to check if loan is overdue
LoanSchema.methods.isOverdue = function() {
  const today = new Date();
  return this.endDate && today > this.endDate && this.status === 'active';
};

// Method to calculate next due date
LoanSchema.methods.getNextDueDate = function() {
  const lastPayment = this.lastPaymentDate || this.dateApplied;
  const nextDue = new Date(lastPayment);
  
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
    endDate: { $lt: today }
  });
};

// Static method to find loans by customer
LoanSchema.statics.findByCustomerId = function(customerId) {
  return this.find({ customerId }).sort({ dateApplied: -1 });
};

// Pre-save middleware to update calculated fields
LoanSchema.pre('save', function(next) {
  // Ensure all numeric fields have safe defaults
  this.loanAmount = this.loanAmount || 0;
  this.emiAmount = this.emiAmount || 0;
  this.loanDays = this.loanDays || 30;
  this.emiPaid = this.emiPaid || 0;
  this.totalPaid = this.totalPaid || 0;

  // Update end date if loanDays or dateApplied changes
  if (this.isModified('loanDays') || this.isModified('dateApplied')) {
    this.endDate = new Date(this.dateApplied || new Date());
    this.endDate.setDate(this.endDate.getDate() + (this.loanDays || 30));
  }
  
  // Update tenure for backward compatibility
  if (this.isModified('loanDays')) {
    this.tenure = this.loanDays;
  }
  
  // Update tenureType for backward compatibility
  if (this.isModified('loanType')) {
    this.tenureType = (this.loanType || 'Monthly').toLowerCase();
  }
  
  // Update calculated fields
  if (this.isModified('emiAmount') || this.isModified('loanType')) {
    if (this.loanType === 'Daily') this.dailyEMI = this.emiAmount;
    else if (this.loanType === 'Weekly') this.dailyEMI = this.emiAmount / 7;
    else if (this.loanType === 'Monthly') this.dailyEMI = this.emiAmount / 30;
    else this.dailyEMI = this.emiAmount; // Default case
    
    this.totalEMI = (this.loanDays || 30) * (this.dailyEMI || 0);
  }
  
  // Update pending amounts
  if (this.isModified('emiPaid')) {
    this.emiPending = (this.totalEMI || 0) - (this.emiPaid || 0);
  }
  
  if (this.isModified('totalPaid')) {
    this.totalPending = (this.loanAmount || 0) - (this.totalPaid || 0);
  }
  
  next();
});

export default mongoose.models.Loan || mongoose.model('Loan', LoanSchema);