import { NextResponse } from 'next/server';
import Customer from '@/lib/models/Customer';
import Loan from '@/lib/models/Loan';
import EMIPayment from '@/lib/models/EMIPayment';
import { connectDB } from '@/lib/db';

// ==============================================
// DATE UTILITY FUNCTIONS - FIXED FOR IST TIMEZONE
// ==============================================

/**
 * Convert UTC date to IST for display
 * @param {Date} utcDate - Date in UTC
 * @returns {Date} Date in IST
 */
function convertUTCToIST(utcDate) {
  if (!utcDate) return null;
  
  try {
    const istDate = new Date(utcDate);
    istDate.setHours(istDate.getHours() + 5);
    istDate.setMinutes(istDate.getMinutes() + 30);
    
    return istDate;
  } catch (error) {
    console.error('❌ Error converting UTC to IST:', error);
    return null;
  }
}

/**
 * Format date to DD/MM/YYYY for display (returns IST date)
 * @param {Date} date - Date object
 * @returns {string} Date string in DD/MM/YYYY format (IST)
 */
function formatToDDMMYYYY(date) {
  if (!date) return '';
  
  try {
    // Create a copy to avoid modifying original
    let displayDate = new Date(date);
    
    // If date is stored as UTC, convert to IST
    if (date.toISOString().includes('Z')) {
      displayDate = convertUTCToIST(date);
      if (!displayDate) return '';
    }
    
    const day = String(displayDate.getDate()).padStart(2, '0');
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    const year = displayDate.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('❌ Error formatting date to DD/MM/YYYY:', error);
    return '';
  }
}

/**
 * Format date to YYYY-MM-DD for HTML date input
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatForDateInput(date) {
  if (!date) return '';
  
  try {
    let displayDate = new Date(date);
    
    // If date is stored as UTC, convert to IST
    if (date.toISOString().includes('Z')) {
      displayDate = convertUTCToIST(date);
      if (!displayDate) return '';
    }
    
    const year = displayDate.getFullYear();
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    const day = String(displayDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('❌ Error formatting date for input:', error);
    return '';
  }
}

/**
 * Safely format a date that might be string or Date object
 * @param {any} dateInput - Date input (string or Date object)
 * @returns {string} Formatted date in DD/MM/YYYY or empty string
 */
function safeFormatDate(dateInput) {
  if (!dateInput) return '';
  
  try {
    // If it's already a Date object
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      return formatToDDMMYYYY(dateInput);
    }
    
    // If it's a string, try to parse it
    if (typeof dateInput === 'string') {
      // Try ISO format first
      let date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        return formatToDDMMYYYY(date);
      }
      
      // Try DD/MM/YYYY format
      const parts = dateInput.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        }
      }
    }
    
    return '';
  } catch (error) {
    console.error('❌ Error in safeFormatDate:', error, 'input:', dateInput);
    return '';
  }
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
        // Format loan dates for display
        const dateApplied = loan.dateApplied;
        const emiStartDate = loan.emiStartDate || loan.dateApplied;
        const lastEmiDate = loan.lastEmiDate || loan.dateApplied;
        const nextEmiDate = loan.nextEmiDate;
        const createdAt = loan.createdAt;
        const updatedAt = loan.updatedAt;
        
        // Format dates to DD/MM/YYYY
        const dateAppliedDisplay = safeFormatDate(dateApplied);
        const emiStartDateDisplay = safeFormatDate(emiStartDate);
        const lastEmiDateDisplay = safeFormatDate(lastEmiDate);
        const nextEmiDateDisplay = safeFormatDate(nextEmiDate);
        const createdAtDisplay = safeFormatDate(createdAt);
        const updatedAtDisplay = safeFormatDate(updatedAt);
        
        // Also format dates for input fields (YYYY-MM-DD)
        const dateAppliedInput = formatForDateInput(dateApplied);
        const emiStartDateInput = formatForDateInput(emiStartDate);
        const lastEmiDateInput = formatForDateInput(lastEmiDate);
        const nextEmiDateInput = formatForDateInput(nextEmiDate);
        
        console.log('📅 Loan Date Debug:', {
          loanNumber: loan.loanNumber,
          dateApplied: dateApplied?.toISOString(),
          dateAppliedDisplay,
          emiStartDate: emiStartDate?.toISOString(),
          emiStartDateDisplay,
          nextEmiDate: nextEmiDate?.toISOString(),
          nextEmiDateDisplay,
          shouldMatch: dateAppliedDisplay === emiStartDateDisplay
        });
        
        return {
          _id: loan._id,
          customerId: loan.customerId,
          customerName: loan.customerName,
          customerNumber: loan.customerNumber,
          loanNumber: loan.loanNumber,
          amount: loan.amount,
          emiAmount: loan.emiAmount,
          loanType: loan.loanType,
          // Original dates (as stored in UTC)
          dateApplied: dateApplied,
          emiStartDate: emiStartDate,
          loanDays: loan.loanDays,
          status: loan.status,
          totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
          emiPaidCount: loan.emiPaidCount || 0,
          lastEmiDate: lastEmiDate,
          nextEmiDate: nextEmiDate,
          totalPaidAmount: loan.totalPaidAmount || 0,
          remainingAmount: loan.remainingAmount || loan.amount,
          emiHistory: loan.emiHistory || [],
          createdAt: createdAt,
          updatedAt: updatedAt,
          // Include renewal tracking fields
          isRenewed: loan.isRenewed || false,
          renewedLoanNumber: loan.renewedLoanNumber || '',
          renewedDate: loan.renewedDate || '',
          originalLoanNumber: loan.originalLoanNumber || '',
          // Include EMI type fields
          emiType: loan.emiType || 'fixed',
          customEmiAmount: loan.customEmiAmount || null,
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
          // Debug info (optional, can remove in production)
          _debug: {
            dateAppliedISO: dateApplied?.toISOString(),
            emiStartDateISO: emiStartDate?.toISOString(),
            nextEmiDateISO: nextEmiDate?.toISOString(),
            timezone: 'IST',
            displayFormat: 'DD/MM/YYYY'
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
        const paymentDateDisplay = safeFormatDate(paymentDate);
        const paymentDateInput = formatForDateInput(paymentDate);
        const createdAt = payment.createdAt;
        const createdAtDisplay = safeFormatDate(createdAt);
        
        return {
          _id: payment._id,
          customerId: payment.customerId,
          customerName: payment.customerName,
          loanId: payment.loanId,
          loanNumber: payment.loanNumber,
          emiNumber: payment.emiNumber,
          amount: payment.amount,
          paymentDate: paymentDate,
          paymentDateDisplay: paymentDateDisplay,
          paymentDateInput: paymentDateInput,
          paymentMethod: payment.paymentMethod || 'cash',
          collectedBy: payment.collectedBy || '',
          status: payment.status || 'paid',
          remarks: payment.remarks || '',
          createdAt: createdAt,
          createdAtDisplay: createdAtDisplay
        };
      });
    } catch (emiError) {
      console.error('❌ Error fetching EMI payments:', emiError);
      customerWithLoans.emiPayments = [];
    }

    console.log('✅ Customer details with sorted loans and formatted dates prepared successfully');
    
    // Log sample dates for debugging
    if (customerWithLoans.loans.length > 0) {
      const sampleLoan = customerWithLoans.loans[0];
      console.log('📋 Sample Loan Date Verification:', {
        loanNumber: sampleLoan.loanNumber,
        dateApplied: sampleLoan.dateApplied?.toISOString(),
        dateAppliedDisplay: sampleLoan.dateAppliedDisplay,
        emiStartDate: sampleLoan.emiStartDate?.toISOString(),
        emiStartDateDisplay: sampleLoan.emiStartDateDisplay,
        nextEmiDate: sampleLoan.nextEmiDate?.toISOString(),
        nextEmiDateDisplay: sampleLoan.nextEmiDateDisplay,
        formatCorrect: sampleLoan.dateAppliedDisplay === '10/12/2025' ? 'YES (Expected)' : 'CHECK'
      });
    }

    return NextResponse.json({
      success: true,
      data: customerWithLoans
    });

  } catch (error) {
    console.error('❌ Error fetching customer details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customer details: ' + error.message 
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

    // Handle date fields if present
    if (updateData.dateApplied && typeof updateData.dateApplied === 'string') {
      try {
        // Parse date string to Date object
        updateData.dateApplied = new Date(updateData.dateApplied);
        console.log('📅 Parsed dateApplied:', updateData.dateApplied);
      } catch (dateError) {
        console.error('❌ Error parsing dateApplied:', dateError);
      }
    }
    
    if (updateData.emiStartDate && typeof updateData.emiStartDate === 'string') {
      try {
        updateData.emiStartDate = new Date(updateData.emiStartDate);
        console.log('📅 Parsed emiStartDate:', updateData.emiStartDate);
      } catch (dateError) {
        console.error('❌ Error parsing emiStartDate:', dateError);
      }
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