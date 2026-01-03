import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import TeamMember from '@/lib/models/TeamMember';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    // Fetch all data in parallel for better performance
    const [
      totalCustomers,
      totalActiveLoans,
      totalAmountResult,
      totalTeamMembers,
      pendingRequests
    ] = await Promise.all([
      // 1. Total active customers (from Customer model)
      Customer.countDocuments({ 
        status: 'active',
        isActive: true 
      }),
      
      // 2. Total active loans (from Loan model)
      Loan.countDocuments({ 
        status: 'active' 
      }),
      
      // 3. Sum of all active loan amounts (from Loan model)
      Loan.aggregate([
        { 
          $match: { 
            status: 'active' 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' } 
          } 
        }
      ]),
      
      // 4. Total active team members (from TeamMember model)
      TeamMember.countDocuments({ 
        status: 'active' 
      }),
      
      // 5. Pending requests (from Request model)
      Request.countDocuments({ 
        status: 'Pending' 
      })
    ]);
    
    // Extract total amount from aggregate result
    const totalAmount = totalAmountResult[0]?.total || 0;
    
    const stats = {
      totalLoans: totalActiveLoans,
      totalAmount: totalAmount,
      totalCustomers: totalCustomers,
      totalTeamMembers: totalTeamMembers,
      pendingRequests: pendingRequests
    };
    
    return NextResponse.json({ 
      success: true, 
      data: stats 
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}