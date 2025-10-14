import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database';
import Loan from '@/lib/models/Loan';
import Customer from '@/lib/models/Customer';
import EMI from '@/lib/models/EMI';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      customerId,
      loanAmount,
      interestRate,
      tenure,
      tenureType,
      startDate,
      endDate,
      dailyEMI,
    } = body;

    // Validate required fields
    if (!customerId || !loanAmount || !interestRate || !tenure || !tenureType || !startDate || !endDate || !dailyEMI) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Calculate total EMI and pending amounts
    const totalEMI = tenure;
    const emiPending = tenure;

    const loan = new Loan({
      customerId,
      loanAmount,
      interestRate,
      tenure,
      tenureType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      dailyEMI,
      totalEMI,
      emiPaid: 0,
      emiPending,
      totalPaid: 0,
      totalPending: loanAmount,
    });

    const savedLoan = await loan.save();

    // Create EMI records for the loan
    const emiRecords = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < tenure; i++) {
      const dueDate = new Date(start);
      
      if (tenureType === 'daily') {
        dueDate.setDate(start.getDate() + i);
      } else if (tenureType === 'weekly') {
        dueDate.setDate(start.getDate() + (i * 7));
      } else if (tenureType === 'monthly') {
        dueDate.setMonth(start.getMonth() + i);
      }

      emiRecords.push({
        loanId: savedLoan._id,
        customerId,
        amount: dailyEMI,
        dueDate,
        status: 'pending',
      });
    }

    await EMI.insertMany(emiRecords);

    return NextResponse.json({
      success: true,
      message: 'Loan created successfully',
      data: savedLoan,
    });

  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    let query = {};
    if (customerId) {
      query = { customerId };
    }

    const loans = await Loan.find(query)
      .populate('customerId', 'name phone businessName')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: loans,
    });

  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}