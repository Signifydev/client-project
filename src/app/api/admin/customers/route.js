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

export async function POST(request) {
  try {
    await connectDB();
    const customerData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'phone', 'businessName', 'area', 'loanNumber', 'loanAmount', 'emiAmount', 'loanType'];
    const missingFields = requiredFields.filter(field => !customerData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Check if customer with same phone or loan number already exists
    const existingCustomer = await Customer.findOne({
      $or: [
        { phone: customerData.phone },
        { loanNumber: customerData.loanNumber }
      ]
    });

    if (existingCustomer) {
      return NextResponse.json({ 
        error: 'Customer with same phone number or loan number already exists' 
      }, { status: 400 });
    }

    // Use a default value for createdBy since we're in admin context
    const createdBy = 'super_admin';

    // Create new customer
    const newCustomer = new Customer({
      ...customerData,
      status: 'active',
      createdBy: createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newCustomer.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Customer created successfully',
      data: newCustomer 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
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