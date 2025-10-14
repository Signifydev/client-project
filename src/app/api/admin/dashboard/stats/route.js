import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    // Get real data from database
    const totalLoans = await Customer.countDocuments({ status: 'active' });
    
    const totalAmountResult = await Customer.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, total: { $sum: '$loanAmount' } } }
    ]);
    const totalAmount = totalAmountResult[0]?.total || 0;
    
    const pendingEMIs = await EMIPayment.countDocuments({ 
      status: 'Due',
      paymentDate: { $lt: new Date() }
    });
    
    const pendingRequests = await Request.countDocuments({ status: 'Pending' });
    
    const stats = {
      totalLoans,
      totalAmount,
      pendingEMIs,
      pendingRequests
    };
    
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}