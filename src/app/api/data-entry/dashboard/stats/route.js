import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Today's EMI collections
    const todayEMICount = await EMIPayment.countDocuments({
      paymentDate: { $gte: today, $lt: tomorrow }
    });
    
    const todayCollection = await EMIPayment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // New customers added today
    const newCustomersToday = await Customer.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    // Pending requests
    const pendingRequests = await Request.countDocuments({ status: 'Pending' });
    
    const stats = {
      emiCollected: todayEMICount,
      newCustomers: newCustomersToday,
      pendingRequests: pendingRequests,
      totalCollection: todayCollection[0]?.total || 0
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}