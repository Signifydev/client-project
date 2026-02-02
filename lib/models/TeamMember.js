import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema({
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
  whatsappNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
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
  role: {
    type: String,
    required: true,
    enum: ['Recovery Team', 'Data Entry Operator']
  },
  permissions: {
    type: String,
    enum: ['only_data_entry', 'data_entry_plus_team'],
    default: 'only_data_entry'
  },
  operatorNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows null/undefined for Recovery Team
  },
  teamMemberNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows null/undefined for Data Entry Operators
  },
  officeCategory: {
    type: String,
    enum: ['Office 1', 'Office 2', '', null],
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  joinDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save validation to ensure role-specific number assignment
teamMemberSchema.pre('save', function(next) {
  if (this.role === 'Data Entry Operator') {
    if (!this.operatorNumber || this.operatorNumber.trim() === '') {
      return next(new Error('Operator Number is required for Data Entry Operators'));
    }
    // Clear teamMemberNumber for Data Entry Operators
    this.teamMemberNumber = undefined;
    
    // Set default permissions for Data Entry Operators
    if (!this.permissions) {
      this.permissions = 'only_data_entry';
    }
  } else if (this.role === 'Recovery Team') {
    if (!this.teamMemberNumber || this.teamMemberNumber.trim() === '') {
      return next(new Error('Team Member Number is required for Recovery Team'));
    }
    // Clear operatorNumber for Recovery Team
    this.operatorNumber = undefined;
  }
  next();
});

// Indexes for faster queries
teamMemberSchema.index({ loginId: 1 });
teamMemberSchema.index({ role: 1 });
teamMemberSchema.index({ status: 1 });
teamMemberSchema.index({ operatorNumber: 1 }, { unique: true, sparse: true });
teamMemberSchema.index({ teamMemberNumber: 1 }, { unique: true, sparse: true });
teamMemberSchema.index({ permissions: 1 });

// Export as ES6 module
export default mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);