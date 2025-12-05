import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

// GET method for fetching single customer details by ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('🔍 Fetching single customer details for ID:', id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Find customer by ID
    const customer = await Customer.findById(id);
    
    if (!customer) {
      console.log('❌ Customer not found for ID:', id);
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Customer found:', customer.name);

    // Fetch all loans for this customer
    const loans = await Loan.find({ customerId: id }).sort({ createdAt: 1 });
    console.log(`📊 Found ${loans.length} loans for customer ${customer.name}`);

    // Sort loans by loan number (L1, L2, L3, etc.)
    const sortedLoans = loans.sort((a, b) => {
      const extractNumber = (loanNumber) => {
        if (!loanNumber) return 0;
        const match = loanNumber.match(/L(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const aNumber = extractNumber(a.loanNumber);
      const bNumber = extractNumber(b.loanNumber);
      
      return aNumber - bNumber; // Ascending order (L1, L2, L3...)
    });

    console.log('🔢 Loans sorted by loan number:', sortedLoans.map(loan => loan.loanNumber));

    // Format customer data with sorted loans
    const customerWithLoans = {
      _id: customer._id,
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      whatsappNumber: customer.whatsappNumber || '',
      businessName: customer.businessName,
      area: customer.area,
      customerNumber: customer.customerNumber,
      loanAmount: customer.loanAmount,
      emiAmount: customer.emiAmount,
      loanType: customer.loanType,
      address: customer.address || '',
      status: customer.status,
      email: customer.email,
      businessType: customer.businessType,
      category: customer.category || 'A',
      officeCategory: customer.officeCategory || 'Office 1',
      createdAt: customer.createdAt,
      profilePicture: customer.profilePicture,
      fiDocuments: customer.fiDocuments || {},
      loans: sortedLoans.map(loan => ({
        _id: loan._id,
        customerId: loan.customerId,
        customerName: loan.customerName,
        customerNumber: loan.customerNumber,
        loanNumber: loan.loanNumber,
        amount: loan.amount,
        emiAmount: loan.emiAmount,
        loanType: loan.loanType,
        dateApplied: loan.dateApplied,
        emiStartDate: loan.emiStartDate || loan.dateApplied,
        loanDays: loan.loanDays,
        status: loan.status,
        totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
        emiPaidCount: loan.emiPaidCount || 0,
        lastEmiDate: loan.lastEmiDate || loan.dateApplied,
        nextEmiDate: loan.nextEmiDate,
        totalPaidAmount: loan.totalPaidAmount || 0,
        remainingAmount: loan.remainingAmount || loan.amount,
        emiHistory: loan.emiHistory || [],
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
        // Include renewal tracking fields
        isRenewed: loan.isRenewed || false,
        renewedLoanNumber: loan.renewedLoanNumber || '',
        renewedDate: loan.renewedDate || '',
        originalLoanNumber: loan.originalLoanNumber || '',
        // Include EMI type fields
        emiType: loan.emiType || 'fixed',
        customEmiAmount: loan.customEmiAmount || null
      }))
    };

    console.log('✅ Customer details with sorted loans prepared successfully');

    return NextResponse.json({
      success: true,
      data: customerWithLoans
    });

  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customer details: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// PUT method to update customer details (for admin approval or edits)
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const updateData = await request.json();

    console.log('🔄 Updating customer with ID:', id);
    console.log('📦 Update data:', updateData);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Customer updated successfully:', customer.name);

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });

  } catch (error) {
    console.error('❌ Error updating customer:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update customer: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE method to delete customer (soft delete)
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('🗑️ Deleting customer with ID:', id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting status to inactive
    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: { status: 'inactive' } },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Customer soft deleted successfully:', customer.name);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
      data: customer
    });

  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete customer: ' + error.message 
      },
      { status: 500 }
    );
  }
}