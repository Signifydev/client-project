import { NextResponse } from 'next/server';

// Mock data - in real app, fetch from database
const customers = [
  {
    _id: '1',
    name: 'John Doe',
    phone: '1234567890',
    businessName: 'John Shop',
    area: 'Downtown',
    loanNumber: 'LN001',
    loanAmount: 50000,
    emiAmount: 2000,
    loanType: 'Monthly',
    address: '123 Main St',
    status: 'active',
    email: 'john@example.com',
    createdAt: new Date().toISOString()
  }
];

let loans = []; // This should be the same array from add-loan route

export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Find customer
    const customer = customers.find(c => c._id === id);
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get all loans for this customer
    const customerLoans = loans.filter(loan => loan.customerId === id);

    // Return customer details with loans
    const customerWithLoans = {
      ...customer,
      loans: customerLoans
    };

    return NextResponse.json({
      success: true,
      data: customerWithLoans
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer: ' + error.message },
      { status: 500 }
    );
  }
}