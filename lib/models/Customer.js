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
  
  // Document storage fields - SIMPLIFIED STRUCTURE
  profilePicture: {
    type: {
      filename: { type: String, default: null },
      url: { type: String, default: null },
      originalName: { type: String, default: null },
      uploadedAt: { type: Date, default: Date.now }
    },
    default: () => ({
      filename: null,
      url: null,
      originalName: null,
      uploadedAt: new Date()
    })
  },
  fiDocuments: {
    type: {
      shop: {
        type: {
          filename: { type: String, default: null },
          url: { type: String, default: null },
          originalName: { type: String, default: null },
          uploadedAt: { type: Date, default: Date.now }
        },
        default: () => ({
          filename: null,
          url: null,
          originalName: null,
          uploadedAt: new Date()
        })
      },
      home: {
        type: {
          filename: { type: String, default: null },
          url: { type: String, default: null },
          originalName: { type: String, default: null },
          uploadedAt: { type: Date, default: Date.now }
        },
        default: () => ({
          filename: null,
          url: null,
          originalName: null,
          uploadedAt: new Date()
        })
      }
    },
    default: () => ({
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
    })
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
  approvedBy: {
    type: String,
    default: null
  },
  approvedAt: {
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

// NO PRE-SAVE MIDDLEWARE - COMPLETELY REMOVED

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

// Method to check if customer has documents
customerSchema.methods.hasDocuments = function() {
  return !!(this.profilePicture?.url || this.fiDocuments?.shop?.url || this.fiDocuments?.home?.url);
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

// Transform output to include virtuals
customerSchema.set('toJSON', { virtuals: true });
customerSchema.set('toObject', { virtuals: true });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);