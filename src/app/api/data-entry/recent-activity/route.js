import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import Request from '@/lib/models/Request';

export async function GET(request) {
  try {
    await connectDB();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const officeParam = searchParams.get('office') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');
    const days = parseInt(searchParams.get('days') || '7');
    
    console.log('📈 Fetching recent activity for:', {
      office: officeParam,
      limit: limit,
      days: days
    });
    
    // Calculate date range (last X days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Build base query for office filtering
    const officeQuery = {};
    if (officeParam && officeParam !== 'all') {
      officeQuery.officeCategory = officeParam;
    }
    
    // 1. Get recent customer additions
    const customerMatch = { ...officeQuery, createdAt: { $gte: startDate } };
    const recentCustomers = await Customer.find(customerMatch)
      .select('name customerNumber phone businessName area officeCategory createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // 2. Get recent EMI payments with customer office filtering
    let paymentMatch = { createdAt: { $gte: startDate } };
    
    if (officeParam && officeParam !== 'all') {
      // Get customer IDs for this office
      const officeCustomers = await Customer.find({ officeCategory: officeParam }).select('_id');
      const customerIds = officeCustomers.map(c => c._id);
      
      paymentMatch.customerId = { $in: customerIds };
    }
    
    const recentPayments = await EMIPayment.find(paymentMatch)
      .populate({
        path: 'customerId',
        select: 'name officeCategory customerNumber',
        model: Customer
      })
      .select('customerName amount status paymentDate collectedBy createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // 3. Get recent requests/approvals
    const requestMatch = { 
      status: { $in: ['Approved', 'Rejected'] },
      updatedAt: { $gte: startDate }
    };
    
    if (officeParam && officeParam !== 'all') {
      // For New Customer requests, check step1Data.officeCategory
      requestMatch.$or = [
        { 'step1Data.officeCategory': officeParam },
        { createdBy: { $regex: officeParam, $options: 'i' } }
      ];
    }
    
    const recentRequests = await Request.find(requestMatch)
      .select('type customerName status createdAt updatedAt createdBy')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    
    // Combine and format activities
    const activities = [];
    
    // Add customer activities
    recentCustomers.forEach(customer => {
      activities.push({
        type: 'customer_added',
        description: `New customer registered: ${customer.name}`,
        time: formatTimeAgo(customer.createdAt),
        customerName: customer.name,
        customerNumber: customer.customerNumber,
        office: customer.officeCategory,
        data: {
          businessName: customer.businessName,
          area: customer.area
        },
        timestamp: customer.createdAt
      });
    });
    
    // Add payment activities
    recentPayments.forEach(payment => {
      if (!payment.customerId) return; // Skip if no customer
      
      const statusText = payment.status === 'Advance' ? 'advance payment' : 'EMI payment';
      activities.push({
        type: 'emi_paid',
        description: `${statusText} of ₹${payment.amount} collected`,
        time: formatTimeAgo(payment.createdAt),
        customerName: payment.customerName || payment.customerId.name,
        customerNumber: payment.customerId.customerNumber,
        office: payment.customerId.officeCategory || 'Unknown',
        data: {
          amount: payment.amount,
          status: payment.status,
          collectedBy: payment.collectedBy,
          paymentDate: payment.paymentDate
        },
        timestamp: payment.createdAt
      });
    });
    
    // Add request activities
    recentRequests.forEach(req => {
      const action = req.status === 'Approved' ? 'approved' : 'rejected';
      activities.push({
        type: 'request_processed',
        description: `${req.type} request ${action} for ${req.customerName}`,
        time: formatTimeAgo(req.updatedAt),
        customerName: req.customerName,
        data: {
          type: req.type,
          status: req.status,
          processedBy: req.createdBy
        },
        timestamp: req.updatedAt
      });
    });
    
    // Sort all activities by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Take only the requested limit
    const limitedActivities = activities.slice(0, limit);
    
    // Get activity statistics
    const activityStats = {
      totalActivities: activities.length,
      customerAdditions: recentCustomers.length,
      emiPayments: recentPayments.length,
      requestsProcessed: recentRequests.length,
      byType: activities.reduce((acc, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1;
        return acc;
      }, {})
    };
    
    return NextResponse.json({
      success: true,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: days
      },
      activities: limitedActivities,
      statistics: activityStats,
      office: officeParam
    });
    
  } catch (error) {
    console.error('❌ Error fetching recent activity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent activity';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        activities: [],
        statistics: {
          totalActivities: 0,
          customerAdditions: 0,
          emiPayments: 0,
          requestsProcessed: 0,
          byType: {}
        }
      },
      { status: 500 }
    );
  }
}

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return past.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}