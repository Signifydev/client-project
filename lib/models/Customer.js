import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: [{ 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits'
    }
  }],
  whatsappNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d{10}$/.test(v);
      },
      message: 'WhatsApp number must be 10 digits'
    },
    default: null
  },
  businessName: { 
    type: String, 
    required: true,
    trim: true
  },
  area: { 
    type: String, 
    required: true,
    trim: true
  },
  customerNumber: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  
  // Document storage fields - FIXED: Added proper defaults and null handling
  profilePicture: {
    filename: { type: String, default: null },
    url: { type: String, default: null },
    originalName: { type: String, default: null },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  fiDocuments: {
    shop: {
      filename: { type: String, default: null },
      url: { type: String, default: null },
      originalName: { type: String, default: null },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    home: {
      filename: { type: String, default: null },
      url: { type: String, default: null },
      originalName: { type: String, default: null },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  
  // Additional customer information
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  businessType: {
    type: String,
    trim: true,
    default: null
  },
  
  // Category & Office fields
  category: {
    type: String,
    enum: ['A', 'B', 'C'],
    required: true,
    default: 'A'
  },
  officeCategory: {
    type: String,
    enum: ['Office 1', 'Office 2'],
    required: true,
    default: 'Office 1'
  },
  
  // Loan information (for backward compatibility and quick access)
  loanAmount: {
    type: Number,
    default: 0
  },
  emiAmount: {
    type: Number,
    default: 0
  },
  loanType: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly'],
    default: 'Daily'
  },
  loanDate: {
    type: Date,
    default: Date.now
  },
  loanDays: {
    type: Number,
    default: 0
  },
  
  // New fields for EMI configuration
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
    default: null,
    validate: {
      validator: function(v) {
        // EMI start date should not be before loan date
        if (v && this.loanDate) {
          return v >= this.loanDate;
        }
        return true;
      },
      message: 'EMI start date cannot be before loan date'
    }
  },
  
  // Status fields
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'pending', 'rejected'], 
    default: 'pending' 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Login credentials for customer portal
  loginId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  
  // Metadata
  createdBy: { 
    type: String, 
    required: true 
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

// FIXED: Add pre-save middleware to handle null values for file fields
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure file fields have proper structure even if null
  if (!this.profilePicture || this.profilePicture === null) {
    this.profilePicture = {
      filename: null,
      url: null,
      originalName: null,
      uploadedAt: new Date()
    };
  }
  
  if (!this.fiDocuments || this.fiDocuments === null) {
    this.fiDocuments = {
      shop: {
        filename: null,
        url: null,
        originalName: null,
        uploadedAt: new Date()
      },
      home: {
        filename: null,
        url: null,
        originalName: null,
        uploadedAt: new Date()
      }
    };
  }
  
  // Ensure nested fiDocuments structure
  if (!this.fiDocuments.shop || this.fiDocuments.shop === null) {
    this.fiDocuments.shop = {
      filename: null,
      url: null,
      originalName: null,
      uploadedAt: new Date()
    };
  }
  
  if (!this.fiDocuments.home || this.fiDocuments.home === null) {
    this.fiDocuments.home = {
      filename: null,
      url: null,
      originalName: null,
      uploadedAt: new Date()
    };
  }
  
  // Auto-calculate total loan amount if not provided
  if (this.isModified('emiAmount') || this.isModified('loanDays') || 
      this.isModified('emiType') || this.isModified('customEmiAmount')) {
    this.loanAmount = this.totalLoanAmount;
  }
  
  next();
});

// Index for better query performance
customerSchema.index({ phone: 1 });
customerSchema.index({ customerNumber: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ area: 1 });
customerSchema.index({ category: 1 });
customerSchema.index({ officeCategory: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ whatsappNumber: 1 });
customerSchema.index({ loginId: 1 });
customerSchema.index({ loanType: 1 });
customerSchema.index({ emiType: 1 });
customerSchema.index({ businessName: 'text' });
customerSchema.index({ name: 'text' });

// Virtual for full customer info
customerSchema.virtual('fullInfo').get(function() {
  return `${this.name} - ${this.phone.join(', ')} - ${this.businessName} (${this.area})`;
});

// Virtual for primary phone number
customerSchema.virtual('primaryPhone').get(function() {
  return this.phone.length > 0 ? this.phone[0] : null;
});

// Virtual for formatted phone numbers
customerSchema.virtual('formattedPhones').get(function() {
  return this.phone.join(', ');
});

// Virtual for total loan amount calculation
customerSchema.virtual('totalLoanAmount').get(function() {
  if (this.emiType === 'custom' && this.loanType !== 'Daily') {
    const regularPeriods = this.loanDays - 1;
    const lastPeriod = 1;
    return (this.emiAmount * regularPeriods) + (this.customEmiAmount * lastPeriod);
  } else {
    return this.emiAmount * this.loanDays;
  }
});

// Virtual for remaining EMIs
customerSchema.virtual('remainingEmis').get(function() {
  // This would need to be calculated based on actual payments
  // For now, return total loan days as placeholder
  return this.loanDays;
});

// Virtual for next EMI date
customerSchema.virtual('nextEmiDate').get(function() {
  if (!this.emiStartDate) return null;
  
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
});

// Method to check if customer has documents
customerSchema.methods.hasDocuments = function() {
  return !!(this.profilePicture?.url || this.fiDocuments?.shop?.url || this.fiDocuments?.home?.url);
};

// Method to check if customer has WhatsApp number
customerSchema.methods.hasWhatsApp = function() {
  return !!this.whatsappNumber;
};

// Method to check if custom EMI is applicable
customerSchema.methods.isCustomEMI = function() {
  return this.emiType === 'custom' && this.loanType !== 'Daily';
};

// Method to validate EMI configuration
customerSchema.methods.validateEMIConfig = function() {
  const errors = [];
  
  if (this.emiType === 'custom' && this.loanType !== 'Daily' && !this.customEmiAmount) {
    errors.push('Custom EMI amount is required for custom EMI type with Weekly/Monthly loans');
  }
  
  if (this.emiStartDate && this.loanDate && this.emiStartDate < this.loanDate) {
    errors.push('EMI start date cannot be before loan date');
  }
  
  if (this.loanDays <= 0) {
    errors.push('Loan days must be greater than 0');
  }
  
  return errors;
};

// Method to add a new phone number
customerSchema.methods.addPhone = function(phoneNumber) {
  if (/^\d{10}$/.test(phoneNumber) && !this.phone.includes(phoneNumber)) {
    this.phone.push(phoneNumber);
    return true;
  }
  return false;
};

// Method to remove a phone number
customerSchema.methods.removePhone = function(phoneNumber) {
  const index = this.phone.indexOf(phoneNumber);
  if (index > -1) {
    this.phone.splice(index, 1);
    return true;
  }
  return false;
};

// Method to update document
customerSchema.methods.updateDocument = function(documentType, fileData) {
  if (documentType === 'profilePicture') {
    this.profilePicture = {
      filename: fileData.filename || null,
      url: fileData.url || null,
      originalName: fileData.originalName || null,
      uploadedAt: fileData.uploadedAt || new Date()
    };
  } else if (documentType === 'fiDocumentShop') {
    this.fiDocuments.shop = {
      filename: fileData.filename || null,
      url: fileData.url || null,
      originalName: fileData.originalName || null,
      uploadedAt: fileData.uploadedAt || new Date()
    };
  } else if (documentType === 'fiDocumentHome') {
    this.fiDocuments.home = {
      filename: fileData.filename || null,
      url: fileData.url || null,
      originalName: fileData.originalName || null,
      uploadedAt: fileData.uploadedAt || new Date()
    };
  }
  this.updatedAt = new Date();
};

// Method to get document info
customerSchema.methods.getDocumentInfo = function(documentType) {
  switch(documentType) {
    case 'profilePicture':
      return this.profilePicture;
    case 'fiDocumentShop':
      return this.fiDocuments.shop;
    case 'fiDocumentHome':
      return this.fiDocuments.home;
    default:
      return null;
  }
};

// Static method to find active customers
customerSchema.statics.findActive = function() {
  return this.find({ status: 'active', isActive: true });
};

// Static method to find by phone (any phone in the array)
customerSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone: { $in: [phone] }, isActive: true });
};

// Static method to find by customer number
customerSchema.statics.findByCustomerNumber = function(customerNumber) {
  return this.findOne({ customerNumber, isActive: true });
};

// Static method to find by category
customerSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Static method to find by office category
customerSchema.statics.findByOfficeCategory = function(officeCategory) {
  return this.find({ officeCategory, isActive: true });
};

// Static method to find by WhatsApp number
customerSchema.statics.findByWhatsApp = function(whatsappNumber) {
  return this.findOne({ whatsappNumber, isActive: true });
};

// Static method to find customers with multiple phones
customerSchema.statics.findWithMultiplePhones = function() {
  return this.find({ $expr: { $gt: [{ $size: '$phone' }, 1] }, isActive: true });
};

// Static method to find by login ID
customerSchema.statics.findByLoginId = function(loginId) {
  return this.findOne({ loginId, isActive: true });
};

// Static method to find by EMI type
customerSchema.statics.findByEMIType = function(emiType) {
  return this.find({ emiType, isActive: true });
};

// Static method to find by loan type
customerSchema.statics.findByLoanType = function(loanType) {
  return this.find({ loanType, isActive: true });
};

// Static method to find pending approval customers
customerSchema.statics.findPending = function() {
  return this.find({ status: 'pending' });
};

// Static method to get customer statistics by category
customerSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalLoanAmount: { $sum: '$loanAmount' }
      }
    }
  ]);
};

// Static method to get customer statistics by office category
customerSchema.statics.getOfficeCategoryStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$officeCategory',
        count: { $sum: 1 },
        totalLoanAmount: { $sum: '$loanAmount' }
      }
    }
  ]);
};

// Static method to get customer statistics by loan type
customerSchema.statics.getLoanTypeStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$loanType',
        count: { $sum: 1 },
        totalLoanAmount: { $sum: '$loanAmount' }
      }
    }
  ]);
};

// Static method to get customer statistics by EMI type
customerSchema.statics.getEMITypeStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$emiType',
        count: { $sum: 1 },
        totalLoanAmount: { $sum: '$loanAmount' }
      }
    }
  ]);
};

// Static method to search customers by multiple criteria
customerSchema.statics.searchCustomers = function(searchTerm) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { businessName: { $regex: searchTerm, $options: 'i' } },
          { customerNumber: { $regex: searchTerm, $options: 'i' } },
          { phone: { $in: [new RegExp(searchTerm, 'i')] } },
          { area: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  });
};

// Transform output to include virtuals
customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);