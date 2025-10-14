import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    
    // Get date range for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Real database queries using YOUR collections
    const newLoans = await db.collection('requests').countDocuments({
      status: 'approved',
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const newCustomers = await db.collection('customers').countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Total collection from emipayments
    const totalCollectionResult = await db.collection('emipayments').aggregate([
      {
        $match: {
          paymentDate: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();
    
    const totalCollection = totalCollectionResult[0]?.total || 0;
    
    // Pending EMIs - assuming requests with pending status
    const pendingEMIs = await db.collection('requests').countDocuments({
      status: 'pending'
    });

    // Loan distribution by type from requests
    const loanDistributionResult = await db.collection('requests').aggregate([
      {
        $group: {
          _id: '$loanType',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    // Convert to percentage distribution
    const totalLoans = await db.collection('requests').countDocuments({ status: 'approved' });
    const loanDistribution = {};
    loanDistributionResult.forEach(item => {
      const percentage = totalLoans > 0 ? Math.round((item.count / totalLoans) * 100) : 0;
      loanDistribution[item._id || 'Other'] = percentage;
    });

    // Monthly growth data (last 6 months) from requests
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await db.collection('requests').aggregate([
      {
        $match: {
          status: 'approved',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 6
      }
    ]).toArray();
    
    const chartData = monthlyData.map(item => item.count);

    const reportData = {
      newLoans,
      newCustomers,
      totalCollection,
      pendingEMIs,
      chartData: chartData.length > 0 ? chartData : [0, 0, 0, 0, 0, 0],
      loanDistribution: Object.keys(loanDistribution).length > 0 ? loanDistribution : {
        'Personal Loan': 40,
        'Business Loan': 30,
        'Home Loan': 20,
        'Education Loan': 10
      },
      growthRate: chartData.length > 1 ? 
        Math.round(((chartData[chartData.length - 1] - chartData[0]) / chartData[0]) * 100) : 0
    };

    console.log('Real Report Data:', reportData);

    return NextResponse.json({ 
      success: true, 
      data: reportData 
    });
  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}