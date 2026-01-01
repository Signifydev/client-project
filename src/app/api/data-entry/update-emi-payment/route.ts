import { NextRequest, NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import Request from '@/lib/models/Request';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';
import mongoose, { ClientSession } from 'mongoose';

// Define types for payment objects
interface EMIPaymentDoc {
  _id: mongoose.Types.ObjectId;
  amount: number;
  status: string;
  paymentDate: Date | string;
  notes?: string;
  editedAt?: Date;
  editedBy?: string;
  collectedBy?: string;
}

interface LoanDocument extends mongoose.Document {
  emiHistory: EMIPaymentDoc[];
  loanNumber: string;
  amount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  emiPaidCount: number;
  lastEmiDate?: Date | string;
  customerId: mongoose.Types.ObjectId | string;
  status: string;
  markModified: (path: string) => void;
  save: (options?: { session?: ClientSession }) => Promise<this>;
}

interface CustomerDocument extends mongoose.Document {
  totalPaidAmount: number;
  remainingAmount: number;
  lastPaymentDate?: Date | string;
  name: string;
  markModified: (path: string) => void;
  save: (options?: { session?: ClientSession }) => Promise<this>;
}

interface RequestLog {
  requestType: string;
  customerId: mongoose.Types.ObjectId | string;
  customerName: string;
  loanNumber: string;
  paymentId: mongoose.Types.ObjectId | string;
  details: {
    action: string;
    oldAmount: number;
    newAmount: number;
    amountDifference: number;
    oldStatus: string;
    newStatus: string;
    notes?: string;
  };
  status: string;
  requestedBy: string;
  requestedAt: Date;
}

// Helper function to format date to YYYY-MM-DD
function formatToYYYYMMDD(dateInput: Date | string): string {
  if (!dateInput) return '';
  
  try {
    // If already a Date object
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's a string
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error converting to YYYY-MM-DD:', error);
    return '';
  }
}

// Helper function to validate YYYY-MM-DD format
function isValidYYYYMMDD(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const body = await request.json();
    const {
      paymentId,
      amount,
      status,
      customerId,
      customerName,
      loanNumber,
      previousAmount,
      collectedBy,
      notes
    } = body;

    console.log('🔧 Editing EMI payment request received WITH SYNC:', {
      paymentId,
      newAmount: amount,
      previousAmount,
      status,
      customerName,
      loanNumber,
      customerId
    });

    // Validate required fields
    if (!paymentId || !amount || !customerId || !loanNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: paymentId, amount, customerId, and loanNumber are required' },
        { status: 400 }
      );
    }

    // Validate amount
    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Convert string IDs to ObjectId
    const paymentObjectId = new mongoose.Types.ObjectId(paymentId);
    const customerObjectId = new mongoose.Types.ObjectId(customerId);

    // Start MongoDB transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the loan containing this payment
      const loan = await Loan.findOne({
        'emiHistory._id': paymentObjectId,
        loanNumber: loanNumber
      }).session(session) as LoanDocument | null;

      if (!loan) {
        await session.abortTransaction();
        console.error('❌ Loan not found with paymentId:', paymentId, 'loanNumber:', loanNumber);
        return NextResponse.json(
          { success: false, error: 'Loan or payment not found' },
          { status: 404 }
        );
      }

      console.log('✅ Found loan:', {
        loanId: loan._id,
        loanNumber: loan.loanNumber,
        customerId: loan.customerId,
        emiHistoryCount: loan.emiHistory?.length || 0
      });

      // Find the specific payment in emiHistory
      const paymentIndex = loan.emiHistory.findIndex(
        (p: EMIPaymentDoc) => p._id.toString() === paymentId
      );

      if (paymentIndex === -1) {
        await session.abortTransaction();
        console.error('❌ Payment not found in loan emiHistory:', paymentId);
        return NextResponse.json(
          { success: false, error: 'Payment not found in loan history' },
          { status: 404 }
        );
      }

      const oldPayment = loan.emiHistory[paymentIndex];
      const amountDifference = newAmount - oldPayment.amount;

      console.log('📝 Payment details:', {
        oldAmount: oldPayment.amount,
        newAmount: newAmount,
        difference: amountDifference,
        oldStatus: oldPayment.status,
        newStatus: status,
        paymentDate: oldPayment.paymentDate
      });

      // Update the payment details in loan emiHistory
      loan.emiHistory[paymentIndex].amount = newAmount;
      loan.emiHistory[paymentIndex].status = status;
      loan.emiHistory[paymentIndex].editedAt = new Date();
      loan.emiHistory[paymentIndex].editedBy = collectedBy || 'data_entry_operator';
      
      // Append notes if provided
      if (notes) {
        const existingNotes = oldPayment.notes || '';
        loan.emiHistory[paymentIndex].notes = existingNotes 
          ? `${existingNotes} | ${notes}` 
          : notes;
      }

      // Recalculate loan totals based on updated payment
      let totalPaidAmount = 0;
      let paidCount = 0;
      let partialCount = 0;

      loan.emiHistory.forEach((payment: EMIPaymentDoc) => {
        totalPaidAmount += payment.amount;
        
        if (payment.status === 'Paid' || payment.status === 'Advance') {
          paidCount++;
        } else if (payment.status === 'Partial') {
          partialCount++;
        }
      });

      // Update loan fields
      loan.totalPaidAmount = totalPaidAmount;
      loan.remainingAmount = Math.max(0, loan.amount - totalPaidAmount);
      loan.emiPaidCount = paidCount + (partialCount * 0.5); // Partial payments count as 0.5
      
      // Update lastEmiDate to the latest payment date
      if (loan.emiHistory.length > 0) {
        const sortedPayments = [...loan.emiHistory].sort(
          (a: EMIPaymentDoc, b: EMIPaymentDoc) => {
            const dateA = new Date(a.paymentDate);
            const dateB = new Date(b.paymentDate);
            return dateB.getTime() - dateA.getTime();
          }
        );
        loan.lastEmiDate = sortedPayments[0].paymentDate;
      }

      // Mark as modified to ensure mongoose saves the changes
      loan.markModified('emiHistory');
      loan.markModified('totalPaidAmount');
      loan.markModified('remainingAmount');
      loan.markModified('emiPaidCount');

      // Save the updated loan
      await loan.save({ session });

      console.log('✅ Loan updated successfully:', {
        loanNumber: loan.loanNumber,
        totalPaidAmount: loan.totalPaidAmount,
        remainingAmount: loan.remainingAmount,
        emiPaidCount: loan.emiPaidCount
      });

      // ✅ NEW: Sync with EMIPayment collection
      try {
        // Check if payment exists in EMIPayment collection
        const emiPayment = await EMIPayment.findOne({
          _id: paymentObjectId
        }).session(session);
        
        if (emiPayment) {
          // Update EMIPayment record to match
          emiPayment.amount = newAmount;
          emiPayment.status = status;
          emiPayment.updatedAt = new Date();
          emiPayment.notes = emiPayment.notes 
            ? `${emiPayment.notes} | Synced from loan edit: ${notes || ''}`
            : notes || 'Synced from loan edit';
          
          await emiPayment.save({ session });
          console.log('✅ Synced EMIPayment collection with loan edit');
          
          // If payment has chain, update chain totals using the static method
          if (emiPayment.partialChainId) {
            // Use the static method from EMIPayment model
            const EMIPaymentModel = mongoose.model('EMIPayment');
            const modelWithStaticMethods = EMIPaymentModel as typeof EMIPaymentModel & {
              updateChainTotals?: (chainId: string) => Promise<any>;
            };
            
            if (modelWithStaticMethods.updateChainTotals) {
              await modelWithStaticMethods.updateChainTotals(emiPayment.partialChainId);
              console.log('✅ Updated chain totals after sync');
            } else {
              console.log('⚠️ updateChainTotals method not available on EMIPayment model');
            }
          }
        } else {
          console.log('⚠️ Payment not found in EMIPayment collection, creating new entry');
          
          // Create new EMIPayment entry
          const newEMIPayment = new EMIPayment({
            _id: paymentObjectId,
            customerId: customerObjectId,
            customerName: customerName,
            loanId: loan._id,
            loanNumber: loanNumber,
            paymentDate: formatToYYYYMMDD(oldPayment.paymentDate),
            amount: newAmount,
            status: status,
            collectedBy: collectedBy || 'data_entry_operator',
            notes: notes || `Created from loan edit sync`,
            createdAt: oldPayment.editedAt || new Date(),
            updatedAt: new Date()
          });
          
          await newEMIPayment.save({ session });
          console.log('✅ Created new EMIPayment entry for sync');
        }
      } catch (syncError: any) {
        console.error('⚠️ Error syncing EMIPayment collection:', syncError);
        // Don't fail transaction if sync fails
      }

      // Update customer's total paid amount from all active loans
      const customer = await Customer.findById(customerObjectId).session(session) as CustomerDocument | null;
      if (customer) {
        console.log('📊 Updating customer totals for:', customer.name);
        
        // Find all active loans for this customer
        const allLoans = await Loan.find({
          customerId: customerObjectId,
          status: 'active'
        }).session(session) as LoanDocument[];

        // Calculate total paid amount from all loans
        const customerTotalPaid = allLoans.reduce(
          (sum: number, loan: LoanDocument) => sum + (loan.totalPaidAmount || 0),
          0
        );

        // Update customer fields
        customer.totalPaidAmount = customerTotalPaid;
        
        // Recalculate customer's remaining amount
        const totalLoanAmount = allLoans.reduce(
          (sum: number, loan: LoanDocument) => sum + (loan.amount || 0),
          0
        );
        customer.remainingAmount = Math.max(0, totalLoanAmount - customerTotalPaid);
        
        // Update last payment date
        if (allLoans.length > 0) {
          const allPayments: EMIPaymentDoc[] = allLoans.flatMap(loan => loan.emiHistory || []);
          if (allPayments.length > 0) {
            const sortedAllPayments = allPayments.sort(
              (a: EMIPaymentDoc, b: EMIPaymentDoc) => {
                const dateA = new Date(a.paymentDate);
                const dateB = new Date(b.paymentDate);
                return dateB.getTime() - dateA.getTime();
              }
            );
            customer.lastPaymentDate = sortedAllPayments[0].paymentDate;
          }
        }

        customer.markModified('totalPaidAmount');
        customer.markModified('remainingAmount');
        await customer.save({ session });

        console.log('✅ Customer updated successfully:', {
          customerName: customer.name,
          totalPaidAmount: customer.totalPaidAmount,
          remainingAmount: customer.remainingAmount
        });
      }

      // Create a request log entry for audit trail
      try {
        const requestLog = new Request({
          requestType: 'edit_emi_payment',
          customerId: customerObjectId,
          customerName: customerName,
          loanNumber: loanNumber,
          paymentId: paymentObjectId,
          details: {
            action: 'edit_emi_payment',
            oldAmount: oldPayment.amount,
            newAmount: newAmount,
            amountDifference: amountDifference,
            oldStatus: oldPayment.status,
            newStatus: status,
            notes: notes || `Edited EMI payment from ₹${oldPayment.amount} to ₹${newAmount}`
          },
          status: 'completed',
          requestedBy: collectedBy || 'data_entry_operator',
          requestedAt: new Date()
        } as RequestLog);

        await requestLog.save({ session });
        console.log('📝 Request log created for audit trail');
      } catch (logError: any) {
        console.warn('⚠️ Could not create request log:', logError.message);
        // Don't fail transaction if logging fails
      }

      // Commit the transaction
      await session.commitTransaction();
      console.log('✅ Transaction committed successfully with sync');

      return NextResponse.json({
        success: true,
        message: 'EMI payment updated and synchronized successfully',
        data: {
          paymentId,
          newAmount: newAmount,
          previousAmount: oldPayment.amount,
          difference: amountDifference,
          loanNumber: loan.loanNumber,
          customerName: customerName,
          updatedAt: new Date(),
          synced: true
        }
      });

    } catch (transactionError: any) {
      // Abort transaction on error
      await session.abortTransaction();
      console.error('❌ Transaction aborted due to error:', transactionError);
      
      // Check for specific errors
      if (transactionError.name === 'ValidationError') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Validation error: ' + transactionError.message,
            details: transactionError.errors
          },
          { status: 400 }
        );
      }
      
      if (transactionError.name === 'CastError') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid data format: ' + transactionError.message
          },
          { status: 400 }
        );
      }
      
      throw transactionError; // Re-throw for general error handler
    } finally {
      // End session
      session.endSession();
    }

  } catch (error: any) {
    console.error('❌ Error editing EMI payment:', error);
    
    // Return appropriate error response
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to edit EMI payment',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}