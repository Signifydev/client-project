// app/api/data-entry/collection/route.js - UPDATED VERSION

import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import Loan from '@/lib/models/Loan'; // Import Loan model
import { connectDB } from '@/lib/db';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const officeCategory = searchParams.get('officeCategory');
    
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    console.log('📅 Fetching collection data for date:', date, 'office:', officeCategory);

    // Build base query for date range
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // First, let's get all customers for the specified office
    const customerQuery = {};
    if (officeCategory && officeCategory !== 'all') {
      customerQuery.officeCategory = officeCategory;
    }
    
    const customers = await Customer.find(customerQuery)
      .select('_id name customerNumber phone businessName area officeCategory')
      .lean();
    
    console.log(`👥 Found ${customers.length} customers for office: ${officeCategory || 'all'}`);

    // Then get payments for the date
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

    console.log(`💰 Found ${emiPayments.length} EMI payments for ${date}`);

    // Process payments and group by customer
    const customerPaymentsMap = new Map();
    let totalCollection = 0;
    let paymentCount = 0;

    for (const payment of emiPayments) {
      const customerId = payment.customerId?._id?.toString();
      
      if (!customerId) continue;
      
      // Skip if payment customer is not in our filtered customers
      if (officeCategory && officeCategory !== 'all') {
        const customer = customers.find(c => c._id.toString() === customerId);
        if (!customer) continue;
      }

      paymentCount++;
      totalCollection += payment.amount || 0;

      if (!customerPaymentsMap.has(customerId)) {
        const customer = customers.find(c => c._id.toString() === customerId) || payment.customerId;
        customerPaymentsMap.set(customerId, {
          customerId: customerId,
          customerNumber: customer.customerNumber || 'N/A',
          customerName: customer.name || 'N/A',
          officeCategory: customer.officeCategory || 'Office 1',
          totalCollected: 0,
          payments: []
        });
      }

      const customerData = customerPaymentsMap.get(customerId);
      customerData.totalCollected += payment.amount || 0;
      
      const paymentData = {
        _id: payment._id.toString(),
        customerId: customerId,
        customerNumber: customerData.customerNumber,
        customerName: customerData.customerName,
        loanId: payment.loanId?._id?.toString() || 'N/A',
        loanNumber: payment.loanId?.loanNumber || payment.loanNumber || 'N/A',
        emiAmount: payment.loanId?.emiAmount || payment.amount || 0,
        paidAmount: payment.amount || 0,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod || 'Cash',
        officeCategory: customerData.officeCategory,
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
      payments: allPayments, // Direct payments array
      customers: customerPayments, // Grouped by customer
      statistics: {
        todaysCollection: totalCollection,
        numberOfCustomersPaid: numberOfCustomersPaid,
        totalCollections: paymentCount
      },
      summary: {
        totalCollection: totalCollection,
        numberOfCustomersPaid: numberOfCustomersPaid,
        totalTransactions: paymentCount
      }
    };

    console.log('✅ Final collection data summary:', {
      date,
      totalCollection,
      numberOfCustomersPaid,
      paymentCount,
      allPaymentsCount: allPayments.length
    });

    return NextResponse.json({
      success: true,
      data: collectionData
    });

  } catch (error) {
    console.error('❌ Error fetching collection data:', error);
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