import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  businessName: String,
  area: { type: String, required: true },
  loanNumber: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  emiAmount: { type: Number, required: true },
  loanType: { type: String, enum: ['Daily', 'Weekly', 'Monthly'], required: true },
  address: String,
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'pending' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);