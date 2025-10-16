import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    console.log('📨 Received edit request:', body);

    const {
      customerId,
      name,
      phone,
      businessName,
      area,
      loanNumber,
      loanAmount,
      emiAmount,
      loanType,
      address,
      requestedBy
    } = body;

    // Validate required fields
    if (!customerId || !name || !phone || !area || !loanNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const existingCustomer = await Customer.findById(customerId);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Existing customer found:', existingCustomer.name);

    // Create edit request - include BOTH createdBy and requestedBy for compatibility
    const editRequest = new Request({
      type: 'New Customer', // Using existing type for compatibility
      customerName: name,
      status: 'Pending',
      requestedBy: requestedBy || 'data_entry_operator_1',
      createdBy: requestedBy || 'data_entry_operator_1', // Add this line
      data: {
        customerId,
        originalData: {
          name: existingCustomer.name,
          phone: existingCustomer.phone,
          businessName: existingCustomer.businessName,
          area: existingCustomer.area,
          loanNumber: existingCustomer.loanNumber,
          loanAmount: existingCustomer.loanAmount,
          emiAmount: existingCustomer.emiAmount,
          loanType: existingCustomer.loanType,
          address: existingCustomer.address
        },
        newData: {
          name,
          phone,
          businessName,
          area,
          loanNumber,
          loanAmount: Number(loanAmount),
          emiAmount: Number(emiAmount),
          loanType,
          address
        },
        isEditRequest: true // Flag to identify edit requests
      }
    });

    await editRequest.save();

    console.log('✅ Edit request saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Edit request submitted successfully. Waiting for admin approval.',
      data: editRequest
    });
  } catch (error) {
    console.error('❌ Error creating edit request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}