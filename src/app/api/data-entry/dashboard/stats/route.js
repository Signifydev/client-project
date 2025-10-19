import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import Request from '@/lib/models/Request';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's date in local timezone for proper filtering
    const todayStart = new Date(today);
    const todayEnd = new Date(tomorrow);

    // Run all database queries in parallel for better performance
    const [
      todayEMIStats,
      newCustomersToday,
      pendingRequests,
      totalActiveCustomers,
      overdueLoans,
      collectorStats,
      weeklyTrend
    ] = await Promise.all([
      // Today's EMI collections with status filter
      EMIPayment.aggregate([
        {
          $match: {
            paymentDate: { $gte: todayStart, $lt: todayEnd },
            status: { $in: ['Paid', 'Partial'] } // Only count successful payments
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            paymentCount: { $sum: 1 }
          }
        }
      ]),

      // New customers added today (including pending approval)
      Customer.countDocuments({
        createdAt: { $gte: todayStart, $lt: todayEnd }
      }),

      // Pending requests with priority breakdown
      Request.aggregate([
        {
          $match: { status: 'Pending' }
        },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]),

      // Total active customers
      Customer.countDocuments({ 
        status: 'active',
        isActive: true 
      }),

      // Overdue loans count
      Loan.countDocuments({ 
        status: 'active',
        endDate: { $lt: today }
      }),

      // Today's collection by collector
      EMIPayment.aggregate([
        {
          $match: {
            paymentDate: { $gte: todayStart, $lt: todayEnd },
            status: { $in: ['Paid', 'Partial'] }
          }
        },
        {
          $group: {
            _id: '$collectedBy',
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { amount: -1 }
        }
      ]),

      // Weekly collection trend (last 7 days)
      EMIPayment.aggregate([
        {
          $match: {
            paymentDate: { 
              $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
              $lt: todayEnd
            },
            status: { $in: ['Paid', 'Partial'] }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' }
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    // Calculate total pending requests
    const totalPendingRequests = pendingRequests.reduce((total, item) => total + item.count, 0);

    // Calculate high priority requests
    const highPriorityRequests = pendingRequests
      .filter(item => item._id === 'High' || item._id === 'Urgent')
      .reduce((total, item) => total + item.count, 0);

    // Format weekly trend data
    const formattedWeeklyTrend = weeklyTrend.map(day => ({
      date: day._id,
      amount: day.amount,
      count: day.count
    }));

    const stats = {
      // Main dashboard metrics
      emiCollected: todayEMIStats[0]?.paymentCount || 0,
      newCustomers: newCustomersToday,
      pendingRequests: totalPendingRequests,
      totalCollection: todayEMIStats[0]?.totalAmount || 0,
      
      // Additional metrics for enhanced dashboard
      totalActiveCustomers: totalActiveCustomers,
      overdueLoans: overdueLoans,
      highPriorityRequests: highPriorityRequests,
      
      // Detailed breakdowns
      collectionBreakdown: {
        byCollector: collectorStats,
        todayAmount: todayEMIStats[0]?.totalAmount || 0,
        todayCount: todayEMIStats[0]?.paymentCount || 0
      },
      
      // Request priority breakdown
      requestBreakdown: {
        total: totalPendingRequests,
        byPriority: pendingRequests.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        highPriority: highPriorityRequests
      },
      
      // Trend data
      weeklyTrend: formattedWeeklyTrend,
      
      // Timestamp
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    // Return default stats in case of error
    const defaultStats = {
      emiCollected: 0,
      newCustomers: 0,
      pendingRequests: 0,
      totalCollection: 0,
      totalActiveCustomers: 0,
      overdueLoans: 0,
      highPriorityRequests: 0,
      collectionBreakdown: {
        byCollector: [],
        todayAmount: 0,
        todayCount: 0
      },
      requestBreakdown: {
        total: 0,
        byPriority: {},
        highPriority: 0
      },
      weeklyTrend: [],
      lastUpdated: new Date().toISOString(),
      error: 'Failed to fetch some statistics'
    };
    
    return NextResponse.json(defaultStats, { status: 500 });
  }
}