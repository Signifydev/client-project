import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  type: { type: String, enum: ['New Customer', 'EMI Update', 'Loan Update'], required: true },
  customerName: String,
  data: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Request || mongoose.model('Request', requestSchema);