import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import { connectDB } from '@/lib/db';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const createdBy = searchParams.get('createdBy');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;
    const includeOverdue = searchParams.get('includeOverdue') === 'true';
    
    // Build query for pending requests
    let query = { status: 'Pending' }; // Use 'Pending' as per your enum
    
    // Add filters if provided
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Get pending requests with population and sorting
    const requests = await Request.find(query)
      .populate('customerId', 'name phone businessName area loanNumber')
      .sort({ 
        priority: -1, // High priority first
        createdAt: 1  // Oldest first within same priority
      })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalCount = await Request.countDocuments(query);
    
    // Get request statistics
    const stats = await Request.aggregate([
      {
        $match: { status: 'Pending' }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          highPriority: {
            $sum: {
              $cond: [{ $in: ['$priority', ['High', 'Urgent']] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    // Get priority breakdown
    const priorityStats = await Request.aggregate([
      {
        $match: { status: 'Pending' }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Find overdue requests (older than 7 days)
    let overdueRequests = [];
    if (includeOverdue) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      overdueRequests = await Request.find({
        status: 'Pending',
        createdAt: { $lt: sevenDaysAgo }
      })
      .populate('customerId', 'name phone')
      .select('_id type customerName priority createdAt')
      .sort({ createdAt: 1 })
      .limit(10);
    }
    
    // Calculate request ages and add virtual fields
    const requestsWithAge = requests.map(req => {
      const requestObj = req.toObject();
      const now = new Date();
      const created = new Date(requestObj.createdAt);
      const diffTime = Math.abs(now - created);
      const ageInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        ...requestObj,
        ageInDays,
        isOverdue: ageInDays > 7,
        formattedCreatedDate: created.toLocaleDateString('en-IN'),
        formattedCreatedTime: created.toLocaleTimeString('en-IN')
      };
    });
    
    // Get high priority request count
    const highPriorityCount = priorityStats
      .filter(item => item._id === 'High' || item._id === 'Urgent')
      .reduce((total, item) => total + item.count, 0);
    
    const responseData = {
      success: true,
      data: {
        requests: requestsWithAge,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        statistics: {
          totalPending: totalCount,
          byType: stats.reduce((acc, item) => {
            acc[item._id] = {
              total: item.count,
              highPriority: item.highPriority
            };
            return acc;
          }, {}),
          byPriority: priorityStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          highPriorityCount,
          overdueCount: overdueRequests.length
        },
        filters: {
          type: type || 'all',
          priority: priority || 'all',
          createdBy: createdBy || 'all',
          limit,
          page
        },
        overdueRequests: includeOverdue ? overdueRequests : []
      }
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}