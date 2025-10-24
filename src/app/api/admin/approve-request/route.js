import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const { requestId, action, reason } = await request.json();

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
      customerName: requestDoc.customerName,
      loanNumber: requestDoc.loanNumber,
      status: requestDoc.status
    });

    if (action === 'approve') {
      // Handle approval logic
      if (requestDoc.type === 'New Customer') {
        // For NEW customer requests - create the customer from requestedData
        console.log('📝 Creating new customer from request data...');
        
        const requestedData = requestDoc.requestedData;
        
        // Final duplicate check before creating customer
        const existingCustomer = await Customer.findOne({
          $or: [
            { phone: requestedData.phone },
            { loanNumber: requestedData.loanNumber }
          ],
          status: 'active'
        });

        if (existingCustomer) {
          return NextResponse.json({ 
            success: false,
            error: 'Customer with this phone number or loan number already exists'
          }, { status: 409 });
        }

        // Create new customer
        const customerData = {
          name: requestedData.name,
          phone: requestedData.phone,
          businessName: requestedData.businessName,
          area: requestedData.area,
          loanNumber: requestedData.loanNumber,
          address: requestedData.address,
          loanAmount: requestedData.loanAmount,
          emiAmount: requestedData.emiAmount,
          loanType: requestedData.loanType,
          profilePicture: requestedData.profilePicture,
          fiDocuments: requestedData.fiDocuments,
          status: 'active',
          isActive: true,
          createdBy: requestDoc.createdBy,
          approvedBy: 'admin',
          approvedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const customer = new Customer(customerData);
        await customer.save();
        console.log('✅ New customer created:', customer._id);

        // Create user account for customer login if credentials provided
        if (requestedData.loginId && requestedData.password) {
          try {
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.hash(requestedData.password, 10);
            
            const userData = {
              customerId: customer._id,
              loginId: requestedData.loginId,
              password: hashedPassword,
              role: 'customer',
              email: requestedData.loginId + '@customer.com',
              status: 'active',
              createdBy: requestDoc.createdBy
            };

            const user = new User(userData);
            await user.save();
            console.log('✅ User created successfully for customer');
            
          } catch (error) {
            console.error('❌ Error creating user:', error);
            // Continue even if user creation fails
          }
        }

        // In the approval section for New Customer requests, update the loan creation part:

// Create main loan record
const loanData = {
  customerId: customer._id,
  customerName: customer.name,
  loanNumber: customer.loanNumber,
  loanAmount: customer.loanAmount,
  emiAmount: customer.emiAmount,
  loanType: customer.loanType,
  dateApplied: new Date(requestedData.loanDate) || new Date(),
  loanDays: requestedData.loanDays || 30,
  status: 'active',
  createdBy: requestDoc.createdBy,
  emiPaid: 0,
  totalPaid: 0,
  remainingAmount: customer.loanAmount
};

const loan = new Loan(loanData);
await loan.save();
console.log('✅ Loan created successfully for customer:', loan._id);

        // Update request status to 'Approved' (capital A to match enum)
        requestDoc.status = 'Approved';
        requestDoc.reviewedBy = 'admin';
        requestDoc.reviewedByRole = 'admin';
        requestDoc.reviewNotes = reason || 'Customer approved by admin';
        requestDoc.actionTaken = 'Customer account created successfully';
        requestDoc.reviewedAt = new Date();
        requestDoc.completedAt = new Date();
        requestDoc.updatedAt = new Date();
        
        await requestDoc.save();
        console.log('✅ Request marked as Approved');

        return NextResponse.json({ 
          success: true,
          message: 'Customer approved and created successfully!',
          data: {
            customerId: customer._id,
            customerName: customer.name,
            phone: customer.phone,
            loanNumber: customer.loanNumber,
            status: customer.status
          }
        });

      } else {
        // Handle other request types (EDIT requests, etc.)
        return NextResponse.json({ 
          success: false,
          error: 'Only New Customer requests can be approved via this endpoint'
        }, { status: 400 });
      }

    } else if (action === 'reject') {
      // Handle rejection logic
      console.log('❌ Rejecting request:', requestDoc._id);
      
      // Update request status to 'Rejected' (capital R to match enum)
      requestDoc.status = 'Rejected';
      requestDoc.reviewedBy = 'admin';
      requestDoc.reviewedByRole = 'admin';
      requestDoc.reviewNotes = reason || 'Request rejected by admin';
      requestDoc.actionTaken = 'Request rejected, no customer created';
      requestDoc.reviewedAt = new Date();
      requestDoc.completedAt = new Date();
      requestDoc.updatedAt = new Date();
      
      await requestDoc.save();
      console.log('✅ Request marked as Rejected');

      return NextResponse.json({ 
        success: true,
        message: 'Request rejected successfully'
      });

    } else {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid action. Use "approve" or "reject".' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in approve-request:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}