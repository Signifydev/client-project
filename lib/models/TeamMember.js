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

// Index for faster queries
teamMemberSchema.index({ loginId: 1 });
teamMemberSchema.index({ role: 1 });
teamMemberSchema.index({ status: 1 });

// Export as ES6 module (changed from CommonJS)
export default mongoose.models.TeamMember || mongoose.model('TeamMember', teamMemberSchema);