import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function POST(request) {
  let client;
  
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

    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('loan_management_system');

    // Generate unique loan ID
    const loanId = `loan_${Date.now()}`;
    
    const newLoan = {
      _id: loanId,
      customerId,
      customerName,
      loanNumber: loanNumber,
      amount: Number(amount),
      dateApplied,
      emiAmount: Number(emiAmount),
      loanType,
      loanDays: Number(loanDays),
      createdBy,
      status: 'active',
      createdAt: new Date().toISOString(),
      totalEmiCount: Number(loanDays),
      emiPaidCount: 0,
      lastEmiDate: dateApplied,
      nextEmiDate: calculateNextEmiDate(dateApplied, loanType),
      totalPaidAmount: 0,
      remainingAmount: Number(amount),
      emiHistory: []
    };

    // Insert into MongoDB
    const result = await db.collection('loans').insertOne(newLoan);

    console.log('New loan created:', newLoan);

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
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// GET endpoint to fetch all loans for a customer
export async function GET(request) {
  let client;
  
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('loan_management_system');

    // Fetch from MongoDB
    const customerLoans = await db.collection('loans')
      .find({ customerId: customerId })
      .toArray();
    
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
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Helper function to calculate next EMI date
function calculateNextEmiDate(currentDate, loanType) {
  const date = new Date(currentDate);
  
  switch(loanType) {
    case 'Daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'Weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split('T')[0];
}