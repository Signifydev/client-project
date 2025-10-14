import mongoose from 'mongoose';

const emiPaymentSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  paymentDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Partial', 'Due'], required: true },
  collectedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.EMIPayment || mongoose.model('EMIPayment', emiPaymentSchema);