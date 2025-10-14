import { NextResponse } from 'next/server';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    const payment = new EMIPayment(data);
    await payment.save();
    
    return NextResponse.json({ 
      message: 'EMI payment recorded successfully!',
      payment
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}