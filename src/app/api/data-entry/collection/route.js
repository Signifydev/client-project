import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
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

    console.log('📅 Fetching collection data for date:', date);

    // Find all customers with EMI payments on the specified date
    const customersWithPayments = await Customer.find({
      'loans.emiHistory.paymentDate': date,
      status: 'active'
    }).populate('loans');

    const collectionCustomers = [];
    let totalCollection = 0;
    let office1Collection = 0;
    let office2Collection = 0;

    // Process each customer to calculate collections
    for (const customer of customersWithPayments) {
      let customerTotalCollection = 0;
      
      if (customer.loans && Array.isArray(customer.loans)) {
        for (const loan of customer.loans) {
          if (loan.emiHistory && Array.isArray(loan.emiHistory)) {
            const datePayments = loan.emiHistory.filter(
              payment => payment.paymentDate === date
            );
            
            if (datePayments.length > 0) {
              const collectedAmount = datePayments.reduce((sum, payment) => sum + payment.amount, 0);
              customerTotalCollection += collectedAmount;
            }
          }
        }
      }

      if (customerTotalCollection > 0) {
        collectionCustomers.push({
          customerId: customer._id,
          customerNumber: customer.customerNumber,
          customerName: customer.name,
          totalCollection: customerTotalCollection,
          officeCategory: customer.officeCategory || 'Office 1'
        });

        totalCollection += customerTotalCollection;

        if (customer.officeCategory === 'Office 1') {
          office1Collection += customerTotalCollection;
        } else if (customer.officeCategory === 'Office 2') {
          office2Collection += customerTotalCollection;
        }
      }
    }

    const collectionData = {
      date: date,
      customers: collectionCustomers,
      summary: {
        totalCollection,
        office1Collection,
        office2Collection,
        totalCustomers: collectionCustomers.length
      }
    };

    console.log('✅ Collection data fetched:', {
      date,
      totalCustomers: collectionCustomers.length,
      totalCollection
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