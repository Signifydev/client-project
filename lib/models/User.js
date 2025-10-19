import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Common fields for all users
  name: { 
    type: String, 
    required: function() {
      // Name is required only for system users (not for customer users)
      return this.role !== 'customer';
    },
    trim: true
  },
  email: { 
    type: String, 
    required: function() {
      // Email is required only for system users (not for customer users)
      return this.role !== 'customer';
    },
    // REMOVED: unique: true - Free tier can't handle this with null values
    sparse: true,
    trim: true,
    lowercase: true,
    default: null
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['super_admin', 'data_entry', 'customer'], 
    required: true 
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Fields specific to customer users
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: function() {
      // Customer ID is required only for customer users
      return this.role === 'customer';
    }
  },
  loginId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    required: function() {
      // Login ID is required only for customer users
      return this.role === 'customer';
    }
  },
  
  // Common status fields
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdBy: {
    type: String,
    required: function() {
      // CreatedBy is required for customer users and data_entry users created by admin
      return this.role === 'customer' || this.role === 'data_entry';
    }
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt field and handle email for customer users
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure email is properly handled for customer users
  if (this.role === 'customer') {
    // For customer users, either set a unique email or leave it null
    if (!this.email) {
      this.email = null;
    }
  }
  
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for user display name
userSchema.virtual('displayName').get(function() {
  if (this.role === 'customer' && this.loginId) {
    return this.loginId;
  }
  return this.name || this.email || 'Unknown User';
});

// Index for better query performance - REMOVED unique constraint from email
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ loginId: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ customerId: 1 });
userSchema.index({ createdAt: -1 });

// Static method to find by email (for system users)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email, isActive: true });
};

// Static method to find by loginId (for customer users)
userSchema.statics.findByLoginId = function(loginId) {
  return this.findOne({ loginId, isActive: true });
};

// Static method to find system users (non-customer)
userSchema.statics.findSystemUsers = function() {
  return this.find({ 
    role: { $in: ['super_admin', 'data_entry'] },
    isActive: true 
  });
};

// Static method to find customer users
userSchema.statics.findCustomerUsers = function() {
  return this.find({ 
    role: 'customer',
    isActive: true 
  }).populate('customerId');
};

// Static method to find by customer ID
userSchema.statics.findByCustomerId = function(customerId) {
  return this.findOne({ 
    customerId, 
    role: 'customer',
    isActive: true 
  });
};

// Static method to ensure email uniqueness for system users only
userSchema.statics.isEmailUnique = async function(email, excludeUserId = null) {
  const query = { 
    email: email,
    role: { $in: ['super_admin', 'data_entry'] } // Only check for system users
  };
  
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  const existingUser = await this.findOne(query);
  return !existingUser;
};

export default mongoose.models.User || mongoose.model('User', userSchema);