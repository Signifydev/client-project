import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const { requestId, action } = await request.json();

    // Find the request
    const requestDoc = await Request.findById(requestId);
    if (!requestDoc) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Find and update the customer using loanNumber
      const customer = await Customer.findOne({ 
        loanNumber: requestDoc.data.loanNumber 
      });
      
      if (customer) {
        customer.status = 'active';
        await customer.save();
        console.log('Customer approved:', customer.name);
      } else {
        console.log('Customer not found with loan number:', requestDoc.data.loanNumber);
      }

      // Update request status
      requestDoc.status = 'Approved';
      await requestDoc.save();

      return NextResponse.json({ 
        success: true,
        message: 'Customer approved successfully' 
      });
    } else if (action === 'reject') {
      // Delete the customer
      await Customer.findOneAndDelete({ 
        loanNumber: requestDoc.data.loanNumber 
      });
      
      // Update request status
      requestDoc.status = 'Rejected';
      await requestDoc.save();

      return NextResponse.json({ 
        success: true,
        message: 'Customer rejected successfully' 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in approve-request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}