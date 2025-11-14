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

    console.log('📅 Fetching collection data for date:', date);

    const collectionCustomers = [];
    let totalCollection = 0;
    let office1Collection = 0;
    let office2Collection = 0;

    // PRIMARY STRATEGY: Get payments from EMIPayment collection
    console.log('🔍 Checking EMIPayment collection for date:', date);
    
    const emiPayments = await EMIPayment.find({
      paymentDate: {
        $gte: new Date(date + 'T00:00:00.000Z'),
        $lt: new Date(date + 'T23:59:59.999Z')
      },
      status: { $in: ['Paid', 'Partial'] }
    }).populate('customerId', 'name customerNumber officeCategory phone businessName area');

    console.log(`💰 Found ${emiPayments.length} EMI payments for ${date}`);

    // Process EMI payments
    const customerPaymentMap = new Map();

    emiPayments.forEach(payment => {
      const customerId = payment.customerId?._id?.toString();
      
      if (!customerId) {
        console.log('⚠️ Payment without customer:', payment._id);
        return;
      }

      if (!customerPaymentMap.has(customerId)) {
        customerPaymentMap.set(customerId, {
          customer: payment.customerId,
          payments: [],
          totalAmount: 0,
          loans: new Map()
        });
      }

      const customerData = customerPaymentMap.get(customerId);
      customerData.payments.push(payment);
      customerData.totalAmount += payment.amount;

      // Track loans
      const loanKey = payment.loanNumber || 'default';
      if (!customerData.loans.has(loanKey)) {
        customerData.loans.set(loanKey, {
          loanNumber: payment.loanNumber || 'N/A',
          collectedAmount: 0
        });
      }
      
      const loanData = customerData.loans.get(loanKey);
      loanData.collectedAmount += payment.amount;
      loanData.emiAmount = payment.amount; // Use payment amount as EMI amount for display
    });

    // Convert to collection customers format
    customerPaymentMap.forEach((customerData, customerId) => {
      const loanDetails = Array.from(customerData.loans.values());
      
      collectionCustomers.push({
        customerId: customerId,
        customerNumber: customerData.customer.customerNumber || `CN${customerId}`,
        customerName: customerData.customer.name,
        totalCollection: customerData.totalAmount,
        officeCategory: customerData.customer.officeCategory || 'Office 1',
        loans: loanDetails
      });

      totalCollection += customerData.totalAmount;

      if (customerData.customer.officeCategory === 'Office 1') {
        office1Collection += customerData.totalAmount;
      } else if (customerData.customer.officeCategory === 'Office 2') {
        office2Collection += customerData.totalAmount;
      }
    });

    console.log(`📊 Processed ${collectionCustomers.length} customers from EMI payments`);

    // FALLBACK STRATEGY: If no EMI payments found, check customer loans
    if (collectionCustomers.length === 0) {
      console.log('🔄 No EMI payments found, checking customer loans as fallback...');
      
      const allCustomers = await Customer.find({
        status: 'active'
      }).populate('loans');

      for (const customer of allCustomers) {
        let customerTotalCollection = 0;
        const loanDetails = [];
        
        if (customer.loans && Array.isArray(customer.loans)) {
          for (const loan of customer.loans) {
            if (loan.emiHistory && Array.isArray(loan.emiHistory)) {
              const datePayments = loan.emiHistory.filter(payment => {
                const paymentDate = new Date(payment.paymentDate).toISOString().split('T')[0];
                return paymentDate === date;
              });
              
              if (datePayments.length > 0) {
                const collectedAmount = datePayments.reduce((sum, payment) => sum + payment.amount, 0);
                customerTotalCollection += collectedAmount;
                
                loanDetails.push({
                  loanNumber: loan.loanNumber || 'N/A',
                  emiAmount: loan.emiAmount || 0,
                  collectedAmount: collectedAmount
                });

                console.log(`💰 Found payment in customer loans for ${customer.name}:`, {
                  loanNumber: loan.loanNumber,
                  amount: collectedAmount
                });
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
            officeCategory: customer.officeCategory || 'Office 1',
            loans: loanDetails
          });

          totalCollection += customerTotalCollection;

          if (customer.officeCategory === 'Office 1') {
            office1Collection += customerTotalCollection;
          } else if (customer.officeCategory === 'Office 2') {
            office2Collection += customerTotalCollection;
          }
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

    console.log('✅ Final collection data:', {
      date,
      totalCustomers: collectionCustomers.length,
      totalCollection,
      source: emiPayments.length > 0 ? 'EMIPayment Collection' : 'Customer Loans Fallback'
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