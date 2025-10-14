import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    const requests = await Request.find({ status: 'Pending' }).sort({ createdAt: -1 });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}