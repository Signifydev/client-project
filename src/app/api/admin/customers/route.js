import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

// GET method for fetching customers with loan data
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const includeLoans = searchParams.get('includeLoans') === 'true';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = (page - 1) * limit;
    
    console.log('🔍 [ADMIN API] Fetching customers:', { 
      customerId, 
      includeLoans, 
      page, 
      limit,
      skip 
    });

    // ============== SINGLE CUSTOMER DETAIL VIEW ==============
    if (customerId) {
      const customer = await Customer.findById(customerId);
      
      if (!customer) {
        return NextResponse.json({ 
          success: false,
          error: 'Customer not found' 
        }, { status: 404 });
      }
      
      // Fetch all loans for this customer using aggregation for better performance
      const [loans, emiPayments] = await Promise.all([
        Loan.find({ 
          customerId: customerId,
          status: { $ne: 'renewed' } // Exclude renewed loans from active view
        }).sort({ loanNumber: 1 }),
        
        EMIPayment.find({ 
          customerId: customerId 
        }).sort({ paymentDate: -1 }).limit(100)
      ]);
      
      console.log(`📊 Found ${loans.length} active loans for customer: ${customer.name}`);
      
      // Calculate loan statistics
      const loanStats = loans.reduce((stats, loan) => {
        stats.totalLoanAmount += loan.amount || 0;
        stats.totalPaidAmount += loan.totalPaidAmount || 0;
        if (loan.status === 'active' && !loan.isRenewed) {
          stats.activeLoans++;
        }
        return stats;
      }, { totalLoanAmount: 0, totalPaidAmount: 0, activeLoans: 0 });
      
      // Format customer data for Admin interface
      const customerWithLoans = {
        // Basic customer info
        _id: customer._id,
        id: customer._id,
        name: customer.name,
        phone: Array.isArray(customer.phone) ? customer.phone[0] : customer.phone,
        phoneArray: Array.isArray(customer.phone) ? customer.phone : [customer.phone],
        businessName: customer.businessName,
        area: customer.area,
        customerNumber: customer.customerNumber,
        address: customer.address || '',
        status: customer.status,
        category: customer.category || 'A',
        officeCategory: customer.officeCategory || 'Office 1',
        createdAt: customer.createdAt,
        profilePicture: customer.profilePicture,
        fiDocuments: customer.fiDocuments || {},
        whatsappNumber: customer.whatsappNumber || '',
        secondaryPhone: Array.isArray(customer.phone) && customer.phone.length > 1 ? customer.phone[1] : '',
        
        // Loan information for compatibility
        loanNumber: loans.length > 0 ? loans[0].loanNumber : '',
        loanAmount: loans.length > 0 ? loans[0].amount : 0,
        emiAmount: loans.length > 0 ? loans[0].emiAmount : 0,
        loanType: loans.length > 0 ? loans[0].loanType : '',
        loanDate: loans.length > 0 ? loans[0].dateApplied : '',
        loanDays: loans.length > 0 ? loans[0].loanDays : 0,
        totalCollection: loans.length > 0 ? loans[0].totalPaidAmount : 0,
        emiPaidCount: loans.length > 0 ? loans[0].emiPaidCount : 0,
        nextEmiDate: loans.length > 0 ? loans[0].nextEmiDate : '',
        
        // Additional loans array
        additionalLoans: loans.length > 1 ? loans.slice(1).map(loan => ({
          _id: loan._id,
          loanNumber: loan.loanNumber,
          loanAmount: loan.amount,
          emiAmount: loan.emiAmount,
          loanType: loan.loanType,
          loanDate: loan.dateApplied,
          loanDays: loan.loanDays,
          status: loan.status,
          totalCollection: loan.totalPaidAmount || 0,
          emiPaidCount: loan.emiPaidCount || 0,
          nextEmiDate: loan.nextEmiDate,
          emiStartDate: loan.emiStartDate || loan.dateApplied,
          totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
          remainingAmount: loan.remainingAmount || loan.amount
        })) : [],
        
        // Complete loans array for detailed view
        loans: loans.map(loan => ({
          _id: loan._id,
          loanId: loan._id,
          loanNumber: loan.loanNumber,
          loanAmount: loan.amount,
          emiAmount: loan.emiAmount,
          loanType: loan.loanType,
          loanDate: loan.dateApplied,
          loanDays: loan.loanDays,
          status: loan.status,
          totalCollection: loan.totalPaidAmount || 0,
          emiPaidCount: loan.emiPaidCount || 0,
          nextEmiDate: loan.nextEmiDate,
          emiStartDate: loan.emiStartDate || loan.dateApplied,
          totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
          remainingAmount: loan.remainingAmount || loan.amount,
          emiType: loan.emiType || 'fixed',
          customEmiAmount: loan.customEmiAmount || null,
          createdBy: loan.createdBy,
          createdAt: loan.createdAt,
          updatedAt: loan.updatedAt
        })),
        
        // Loan summary statistics
        loanSummary: {
          totalLoans: loans.length,
          totalLoanAmount: loanStats.totalLoanAmount,
          totalPaidAmount: loanStats.totalPaidAmount,
          totalRemainingAmount: loanStats.totalLoanAmount - loanStats.totalPaidAmount,
          activeLoans: loanStats.activeLoans,
          completedLoans: loans.filter(l => l.status === 'completed').length,
          overdueLoans: loans.filter(l => l.status === 'overdue').length,
          renewedLoans: loans.filter(l => l.isRenewed || l.status === 'renewed').length
        },
        
        // EMI payments for transaction history
        emiPayments: emiPayments.map(payment => ({
          _id: payment._id,
          paymentDate: payment.paymentDate,
          amount: payment.amount,
          status: payment.status,
          collectedBy: payment.collectedBy,
          loanId: payment.loanId,
          loanNumber: payment.loanNumber,
          notes: payment.notes,
          paymentType: payment.paymentType || 'single',
          isAdvancePayment: payment.isAdvancePayment || false,
          advanceFromDate: payment.advanceFromDate,
          advanceToDate: payment.advanceToDate,
          advanceEmiCount: payment.advanceEmiCount,
          advanceTotalAmount: payment.advanceTotalAmount
        }))
      };
      
      console.log('✅ Admin customer details prepared with loans');
      
      return NextResponse.json({ 
        success: true, 
        data: customerWithLoans 
      });
    }
    
    // ============== LIST VIEW WITH PAGINATION ==============
    // Get total count for pagination
    const totalCustomers = await Customer.countDocuments({ status: 'active' });
    
    // Fetch paginated customers
    const customers = await Customer.find({ 
      status: 'active' 
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    console.log(`📋 Found ${customers.length} customers (page ${page} of ${Math.ceil(totalCustomers / limit)})`);
    
    // Get all customer IDs for batch loan query
    const customerIds = customers.map(c => c._id);
    
    // Batch fetch loans for all customers using aggregation (more efficient)
    const loansByCustomer = await Loan.aggregate([
      {
        $match: {
          customerId: { $in: customerIds },
          status: 'active',
          isRenewed: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$customerId',
          loans: { $push: '$$ROOT' },
          totalLoanAmount: { $sum: '$amount' },
          totalPaidAmount: { $sum: '$totalPaidAmount' },
          emiPaidCount: { $sum: '$emiPaidCount' },
          loanCount: { $sum: 1 }
        }
      }
    ]);
    
    // Create lookup map for O(1) access
    const loanMap = {};
    loansByCustomer.forEach(item => {
      loanMap[item._id.toString()] = item;
    });
    
    // Enhance customers with loan info
    const enhancedCustomers = customers.map(customer => {
      const customerLoans = loanMap[customer._id.toString()];
      
      if (!customerLoans) {
        // No loans found for this customer
        return {
          _id: customer._id,
          id: customer._id,
          name: customer.name,
          phone: Array.isArray(customer.phone) ? customer.phone[0] : customer.phone,
          businessName: customer.businessName,
          area: customer.area,
          customerNumber: customer.customerNumber,
          officeCategory: customer.officeCategory || 'Office 1',
          category: customer.category || 'A',
          status: customer.status,
          createdAt: customer.createdAt,
          loanCount: 0,
          hasLoans: false,
          loanNumber: '',
          loanAmount: 0,
          emiAmount: 0,
          loanType: '',
          loanDays: 0,
          totalLoanAmount: 0,
          totalPaidAmount: 0,
          remainingAmount: 0,
          activeLoans: 0,
          totalCollection: 0,
          emiPaidCount: 0,
          nextEmiDate: ''
        };
      }
      
      // Get first loan for basic info
      const firstLoan = customerLoans.loans[0];
      
      return {
        _id: customer._id,
        id: customer._id,
        name: customer.name,
        phone: Array.isArray(customer.phone) ? customer.phone[0] : customer.phone,
        businessName: customer.businessName,
        area: customer.area,
        customerNumber: customer.customerNumber,
        officeCategory: customer.officeCategory || 'Office 1',
        category: customer.category || 'A',
        status: customer.status,
        createdAt: customer.createdAt,
        loanCount: customerLoans.loanCount,
        hasLoans: customerLoans.loanCount > 0,
        loanNumber: firstLoan ? firstLoan.loanNumber : '',
        loanAmount: firstLoan ? firstLoan.amount : 0,
        emiAmount: firstLoan ? firstLoan.emiAmount : 0,
        loanType: firstLoan ? firstLoan.loanType : '',
        loanDays: firstLoan ? firstLoan.loanDays : 0,
        totalLoanAmount: customerLoans.totalLoanAmount,
        totalPaidAmount: customerLoans.totalPaidAmount,
        remainingAmount: customerLoans.totalLoanAmount - customerLoans.totalPaidAmount,
        activeLoans: customerLoans.loanCount,
        totalCollection: customerLoans.totalPaidAmount,
        emiPaidCount: customerLoans.emiPaidCount,
        nextEmiDate: firstLoan ? firstLoan.nextEmiDate : ''
      };
    });
    
    console.log('✅ Admin customers list prepared with loan info (optimized)');
    
    return NextResponse.json({ 
      success: true, 
      count: enhancedCustomers.length,
      total: totalCustomers,
      data: enhancedCustomers,
      pagination: {
        page,
        limit,
        total: totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit),
        hasNextPage: page < Math.ceil(totalCustomers / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Error in admin customers API:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

// POST method for creating new customers (admin-only)
export async function POST(request) {
  try {
    await connectDB();
    const customerData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'phone', 'businessName', 'area', 'loanNumber', 'loanAmount', 'emiAmount', 'loanType'];
    const missingFields = requiredFields.filter(field => !customerData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Check if customer with same phone or loan number already exists
    const existingCustomer = await Customer.findOne({
      $or: [
        { phone: customerData.phone },
        { loanNumber: customerData.loanNumber }
      ]
    });

    if (existingCustomer) {
      return NextResponse.json({ 
        error: 'Customer with same phone number or loan number already exists' 
      }, { status: 400 });
    }

    // Use a default value for createdBy since we're in admin context
    const createdBy = 'super_admin';

    // Create new customer
    const newCustomer = new Customer({
      ...customerData,
      status: 'active',
      createdBy: createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newCustomer.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Customer created successfully',
      data: newCustomer 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE method to delete customer (hard delete)
export async function DELETE(request) {
  try {
    await connectDB();
    const { customerId } = await request.json();

    if (!customerId) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer ID is required' 
      }, { status: 400 });
    }

    // Find and delete the customer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer not found' 
      }, { status: 404 });
    }

    // Delete all EMI payments associated with this customer
    await EMIPayment.deleteMany({ customerId: customerId });
    
    // Delete all loans associated with this customer
    await Loan.deleteMany({ customerId: customerId });

    // Delete the customer
    await Customer.findByIdAndDelete(customerId);

    return NextResponse.json({ 
      success: true,
      message: 'Customer and all associated data deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}