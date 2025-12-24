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
 * @param {Date|string} date - Date object or YYYY-MM-DD string
 * @returns {string} Date in DD/MM/YYYY format
 */
function formatToDDMMYYYY(date) {
  if (!date) return '';
  
  try {
    // If it's already a string in YYYY-MM-DD format
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // If it's a Date object
    if (date instanceof Date) {
      let displayDate = new Date(date);
      
      // If date is stored as UTC, convert to IST
      if (date.toISOString().includes('Z')) {
        displayDate = convertUTCToIST(date);
      }
      
      const day = String(displayDate.getDate()).padStart(2, '0');
      const month = String(displayDate.getMonth() + 1).padStart(2, '0');
      const year = displayDate.getFullYear();
      
      return `${day}/${month}/${year}`;
    }
    
    console.error('❌ Invalid date format in formatToDDMMYYYY:', date);
    return '';
  } catch (error) {
    console.error('❌ Error formatting date to DD/MM/YYYY:', error);
    return '';
  }
}

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
      uploadedAt: { 
        type: Date, 
        default: null,
        set: function(date) {
          // Convert IST date to UTC for storage
          if (date && date instanceof Date) {
            return convertISTToUTC(date);
          }
          return date;
        }
      }
    },
    fiDocuments: {
      shop: {
        filename: { type: String, default: null },
        url: { type: String, default: null },
        originalName: { type: String, default: null },
        uploadedAt: { 
          type: Date, 
          default: null,
          set: function(date) {
            // Convert IST date to UTC for storage
            if (date && date instanceof Date) {
              return convertISTToUTC(date);
            }
            return date;
          }
        }
      },
      home: {
        filename: { type: String, default: null },
        url: { type: String, default: null },
        originalName: { type: String, default: null },
        uploadedAt: { 
          type: Date, 
          default: null,
          set: function(date) {
            // Convert IST date to UTC for storage
            if (date && date instanceof Date) {
              return convertISTToUTC(date);
            }
            return date;
          }
        }
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
    // ============================================================================
    // FIXED: Changed from Date to String type for consistency
    // ============================================================================
    loanDate: { 
      type: String, // Changed from Date to String
      default: null,
      required: function() {
        return this.parent().type === 'New Customer' && 
               this.parent().step2Data?.loanSelectionType === 'single';
      }
      // Removed set function - storing as YYYY-MM-DD string
    },
    emiStartDate: { 
      type: String, // Changed from Date to String
      default: null,
      required: function() {
        return this.parent().type === 'New Customer' && 
               this.parent().step2Data?.loanSelectionType === 'single';
      }
      // Removed set function - storing as YYYY-MM-DD string
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
    },
    // NEW: Store input dates as strings for reference
    loanDateInput: {
      type: String,
      default: '',
      required: false
    },
    emiStartDateInput: {
      type: String,
      default: '',
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
    default: () => convertISTToUTC(getCurrentISTDate()) // Store as UTC
  },
  updatedAt: { 
    type: Date, 
    default: () => convertISTToUTC(getCurrentISTDate()) // Store as UTC
  },
  reviewedAt: { 
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
  approvedAt: { 
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
  rejectedAt: { 
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
  completedAt: { 
    type: Date, 
    default: null,
    set: function(date) {
      // Convert IST date to UTC for storage
      if (date && date instanceof Date) {
        return convertISTToUTC(date);
      }
      return date;
    }
  }
});

// CRITICAL FIX: Pre-save middleware with 'next' parameter
requestSchema.pre('save', function(next) {
  this.updatedAt = convertISTToUTC(getCurrentISTDate());
  
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
      } else if (this.step2Data.loanSelectionType === 'single') {
        // ============================================================================
        // FIXED: For single loans, store input dates as strings
        // ============================================================================
        if (this.step2Data.loanDate && !this.step2Data.loanDateInput) {
          this.step2Data.loanDateInput = this.step2Data.loanDate;
        }
        if (this.step2Data.emiStartDate && !this.step2Data.emiStartDateInput) {
          this.step2Data.emiStartDateInput = this.step2Data.emiStartDate;
        }
        
        // Ensure numeric fields have valid values
        this.step2Data.amount = Number(this.step2Data.amount) || 0;
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
  const now = getCurrentISTDate();
  const created = this.createdAt ? convertUTCToIST(new Date(this.createdAt)) : getCurrentISTDate();
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isOverdue (requests older than 7 days)
requestSchema.virtual('isOverdue').get(function() {
  return this.ageInDays > 7 && this.status === 'Pending';
});

// Virtual for formatted created date in DD/MM/YYYY
requestSchema.virtual('formattedCreatedDate').get(function() {
  return formatToDDMMYYYY(this.createdAt);
});

// Virtual for formatted updated date in DD/MM/YYYY
requestSchema.virtual('formattedUpdatedDate').get(function() {
  return formatToDDMMYYYY(this.updatedAt);
});

// Virtual for formatted reviewed date in DD/MM/YYYY
requestSchema.virtual('formattedReviewedDate').get(function() {
  return formatToDDMMYYYY(this.reviewedAt);
});

// Virtual for formatted approved date in DD/MM/YYYY
requestSchema.virtual('formattedApprovedDate').get(function() {
  return formatToDDMMYYYY(this.approvedAt);
});

// ============================================================================
// FIXED: Virtual for loan dates in DD/MM/YYYY format - handles strings
// ============================================================================
requestSchema.virtual('loanDateDisplay').get(function() {
  if (this.step2Data && this.step2Data.loanDate) {
    return formatToDDMMYYYY(this.step2Data.loanDate);
  }
  return '';
});

requestSchema.virtual('emiStartDateDisplay').get(function() {
  if (this.step2Data && this.step2Data.emiStartDate) {
    return formatToDDMMYYYY(this.step2Data.emiStartDate);
  }
  return '';
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
      whatsappNumber: this.step1Data.whatsappNumber,
      businessName: this.step1Data.businessName,
      area: this.step1Data.area,
      customerNumber: this.step1Data.customerNumber,
      address: this.step1Data.address,
      category: this.step1Data.category,
      officeCategory: this.step1Data.officeCategory
    };
  }
  return null;
});

// ============================================================================
// FIXED: Virtual for loan summary with display dates - handles strings
// ============================================================================
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
      loanDate: this.step2Data.loanDate,
      // Display dates (formatted from strings)
      loanDateDisplay: formatToDDMMYYYY(this.step2Data.loanDate),
      emiStartDateDisplay: formatToDDMMYYYY(this.step2Data.emiStartDate),
      // Input dates for reference
      loanDateInput: this.step2Data.loanDateInput || this.step2Data.loanDate,
      emiStartDateInput: this.step2Data.emiStartDateInput || this.step2Data.emiStartDate
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

// Method to approve request (with IST dates)
requestSchema.methods.approve = function(reviewedBy, reviewedByRole, notes = '', actionTaken = '') {
  this.status = 'Approved';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.actionTaken = actionTaken;
  this.reviewedAt = convertISTToUTC(getCurrentISTDate());
  this.approvedAt = convertISTToUTC(getCurrentISTDate());
  this.completedAt = convertISTToUTC(getCurrentISTDate());
};

// Method to reject request (with IST dates)
requestSchema.methods.reject = function(reviewedBy, reviewedByRole, notes = '', rejectionReason = '', actionTaken = '') {
  this.status = 'Rejected';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.rejectionReason = rejectionReason;
  this.actionTaken = actionTaken;
  this.reviewedAt = convertISTToUTC(getCurrentISTDate());
  this.rejectedAt = convertISTToUTC(getCurrentISTDate());
  this.completedAt = convertISTToUTC(getCurrentISTDate());
};

// Method to put request on hold (with IST dates)
requestSchema.methods.putOnHold = function(reviewedBy, reviewedByRole, notes = '') {
  this.status = 'On Hold';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewNotes = notes;
  this.reviewedAt = convertISTToUTC(getCurrentISTDate());
};

// Method to mark as in review (with IST dates)
requestSchema.methods.markInReview = function(reviewedBy, reviewedByRole) {
  this.status = 'In Review';
  this.reviewedBy = reviewedBy;
  this.reviewedByRole = reviewedByRole;
  this.reviewedAt = convertISTToUTC(getCurrentISTDate());
};

// Method to update priority
requestSchema.methods.updatePriority = function(priority, notes = '') {
  this.priority = priority;
  if (notes) this.reviewNotes = notes;
};

// ============================================================================
// FIXED: Validate step data method - handles string dates
// ============================================================================
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
        
        // ============================================================================
        // FIXED: Validate dates - now strings in YYYY-MM-DD format
        // ============================================================================
        if (this.step2Data.emiStartDate && this.step2Data.loanDate) {
          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(this.step2Data.loanDate)) {
            errors.push('Loan date must be in YYYY-MM-DD format');
          }
          if (!dateRegex.test(this.step2Data.emiStartDate)) {
            errors.push('EMI start date must be in YYYY-MM-DD format');
          }
          
          // Compare dates (strings are comparable in YYYY-MM-DD format)
          if (this.step2Data.emiStartDate < this.step2Data.loanDate) {
            errors.push('EMI start date cannot be before loan date');
          }
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

// Method to get request summary with display dates
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
    createdAt: this.formattedCreatedDate,
    updatedAt: this.formattedUpdatedDate
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

// Static method to find overdue requests (using IST dates)
requestSchema.statics.findOverdueRequests = function() {
  const sevenDaysAgoIST = getCurrentISTDate();
  sevenDaysAgoIST.setDate(sevenDaysAgoIST.getDate() - 7);
  const sevenDaysAgoUTC = convertISTToUTC(sevenDaysAgoIST);
  
  return this.find({ 
    status: 'Pending',
    createdAt: { $lt: sevenDaysAgoUTC }
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
  
  // Calculate overdue using IST dates
  const sevenDaysAgoIST = getCurrentISTDate();
  sevenDaysAgoIST.setDate(sevenDaysAgoIST.getDate() - 7);
  const sevenDaysAgoUTC = convertISTToUTC(sevenDaysAgoIST);
  
  const overdue = await this.countDocuments({ 
    status: 'Pending',
    createdAt: { $lt: sevenDaysAgoUTC }
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

// ============================================================================
// FIXED: Transform to include display dates in JSON/object output - handles strings
// ============================================================================
requestSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add display date fields when converting to JSON
    ret.formattedCreatedDate = formatToDDMMYYYY(doc.createdAt);
    ret.formattedUpdatedDate = formatToDDMMYYYY(doc.updatedAt);
    ret.formattedReviewedDate = formatToDDMMYYYY(doc.reviewedAt);
    ret.formattedApprovedDate = formatToDDMMYYYY(doc.approvedAt);
    ret.formattedRejectedDate = formatToDDMMYYYY(doc.rejectedAt);
    
    // Add loan date displays if they exist
    if (doc.step2Data) {
      if (doc.step2Data.loanDate) {
        ret.step2Data.loanDateDisplay = formatToDDMMYYYY(doc.step2Data.loanDate);
      }
      if (doc.step2Data.emiStartDate) {
        ret.step2Data.emiStartDateDisplay = formatToDDMMYYYY(doc.step2Data.emiStartDate);
      }
    }
    
    return ret;
  }
});

requestSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Add display date fields when converting to Object
    ret.formattedCreatedDate = formatToDDMMYYYY(doc.createdAt);
    ret.formattedUpdatedDate = formatToDDMMYYYY(doc.updatedAt);
    ret.formattedReviewedDate = formatToDDMMYYYY(doc.reviewedAt);
    ret.formattedApprovedDate = formatToDDMMYYYY(doc.approvedAt);
    ret.formattedRejectedDate = formatToDDMMYYYY(doc.rejectedAt);
    
    // Add loan date displays if they exist
    if (doc.step2Data) {
      if (doc.step2Data.loanDate) {
        ret.step2Data.loanDateDisplay = formatToDDMMYYYY(doc.step2Data.loanDate);
      }
      if (doc.step2Data.emiStartDate) {
        ret.step2Data.emiStartDateDisplay = formatToDDMMYYYY(doc.step2Data.emiStartDate);
      }
    }
    
    return ret;
  }
});

export default mongoose.models.Request || mongoose.model('Request', requestSchema);