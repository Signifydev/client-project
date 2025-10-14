import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    const customers = await Customer.find({ status: 'active' }).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { customerId } = await request.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Find and delete the customer
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Delete all EMI payments associated with this customer
    await EMIPayment.deleteMany({ customerId: customerId });

    // Delete the customer
    await Customer.findByIdAndDelete(customerId);

    return NextResponse.json({ 
      success: true,
      message: 'Customer and all associated data deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}