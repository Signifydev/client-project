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
    
    // REPLACE pendingEMIs with totalCustomers
    // Count all active customers (since each customer represents one loan in your system)
    const totalCustomers = await Customer.countDocuments({ status: 'active' });
    
    const pendingRequests = await Request.countDocuments({ status: 'Pending' });
    
    const stats = {
      totalLoans,
      totalAmount,
      totalCustomers, // Changed from pendingEMIs to totalCustomers
      pendingRequests
    };
    
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}