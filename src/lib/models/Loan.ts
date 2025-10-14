import mongoose, { Document, Schema } from 'mongoose';

export interface ILoan extends Document {
  customerId: mongoose.Types.ObjectId;
  loanAmount: number;
  interestRate: number;
  tenure: number; // in days
  tenureType: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'overdue';
  dailyEMI: number;
  totalEMI: number;
  emiPaid: number;
  emiPending: number;
  totalPaid: number;
  totalPending: number;
  createdAt: Date;
  updatedAt: Date;
}

const LoanSchema: Schema = new Schema(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    loanAmount: {
      type: Number,
      required: true,
    },
    interestRate: {
      type: Number,
      required: true,
    },
    tenure: {
      type: Number,
      required: true,
    },
    tenureType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'overdue'],
      default: 'active',
    },
    dailyEMI: {
      type: Number,
      required: true,
    },
    totalEMI: {
      type: Number,
      required: true,
    },
    emiPaid: {
      type: Number,
      default: 0,
    },
    emiPending: {
      type: Number,
      required: true,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    totalPending: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Loan || mongoose.model<ILoan>('Loan', LoanSchema);