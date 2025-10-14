import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Request from '@/lib/models/Request';
import { connectDB } from '@/lib/db';

// GET method to fetch all active customers
export async function GET() {
  try {
    await connectDB();
    // Get all active customers for data entry operators
    const customers = await Customer.find({ status: 'active' }).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST method to add new customer (your existing code)
export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    console.log('Received data:', data); // Debug log
    
    // Create customer with pending status
    const customer = new Customer({
      ...data,
      status: 'pending'
    });
    
    await customer.save();
    
    // Create approval request for super admin
    const approvalRequest = new Request({
      type: 'New Customer',
      customerName: customer.name,
      data: data,
      createdBy: data.createdBy || 'data_entry_operator'
    });
    
    await approvalRequest.save();
    
    return NextResponse.json({ 
      success: true,
      message: 'Customer added successfully! Waiting for admin approval.',
      customer: customer
    });
    
  } catch (error) {
    console.error('Error in API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}