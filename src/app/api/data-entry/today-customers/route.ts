import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Customer from '@/lib/models/Customer';

interface TodayCustomersQuery {
  date?: string;
  office?: string;
}

interface MatchQuery {
  createdAt: {
    $gte: Date;
    $lte: Date;
  };
  officeCategory?: string;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || undefined;
    const officeParam = searchParams.get('office') || 'all';
    
    // Use today's date if not provided
    const today = dateParam || new Date().toISOString().split('T')[0];
    
    console.log('👥 Fetching today customers for:', {
      date: today,
      office: officeParam
    });
    
    // Create date range for today (start of day to end of day in UTC)
    const startDate = new Date(today + 'T00:00:00.000Z');
    const endDate = new Date(today + 'T23:59:59.999Z');
    
    // Build match query
    const matchQuery: MatchQuery = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // Filter by office if provided and not 'all'
    if (officeParam && officeParam !== 'all') {
      (matchQuery as any).officeCategory = officeParam;
    }
    
    // Count customers added today
    const count = await Customer.countDocuments(matchQuery);
    
    // Get customer details
    const customers = await Customer.find(matchQuery)
      .select('name customerNumber phone businessName area category officeCategory createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Format customer data
    const formattedCustomers = customers.map(customer => ({
      id: customer._id?.toString(),
      name: customer.name,
      customerNumber: customer.customerNumber,
      phone: customer.phone,
      businessName: customer.businessName,
      area: customer.area,
      category: customer.category,
      officeCategory: customer.officeCategory,
      createdAt: customer.createdAt,
      createdAtFormatted: new Date(customer.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    }));
    
    // Get statistics by category
    const categoryStats = await Customer.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get statistics by office
    const officeStats = await Customer.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$officeCategory',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return NextResponse.json({
      success: true,
      date: today,
      count: count,
      customers: formattedCustomers,
      statistics: {
        byCategory: categoryStats,
        byOffice: officeStats
      },
      office: officeParam
    });
    
  } catch (error: unknown) {
    console.error('❌ Error fetching today customers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch today customers';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        date: new Date().toISOString().split('T')[0],
        count: 0,
        customers: [],
        statistics: {
          byCategory: [],
          byOffice: []
        }
      },
      { status: 500 }
    );
  }
}