import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';

export async function GET(req) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== 'customer') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const customer = await Customer.findById(decoded.id);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // ✅ FIXED: Correct way to fetch active loans
    const loans = await Loan.find({
      customerId: customer._id,
      status: 'active',
      isRenewed: false,
      $expr: { $lt: ['$emiPaidCount', '$totalEmiCount'] },
    }).sort({ createdAt: -1 });

    // ✅ FIXED: Map loans for MOBILE APP
    const mobileLoans = loans.map((loan) => ({
      loanNumber: loan.loanNumber,
      loanAmount: loan.totalLoanAmount,      // 🔑 mapped
      emiAmount: loan.emiAmount,
      loanDays: loan.loanDays,
      paidEmis: loan.emiPaidCount,            // 🔑 mapped
      status: loan.status,
      progress: loan.progressPercentage,      // 🔑 virtual
      remainingAmount: loan.remainingAmount,
      loanType: loan.loanType,
      nextEmiDate: loan.nextEmiDateDisplay,
    }));

    return NextResponse.json({
      success: true,
      customer,
      loans: mobileLoans,
    });

  } catch (error) {
    console.error('PROFILE API ERROR:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
