import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'daily';
    const loanType = searchParams.get('loanType') || null;
    
    const db = mongoose.connection.db;
    const today = new Date();
    let startDate = new Date();
    
    // Set date range based on selection
    switch(range) {
      case 'daily':
        startDate.setDate(today.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'monthly':
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }
    
    // Format dates to YYYY-MM-DD
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const startDateStr = formatDate(startDate);
    const todayStr = formatDate(today);
    
    // 1. GET LOANS AGGREGATION
    const loanMatchStage = {
      $match: {
        createdAt: { $gte: new Date(startDateStr), $lte: new Date(todayStr) },
        status: 'active' // Only active loans
      }
    };
    
    if (loanType) {
      loanMatchStage.$match.loanType = loanType;
    }
    
    const loanAggregation = await db.collection('loans').aggregate([
      loanMatchStage,
      {
        $group: {
          _id: loanType ? null : '$loanType', // Group by loanType if no filter
          totalLoans: { $sum: 1 },
          totalLoanAmount: { $sum: '$amount' },
          // For custom EMI loans, calculate total loan amount correctly
          totalCalculatedAmount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$emiType', 'custom'] },
                  { $ne: ['$loanType', 'Daily'] }
                ]},
                { $add: [
                  { $multiply: ['$emiAmount', { $subtract: ['$loanDays', 1] }] },
                  '$customEmiAmount'
                ]},
                { $multiply: ['$emiAmount', '$loanDays'] }
              ]
            }
          }
        }
      },
      {
        $project: {
          loanType: { $ifNull: ['$_id', loanType] },
          totalLoans: 1,
          totalLoanAmount: { $max: ['$totalCalculatedAmount', '$totalLoanAmount'] },
          _id: 0
        }
      }
    ]).toArray();
    
    // 2. GET RECOVERED AMOUNTS FROM EMI PAYMENTS
    const emiMatchStage = {
      $match: {
        paymentDate: { $gte: startDateStr, $lte: todayStr },
        status: { $in: ['Paid', 'Partial'] } // Only count actual payments
      }
    };
    
    // Join with loans to get loanType for payments
    const emiAggregation = await db.collection('emipayments').aggregate([
      emiMatchStage,
      {
        $lookup: {
          from: 'loans',
          localField: 'loanId',
          foreignField: '_id',
          as: 'loanInfo'
        }
      },
      { $unwind: '$loanInfo' },
      {
        $match: loanType ? { 'loanInfo.loanType': loanType } : {}
      },
      {
        $group: {
          _id: loanType ? null : '$loanInfo.loanType',
          totalRecoveredAmount: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $project: {
          loanType: { $ifNull: ['$_id', loanType] },
          totalRecoveredAmount: 1,
          paymentCount: 1,
          _id: 0
        }
      }
    ]).toArray();
    
    // 3. COMBINE DATA
    let result = [];
    
    if (loanType) {
      // Single loan type requested
      const loanData = loanAggregation[0] || { 
        loanType, 
        totalLoans: 0, 
        totalLoanAmount: 0 
      };
      const emiData = emiAggregation[0] || { 
        loanType, 
        totalRecoveredAmount: 0, 
        paymentCount: 0 
      };
      
      result = [{
        loanType,
        newLoans: loanData.totalLoans,
        totalAmount: loanData.totalLoanAmount,
        recoveredAmount: emiData.totalRecoveredAmount,
        amountToRecover: loanData.totalLoanAmount - emiData.totalRecoveredAmount,
        paymentCount: emiData.paymentCount
      }];
    } else {
      // All loan types
      const loanTypes = ['Daily', 'Weekly', 'Monthly'];
      
      result = loanTypes.map(type => {
        const loanData = loanAggregation.find(item => item.loanType === type) || { 
          totalLoans: 0, 
          totalLoanAmount: 0 
        };
        const emiData = emiAggregation.find(item => item.loanType === type) || { 
          totalRecoveredAmount: 0, 
          paymentCount: 0 
        };
        
        return {
          loanType: type,
          newLoans: loanData.totalLoans,
          totalAmount: loanData.totalLoanAmount,
          recoveredAmount: emiData.totalRecoveredAmount,
          amountToRecover: loanData.totalLoanAmount - emiData.totalRecoveredAmount,
          paymentCount: emiData.paymentCount
        };
      });
    }
    
    // Add totals row if multiple loan types
    if (!loanType && result.length > 0) {
      const totals = result.reduce((acc, item) => ({
        newLoans: acc.newLoans + item.newLoans,
        totalAmount: acc.totalAmount + item.totalAmount,
        recoveredAmount: acc.recoveredAmount + item.recoveredAmount,
        paymentCount: acc.paymentCount + item.paymentCount
      }), { newLoans: 0, totalAmount: 0, recoveredAmount: 0, paymentCount: 0 });
      
      result.push({
        loanType: 'TOTAL',
        newLoans: totals.newLoans,
        totalAmount: totals.totalAmount,
        recoveredAmount: totals.recoveredAmount,
        amountToRecover: totals.totalAmount - totals.recoveredAmount,
        paymentCount: totals.paymentCount
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result,
      range,
      period: { startDate: startDateStr, endDate: todayStr }
    });
  } catch (error) {
    console.error('Error fetching loan details:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}