import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    
    console.log('🧪 Testing database connection...');
    
    // Test 1: Count all customers
    const totalCustomers = await Customer.countDocuments({});
    console.log('📊 Total customers:', totalCustomers);
    
    // Test 2: Get office distribution
    const officeDistribution = await Customer.aggregate([
      {
        $group: {
          _id: "$officeCategory",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Test 3: Get status distribution
    const statusDistribution = await Customer.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Test 4: Get sample customers
    const sampleCustomers = await Customer.find({})
      .limit(5)
      .select('name customerNumber officeCategory status phone')
      .lean();
    
    // Test 5: Count loans
    const totalLoans = await Loan.countDocuments({});
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        customers: totalCustomers,
        loans: totalLoans
      },
      distribution: {
        offices: officeDistribution,
        status: statusDistribution
      },
      sampleCustomers: sampleCustomers,
      message: 'Database connection test completed successfully'
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}