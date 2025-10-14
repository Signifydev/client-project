import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'monthly';
    
    const db = mongoose.connection.db;
    
    // Real aggregation query for loan data
    const loanData = await db.collection('loans').aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newLoans: { $sum: 1 },
          totalAmount: { $sum: '$loanAmount' },
          approved: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] 
            } 
          },
          pending: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] 
            } 
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray();

    return NextResponse.json({ 
      success: true, 
      data: loanData 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}