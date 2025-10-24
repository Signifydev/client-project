import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
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
  lastPaymentDate: {
    type: Date,
    default: null
  },
  totalPaid: {
    type: Number,
    default: 0
  },
  pendingAmount: {
    type: Number,
    default: 0
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
customerSchema.index({ loanNumber: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ area: 1 });
customerSchema.index({ category: 1 });
customerSchema.index({ officeCategory: 1 });
customerSchema.index({ createdAt: -1 });

// Virtual for full customer info
customerSchema.virtual('fullInfo').get(function() {
  return `${this.name} - ${this.phone} - ${this.businessName} (${this.area})`;
});

// Method to check if customer has documents
customerSchema.methods.hasDocuments = function() {
  return !!(this.profilePicture || this.fiDocuments?.shop || this.fiDocuments?.home);
};

// Static method to find active customers
customerSchema.statics.findActive = function() {
  return this.find({ status: 'active', isActive: true });
};

// Static method to find by phone
customerSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone, isActive: true });
};

// Static method to find by loan number
customerSchema.statics.findByLoanNumber = function(loanNumber) {
  return this.findOne({ loanNumber, isActive: true });
};

// Static method to find by category
customerSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true });
};

// Static method to find by office category
customerSchema.statics.findByOfficeCategory = function(officeCategory) {
  return this.find({ officeCategory, isActive: true });
};

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);