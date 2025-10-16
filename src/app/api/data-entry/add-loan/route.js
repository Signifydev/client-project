import { NextResponse } from 'next/server';

// Mock database - in real app, you'd use a proper database
let loans = [];

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      loanNumber,
      amount,
      dateApplied,
      emiAmount,
      loanType,
      loanDays,
      createdBy
    } = body;

    // Validate required fields
    if (!customerId || !customerName || !loanNumber || !amount || !emiAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique loan ID
    const loanId = `loan_${Date.now()}`;
    
    const newLoan = {
      _id: loanId,
      customerId,
      customerName,
      loanNumber: `${loanNumber}_${loans.filter(loan => loan.customerId === customerId).length + 1}`,
      amount: Number(amount),
      dateApplied,
      emiAmount: Number(emiAmount),
      loanType,
      loanDays: Number(loanDays),
      createdBy,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Add to our mock database
    loans.push(newLoan);

    console.log('New loan created:', newLoan);
    console.log('Total loans for customer:', loans.filter(loan => loan.customerId === customerId).length);

    return NextResponse.json({
      success: true,
      message: 'New loan added successfully',
      data: newLoan
    });

  } catch (error) {
    console.error('Error adding new loan:', error);
    return NextResponse.json(
      { error: 'Failed to add new loan: ' + error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch all loans for a customer
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const customerLoans = loans.filter(loan => loan.customerId === customerId);
    
    return NextResponse.json({
      success: true,
      data: customerLoans
    });

  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loans: ' + error.message },
      { status: 500 }
    );
  }
}