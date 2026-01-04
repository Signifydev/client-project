import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

// Helper function to get current date as YYYY-MM-DD
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to validate YYYY-MM-DD format
function isValidYYYYMMDD(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    // If no date provided, use today
    const targetDate = date || getCurrentDateString();
    
    if (!isValidYYYYMMDD(targetDate)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date format. Must be YYYY-MM-DD',
          receivedDate: targetDate,
          example: '2024-12-31'
        },
        { status: 400 }
      );
    }

    console.log('📅 [ADMIN] Fetching collection data for date:', targetDate);

    // ✅ FIXED: Query with STRING date (since EMIPayment stores paymentDate as string)
    const paymentQuery = {
      paymentDate: targetDate, // Direct string match since we store as YYYY-MM-DD
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    };
    
    console.log('🔍 Query details:', {
      paymentQuery,
      targetDate,
      status: ['Paid', 'Partial', 'Advance']
    });
    
    const emiPayments = await EMIPayment.find(paymentQuery)
      .populate('customerId', 'name customerNumber officeCategory')
      .populate('loanId', 'loanNumber emiAmount loanType')
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    console.log(`💰 [ADMIN] Found ${emiPayments.length} EMI payments for ${targetDate}`);
    
    // Log sample data for debugging
    if (emiPayments.length > 0) {
      console.log('📋 Sample payment data:', {
        customerId: emiPayments[0].customerId?._id || emiPayments[0].customerId,
        customerName: emiPayments[0].customerId?.name || 'N/A',
        paymentDate: emiPayments[0].paymentDate,
        amount: emiPayments[0].amount,
        status: emiPayments[0].status,
        loanNumber: emiPayments[0].loanId?.loanNumber || 'N/A'
      });
    }

    // Initialize statistics
    let totalCollection = 0;
    let paymentCount = 0;
    let office1Collection = 0;
    let office2Collection = 0;
    let office1Customers = new Set();
    let office2Customers = new Set();

    // Process payments
    const customerPaymentsMap = new Map();
    
    for (const payment of emiPayments) {
      const customerId = payment.customerId?._id?.toString() || payment.customerId?.toString();
      
      if (!customerId) {
        console.warn('⚠️ Skipping payment without customerId:', payment._id);
        continue;
      }
      
      paymentCount++;
      const paymentAmount = payment.amount || 0;
      totalCollection += paymentAmount;

      // Get customer office category
      const officeCategory = payment.customerId?.officeCategory || 'Office 1';
      
      // Update office-wise statistics
      if (officeCategory === 'Office 1') {
        office1Collection += paymentAmount;
        office1Customers.add(customerId);
      } else if (officeCategory === 'Office 2') {
        office2Collection += paymentAmount;
        office2Customers.add(customerId);
      } else {
        // Handle unknown office category
        console.warn('⚠️ Unknown office category:', officeCategory, 'for customer:', customerId);
      }

      // Group by customer
      if (!customerPaymentsMap.has(customerId)) {
        const customer = payment.customerId;
        customerPaymentsMap.set(customerId, {
          customerId: customerId,
          customerNumber: customer?.customerNumber || payment.customerNumber || 'N/A',
          customerName: customer?.name || payment.customerName || 'Unknown Customer',
          officeCategory: officeCategory,
          totalCollected: 0,
          payments: []
        });
      }

      const customerData = customerPaymentsMap.get(customerId);
      customerData.totalCollected += paymentAmount;
      
      const paymentData = {
        _id: payment._id?.toString() || `temp_${Date.now()}_${Math.random()}`,
        customerId: customerId,
        customerNumber: customerData.customerNumber,
        customerName: customerData.customerName,
        loanId: payment.loanId?._id?.toString() || payment.loanId || 'N/A',
        loanNumber: payment.loanId?.loanNumber || payment.loanNumber || 'N/A',
        emiAmount: payment.loanId?.emiAmount || payment.amount || 0,
        paidAmount: paymentAmount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod || 'Cash',
        officeCategory: officeCategory,
        operatorName: payment.collectedBy || payment.operatorName || 'N/A',
        status: payment.status
      };
      
      customerData.payments.push(paymentData);
    }

    // Convert map to array
    const customerPayments = Array.from(customerPaymentsMap.values());
    const numberOfCustomersPaid = customerPayments.length;

    // Flatten all payments for the main payments array
    const allPayments = customerPayments.flatMap(cp => cp.payments);

    const collectionData = {
      date: targetDate,
      payments: allPayments,
      customers: customerPayments,
      statistics: {
        todaysCollection: totalCollection,
        numberOfCustomersPaid: numberOfCustomersPaid,
        totalCollections: paymentCount,
        office1Collection: office1Collection,
        office2Collection: office2Collection,
        office1CustomersPaid: office1Customers.size,
        office2CustomersPaid: office2Customers.size
      },
      summary: {
        totalCollection: totalCollection,
        numberOfCustomersPaid: numberOfCustomersPaid,
        totalTransactions: paymentCount,
        office1: {
          collection: office1Collection,
          customersPaid: office1Customers.size,
          transactions: allPayments.filter(p => p.officeCategory === 'Office 1').length
        },
        office2: {
          collection: office2Collection,
          customersPaid: office2Customers.size,
          transactions: allPayments.filter(p => p.officeCategory === 'Office 2').length
        }
      }
    };

    console.log('✅ [ADMIN] Final collection data summary:', {
      date: targetDate,
      totalCollection,
      numberOfCustomersPaid,
      paymentCount,
      office1Collection,
      office2Collection,
      office1Customers: office1Customers.size,
      office2Customers: office2Customers.size
    });

    return NextResponse.json({
      success: true,
      data: collectionData,
      meta: {
        date: targetDate,
        fetchedAt: new Date().toISOString(),
        recordCount: {
          payments: paymentCount,
          customers: numberOfCustomersPaid
        }
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching collection data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch collection data: ' + error.message,
        message: 'Please check if EMI payments exist for this date',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: Add support for date range queries
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { startDate, endDate } = body;
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required for range queries' },
        { status: 400 }
      );
    }
    
    if (!isValidYYYYMMDD(startDate) || !isValidYYYYMMDD(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    
    // For range queries with string dates, we can use string comparison
    // since YYYY-MM-DD format is lexicographically sortable
    const paymentQuery = {
      paymentDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    };
    
    const emiPayments = await EMIPayment.find(paymentQuery)
      .populate('customerId', 'name customerNumber officeCategory')
      .populate('loanId', 'loanNumber emiAmount loanType')
      .sort({ paymentDate: -1 })
      .lean();
    
    const totalCollection = emiPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const uniqueCustomers = new Set(emiPayments.map(p => p.customerId?.toString()));
    
    return NextResponse.json({
      success: true,
      data: {
        startDate,
        endDate,
        payments: emiPayments,
        statistics: {
          totalCollection,
          totalPayments: emiPayments.length,
          uniqueCustomers: uniqueCustomers.size
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [ADMIN] Error fetching collection range data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collection data: ' + error.message },
      { status: 500 }
    );
  }
}