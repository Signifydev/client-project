import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import Customer from "@/lib/models/Customer";

export async function POST(req) {
  try {
    await connectDB();

    const { loginId, password, deviceId } = await req.json();

    if (!loginId || !password || !deviceId) {
      return NextResponse.json(
        { success: false, message: "Missing credentials" },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ loginId });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (customer.status !== "active" || customer.isActive !== true) {
      return NextResponse.json(
        { success: false, message: "Customer not approved or inactive" },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, customer.password);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
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
          errorCode: "ACTIVE_SESSION_EXISTS",
          message:
            "You are already logged in on another device. Please logout from that device first."
        },
        { status: 403 }
      );
    }

    // ✅ REGISTER DEVICE SESSION
    customer.activeDeviceId = deviceId;
    customer.lastLoginAt = new Date();
    await customer.save();

    // 🔐 ISSUE JWT
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
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        customerNumber: customer.customerNumber,
        businessName: customer.businessName
      }
    });

  } catch (error) {
    console.error("❌ Customer Login Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
