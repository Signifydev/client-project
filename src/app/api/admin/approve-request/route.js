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
      customerNumber: requestDoc.customerNumber,
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
        
        // FIXED: Use customerNumber instead of loanNumber for duplicate check
        const existingCustomer = await Customer.findOne({
          $or: [
            { phone: { $in: requestedData.phone } },
            { customerNumber: requestedData.customerNumber }
          ],
          status: 'active'
        });

        if (existingCustomer) {
          return NextResponse.json({ 
            success: false,
            error: 'Customer with this phone number or customer number already exists'
          }, { status: 409 });
        }

        // FIXED: Check for existing customer using customerNumber
        const existingPendingCustomer = await Customer.findOne({
          customerNumber: requestedData.customerNumber,
          status: 'pending'
        });

        // FIXED: Declare customer variable at the start
        let customer;

        if (existingPendingCustomer) {
          console.log('🔄 Found existing pending customer, updating to active...');
          // Update the existing pending customer to active
          existingPendingCustomer.status = 'active';
          existingPendingCustomer.isActive = true;
          existingPendingCustomer.approvedBy = processedBy;
          existingPendingCustomer.approvedAt = new Date();
          existingPendingCustomer.updatedAt = new Date();
          
          // FIXED: Use new required fields
          existingPendingCustomer.name = requestedData.name;
          existingPendingCustomer.phone = requestedData.phone;
          existingPendingCustomer.whatsappNumber = requestedData.whatsappNumber || '';
          existingPendingCustomer.businessName = requestedData.businessName;
          existingPendingCustomer.area = requestedData.area;
          existingPendingCustomer.address = requestedData.address;
          existingPendingCustomer.customerNumber = requestedData.customerNumber;
          existingPendingCustomer.category = requestedData.category || 'A';
          existingPendingCustomer.officeCategory = requestedData.officeCategory || 'Office 1';
          existingPendingCustomer.loginId = requestedData.loginId;
          existingPendingCustomer.password = requestedData.password;
          
          await existingPendingCustomer.save();
          customer = existingPendingCustomer;
          console.log('✅ Updated existing pending customer to active status');
        } else {
          console.log('🆕 Creating new customer record...');
          // FIXED: Create customer with new schema (without loan fields)
          const customerData = {
            name: requestedData.name,
            phone: requestedData.phone,
            whatsappNumber: requestedData.whatsappNumber || '',
            businessName: requestedData.businessName,
            area: requestedData.area,
            customerNumber: requestedData.customerNumber,
            address: requestedData.address,
            category: requestedData.category || 'A',
            officeCategory: requestedData.officeCategory || 'Office 1',
            profilePicture: requestedData.profilePicture,
            fiDocuments: requestedData.fiDocuments || {},
            status: 'active',
            isActive: true,
            loginId: requestedData.loginId,
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

        // FIXED: Create the main loan (L1) with loan details from requestedData
        console.log('🆕 Creating main loan record (L1)...');
        
        // Calculate next EMI date
        const calculateNextEmiDate = (loanDate, loanType) => {
          const date = new Date(loanDate || new Date());
          switch(loanType) {
            case 'Daily':
              date.setDate(date.getDate() + 1);
              break;
            case 'Weekly':
              date.setDate(date.getDate() + 7);
              break;
            case 'Monthly':
              date.setMonth(date.getMonth() + 1);
              break;
          }
          return date;
        };

        const loanData = {
          customerId: customer._id,
          customerName: customer.name,
          customerNumber: customer.customerNumber,
          loanNumber: 'L1',
          amount: requestedData.loanAmount,
          emiAmount: requestedData.emiAmount,
          loanType: requestedData.loanType,
          dateApplied: requestedData.loanDate ? new Date(requestedData.loanDate) : new Date(),
          loanDays: requestedData.loanDays || 30,
          status: 'active',
          createdBy: requestDoc.createdBy,
          totalEmiCount: requestedData.loanDays || 30,
          emiPaidCount: 0,
          lastEmiDate: null,
          nextEmiDate: calculateNextEmiDate(requestedData.loanDate, requestedData.loanType),
          totalPaidAmount: 0,
          remainingAmount: requestedData.loanAmount
        };

        const mainLoan = new Loan(loanData);
        await mainLoan.save();
        console.log('✅ Main loan (L1) created successfully:', mainLoan._id);

        // Update request status to 'Approved'
        requestDoc.status = 'Approved';
        requestDoc.customerId = customer._id;
        requestDoc.reviewedBy = processedBy;
        requestDoc.reviewedByRole = 'admin';
        requestDoc.reviewNotes = reason || 'Customer approved by admin';
        requestDoc.actionTaken = 'Customer account created successfully with loan L1';
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
            customerNumber: customer.customerNumber,
            loanNumber: 'L1',
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

        // FIXED: Generate sequential loan number (L2, L3, etc.)
        const existingLoans = await Loan.find({ customerId: customer._id });
        const nextLoanNumber = `L${existingLoans.length + 1}`;

        // Calculate next EMI date
        const calculateNextEmiDate = (loanDate, loanType) => {
          const date = new Date(loanDate || new Date());
          switch(loanType) {
            case 'Daily':
              date.setDate(date.getDate() + 1);
              break;
            case 'Weekly':
              date.setDate(date.getDate() + 7);
              break;
            case 'Monthly':
              date.setMonth(date.getMonth() + 1);
              break;
          }
          return date;
        };

        // Create the additional loan
        const loanData = {
          customerId: customer._id,
          customerName: customer.name,
          customerNumber: customer.customerNumber,
          loanNumber: nextLoanNumber,
          amount: Number(requestedData.amount),
          emiAmount: Number(requestedData.emiAmount),
          loanType: requestedData.loanType,
          dateApplied: new Date(requestedData.dateApplied) || new Date(),
          loanDays: Number(requestedData.loanDays) || 30,
          status: 'active',
          createdBy: requestDoc.createdBy,
          totalEmiCount: Number(requestedData.loanDays) || 30,
          emiPaidCount: 0,
          lastEmiDate: null,
          nextEmiDate: calculateNextEmiDate(requestedData.dateApplied, requestedData.loanType),
          totalPaidAmount: 0,
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
        requestDoc.actionTaken = `Additional loan created: ${nextLoanNumber}`;
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
            customerNumber: customer.customerNumber,
            amount: newLoan.amount,
            emiAmount: newLoan.emiAmount,
            loanType: newLoan.loanType,
            status: newLoan.status
          }
        });

      } else if (requestDoc.type === 'EDIT' || requestDoc.type === 'Customer Edit') {
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
        const changes = requestDoc.changes || requestDoc.requestedData || {};
        console.log('📋 Changes to apply:', changes);

        // FIXED: Update customer fields with new schema
        const updatableFields = [
          'name', 'phone', 'whatsappNumber', 'businessName', 'area', 'address',
          'customerNumber', 'category', 'officeCategory', 'loginId', 'password',
          'profilePicture', 'fiDocuments'
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

        // If loan details were changed in EDIT, update the corresponding loan
        if (changes.loanAmount || changes.emiAmount || changes.loanType) {
          // Find the main loan (L1) for this customer
          const mainLoan = await Loan.findOne({ 
            customerId: customerId,
            loanNumber: 'L1'
          });

          if (mainLoan) {
            if (changes.loanAmount) {
              mainLoan.amount = changes.loanAmount;
              mainLoan.remainingAmount = changes.loanAmount - mainLoan.totalPaidAmount;
            }
            if (changes.emiAmount) mainLoan.emiAmount = changes.emiAmount;
            if (changes.loanType) {
              mainLoan.loanType = changes.loanType;
              // Recalculate next EMI date based on new loan type
              const calculateNextEmiDate = (lastEmiDate, loanType) => {
                const date = new Date(lastEmiDate || mainLoan.dateApplied);
                switch(loanType) {
                  case 'Daily':
                    date.setDate(date.getDate() + 1);
                    break;
                  case 'Weekly':
                    date.setDate(date.getDate() + 7);
                    break;
                  case 'Monthly':
                    date.setMonth(date.getMonth() + 1);
                    break;
                }
                return date;
              };
              mainLoan.nextEmiDate = calculateNextEmiDate(mainLoan.lastEmiDate, changes.loanType);
            }
            
            mainLoan.updatedAt = new Date();
            await mainLoan.save();
            console.log('✅ Main loan (L1) updated successfully');
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
            customerNumber: existingCustomer.customerNumber,
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
      
      if (requestDoc.type === 'New Customer') {
        try {
          // FIXED: Delete using customerNumber instead of loanNumber
          await Customer.deleteMany({ 
            customerNumber: requestDoc.customerNumber,
            status: 'pending' 
          });
          console.log('✅ Deleted pending customers with customer number:', requestDoc.customerNumber);
          
          if (requestDoc.customerId) {
            await Loan.deleteMany({ customerId: requestDoc.customerId });
            console.log('✅ Deleted pending loans for customer:', requestDoc.customerId);
          }
        } catch (deleteError) {
          console.error('❌ Error deleting pending customer data:', deleteError);
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