import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'New Customer', 
      'Customer Edit', 
      'EMI Update', 
      'Loan Update', 
      'Loan Addition',
      'Document Update',
      'Status Change',
      'Other'
    ], 
    required: true 
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: function() {
      return this.type !== 'New Customer';
    }
  },
  customerName: { 
    type: String, 
    required: true,
    trim: true
  },
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    default: null
  },
  loanNumber: {
    type: String,
    trim: true,
    default: null
  },
  // Store the current data (before changes)
  currentData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Store the requested changes
  requestedData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Additional details about the request
  description: {
    type: String,
    trim: true,
    default: ''
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected', 'In Review', 'On Hold'], 
    default: 'Pending' 
  },
  createdBy: { 
    type: String, 
    required: true 
  },
  createdByRole: {
    type: String,
    enum: ['data_entry', 'admin', 'super_admin'],
    default: 'data_entry'
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedByRole: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: null
  },
  reviewNotes: {
    type: String,
    trim: true,
    default: ''
  },
  actionTaken: {
    type: String,
    trim: true,
    default: ''
  },
  estimatedImpact: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  },
  requiresCustomerNotification: {
    type: Boolean,
    default: false
  },
  customerNotified: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  reviewedAt: { 
    type: Date, 
    default: null 
  },
  completedAt: { 
    type: Date, 
    default: null 
  }
});

// Update the updatedAt field before saving
requestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
requestSchema.index({ status: 1 });
requestSchema.index({ type: 1 });
requestSchema.index({ customerId: 1 });
requestSchema.index({ createdBy: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ priority: 1 });
requestSchema.index({ reviewedBy: 1 });

// Virtual for request age in days
requestSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isOverdue (requests older than 7 days)
requestSchema.virtual('isOverdue').get(function() {
  return this.ageInDays > 7 && this.status === 'Pending';
});

// Virtual for formatted created date
requestSchema.virtual('formattedCreatedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN');
});

// Method to approve request
requestSchema.methods.approve = function(reviewedBy, reviewedByRole, notes = '', actionTaken = '') {
  this.status = 'Approved';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.actionTaken = actionTaken;
  this.reviewedAt = new Date();
  this.completedAt = new Date();
};

// Method to reject request
requestSchema.methods.reject = function(reviewedBy, reviewedByRole, notes = '', actionTaken = '') {
  this.status = 'Rejected';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.actionTaken = actionTaken;
  this.reviewedAt = new Date();
  this.completedAt = new Date();
};

// Method to put request on hold
requestSchema.methods.putOnHold = function(reviewedBy, reviewedByRole, notes = '') {
  this.status = 'On Hold';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.reviewedAt = new Date();
};

// Method to mark as in review
requestSchema.methods.markInReview = function(reviewedBy, reviewedByRole) {
  this.status = 'In Review';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewedAt = new Date();
};

// Method to update priority
requestSchema.methods.updatePriority = function(priority, notes = '') {
  this.priority = priority;
  if (notes) this.reviewNotes = notes;
};

// Static method to find pending requests
requestSchema.statics.findPendingRequests = function() {
  return this.find({ status: 'Pending' }).sort({ priority: -1, createdAt: 1 });
};

// Static method to find requests by type
requestSchema.statics.findByType = function(type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

// Static method to find requests by customer
requestSchema.statics.findByCustomerId = function(customerId) {
  return this.find({ customerId }).sort({ createdAt: -1 });
};

// Static method to find requests by creator
requestSchema.statics.findByCreator = function(createdBy) {
  return this.find({ createdBy }).sort({ createdAt: -1 });
};

// Static method to find overdue requests
requestSchema.statics.findOverdueRequests = function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return this.find({ 
    status: 'Pending',
    createdAt: { $lt: sevenDaysAgo }
  }).sort({ createdAt: 1 });
};

// Static method to find high priority requests
requestSchema.statics.findHighPriorityRequests = function() {
  return this.find({ 
    priority: { $in: ['High', 'Urgent'] },
    status: 'Pending'
  }).sort({ createdAt: 1 });
};

// Static method to get request statistics
requestSchema.statics.getRequestStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const total = await this.countDocuments();
  const pending = await this.countDocuments({ status: 'Pending' });
  const overdue = await this.countDocuments({ 
    status: 'Pending',
    createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });
  
  return {
    total,
    pending,
    overdue,
    byStatus: stats
  };
};

// Static method to get requests requiring customer notification
requestSchema.statics.findRequestsRequiringNotification = function() {
  return this.find({
    requiresCustomerNotification: true,
    customerNotified: false,
    status: { $in: ['Approved', 'Rejected'] }
  });
};

// Method to mark customer as notified
requestSchema.methods.markCustomerNotified = function() {
  this.customerNotified = true;
};

export default mongoose.models.Request || mongoose.model('Request', requestSchema);