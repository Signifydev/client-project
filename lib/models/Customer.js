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
  // CHANGED: Use customerNumber as primary identifier instead of loanNumber
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
  // New fields for file uploads
  profilePicture: {
    type: String, // Store file path or URL
    default: null
  },
  fiDocuments: {
    shop: {
      type: String, // Store file path or URL for shop FI document
      default: null
    },
    home: {
      type: String, // Store file path or URL for home FI document
      default: null
    }
  },
  // Additional fields for better customer management
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
  // New fields as requested
  category: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'A'
  },
  officeCategory: {
    type: String,
    enum: ['Office 1', 'Office 2'],
    default: 'Office 1'
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'pending'], 
    default: 'pending' 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // REMOVED: Loan-specific fields since loans will be in separate collection
  // loanAmount, emiAmount, loanType, loanDate, loanDays moved to Loan model
  
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

// Update the updatedAt field before saving
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
customerSchema.index({ phone: 1 });
customerSchema.index({ customerNumber: 1 }); // Changed from loanNumber
customerSchema.index({ status: 1 });
customerSchema.index({ area: 1 });
customerSchema.index({ category: 1 });
customerSchema.index({ officeCategory: 1 });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ whatsappNumber: 1 });
customerSchema.index({ loginId: 1 }); // Added index for loginId

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

// Method to check if customer has documents
customerSchema.methods.hasDocuments = function() {
  return !!(this.profilePicture || this.fiDocuments?.shop || this.fiDocuments?.home);
};

// Method to check if customer has WhatsApp number
customerSchema.methods.hasWhatsApp = function() {
  return !!this.whatsappNumber;
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

// Static method to find active customers
customerSchema.statics.findActive = function() {
  return this.find({ status: 'active', isActive: true });
};

// Static method to find by phone (any phone in the array)
customerSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone: { $in: [phone] }, isActive: true });
};

// CHANGED: Find by customer number instead of loan number
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

// Static method to get customer statistics by category
customerSchema.statics.getCategoryStats = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
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
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to find by login ID
customerSchema.statics.findByLoginId = function(loginId) {
  return this.findOne({ loginId, isActive: true });
};

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);