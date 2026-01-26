import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { loginId, otp } = body;

    if (!loginId || !otp) {
      return NextResponse.json(
        { message: "Login ID and OTP are required" },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ loginId });

    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    if (!customer.otp || !customer.otpExpiresAt) {
      return NextResponse.json(
        { message: "No OTP request found" },
        { status: 400 }
      );
    }

    if (customer.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { message: "OTP expired" },
        { status: 410 }
      );
    }

    const isOtpValid = await bcrypt.compare(otp, customer.otp);

    if (!isOtpValid) {
      return NextResponse.json(
        { message: "Invalid OTP" },
        { status: 401 }
      );
    }

    // ✅ OTP VERIFIED — CLEAR OTP & MARK FIRST LOGIN DONE
    customer.isFirstLogin = false;
    customer.otp = null;
    customer.otpExpiresAt = null;

    await customer.save();

    // 🔐 GENERATE JWT TOKEN
    const token = jwt.sign(
      {
        id: customer._id,
        role: "customer"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        customerNumber: customer.customerNumber,
        businessName: customer.businessName
      }
    });

  } catch (error) {
    console.error("❌ OTP Verification Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
