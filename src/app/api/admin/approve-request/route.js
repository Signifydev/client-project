import { NextResponse } from 'next/server';
import Request from '@/lib/models/Request';
import Customer from '@/lib/models/Customer';
import User from '@/lib/models/User';
import Loan from '@/lib/models/Loan';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    await connectDB();
    const { requestId, action, reason, processedBy = 'admin' } = await request.json();

    console.log('🟡 Processing request:', { requestId, action, processedBy });

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
            { phone: { $in: requestedData.phone } },
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

        // Create new customer with ALL required fields
        const customerData = {
          name: requestedData.name,
          phone: requestedData.phone,
          whatsappNumber: requestedData.whatsappNumber || '',
          businessName: requestedData.businessName,
          area: requestedData.area,
          loanNumber: requestedData.loanNumber,
          address: requestedData.address,
          loanAmount: requestedData.loanAmount,
          emiAmount: requestedData.emiAmount,
          loanType: requestedData.loanType,
          category: requestedData.category || 'A',
          officeCategory: requestedData.officeCategory || 'Office 1',
          profilePicture: requestedData.profilePicture,
          fiDocuments: requestedData.fiDocuments || {},
          // ADD THE MISSING REQUIRED FIELDS
          loanDate: requestedData.loanDate ? new Date(requestedData.loanDate) : new Date(),
          loanDays: requestedData.loanDays || 30,
          status: 'active',
          isActive: true,
          userId: requestedData.loginId,
          password: requestedData.password,
          createdBy: requestDoc.createdBy,
          approvedBy: processedBy,
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

        // Create main loan record
        const loanData = {
          customerId: customer._id,
          customerName: customer.name,
          loanNumber: customer.loanNumber,
          amount: customer.loanAmount,
          emiAmount: customer.emiAmount,
          loanType: customer.loanType,
          dateApplied: customer.loanDate,
          loanDays: customer.loanDays,
          status: 'active',
          createdBy: requestDoc.createdBy,
          isMainLoan: true,
          emiPaid: 0,
          totalPaid: 0,
          remainingAmount: customer.loanAmount
        };

        const loan = new Loan(loanData);
        await loan.save();
        console.log('✅ Loan created successfully for customer:', loan._id);

        // Update the existing customer document (created earlier by data entry) to active
        const existingPendingCustomer = await Customer.findById(requestDoc.customerId);
        if (existingPendingCustomer) {
          existingPendingCustomer.status = 'active';
          existingPendingCustomer.isActive = true;
          existingPendingCustomer.approvedBy = processedBy;
          existingPendingCustomer.approvedAt = new Date();
          // Ensure all required fields are set on the existing record too
          if (!existingPendingCustomer.loanDate) {
            existingPendingCustomer.loanDate = customer.loanDate;
          }
          if (!existingPendingCustomer.loanDays) {
            existingPendingCustomer.loanDays = customer.loanDays;
          }
          if (!existingPendingCustomer.category) {
            existingPendingCustomer.category = customer.category;
          }
          if (!existingPendingCustomer.officeCategory) {
            existingPendingCustomer.officeCategory = customer.officeCategory;
          }
          await existingPendingCustomer.save();
          console.log('✅ Updated existing customer to active status');
        }

        // Update the existing loan document to active
        const existingPendingLoan = await Loan.findOne({ 
          customerId: requestDoc.customerId, 
          isMainLoan: true 
        });
        if (existingPendingLoan) {
          existingPendingLoan.status = 'active';
          // Ensure loan has all required fields
          if (!existingPendingLoan.dateApplied) {
            existingPendingLoan.dateApplied = loan.dateApplied;
          }
          if (!existingPendingLoan.loanDays) {
            existingPendingLoan.loanDays = loan.loanDays;
          }
          await existingPendingLoan.save();
          console.log('✅ Updated existing loan to active status');
        }

        // Update request status to 'Approved'
        requestDoc.status = 'Approved';
        requestDoc.reviewedBy = processedBy;
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
          message: 'Customer approved and activated successfully!',
          data: {
            customerId: customer._id,
            customerName: customer.name,
            phone: customer.phone,
            loanNumber: customer.loanNumber,
            status: customer.status
          }
        });

      } else if (requestDoc.type === 'Loan Addition') {
        console.log('📝 Approving loan addition request...');
        
        const requestedData = requestDoc.requestedData;
        
        // Validate required loan data
        if (!requestedData.amount || !requestedData.emiAmount || !requestedData.loanType) {
          return NextResponse.json({ 
            success: false,
            error: 'Missing required loan data in request' 
          }, { status: 400 });
        }

        // Check if customer exists and is active
        const customer = await Customer.findById(requestedData.customerId);
        if (!customer) {
          return NextResponse.json({ 
            success: false,
            error: 'Customer not found' 
          }, { status: 404 });
        }

        if (customer.status !== 'active') {
          return NextResponse.json({ 
            success: false,
            error: 'Customer is not active' 
          }, { status: 400 });
        }

        // Generate unique loan number for additional loan
        const additionalLoanNumber = `ADD_${customer.loanNumber}_${Date.now()}`;

        // Create the additional loan
        const loanData = {
          customerId: customer._id,
          customerName: customer.name,
          loanNumber: additionalLoanNumber,
          amount: Number(requestedData.amount),
          emiAmount: Number(requestedData.emiAmount),
          loanType: requestedData.loanType,
          dateApplied: new Date(requestedData.dateApplied) || new Date(),
          loanDays: Number(requestedData.loanDays) || 30,
          status: 'active',
          createdBy: requestDoc.createdBy,
          isMainLoan: false, // This is an additional loan
          emiPaid: 0,
          totalPaid: 0,
          remainingAmount: Number(requestedData.amount)
        };

        const newLoan = new Loan(loanData);
        await newLoan.save();
        console.log('✅ Additional loan created successfully:', newLoan._id);

        // Update request status
        requestDoc.status = 'Approved';
        requestDoc.reviewedBy = processedBy;
        requestDoc.reviewedByRole = 'admin';
        requestDoc.reviewNotes = reason || 'Loan addition approved by admin';
        requestDoc.actionTaken = `Additional loan created: ${additionalLoanNumber}`;
        requestDoc.reviewedAt = new Date();
        requestDoc.completedAt = new Date();
        requestDoc.updatedAt = new Date();
        
        await requestDoc.save();
        console.log('✅ Loan addition request approved');

        return NextResponse.json({ 
          success: true,
          message: 'Additional loan approved and created successfully!',
          data: {
            loanId: newLoan._id,
            loanNumber: newLoan.loanNumber,
            customerName: customer.name,
            amount: newLoan.amount,
            emiAmount: newLoan.emiAmount,
            loanType: newLoan.loanType,
            status: newLoan.status
          }
        });

      } else {
        // Handle other request types (EDIT requests, etc.)
        return NextResponse.json({ 
          success: false,
          error: 'Unsupported request type for this endpoint' 
        }, { status: 400 });
      }

    } else if (action === 'reject') {
      // Handle rejection logic
      console.log('❌ Rejecting request:', requestDoc._id);
      
      // If it's a new customer request, delete the pending customer and loan
      if (requestDoc.type === 'New Customer' && requestDoc.customerId) {
        try {
          await Customer.findByIdAndDelete(requestDoc.customerId);
          console.log('✅ Deleted pending customer:', requestDoc.customerId);
          
          await Loan.deleteMany({ customerId: requestDoc.customerId });
          console.log('✅ Deleted pending loans for customer');
        } catch (deleteError) {
          console.error('❌ Error deleting pending customer data:', deleteError);
          // Continue with rejection even if deletion fails
        }
      }
      
      // Update request status to 'Rejected'
      requestDoc.status = 'Rejected';
      requestDoc.reviewedBy = processedBy;
      requestDoc.reviewedByRole = 'admin';
      requestDoc.reviewNotes = reason || 'Request rejected by admin';
      requestDoc.actionTaken = 'Request rejected';
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