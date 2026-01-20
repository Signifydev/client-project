import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EMIPayment from '@/lib/models/EMIPayment';

// Date validation function (same as in your existing code)
function isValidYYYYMMDD(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    console.log('📥 Advance payment request:', {
      loanId: body.loanId,
      fromDate: body.fromDate,
      toDate: body.toDate,
      amountPerEmi: body.amountPerEmi,
      loanNumber: body.loanNumber
    });
    
    // Validate required fields
    const requiredFields = [
      'loanId', 
      'fromDate', 
      'toDate', 
      'amountPerEmi',
      'customerId',
      'customerName',
      'loanNumber',
      'collectedBy'
    ];
    
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          missingFields 
        },
        { status: 400 }
      );
    }
    
    // Validate dates
    if (!isValidYYYYMMDD(body.fromDate) || !isValidYYYYMMDD(body.toDate)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date format',
          message: 'Dates must be in YYYY-MM-DD format' 
        },
        { status: 400 }
      );
    }
    
    if (body.fromDate > body.toDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid date range',
          message: 'Start date must be before end date' 
        },
        { status: 400 }
      );
    }
    
    // Validate amount
    const amountPerEmi = parseFloat(body.amountPerEmi);
    if (isNaN(amountPerEmi) || amountPerEmi <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid amount',
          message: 'EMI amount must be a positive number' 
        },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Use the existing EMIPayment.createAdvancePayments method
    const result = await EMIPayment.createAdvancePayments({
      loanId: body.loanId,
      fromDate: body.fromDate,
      toDate: body.toDate,
      amountPerEmi: amountPerEmi,
      collectedBy: body.collectedBy,
      customerId: body.customerId,
      customerName: body.customerName,
      loanNumber: body.loanNumber,
      notes: body.notes || `Advance payment from ${body.fromDate} to ${body.toDate}`
    });
    
    return NextResponse.json({
      success: true,
      payments: result.payments,
      totalAmount: result.totalAmount,
      totalInstallments: result.totalInstallments,
      message: `Successfully created ${result.totalInstallments} advance payments`
    });
    
  } catch (error) {
    console.error('❌ Error creating advance payments:', error);
    
    // Handle specific errors
    if (error.message.includes('Loan not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Loan not found'
        },
        { status: 404 }
      );
    }
    
    if (error.message.includes('Cannot create advance payments')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot create advance payments',
          message: error.message
        },
        { status: 400 }
      );
    }
    
    if (error.message.includes('No valid payment dates')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid payment dates',
          message: error.message
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create advance payments',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const customerId = searchParams.get('customerId');
    const date = searchParams.get('date');
    
    await connectDB();
    
    let query = { paymentType: 'advance' };
    
    if (loanId) query.loanId = loanId;
    if (customerId) query.customerId = customerId;
    if (date) query.paymentDate = date;
    
    const advancePayments = await EMIPayment.find(query)
      .sort({ paymentDate: -1 })
      .limit(100)
      .lean();
    
    // Group by date range for summary
    const groupedPayments = {};
    advancePayments.forEach(payment => {
      const key = `${payment.advanceFromDate}_${payment.advanceToDate}`;
      if (!groupedPayments[key]) {
        groupedPayments[key] = {
          fromDate: payment.advanceFromDate,
          toDate: payment.advanceToDate,
          loanNumber: payment.loanNumber,
          customerName: payment.customerName,
          totalAmount: 0,
          count: 0,
          payments: []
        };
      }
      groupedPayments[key].totalAmount += payment.amount;
      groupedPayments[key].count += 1;
      groupedPayments[key].payments.push(payment);
    });
    
    const summaries = Object.values(groupedPayments);
    
    return NextResponse.json({
      success: true,
      data: {
        advancePayments,
        summaries,
        totalAdvancePayments: advancePayments.length,
        totalAmount: advancePayments.reduce((sum, p) => sum + p.amount, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching advance payments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}