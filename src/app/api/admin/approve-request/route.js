import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const { requestId, action } = await request.json();

    console.log('🟡 Processing request:', { requestId, action });

    // Find the request
    const requestDoc = await Request.findById(requestId);
    if (!requestDoc) {
      return NextResponse.json({ 
        success: false,
        error: 'Request not found' 
      }, { status: 404 });
    }

    console.log('🔍 Found request:', {
      type: requestDoc.type,
      customerId: requestDoc.customerId,
      customerName: requestDoc.customerName,
      loanNumber: requestDoc.loanNumber
    });

    if (action === 'approve') {
      // Find and update the customer using customerId (more reliable than loanNumber)
      const customer = await Customer.findById(requestDoc.customerId);
      
      if (!customer) {
        return NextResponse.json({ 
          success: false,
          error: 'Customer not found' 
        }, { status: 404 });
      }

      // Update customer status to active
      customer.status = 'active';
      customer.isActive = true;
      customer.updatedAt = new Date();
      await customer.save();

      console.log('✅ Customer approved:', customer.name);

      // Update request status
      requestDoc.status = 'approved';
      requestDoc.updatedAt = new Date();
      requestDoc.processedBy = 'admin';
      requestDoc.processedAt = new Date();
      await requestDoc.save();

      return NextResponse.json({ 
        success: true,
        message: 'Customer approved successfully',
        data: {
          customerId: customer._id,
          customerName: customer.name,
          status: customer.status
        }
      });

    } else if (action === 'reject') {
      // Find the customer
      const customer = await Customer.findById(requestDoc.customerId);
      
      if (customer) {
        // Delete user account if exists
        await User.findOneAndDelete({ customerId: customer._id });
        
        // Delete the customer
        await Customer.findByIdAndDelete(customer._id);
        console.log('❌ Customer rejected and deleted:', customer.name);
      }

      // Update request status
      requestDoc.status = 'rejected';
      requestDoc.updatedAt = new Date();
      requestDoc.processedBy = 'admin';
      requestDoc.processedAt = new Date();
      await requestDoc.save();

      return NextResponse.json({ 
        success: true,
        message: 'Customer rejected successfully'
      });
    }

    return NextResponse.json({ 
      success: false,
      error: 'Invalid action. Use "approve" or "reject".' 
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error in approve-request:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}