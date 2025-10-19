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
    enum: ['Paid', 'Partial', 'Due', 'Overdue', 'Pending'], 
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
emiPaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
emiPaymentSchema.index({ customerId: 1 });
emiPaymentSchema.index({ loanId: 1 });
emiPaymentSchema.index({ paymentDate: -1 });
emiPaymentSchema.index({ collectedBy: 1 });
emiPaymentSchema.index({ status: 1 });
emiPaymentSchema.index({ createdAt: -1 });

// Virtual for formatted payment date
emiPaymentSchema.virtual('formattedPaymentDate').get(function() {
  return this.paymentDate.toLocaleDateString('en-IN');
});

// Virtual for formatted amount
emiPaymentSchema.virtual('formattedAmount').get(function() {
  return `₹${this.amount.toLocaleString('en-IN')}`;
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
        status: { $in: ['Paid', 'Partial'] }
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
        status: { $in: ['Paid', 'Partial'] }
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

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);