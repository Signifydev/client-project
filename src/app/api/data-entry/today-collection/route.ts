import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import EMIPayment from '@/lib/models/EMIPayment';
import Customer from '@/lib/models/Customer';

interface TodayCollectionQuery {
  date?: string;
  office?: string;
}

interface MatchQuery {
  paymentDate: string;
  status: { $in: string[] };
  customerId?: { $in: any[] };
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
    
    console.log('📊 Fetching today collection for:', {
      date: today,
      office: officeParam
    });
    
    // First, get all customer IDs for the office (if filtering by office)
    let customerIds: any[] = [];
    if (officeParam && officeParam !== 'all') {
      const customers = await Customer.find({ officeCategory: officeParam }).select('_id');
      customerIds = customers.map(c => c._id);
    }
    
    // Build match query
    const matchQuery: MatchQuery = {
      paymentDate: today,
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    };
    
    // Add customer filter if office filtering
    if (customerIds.length > 0) {
      matchQuery.customerId = { $in: customerIds };
    }
    
    // Aggregate to get total collection
    const result = await EMIPayment.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          paymentCount: { $sum: 1 },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Paid'] }, '$amount', 0]
            }
          },
          partialAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Partial'] }, '$amount', 0]
            }
          },
          advanceAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Advance'] }, '$amount', 0]
            }
          }
        }
      }
    ]);
    
    // Get payment details for breakdown
    const paymentDetails = await EMIPayment.find(matchQuery)
      .populate('customerId', 'name officeCategory')
      .select('customerName amount status paymentMethod collectedBy paymentDate')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    const stats = result[0] || {
      totalAmount: 0,
      paymentCount: 0,
      paidAmount: 0,
      partialAmount: 0,
      advanceAmount: 0
    };
    
    // Format response
    const formattedPayments = paymentDetails.map(payment => ({
      id: payment._id?.toString(),
      customerName: payment.customerName,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      collectedBy: payment.collectedBy,
      paymentDate: payment.paymentDate,
      customerOffice: (payment.customerId as any)?.officeCategory || 'Unknown'
    }));
    
    return NextResponse.json({
      success: true,
      date: today,
      total: stats.totalAmount,
      paymentCount: stats.paymentCount,
      breakdown: {
        paid: stats.paidAmount,
        partial: stats.partialAmount,
        advance: stats.advanceAmount
      },
      recentPayments: formattedPayments,
      office: officeParam
    });
    
  } catch (error: unknown) {
    console.error('❌ Error fetching today collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch today collection';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        date: new Date().toISOString().split('T')[0],
        total: 0,
        paymentCount: 0,
        breakdown: { paid: 0, partial: 0, advance: 0 },
        recentPayments: []
      },
      { status: 500 }
    );
  }
}