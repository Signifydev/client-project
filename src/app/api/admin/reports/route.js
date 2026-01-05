import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import EMIPayment from '@/lib/models/EMIPayment';
import Request from '@/lib/models/Request';

// Helper function to format date for string comparison (YYYY-MM-DD)
function formatDateForQuery(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to calculate date range
function getDateRange(range, customStart, customEnd) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now);

  switch (range) {
    case 'daily':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'quarterly':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'yearly':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Default to monthly if custom dates not provided
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    default: // monthly default
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'monthly';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // Calculate date range
    const { startDate, endDate } = getDateRange(range, customStart, customEnd);
    
    // Format dates for string comparisons
    const startDateStr = formatDateForQuery(startDate);
    const endDateStr = formatDateForQuery(endDate);
    const todayStr = formatDateForQuery(new Date());
    
    console.log('📊 Reports API Query:', {
      range,
      customStart,
      customEnd,
      startDate: startDateStr,
      endDate: endDateStr,
      startDateFull: startDate.toISOString(),
      endDateFull: endDate.toISOString()
    });

    // ============ 1. NEW LOANS (Approved requests in date range) ============
    console.log('🔍 Querying new loans...');
    const newLoans = await Request.countDocuments({
      status: 'Approved',
      type: { $in: ['New Customer', 'New Loan'] },
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    console.log('✅ New loans found:', newLoans);

    // ============ 2. NEW CUSTOMERS (Created in date range) ============
    console.log('🔍 Querying new customers...');
    const newCustomers = await Customer.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    console.log('✅ New customers found:', newCustomers);

    // ============ 3. TOTAL COLLECTION (EMI payments in date range) ============
    console.log('🔍 Querying total collection...');
    // Since paymentDate is stored as string (YYYY-MM-DD), we need string comparison
    const totalCollectionResult = await EMIPayment.aggregate([
      {
        $match: {
          paymentDate: { 
            $gte: startDateStr, 
            $lte: endDateStr 
          },
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalCollection = totalCollectionResult[0]?.total || 0;
    console.log('✅ Total collection:', totalCollection);

    // ============ 4. PENDING EMIS ============
    console.log('🔍 Querying pending EMIs...');
    // Get active loans where nextEmiDate is today or earlier (string comparison)
    const pendingEMIsQuery = await Loan.find({
      status: 'active',
      nextEmiDate: { $lte: todayStr }
    }).select('_id loanNumber nextEmiDate emiPaidCount totalEmiCount');
    
    // Filter out completed loans (where emiPaidCount >= totalEmiCount)
    const pendingEMIs = pendingEMIsQuery.filter(loan => 
      loan.emiPaidCount < loan.totalEmiCount
    ).length;
    
    console.log('✅ Pending EMIs found:', pendingEMIs);

    // ============ 5. LOAN DISTRIBUTION BY TYPE ============
    console.log('🔍 Querying loan distribution...');
    const loanDistributionResult = await Loan.aggregate([
      {
        $match: {
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$loanType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalLoans = await Loan.countDocuments({ status: 'active' });
    const loanDistribution = {};
    
    loanDistributionResult.forEach(item => {
      if (item._id) {
        const percentage = totalLoans > 0 ? Math.round((item.count / totalLoans) * 100) : 0;
        loanDistribution[item._id] = percentage;
      }
    });
    
    console.log('✅ Loan distribution:', loanDistribution);

    // ============ 6. MONTHLY GROWTH DATA (Last 6 months) ============
    console.log('🔍 Querying growth data...');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = formatDateForQuery(sixMonthsAgo);
    
    // Get loan counts for each of the last 6 months
    const monthlyData = await Loan.aggregate([
      {
        $match: {
          status: 'active',
          dateApplied: { $gte: sixMonthsAgoStr }
        }
      },
      {
        $group: {
          _id: {
            yearMonth: { $substr: ['$dateApplied', 0, 7] } // YYYY-MM
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.yearMonth': 1 }
      },
      {
        $limit: 6
      }
    ]);

    // Format chart data - ensure we have 6 data points
    let chartData = [];
    
    if (monthlyData.length > 0) {
      // Use actual data
      chartData = monthlyData.map(item => item.count);
      console.log('📈 Actual chart data:', chartData);
    } else {
      // Generate sample data for demo (REMOVE THIS IN PRODUCTION)
      chartData = [5, 10, 15, 20, 25, 30];
      console.log('⚠️ Using sample chart data');
    }

    // ============ 7. ADDITIONAL METRICS ============
    
    // Total active loans
    const totalActiveLoans = await Loan.countDocuments({ status: 'active' });
    
    // Total loan amount (active loans)
    const totalLoanAmountResult = await Loan.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalLoanAmount = totalLoanAmountResult[0]?.total || 0;
    
    // Today's collection
    const todaysCollectionResult = await EMIPayment.aggregate([
      {
        $match: {
          paymentDate: todayStr,
          status: { $in: ['Paid', 'Partial', 'Advance'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const todaysCollection = todaysCollectionResult[0]?.total || 0;

    // Calculate growth rate
    let growthRate = 0;
    if (chartData.length > 1) {
      const firstValue = chartData[0] || 1;
      const lastValue = chartData[chartData.length - 1] || 1;
      growthRate = Math.round(((lastValue - firstValue) / firstValue) * 100);
    }

    // ============ 8. PREPARE FINAL REPORT DATA ============
    const reportData = {
      // Core metrics
      newLoans,
      newCustomers,
      totalCollection,
      pendingEMIs,
      
      // Charts and visualizations
      chartData: chartData,
      loanDistribution: Object.keys(loanDistribution).length > 0 ? loanDistribution : {
        'Daily': 40,
        'Weekly': 30,
        'Monthly': 20,
        'Other': 10
      },
      
      // Additional metrics
      growthRate: Math.max(0, growthRate),
      totalActiveLoans,
      totalLoanAmount,
      todaysCollection,
      
      // Date info for frontend
      dateRange: {
        start: startDateStr,
        end: endDateStr,
        range: range,
        display: `${startDateStr} to ${endDateStr}`
      },
      
      // Debug info (remove in production)
      _debug: {
        queriesPerformed: 7,
        hasRealData: monthlyData.length > 0,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📈 FINAL Report Data:', {
      newLoans,
      newCustomers,
      totalCollection: `₹${totalCollection}`,
      pendingEMIs,
      totalActiveLoans,
      totalLoanAmount: `₹${totalLoanAmount}`,
      todaysCollection: `₹${todaysCollection}`,
      growthRate: `${growthRate}%`,
      chartDataPoints: chartData.length,
      loanTypes: Object.keys(loanDistribution)
    });

    return NextResponse.json({ 
      success: true, 
      data: reportData 
    });
    
  } catch (error) {
    console.error('❌ Reports API Error:', error);
    console.error('Error stack:', error.stack);
    
    // Return sample data if real query fails (for debugging)
    const sampleData = {
      newLoans: 12,
      newCustomers: 8,
      totalCollection: 125000,
      pendingEMIs: 45,
      chartData: [5, 10, 15, 20, 25, 30],
      loanDistribution: {
        'Daily': 40,
        'Weekly': 30,
        'Monthly': 20,
        'Other': 10
      },
      growthRate: 25,
      totalActiveLoans: 150,
      totalLoanAmount: 2500000,
      todaysCollection: 8500,
      dateRange: {
        start: '2024-01-01',
        end: '2024-01-31',
        range: 'monthly',
        display: '2024-01-01 to 2024-01-31'
      },
      _debug: {
        error: error.message,
        sampleData: true,
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json({ 
      success: true, 
      data: sampleData,
      warning: 'Using sample data due to query error'
    });
  }
}