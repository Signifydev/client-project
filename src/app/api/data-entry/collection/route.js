// app/api/data-entry/collection/route.js - COMPLETELY FIXED VERSION
import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import Loan from '@/lib/models/Loan';
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

    console.log('📅 Fetching collection data for:', { date, officeCategory });

    // ✅ FIX 1: Query using string date (YYYY-MM-DD) - MATCHES DATABASE FORMAT
    const paymentQuery = {
      paymentDate: date, // Direct string match, NOT Date object
      status: { $in: ['Paid', 'Partial', 'Advance'] }
    };

    // Get payments for the exact date string
    console.log('🔍 Payment query:', paymentQuery);
    
    const emiPayments = await EMIPayment.find(paymentQuery)
      .populate('customerId', 'name customerNumber officeCategory')
      .populate('loanId', 'loanNumber emiAmount loanType')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`💰 Found ${emiPayments.length} EMI payments for ${date}`);

    // If no payments found, return empty but success
    if (emiPayments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date: date,
          payments: [],
          customers: [],
          statistics: {
            todaysCollection: 0,
            numberOfCustomersPaid: 0,
            totalCollections: 0
          },
          summary: {
            totalCollection: 0,
            numberOfCustomersPaid: 0,
            totalTransactions: 0
          }
        },
        message: 'No payments found for this date'
      });
    }

    // Process payments - SIMPLIFIED LOGIC
    const customerPaymentsMap = new Map();
    let totalCollection = 0;
    let paymentCount = 0;

    for (const payment of emiPayments) {
      const customerId = payment.customerId?._id?.toString();
      
      if (!customerId) {
        console.warn('⚠️ Payment missing customerId:', payment._id);
        continue;
      }
      
      // ✅ FIX 2: Handle office filtering correctly
      const customerOffice = payment.customerId?.officeCategory;
      if (officeCategory && officeCategory !== 'all' && customerOffice !== officeCategory) {
        console.log(`⏩ Skipping payment - office mismatch: ${customerOffice} vs ${officeCategory}`);
        continue;
      }

      paymentCount++;
      totalCollection += payment.amount || 0;

      if (!customerPaymentsMap.has(customerId)) {
        customerPaymentsMap.set(customerId, {
          customerId: customerId,
          customerNumber: payment.customerId?.customerNumber || payment.customerNumber || 'N/A',
          customerName: payment.customerId?.name || payment.customerName || 'N/A',
          officeCategory: customerOffice || 'Office 1',
          totalCollected: 0,
          payments: []
        });
      }

      const customerData = customerPaymentsMap.get(customerId);
      customerData.totalCollected += payment.amount || 0;
      
      // ✅ FIX 3: Use correct field names that frontend expects
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
        operatorName: payment.collectedBy || 'N/A', // ✅ This field is EXPECTED by frontend
        collectedBy: payment.collectedBy || 'N/A', // ✅ Also include original for consistency
        status: payment.status
      };
      
      customerData.payments.push(paymentData);
    }

    // Convert map to arrays
    const customerPayments = Array.from(customerPaymentsMap.values());
    const numberOfCustomersPaid = customerPayments.length;

    // Flatten all payments for the main payments array
    const allPayments = customerPayments.flatMap(cp => cp.payments);

    const collectionData = {
      date: date,
      payments: allPayments, // ✅ Frontend expects this at root level
      customers: customerPayments, // ✅ Also include grouped version
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

    console.log('✅ Collection data prepared:', {
      date,
      totalCollection,
      numberOfCustomersPaid,
      totalPayments: allPayments.length,
      samplePayment: allPayments.length > 0 ? {
        customerName: allPayments[0].customerName,
        amount: allPayments[0].paidAmount,
        operator: allPayments[0].operatorName
      } : 'No payments'
    });

    return NextResponse.json({
      success: true,
      data: collectionData
    });

  } catch (error) {
    console.error('❌ Error in collection API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch collection data',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}