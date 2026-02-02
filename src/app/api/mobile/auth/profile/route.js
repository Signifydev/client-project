import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';

export async function GET(req) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== 'customer') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const customer = await Customer.findById(decoded.id);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const loans = await Loan.find({
      customerId: customer._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      customer,
      loans,
    });

  } catch (error) {
    console.error('PROFILE API ERROR:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
