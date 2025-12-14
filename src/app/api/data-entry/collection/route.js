import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
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

    // Build query for EMIPayment
    const paymentQuery = {
      paymentDate: {
        $gte: new Date(date + 'T00:00:00.000Z'),
        $lt: new Date(date + 'T23:59:59.999Z')
      },
      status: { $in: ['Paid', 'Partial'] }
    };
    
    // Filter by office category if provided
    if (officeCategory && officeCategory !== 'all') {
      paymentQuery.officeCategory = officeCategory;
    }

    console.log('🔍 Checking EMIPayment collection for date:', date);
    
    // Fetch payments with customer details
    const emiPayments = await EMIPayment.find(paymentQuery)
      .populate('customerId', 'name customerNumber officeCategory phone businessName area')
      .sort({ paymentDate: -1 })
      .lean();

    console.log(`💰 Found ${emiPayments.length} EMI payments for ${date}`);

    // Prepare statistics
    let totalCollection = 0;
    let numberOfCustomersPaid = 0;
    const uniqueCustomerIds = new Set();
    const paymentsWithDetails = [];

    // Process each payment
    for (const payment of emiPayments) {
      const customerId = payment.customerId?._id?.toString();
      
      if (!customerId) {
        console.log('⚠️ Payment without customer:', payment._id);
        continue;
      }

      // Add to unique customers set
      uniqueCustomerIds.add(customerId);
      
      // Add to total collection
      totalCollection += payment.amount || 0;

      // Create payment with details
      const paymentWithDetails = {
        _id: payment._id,
        customerId: customerId,
        customerNumber: payment.customerId?.customerNumber || 'N/A',
        customerName: payment.customerId?.name || 'N/A',
        loanId: payment.loanId,
        loanNumber: payment.loanNumber || 'N/A',
        emiAmount: payment.amount || 0,
        paidAmount: payment.amount || 0,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod || 'Cash',
        officeCategory: payment.customerId?.officeCategory || payment.officeCategory || 'Office 1',
        operatorName: payment.operatorName || 'N/A',
        status: payment.status
      };

      paymentsWithDetails.push(paymentWithDetails);
    }

    numberOfCustomersPaid = uniqueCustomerIds.size;

    const collectionData = {
      date: date,
      payments: paymentsWithDetails,
      statistics: {
        todaysCollection: totalCollection,
        numberOfCustomersPaid: numberOfCustomersPaid,
        totalCollections: emiPayments.length
      },
      summary: {
        totalCollection,
        numberOfCustomersPaid,
        totalTransactions: emiPayments.length
      }
    };

    console.log('✅ Final collection data:', {
      date,
      numberOfCustomersPaid,
      totalCollection,
      totalTransactions: emiPayments.length
    });

    return NextResponse.json({
      success: true,
      data: collectionData
    });

  } catch (error) {
    console.error('❌ Error fetching collection data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collection data: ' + error.message },
      { status: 500 }
    );
  }
}