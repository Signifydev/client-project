import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'New Customer', 
      'New Loan',
      'Customer Edit', 
      'Loan Edit',
      'Loan Renew',
      'Loan Addition',
      'Loan Deletion',
      'EMI Update', 
      'EMI Correction',
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
    },
    default: null
  },
  customerName: { 
    type: String, 
    required: true,
    trim: true
  },
  customerNumber: {
    type: String,
    trim: true,
    default: null
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
  
  // Step 1: Customer Details - ONLY for New Customer requests
  step1Data: {
    name: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    },
    phone: [{ 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    }],
    whatsappNumber: { 
      type: String, 
      default: '',
      required: false
    },
    businessName: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    },
    area: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    },
    customerNumber: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    },
    address: { 
      type: String, 
      default: '',
      required: false
    },
    category: { 
      type: String, 
      default: 'A',
      required: false
    },
    officeCategory: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    },
    profilePicture: {
      filename: { type: String, default: null },
      url: { type: String, default: null },
      originalName: { type: String, default: null },
      uploadedAt: { type: Date, default: null }
    },
    fiDocuments: {
      shop: {
        filename: { type: String, default: null },
        url: { type: String, default: null },
        originalName: { type: String, default: null },
        uploadedAt: { type: Date, default: null }
      },
      home: {
        filename: { type: String, default: null },
        url: { type: String, default: null },
        originalName: { type: String, default: null },
        uploadedAt: { type: Date, default: null }
      }
    },
    hasProfilePicture: { type: Boolean, default: false },
    hasFiDocuments: {
      shop: { type: Boolean, default: false },
      home: { type: Boolean, default: false }
    }
  },
  
  // Step 2: Loan Details - ONLY for New Customer requests
  step2Data: {
    loanSelectionType: {
      type: String,
      enum: ['single', 'multiple'],
      default: 'single',
      required: function() {
        return this.parent().type === 'New Customer';
      }
    },
    loanNumber: {
      type: String,
      default: '',
      trim: true,
      required: false
    },
    loanDate: { 
      type: Date, 
      default: null,
      required: function() {
        return this.parent().type === 'New Customer' && 
               this.parent().step2Data?.loanSelectionType === 'single';
      }
    },
    emiStartDate: { 
      type: Date, 
      default: null,
      required: function() {
        return this.parent().type === 'New Customer' && 
               this.parent().step2Data?.loanSelectionType === 'single';
      }
    },
    // FIX: ADDED THE MISSING 'amount' FIELD
    amount: { 
      type: Number, 
      default: 0,
      min: 0,
      required: function() {
        return this.parent().type === 'New Customer' && 
               this.parent().step2Data?.loanSelectionType === 'single';
      }
    },
    loanAmount: { 
      type: Number, 
      default: 0,
      min: 0,
      required: false
    },
    emiAmount: { 
      type: Number, 
      default: 0,
      min: 0,
      required: false
    },
    loanDays: { 
      type: Number, 
      default: 0,
      min: 0,
      required: false
    },
    
    loanType: {
      type: String,
      default: '',
      enum: ['Daily', 'Weekly', 'Monthly', ''],
      required: function() {
        return this.parent().type === 'New Customer' && 
               this.parent().step2Data?.loanSelectionType === 'single';
      }
    },
    
    emiType: {
      type: String,
      default: 'fixed',
      enum: ['fixed', 'custom'],
      required: false
    },
    customEmiAmount: { 
      type: Number, 
      default: null,
      min: 0,
      required: false
    },
    totalLoanAmount: { 
      type: Number, 
      default: 0,
      min: 0,
      required: false
    }
  },
  
  // Step 3: Login Credentials - ONLY for New Customer requests
  step3Data: {
    loginId: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    },
    password: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    },
    confirmPassword: { 
      type: String, 
      required: function() {
        return this.parent().type === 'New Customer';
      },
      default: null
    }
  },
  
  currentData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  requestedData: {
  type: mongoose.Schema.Types.Mixed,
  required: function() {
    return this.type !== 'New Customer';
  },
  default: null
},
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
  rejectionReason: {
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
  approvedAt: { 
    type: Date, 
    default: null 
  },
  rejectedAt: { 
    type: Date, 
    default: null 
  },
  completedAt: { 
    type: Date, 
    default: null 
  }
});

// CRITICAL FIX: Pre-save middleware with 'next' parameter
requestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Normalize status to ensure proper case
  if (this.status && typeof this.status === 'string') {
    const status = this.status.toLowerCase();
    if (status === 'pending') this.status = 'Pending';
    else if (status === 'approved') this.status = 'Approved';
    else if (status === 'rejected') this.status = 'Rejected';
    else if (status === 'in review' || status === 'inreview') this.status = 'In Review';
    else if (status === 'on hold' || status === 'onhold') this.status = 'On Hold';
  }
  
  // Auto-populate description if not provided - USE INLINE FUNCTION INSTEAD
  if (!this.description || this.description.trim() === '') {
    // Generate description inline instead of calling undefined method
    let description = '';
    switch(this.type) {
      case 'New Customer':
        const loanTypeDesc = this.step2Data?.loanSelectionType === 'single' ? 'with Single Loan' : 'for Multiple Loans (Add Later)';
        description = `New customer registration for ${this.customerName} - ${loanTypeDesc}`;
        break;
      case 'New Loan':
        description = `New loan application for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
        break;
      case 'Customer Edit':
        description = `Customer profile edit request for ${this.customerName}`;
        break;
      case 'Loan Edit':
        description = `Loan modification request for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
        break;
      case 'Loan Renew':
        description = `Loan renewal request for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
        break;
      case 'Loan Addition':
        description = `Additional loan request for ${this.customerName}`;
        break;
      case 'Loan Deletion':
        description = `Loan deletion request for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
        break;
      case 'EMI Update':
        description = `EMI payment update for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
        break;
      case 'EMI Correction':
        description = `EMI payment correction for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
        break;
      case 'Document Update':
        description = `Document update request for ${this.customerName}`;
        break;
      case 'Status Change':
        description = `Status change request for ${this.customerName}`;
        break;
      default:
        description = `General request for ${this.customerName}`;
    }
    this.description = description;
  }
  
  // CRITICAL FIX: Clear step data for non-New Customer requests to avoid validation errors
  if (this.type !== 'New Customer') {
    // Set to undefined so they're not included in validation
    this.step1Data = undefined;
    this.step2Data = undefined;
    this.step3Data = undefined;
  } else {
    // FIXED: Handle step2Data validation for Multiple Loans
    if (this.step2Data) {
      // For Multiple Loans, set empty string values to pass validation
      if (this.step2Data.loanSelectionType === 'multiple') {
        // Set loanType to empty string (which is allowed in enum)
        this.step2Data.loanType = '';
        
        // Set other loan fields to defaults if they're empty/null
        if (!this.step2Data.loanDate || this.step2Data.loanDate === '') {
          this.step2Data.loanDate = null;
        }
        if (!this.step2Data.emiStartDate || this.step2Data.emiStartDate === '') {
          this.step2Data.emiStartDate = null;
        }
        if (!this.step2Data.loanNumber || this.step2Data.loanNumber === '') {
          this.step2Data.loanNumber = '';
        }
        // Ensure numeric fields have valid values
        this.step2Data.amount = Number(this.step2Data.amount) || 0; // Added amount field
        this.step2Data.loanAmount = Number(this.step2Data.loanAmount) || 0;
        this.step2Data.emiAmount = Number(this.step2Data.emiAmount) || 0;
        this.step2Data.loanDays = Number(this.step2Data.loanDays) || 0;
        this.step2Data.totalLoanAmount = Number(this.step2Data.totalLoanAmount) || 0;
      }
    }
  }
  
  // CRITICAL: Call next() to continue the save process
  next();
});

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

// Virtual for isNewCustomerRequest
requestSchema.virtual('isNewCustomerRequest').get(function() {
  return this.type === 'New Customer';
});

// Virtual for hasStepData
requestSchema.virtual('hasStepData').get(function() {
  return !!(this.step1Data || this.step2Data || this.step3Data);
});

// Virtual for loanSelectionType text
requestSchema.virtual('loanSelectionTypeText').get(function() {
  if (this.step2Data && this.step2Data.loanSelectionType) {
    return this.step2Data.loanSelectionType === 'single' ? 'Single Loan' : 'Multiple Loans (Add Later)';
  }
  return 'Not Specified';
});

// Virtual for customer basic info
requestSchema.virtual('customerBasicInfo').get(function() {
  if (this.step1Data) {
    return {
      name: this.step1Data.name,
      phone: this.step1Data.phone,
      businessName: this.step1Data.businessName,
      area: this.step1Data.area,
      customerNumber: this.step1Data.customerNumber,
      category: this.step1Data.category,
      officeCategory: this.step1Data.officeCategory
    };
  }
  return null;
});

// Virtual for loan summary
requestSchema.virtual('loanSummary').get(function() {
  if (this.step2Data && this.step2Data.loanSelectionType === 'single') {
    const totalLoanAmount = this.step2Data.emiType === 'custom' && this.step2Data.loanType !== 'Daily' 
      ? (this.step2Data.emiAmount * (this.step2Data.loanDays - 1)) + (this.step2Data.customEmiAmount || 0)
      : this.step2Data.emiAmount * this.step2Data.loanDays;
    
    return {
      loanNumber: this.step2Data.loanNumber,
      loanSelectionType: this.step2Data.loanSelectionType,
      loanType: this.step2Data.loanType,
      amount: this.step2Data.amount, // Added amount field
      loanAmount: this.step2Data.loanAmount,
      emiAmount: this.step2Data.emiAmount,
      loanDays: this.step2Data.loanDays,
      emiType: this.step2Data.emiType,
      customEmiAmount: this.step2Data.customEmiAmount,
      totalLoanAmount: totalLoanAmount || this.step2Data.totalLoanAmount,
      emiStartDate: this.step2Data.emiStartDate,
      loanDate: this.step2Data.loanDate
    };
  }
  return null;
});

// Method to generate auto description
requestSchema.methods.generateAutoDescription = function() {
  switch(this.type) {
    case 'New Customer':
      const loanTypeDesc = this.step2Data?.loanSelectionType === 'single' ? 'with Single Loan' : 'for Multiple Loans (Add Later)';
      return `New customer registration for ${this.customerName} - ${loanTypeDesc}`;
    case 'New Loan':
      return `New loan application for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
    case 'Customer Edit':
      return `Customer profile edit request for ${this.customerName}`;
    case 'Loan Edit':
      return `Loan modification request for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
    case 'Loan Renew':
      return `Loan renewal request for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
    case 'Loan Addition':
      return `Additional loan request for ${this.customerName}`;
    case 'Loan Deletion':
      return `Loan deletion request for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
    case 'EMI Update':
      return `EMI payment update for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
    case 'EMI Correction':
      return `EMI payment correction for ${this.customerName} - Loan: ${this.loanNumber || 'N/A'}`;
    case 'Document Update':
      return `Document update request for ${this.customerName}`;
    case 'Status Change':
      return `Status change request for ${this.customerName}`;
    default:
      return `General request for ${this.customerName}`;
  }
};

// Method to approve request
requestSchema.methods.approve = function(reviewedBy, reviewedByRole, notes = '', actionTaken = '') {
  this.status = 'Approved';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.actionTaken = actionTaken;
  this.reviewedAt = new Date();
  this.approvedAt = new Date();
  this.completedAt = new Date();
};

// Method to reject request
requestSchema.methods.reject = function(reviewedBy, reviewedByRole, notes = '', rejectionReason = '', actionTaken = '') {
  this.status = 'Rejected';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.rejectionReason = rejectionReason;
  this.actionTaken = actionTaken;
  this.reviewedAt = new Date();
  this.rejectedAt = new Date();
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

// Validate step data method - FIXED to check both amount and loanAmount
requestSchema.methods.validateStepData = function() {
  const errors = [];
  
  if (this.type === 'New Customer') {
    // Validate Step 1 data
    if (!this.step1Data) {
      errors.push('Step 1 data (customer details) is required');
    } else {
      if (!this.step1Data.name || !this.step1Data.name.trim()) errors.push('Customer name is required');
      if (!this.step1Data.phone || !Array.isArray(this.step1Data.phone) || this.step1Data.phone.length === 0 || !this.step1Data.phone[0] || !this.step1Data.phone[0].trim()) 
        errors.push('Primary phone number is required');
      if (!this.step1Data.businessName || !this.step1Data.businessName.trim()) errors.push('Business name is required');
      if (!this.step1Data.area || !this.step1Data.area.trim()) errors.push('Area is required');
      if (!this.step1Data.customerNumber || !this.step1Data.customerNumber.trim()) errors.push('Customer number is required');
      if (!this.step1Data.category) errors.push('Category is required');
      if (!this.step1Data.officeCategory) errors.push('Office category is required');
    }
    
    // Validate Step 2 data
    if (!this.step2Data) {
      errors.push('Step 2 data (loan details) is required');
    } else {
      // Validate loan selection type
      if (!this.step2Data.loanSelectionType) {
        errors.push('Loan selection type (single/multiple) is required');
      }
      
      // For single loans, validate loan details
      if (this.step2Data.loanSelectionType === 'single') {
        if (!this.step2Data.loanNumber || !this.step2Data.loanNumber.trim()) {
          errors.push('Loan number is required for single loan');
        } else if (!this.step2Data.loanNumber.toUpperCase().startsWith('L')) {
          errors.push('Loan number must start with "L" prefix');
        }
        
        if (!this.step2Data.loanDate) errors.push('Loan date is required');
        if (!this.step2Data.emiStartDate) errors.push('EMI start date is required');
        
        // FIXED: Validate BOTH amount (principal) AND loanAmount (total)
        if (!this.step2Data.amount || this.step2Data.amount <= 0) errors.push('Valid amount (principal) is required');
        if (!this.step2Data.loanAmount || this.step2Data.loanAmount <= 0) errors.push('Valid loan amount (total) is required');
        
        if (!this.step2Data.emiAmount || this.step2Data.emiAmount <= 0) errors.push('Valid EMI amount is required');
        if (!this.step2Data.loanDays || this.step2Data.loanDays <= 0) errors.push('Valid loan days is required');
        if (!this.step2Data.loanType) errors.push('Loan type (Daily/Weekly/Monthly) is required');
        if (!this.step2Data.emiType) errors.push('EMI type is required');
        
        // Validate custom EMI
        if (this.step2Data.emiType === 'custom' && this.step2Data.loanType !== 'Daily') {
          if (!this.step2Data.customEmiAmount || this.step2Data.customEmiAmount <= 0) {
            errors.push('Custom EMI amount is required for custom EMI type');
          }
        }
        
        // Validate dates
        if (this.step2Data.emiStartDate && this.step2Data.loanDate && 
            new Date(this.step2Data.emiStartDate) < new Date(this.step2Data.loanDate)) {
          errors.push('EMI start date cannot be before loan date');
        }
      }
      // For multiple loans, no validation needed
    }
    
    // Validate Step 3 data
    if (!this.step3Data) {
      errors.push('Step 3 data (login credentials) is required');
    } else {
      if (!this.step3Data.loginId || !this.step3Data.loginId.trim()) errors.push('Login ID is required');
      if (!this.step3Data.password || !this.step3Data.password.trim()) errors.push('Password is required');
      if (!this.step3Data.confirmPassword || !this.step3Data.confirmPassword.trim()) errors.push('Confirm password is required');
      if (this.step3Data.password !== this.step3Data.confirmPassword) errors.push('Passwords do not match');
    }
  }
  
  return errors;
};

// Method to get request summary
requestSchema.methods.getRequestSummary = function() {
  const summary = {
    type: this.type,
    customerName: this.customerName,
    customerNumber: this.customerNumber,
    loanSelectionType: this.loanSelectionTypeText,
    status: this.status,
    priority: this.priority,
    ageInDays: this.ageInDays,
    createdBy: this.createdBy,
    createdAt: this.formattedCreatedDate
  };
  
  if (this.isNewCustomerRequest && this.hasStepData) {
    summary.customerDetails = this.customerBasicInfo;
    summary.loanDetails = this.loanSummary;
  }
  
  return summary;
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

// Static method to find requests by customer number
requestSchema.statics.findByCustomerNumber = function(customerNumber) {
  return this.find({ customerNumber }).sort({ createdAt: -1 });
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

// Static method to find New Customer requests
requestSchema.statics.findNewCustomerRequests = function() {
  return this.find({ type: 'New Customer' }).sort({ createdAt: -1 });
};

// Static method to find loan-related requests
requestSchema.statics.findLoanRequests = function() {
  return this.find({ 
    type: { $in: ['New Loan', 'Loan Edit', 'Loan Renew', 'Loan Addition', 'Loan Deletion'] }
  }).sort({ createdAt: -1 });
};

// Static method to find EMI-related requests
requestSchema.statics.findEMIRequests = function() {
  return this.find({ 
    type: { $in: ['EMI Update', 'EMI Correction'] }
  }).sort({ createdAt: -1 });
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
  
  const typeStats = await this.aggregate([
    {
      $group: {
        _id: '$type',
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
  const newCustomerRequests = await this.countDocuments({ type: 'New Customer', status: 'Pending' });
  
  return {
    total,
    pending,
    overdue,
    newCustomerRequests,
    byStatus: stats,
    byType: typeStats
  };
};

// Static method to find requests requiring customer notification
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

// Indexes for better query performance
requestSchema.index({ type: 1 });
requestSchema.index({ status: 1 });
requestSchema.index({ createdBy: 1 });
requestSchema.index({ customerId: 1 });
requestSchema.index({ customerNumber: 1 });
requestSchema.index({ loanId: 1 });
requestSchema.index({ createdAt: -1 });
requestSchema.index({ priority: 1 });
requestSchema.index({ status: 1, priority: -1 });
requestSchema.index({ type: 1, status: 1 });

// Set to include virtuals in JSON and object outputs
requestSchema.set('toJSON', { virtuals: true });
requestSchema.set('toObject', { virtuals: true });

export default mongoose.models.Request || mongoose.model('Request', requestSchema);