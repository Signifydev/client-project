import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Customer from '@/lib/models/Customer';

export async function POST(req) {
  try {
    await connectDB();

    const { loginId, password } = await req.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing credentials' },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ loginId });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, customer.password);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: customer._id,
        role: 'customer',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      otpRequired: customer.isFirstLogin,
      customerId: customer._id,
      token,
    });

  } catch (error) {
    console.error('MOBILE LOGIN ERROR:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
