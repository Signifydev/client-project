import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

// ==============================================
// FIXED DATE UTILITY FUNCTIONS - HANDLES BOTH STRINGS AND DATE OBJECTS
// ==============================================

/**
 * Validate if a string is in YYYY-MM-DD format
 */
function isValidYYYYMMDD(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Basic validation
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  return true;
}

/**
 * Convert any date input to YYYY-MM-DD string
 */
function toYYYYMMDD(dateInput) {
  if (!dateInput) return '';
  
  try {
    // If it's already a valid YYYY-MM-DD string
    if (typeof dateInput === 'string' && isValidYYYYMMDD(dateInput)) {
      return dateInput;
    }
    
    // If it's a Date object
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If it's another string format, try to parse
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  } catch (error) {
    console.error('❌ Error converting to YYYY-MM-DD:', error);
  }
  
  return '';
}

/**
 * Format date to DD/MM/YYYY for display - HANDLES BOTH STRINGS AND DATE OBJECTS
 */
function formatToDDMMYYYY(dateInput) {
  if (!dateInput) return '';
  
  try {
    // If it's a string in YYYY-MM-DD format (from new loans)
    if (typeof dateInput === 'string' && isValidYYYYMMDD(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // If it's a Date object (legacy data)
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const day = String(dateInput.getDate()).padStart(2, '0');
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const year = dateInput.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // If it's another string, try to parse
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    
    return '';
  } catch (error) {
    console.error('❌ Error formatting date to DD/MM/YYYY:', error, 'input:', dateInput);
    return '';
  }
}

/**
 * Safely format a date that might be string or Date object
 */
function safeFormatDate(dateInput) {
  return formatToDDMMYYYY(dateInput);
}

// GET method for fetching single customer details by ID
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('🔍 Fetching single customer details for ID:', id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Find customer by ID
    const customer = await Customer.findById(id);
    
    if (!customer) {
      console.log('❌ Customer not found for ID:', id);
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Customer found:', customer.name);

    // Fetch all loans for this customer
    const loans = await Loan.find({ customerId: id }).sort({ createdAt: 1 });
    console.log(`📊 Found ${loans.length} loans for customer ${customer.name}`);

    // Sort loans by loan number (L1, L2, L3, etc.)
    const sortedLoans = loans.sort((a, b) => {
      const extractNumber = (loanNumber) => {
        if (!loanNumber) return 0;
        const match = loanNumber.match(/L(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      
      const aNumber = extractNumber(a.loanNumber);
      const bNumber = extractNumber(b.loanNumber);
      
      return aNumber - bNumber; // Ascending order (L1, L2, L3...)
    });

    console.log('🔢 Loans sorted by loan number:', sortedLoans.map(loan => loan.loanNumber));

    // Format customer creation dates
    const customerCreatedAtDisplay = safeFormatDate(customer.createdAt);
    const customerUpdatedAtDisplay = safeFormatDate(customer.updatedAt);
    
    // Format customer data with sorted loans and DATE FORMATTING
    const customerWithLoans = {
      _id: customer._id,
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      whatsappNumber: customer.whatsappNumber || '',
      businessName: customer.businessName,
      area: customer.area,
      customerNumber: customer.customerNumber,
      loanAmount: customer.loanAmount,
      emiAmount: customer.emiAmount,
      loanType: customer.loanType,
      address: customer.address || '',
      status: customer.status,
      email: customer.email,
      businessType: customer.businessType,
      category: customer.category || 'A',
      officeCategory: customer.officeCategory || 'Office 1',
      createdAt: customer.createdAt,
      createdAtDisplay: customerCreatedAtDisplay,
      updatedAt: customer.updatedAt,
      updatedAtDisplay: customerUpdatedAtDisplay,
      profilePicture: customer.profilePicture,
      fiDocuments: customer.fiDocuments || {},
      loans: sortedLoans.map(loan => {
        // ==============================================
        // FIXED: Handle both string and Date object dates
        // ==============================================
        
        // Get raw date values
        const dateApplied = loan.dateApplied;
        const emiStartDate = loan.emiStartDate || loan.dateApplied;
const lastEmiDate = loan.lastEmiDate; // ← NO DEFAULT! Keep as null if no payments

console.log('📅 Date Debug:', {
  loanNumber: loan.loanNumber,
  dateApplied: loan.dateApplied,
  lastEmiDateInDB: loan.lastEmiDate,
  emiPaidCount: loan.emiPaidCount,
  totalPaidAmount: loan.totalPaidAmount
});
        const nextEmiDate = loan.nextEmiDate;
        const createdAt = loan.createdAt;
        const updatedAt = loan.updatedAt;
        
        // Convert to YYYY-MM-DD strings for consistency
        const dateAppliedStr = toYYYYMMDD(dateApplied);
        const emiStartDateStr = toYYYYMMDD(emiStartDate);
        const lastEmiDateStr = toYYYYMMDD(lastEmiDate);
        const nextEmiDateStr = toYYYYMMDD(nextEmiDate);
        const createdAtStr = toYYYYMMDD(createdAt);
        const updatedAtStr = toYYYYMMDD(updatedAt);
        
        // Format dates to DD/MM/YYYY for display
        const dateAppliedDisplay = safeFormatDate(dateApplied);
        const emiStartDateDisplay = safeFormatDate(emiStartDate);
        const lastEmiDateDisplay = safeFormatDate(lastEmiDate);
        const nextEmiDateDisplay = safeFormatDate(nextEmiDate);
        const createdAtDisplay = safeFormatDate(createdAt);
        const updatedAtDisplay = safeFormatDate(updatedAt);
        
        // Also format dates for input fields (YYYY-MM-DD)
        const dateAppliedInput = dateAppliedStr;
        const emiStartDateInput = emiStartDateStr;
        const lastEmiDateInput = lastEmiDateStr;
        const nextEmiDateInput = nextEmiDateStr;
        
        console.log('📅 Loan Date Debug:', {
          loanNumber: loan.loanNumber,
          dateApplied: dateApplied,
          dateAppliedStr,
          dateAppliedDisplay,
          emiStartDate: emiStartDate,
          emiStartDateStr,
          emiStartDateDisplay,
          nextEmiDate: nextEmiDate,
          nextEmiDateStr,
          nextEmiDateDisplay,
          dateType: typeof dateApplied,
          isString: typeof dateApplied === 'string',
          isValidYYYYMMDD: isValidYYYYMMDD(dateApplied)
        });
        
        // ==============================================
        // FIXED: Include emiScheduleDetails if it exists
        // ==============================================
        const emiScheduleDetails = loan.emiScheduleDetails || null;
        
        // If emiScheduleDetails exists but doesn't have schedule, generate it
        let finalScheduleDetails = emiScheduleDetails;
        if (!emiScheduleDetails && loan.emiType === 'custom' && loan.loanType !== 'Daily') {
          // Generate schedule details for existing custom EMI loans
          console.log(`🔧 Generating schedule for custom EMI loan: ${loan.loanNumber}`);
          finalScheduleDetails = {
            emiType: loan.emiType || 'fixed',
            customEmiAmount: loan.customEmiAmount || null,
            totalInstallments: loan.totalEmiCount || loan.loanDays || 30,
            customInstallmentNumber: loan.totalEmiCount || loan.loanDays || 30, // Last installment
            standardAmount: loan.emiAmount || 0,
            customAmount: loan.customEmiAmount || null,
            schedule: [] // Empty for now, can be generated on frontend
          };
        }
        
        return {
          _id: loan._id,
          customerId: loan.customerId,
          customerName: loan.customerName,
          customerNumber: loan.customerNumber,
          loanNumber: loan.loanNumber,
          amount: loan.amount,
          emiAmount: loan.emiAmount,
          loanType: loan.loanType,
          // Store dates as strings for consistency
          dateApplied: dateAppliedStr,
          emiStartDate: emiStartDateStr,
          loanDays: loan.loanDays,
          status: loan.status,
          totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
          emiPaidCount: loan.emiPaidCount || 0,
          lastEmiDate: lastEmiDateStr,
          nextEmiDate: nextEmiDateStr,
          totalPaidAmount: loan.totalPaidAmount || 0,
          remainingAmount: loan.remainingAmount || loan.amount,
          emiHistory: loan.emiHistory || [],
          createdAt: createdAtStr,
          updatedAt: updatedAtStr,
          // Include renewal tracking fields
          isRenewed: loan.isRenewed || false,
          renewedLoanNumber: loan.renewedLoanNumber || '',
          renewedDate: loan.renewedDate || '',
          originalLoanNumber: loan.originalLoanNumber || '',
          // Include EMI type fields
          emiType: loan.emiType || 'fixed',
          customEmiAmount: loan.customEmiAmount || null,
          // ========== FIX: INCLUDE EMI SCHEDULE DETAILS ==========
          emiScheduleDetails: finalScheduleDetails,
          // ========== ADDED DATE DISPLAY FIELDS ==========
          // Display dates in DD/MM/YYYY format
          dateAppliedDisplay: dateAppliedDisplay,
          emiStartDateDisplay: emiStartDateDisplay,
          lastEmiDateDisplay: lastEmiDateDisplay,
          nextEmiDateDisplay: nextEmiDateDisplay,
          createdAtDisplay: createdAtDisplay,
          updatedAtDisplay: updatedAtDisplay,
          // Input dates in YYYY-MM-DD format (for edit forms)
          dateAppliedInput: dateAppliedInput,
          emiStartDateInput: emiStartDateInput,
          lastEmiDateInput: lastEmiDateInput,
          nextEmiDateInput: nextEmiDateInput,
          // Add original date for backward compatibility
          _rawDates: {
            dateApplied: dateApplied,
            emiStartDate: emiStartDate,
            nextEmiDate: nextEmiDate
          }
        };
      })
    };

    // Fetch EMI payments for this customer
    try {
      const emiPayments = await EMIPayment.find({ customerId: id })
        .sort({ paymentDate: -1 })
        .limit(50); // Limit to last 50 payments
      
      console.log(`💰 Found ${emiPayments.length} EMI payments for customer`);
      
      // Add EMI payments to response
      customerWithLoans.emiPayments = emiPayments.map(payment => {
        const paymentDate = payment.paymentDate;
        const paymentDateStr = toYYYYMMDD(paymentDate);
        const paymentDateDisplay = safeFormatDate(paymentDate);
        const paymentDateInput = paymentDateStr;
        const createdAt = payment.createdAt;
        const createdAtStr = toYYYYMMDD(createdAt);
        const createdAtDisplay = safeFormatDate(createdAt);
        
        return {
          _id: payment._id,
          customerId: payment.customerId,
          customerName: payment.customerName,
          loanId: payment.loanId,
          loanNumber: payment.loanNumber,
          emiNumber: payment.emiNumber,
          amount: payment.amount,
          paymentDate: paymentDateStr,
          paymentDateDisplay: paymentDateDisplay,
          paymentDateInput: paymentDateInput,
          paymentMethod: payment.paymentMethod || 'cash',
          collectedBy: payment.collectedBy || '',
          status: payment.status || 'paid',
          remarks: payment.remarks || '',
          createdAt: createdAtStr,
          createdAtDisplay: createdAtDisplay
        };
      });
    } catch (emiError) {
      console.error('❌ Error fetching EMI payments:', emiError);
      customerWithLoans.emiPayments = [];
    }

    console.log('✅ Customer details prepared successfully');
    
    // Log sample dates and EMI schedule details for debugging
    if (customerWithLoans.loans.length > 0) {
      const sampleLoan = customerWithLoans.loans[0];
      console.log('📋 Sample Loan Date Verification:', {
        loanNumber: sampleLoan.loanNumber,
        dateApplied: sampleLoan.dateApplied,
        dateAppliedDisplay: sampleLoan.dateAppliedDisplay,
        emiStartDate: sampleLoan.emiStartDate,
        emiStartDateDisplay: sampleLoan.emiStartDateDisplay,
        nextEmiDate: sampleLoan.nextEmiDate,
        nextEmiDateDisplay: sampleLoan.nextEmiDateDisplay,
        hasEMIScheduleDetails: !!sampleLoan.emiScheduleDetails,
        emiType: sampleLoan.emiType,
        customEmiAmount: sampleLoan.customEmiAmount
      });
      
      // Log if any loans have custom EMI
      const customEMILoans = customerWithLoans.loans.filter(loan => 
        loan.emiType === 'custom' && loan.loanType !== 'Daily'
      );
      console.log(`📊 Found ${customEMILoans.length} custom EMI loans`);
      
      customEMILoans.forEach((loan, index) => {
        console.log(`🔍 Custom EMI Loan ${index + 1}:`, {
          loanNumber: loan.loanNumber,
          emiType: loan.emiType,
          emiAmount: loan.emiAmount,
          customEmiAmount: loan.customEmiAmount,
          hasScheduleDetails: !!loan.emiScheduleDetails,
          scheduleDetails: loan.emiScheduleDetails ? {
            totalInstallments: loan.emiScheduleDetails.totalInstallments,
            customInstallmentNumber: loan.emiScheduleDetails.customInstallmentNumber,
            scheduleLength: loan.emiScheduleDetails.schedule?.length || 0
          } : null
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: customerWithLoans
    });

  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customer details: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT method to update customer details (for admin approval or edits)
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const updateData = await request.json();

    console.log('🔄 Updating customer with ID:', id);
    console.log('📦 Update data:', updateData);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Handle date fields if present - ensure they're stored as strings
    if (updateData.dateApplied && typeof updateData.dateApplied === 'string') {
      // Already a string, keep it as is
      console.log('📅 Keeping dateApplied as string:', updateData.dateApplied);
    }
    
    if (updateData.emiStartDate && typeof updateData.emiStartDate === 'string') {
      // Already a string, keep it as is
      console.log('📅 Keeping emiStartDate as string:', updateData.emiStartDate);
    }

    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Customer updated successfully:', customer.name);

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });

  } catch (error) {
    console.error('❌ Error updating customer:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update customer: ' + error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE method to delete customer (soft delete)
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    console.log('🗑️ Deleting customer with ID:', id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting status to inactive
    const customer = await Customer.findByIdAndUpdate(
      id,
      { $set: { status: 'inactive' } },
      { new: true }
    );

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Customer soft deleted successfully:', customer.name);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
      data: customer
    });

  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete customer: ' + error.message 
      },
      { status: 500 }
    );
  }
}