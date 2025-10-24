import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;

    console.log('Fetching customer details for ID:', id);

    // Find customer by ID and explicitly select all fields
    const customer = await Customer.findById(id).select('+category +officeCategory');
    if (!customer) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Customer not found' 
        },
        { status: 404 }
      );
    }

    console.log('🔍 Customer data from DB:', {
      name: customer.name,
      category: customer.category,
      officeCategory: customer.officeCategory,
      businessName: customer.businessName,
      area: customer.area,
      address: customer.address
    });

    // Get all loans for this customer with detailed information
    const loans = await Loan.find({ customerId: id })
      .sort({ createdAt: -1 });

    console.log('🔍 Loans found:', loans.length);

    // Get recent EMI payments (last 20 payments)
    const emiPayments = await EMIPayment.find({ customerId: id })
      .populate('loanId', 'loanNumber loanType')
      .sort({ paymentDate: -1 })
      .limit(20);

    // Calculate customer statistics
    const paymentStats = await EMIPayment.aggregate([
      {
        $match: { customerId: id }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          lastPaymentDate: { $max: '$paymentDate' }
        }
      }
    ]);

    // Calculate loan statistics
    const loanStats = await Loan.aggregate([
      {
        $match: { customerId: id, status: 'active' }
      },
      {
        $group: {
          _id: null,
          totalLoanAmount: { $sum: '$amount' },
          totalEMIAmount: { $sum: '$emiAmount' },
          activeLoans: { $sum: 1 }
        }
      }
    ]);

    // Get overdue loans
    const today = new Date();
    const overdueLoans = await Loan.find({
      customerId: id,
      status: 'active',
      endDate: { $lt: today }
    });

    // Get the main loan (original loan created with customer)
    const mainLoan = loans.find(loan => loan.isMainLoan) || loans[0];
    
    // Filter out additional loans (excluding the main loan)
    const additionalLoans = loans.filter(loan => 
      loan._id.toString() !== mainLoan?._id?.toString()
    );

    // Format customer data with additional calculated fields
    const customerWithDetails = {
      // Basic customer information - ensure all fields are included
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      businessName: customer.businessName,
      area: customer.area,
      loanNumber: customer.loanNumber,
      loanAmount: customer.loanAmount,
      emiAmount: customer.emiAmount,
      loanType: customer.loanType,
      address: customer.address,
      status: customer.status,
      email: customer.email,
      businessType: customer.businessType,
      category: customer.category || 'A', // Ensure category is included with fallback
      officeCategory: customer.officeCategory || 'Office 1', // Ensure officeCategory is included with fallback
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      profilePicture: customer.profilePicture,
      fiDocuments: customer.fiDocuments,
      
      // Document URLs (if files are uploaded)
      documents: {
        profilePicture: customer.profilePicture ? 
          `${process.env.NEXTAUTH_URL || ''}${customer.profilePicture}` : null,
        fiDocuments: {
          shop: customer.fiDocuments?.shop ? 
            `${process.env.NEXTAUTH_URL || ''}${customer.fiDocuments.shop}` : null,
          home: customer.fiDocuments?.home ? 
            `${process.env.NEXTAUTH_URL || ''}${customer.fiDocuments.home}` : null
        }
      },

      // Main loan information (single loan)
      mainLoan: mainLoan ? {
        _id: mainLoan._id,
        loanNumber: mainLoan.loanNumber,
        amount: mainLoan.amount,
        emiAmount: mainLoan.emiAmount,
        loanType: mainLoan.loanType,
        dateApplied: mainLoan.dateApplied,
        loanDays: mainLoan.loanDays,
        status: mainLoan.status,
        isMainLoan: true
      } : null,

      // Additional loans information (only additional loans, not including main loan)
      loans: additionalLoans.map(loan => ({
        _id: loan._id,
        loanNumber: loan.loanNumber,
        amount: loan.amount,
        emiAmount: loan.emiAmount,
        loanType: loan.loanType,
        dateApplied: loan.dateApplied,
        loanDays: loan.loanDays,
        status: loan.status,
        isMainLoan: loan.isMainLoan || false,
        isOverdue: loan.endDate < today && loan.status === 'active',
        progressPercentage: loan.totalEMI > 0 ? 
          Math.round((loan.emiPaid / loan.totalEMI) * 100) : 0,
        daysRemaining: Math.max(0, Math.ceil((loan.endDate - today) / (1000 * 60 * 60 * 24)))
      })),

      // Payment history
      paymentHistory: emiPayments.map(payment => ({
        ...payment.toObject(),
        formattedPaymentDate: payment.paymentDate.toLocaleDateString('en-IN'),
        formattedAmount: `₹${payment.amount.toLocaleString('en-IN')}`
      })),

      // Statistics
      statistics: {
        totalPaid: paymentStats[0]?.totalPaid || 0,
        totalPayments: paymentStats[0]?.paymentCount || 0,
        lastPaymentDate: paymentStats[0]?.lastPaymentDate || null,
        totalLoanAmount: loanStats[0]?.totalLoanAmount || 0,
        totalEMIAmount: loanStats[0]?.totalEMIAmount || 0,
        activeLoans: loanStats[0]?.activeLoans || 0,
        overdueLoans: overdueLoans.length
      },

      // Summary information for quick view
      summary: {
        totalOutstanding: (loanStats[0]?.totalLoanAmount || 0) - (paymentStats[0]?.totalPaid || 0),
        nextDueDate: calculateNextDueDate(loans, paymentStats[0]?.lastPaymentDate),
        customerSince: customer.createdAt.toLocaleDateString('en-IN'),
        status: customer.status
      }
    };

    console.log('✅ Customer details fetched successfully for:', customer.name);
    console.log('📊 Final customer data structure:', {
      category: customerWithDetails.category,
      officeCategory: customerWithDetails.officeCategory,
      mainLoan: customerWithDetails.mainLoan ? 'Present' : 'Absent',
      additionalLoans: customerWithDetails.loans.length
    });

    return NextResponse.json({
      success: true,
      data: customerWithDetails
    });

  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customer details: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate next due date
function calculateNextDueDate(loans, lastPaymentDate) {
  if (!loans || loans.length === 0) return null;

  const activeLoans = loans.filter(loan => loan.status === 'active');
  if (activeLoans.length === 0) return null;

  // For simplicity, use the main loan (first loan) for due date calculation
  const mainLoan = activeLoans[0];
  const lastPayment = lastPaymentDate || mainLoan.dateApplied;
  
  let nextDue = new Date(lastPayment);
  
  switch (mainLoan.loanType) {
    case 'Daily':
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case 'Weekly':
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case 'Monthly':
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
  }
  
  return nextDue;
}

// Optional: PUT method to update customer basic info (for admin/edit requests)
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    const updateData = await request.json();

    console.log('Updating customer:', id, 'with data:', updateData);

    // Find and update customer
    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Customer not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update customer: ' + error.message 
      },
      { status: 500 }
    );
  }
}