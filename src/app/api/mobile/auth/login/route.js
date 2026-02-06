import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import Customer from '@/lib/models/Customer';

export async function POST(req) {
  try {
    await connectDB();

    const { loginId, password, deviceId } = await req.json();

    if (!loginId || !password || !deviceId) {
      return NextResponse.json(
        { success: false, message: 'Missing credentials or device info' },
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

    // 🔒 SINGLE DEVICE LOGIN CHECK
    if (
      customer.activeDeviceId &&
      customer.activeDeviceId !== deviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode: 'ACTIVE_SESSION_EXISTS',
          message:
            'You are already logged in on another device. Please logout from that device first.',
        },
        { status: 403 }
      );
    }

    // ✅ LOGIN ALLOWED — SAVE DEVICE
    customer.activeDeviceId = deviceId;
    customer.lastLoginAt = new Date();
    await customer.save();

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
      token,
      customer: {
        name: customer.name,
        customerNumber: customer.customerNumber,
      },
    });

  } catch (error) {
    console.error('MOBILE LOGIN ERROR:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
