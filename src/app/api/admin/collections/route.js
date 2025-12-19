import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    console.log('📅 [ADMIN] Fetching collection data for date:', date);

    // Build date range query
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Get payments for the date (ALL payments, no office filter)
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

    console.log(`💰 [ADMIN] Found ${emiPayments.length} EMI payments for ${date}`);

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
      const customerId = payment.customerId?._id?.toString();
      
      if (!customerId) continue;
      
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
      }

      // Group by customer
      if (!customerPaymentsMap.has(customerId)) {
        const customer = payment.customerId;
        customerPaymentsMap.set(customerId, {
          customerId: customerId,
          customerNumber: customer.customerNumber || 'N/A',
          customerName: customer.name || 'N/A',
          officeCategory: officeCategory,
          totalCollected: 0,
          payments: []
        });
      }

      const customerData = customerPaymentsMap.get(customerId);
      customerData.totalCollected += paymentAmount;
      
      const paymentData = {
        _id: payment._id.toString(),
        customerId: customerId,
        customerNumber: customerData.customerNumber,
        customerName: customerData.customerName,
        loanId: payment.loanId?._id?.toString() || 'N/A',
        loanNumber: payment.loanId?.loanNumber || payment.loanNumber || 'N/A',
        emiAmount: payment.loanId?.emiAmount || payment.amount || 0,
        paidAmount: paymentAmount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod || 'Cash',
        officeCategory: officeCategory,
        operatorName: payment.collectedBy || 'N/A',
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
      date: date,
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
      date,
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
      data: collectionData
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching collection data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch collection data: ' + error.message,
        message: 'Please check if EMI payments exist for this date'
      },
      { status: 500 }
    );
  }
}