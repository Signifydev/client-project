import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import { generateOTP, hashOTP } from "@/lib/otp";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { loginId, password } = body;

    if (!loginId || !password) {
      return NextResponse.json(
        { message: "Login ID and password required" },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ loginId });

    if (!customer) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (customer.status !== "active" || customer.isActive !== true) {
      return NextResponse.json(
        { message: "Customer not approved or inactive" },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, customer.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 🔐 FIRST LOGIN → OTP
    if (customer.isFirstLogin !== false) {
      const otp = generateOTP();
      const hashedOtp = await hashOTP(otp);

      customer.otp = hashedOtp;
      customer.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      customer.isFirstLogin = true;

      await customer.save();

      // TODO: Integrate SMS API here
      console.log("📨 OTP sent to:", customer.phone?.[0], "OTP:", otp);

      return NextResponse.json({
        success: true,
        otpRequired: true,
        message: "OTP sent to registered mobile number"
      });
    }

    // ✅ NORMAL LOGIN (OTP already verified)
    return NextResponse.json({
      success: true,
      otpRequired: false,
      customerId: customer._id
    });

  } catch (error) {
    console.error("❌ Customer Login Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
