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
      status: requestDoc.status,
      hasChanges: !!requestDoc.changes,
      hasRequestedData: !!requestDoc.requestedData
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

        // IMPORTANT: Check if there's already a customer record created by Data Entry
        // If yes, we'll update it instead of creating a new one
        let customer;
        const existingPendingCustomer = await Customer.findOne({
          loanNumber: requestedData.loanNumber,
          status: 'pending'
        });

        if (existingPendingCustomer) {
          console.log('🔄 Found existing pending customer, updating to active...');
          // Update the existing pending customer to active
          existingPendingCustomer.status = 'active';
          existingPendingCustomer.isActive = true;
          existingPendingCustomer.approvedBy = processedBy;
          existingPendingCustomer.approvedAt = new Date();
          existingPendingCustomer.updatedAt = new Date();
          
          // Ensure all required fields are set
          existingPendingCustomer.name = requestedData.name;
          existingPendingCustomer.phone = requestedData.phone;
          existingPendingCustomer.whatsappNumber = requestedData.whatsappNumber || '';
          existingPendingCustomer.businessName = requestedData.businessName;
          existingPendingCustomer.area = requestedData.area;
          existingPendingCustomer.address = requestedData.address;
          existingPendingCustomer.loanAmount = requestedData.loanAmount;
          existingPendingCustomer.emiAmount = requestedData.emiAmount;
          existingPendingCustomer.loanType = requestedData.loanType;
          existingPendingCustomer.category = requestedData.category || 'A';
          existingPendingCustomer.officeCategory = requestedData.officeCategory || 'Office 1';
          existingPendingCustomer.loanDate = requestedData.loanDate ? new Date(requestedData.loanDate) : new Date();
          existingPendingCustomer.loanDays = requestedData.loanDays || 30;
          existingPendingCustomer.userId = requestedData.loginId;
          existingPendingCustomer.password = requestedData.password;
          
          await existingPendingCustomer.save();
          customer = existingPendingCustomer;
          console.log('✅ Updated existing pending customer to active status');
        } else {
          console.log('🆕 Creating new customer record...');
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

          customer = new Customer(customerData);
          await customer.save();
          console.log('✅ New customer created:', customer._id);
        }

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

        // Check if there's already a pending loan for this customer
        let mainLoan;
        const existingPendingLoan = await Loan.findOne({ 
          customerId: customer._id, 
          isMainLoan: true 
        });

        if (existingPendingLoan) {
          console.log('🔄 Found existing pending loan, updating to active...');
          // Update the existing loan to active
          existingPendingLoan.status = 'active';
          existingPendingLoan.amount = customer.loanAmount;
          existingPendingLoan.emiAmount = customer.emiAmount;
          existingPendingLoan.loanType = customer.loanType;
          existingPendingLoan.dateApplied = customer.loanDate;
          existingPendingLoan.loanDays = customer.loanDays;
          existingPendingLoan.remainingAmount = customer.loanAmount;
          existingPendingLoan.updatedAt = new Date();
          
          await existingPendingLoan.save();
          mainLoan = existingPendingLoan;
          console.log('✅ Updated existing loan to active status');
        } else {
          console.log('🆕 Creating new main loan record...');
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

          mainLoan = new Loan(loanData);
          await mainLoan.save();
          console.log('✅ Loan created successfully for customer:', mainLoan._id);
        }

        // Update request status to 'Approved'
        requestDoc.status = 'Approved';
        requestDoc.customerId = customer._id; // Link the request to the customer
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

      } else if (requestDoc.type === 'EDIT' || requestDoc.type === 'Customer Edit') {
        // UPDATED: Handle both 'EDIT' and 'Customer Edit' types
        console.log('📝 Processing EDIT/Customer Edit request...');
        
        const customerId = requestDoc.customerId;
        
        if (!customerId) {
          return NextResponse.json({ 
            success: false,
            error: 'Customer ID not found in EDIT request' 
          }, { status: 400 });
        }

        // Find the existing customer
        const existingCustomer = await Customer.findById(customerId);
        if (!existingCustomer) {
          return NextResponse.json({ 
            success: false,
            error: 'Customer not found for editing' 
          }, { status: 404 });
        }

        console.log('🔍 Found customer to edit:', {
          customerId: existingCustomer._id,
          name: existingCustomer.name,
          currentStatus: existingCustomer.status
        });

        // Apply the changes from the request
        // Use requestedData for Customer Edit type, changes for EDIT type
        const changes = requestDoc.changes || requestDoc.requestedData || {};
        console.log('📋 Changes to apply:', changes);

        // Update customer fields with the changes
        const updatableFields = [
          'name', 'phone', 'whatsappNumber', 'businessName', 'area', 'address',
          'loanAmount', 'emiAmount', 'loanType', 'category', 'officeCategory',
          'profilePicture', 'fiDocuments', 'loanDate', 'loanDays'
        ];

        let updatedFields = [];
        updatableFields.forEach(field => {
          if (changes[field] !== undefined && changes[field] !== null) {
            existingCustomer[field] = changes[field];
            updatedFields.push(field);
          }
        });

        // Update timestamps
        existingCustomer.updatedAt = new Date();
        existingCustomer.lastEditedBy = processedBy;
        existingCustomer.lastEditDate = new Date();

        // Save the updated customer
        await existingCustomer.save();
        console.log('✅ Customer updated successfully. Fields changed:', updatedFields);

        // If loan details were changed, update the main loan as well
        if (changes.loanAmount || changes.emiAmount || changes.loanType) {
          const mainLoan = await Loan.findOne({ 
            customerId: customerId, 
            isMainLoan: true 
          });

          if (mainLoan) {
            if (changes.loanAmount) {
              mainLoan.amount = changes.loanAmount;
              mainLoan.remainingAmount = changes.loanAmount - mainLoan.totalPaid;
            }
            if (changes.emiAmount) mainLoan.emiAmount = changes.emiAmount;
            if (changes.loanType) mainLoan.loanType = changes.loanType;
            
            mainLoan.updatedAt = new Date();
            await mainLoan.save();
            console.log('✅ Main loan updated successfully');
          }
        }

        // Update request status to 'Approved'
        requestDoc.status = 'Approved';
        requestDoc.reviewedBy = processedBy;
        requestDoc.reviewedByRole = 'admin';
        requestDoc.reviewNotes = reason || 'Customer edit approved by admin';
        requestDoc.actionTaken = `Customer details updated. Fields modified: ${updatedFields.join(', ')}`;
        requestDoc.reviewedAt = new Date();
        requestDoc.completedAt = new Date();
        requestDoc.updatedAt = new Date();
        
        await requestDoc.save();
        console.log('✅ EDIT request approved and completed');

        return NextResponse.json({ 
          success: true,
          message: 'Customer edit approved successfully!',
          data: {
            customerId: existingCustomer._id,
            customerName: existingCustomer.name,
            updatedFields: updatedFields,
            status: existingCustomer.status
          }
        });

      } else {
        return NextResponse.json({ 
          success: false,
          error: 'Unsupported request type: ' + requestDoc.type
        }, { status: 400 });
      }

    } else if (action === 'reject') {
      // Handle rejection logic
      console.log('❌ Rejecting request:', requestDoc._id);
      
      // If it's a new customer request, delete the pending customer and loan
      if (requestDoc.type === 'New Customer') {
        try {
          // Delete any pending customer with this loan number
          await Customer.deleteMany({ 
            loanNumber: requestDoc.loanNumber,
            status: 'pending' 
          });
          console.log('✅ Deleted pending customers with loan number:', requestDoc.loanNumber);
          
          // Delete any pending loans for this customer
          if (requestDoc.customerId) {
            await Loan.deleteMany({ customerId: requestDoc.customerId });
            console.log('✅ Deleted pending loans for customer:', requestDoc.customerId);
          }
        } catch (deleteError) {
          console.error('❌ Error deleting pending customer data:', deleteError);
          // Continue with rejection even if deletion fails
        }
      } else if (requestDoc.type === 'EDIT' || requestDoc.type === 'Customer Edit') {
        // For EDIT requests, just reject without deleting customer data
        console.log('❌ Rejecting EDIT request - keeping original customer data');
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