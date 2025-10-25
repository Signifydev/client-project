import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request) {
  const body = await request.json();
  return NextResponse.json({
    success: true,
    message: 'POST is working!',
    received: body
  });
}