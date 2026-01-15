import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Loan from '@/lib/models/Loan';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    
    // Test with Parvesh's loan
    const loan = await Loan.findOne({ 
      customerNumber: "CN877",
      loanNumber: "L1"
    }).lean();
    
    return NextResponse.json({
      success: true,
      exists: !!loan,
      data: loan ? {
        _id: loan._id,
        loanNumber: loan.loanNumber,
        status: loan.status,
        emiPaidCount: loan.emiPaidCount,
        totalEmiCount: loan.totalEmiCount,
        loanDays: loan.loanDays,
        isRenewed: loan.isRenewed,
        isCompleted: loan.isCompleted,
        // Check all fields
        emiAmount: loan.emiAmount,
        amount: loan.amount,
        emiHistoryCount: loan.emiHistory?.length || 0
      } : null
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}