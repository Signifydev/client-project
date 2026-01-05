import mongoose from 'mongoose';

// Date utility functions (extracted from your code)
export function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidYYYYMMDD(dateString) {
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

export function formatToYYYYMMDD(dateInput) {
  if (!dateInput) return '';
  
  try {
    if (typeof dateInput === 'string' && isValidYYYYMMDD(dateInput)) {
      return dateInput;
    }
    
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error converting to YYYY-MM-DD:', error);
    return '';
  }
}

export function formatToDDMMYYYY(dateString) {
  if (!isValidYYYYMMDD(dateString)) return '';
  
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

export function addDays(dateString, days) {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return formatToYYYYMMDD(date);
}

function parseDateString(dateString) {
  if (!isValidYYYYMMDD(dateString)) {
    console.error('Invalid date string:', dateString);
    return new Date();
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function cleanId(id) {
  if (!id) return id;
  return id.replace(/(_default|_temp|_new|fallback_)/, '');
}

export function validateAndCleanObjectId(id, fieldName = 'ID') {
  if (!id) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const cleanedId = cleanId(id);
  
  if (!mongoose.Types.ObjectId.isValid(cleanedId)) {
    return { 
      isValid: false, 
      error: `Invalid ${fieldName} format: ${id} (cleaned to: ${cleanedId})` 
    };
  }

  return { 
    isValid: true, 
    cleanedId: new mongoose.Types.ObjectId(cleanedId),
    originalId: id,
    cleanedIdString: cleanedId
  };
}

export function calculateInstallmentNumber(emiStartDate, loanType, paymentDate) {
  if (!emiStartDate || !paymentDate) return 1;
  
  const startDate = parseDateString(emiStartDate);
  const payDate = parseDateString(paymentDate);
  
  const timeDiff = payDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  switch(loanType) {
    case 'Daily':
      return Math.max(1, daysDiff + 1);
    case 'Weekly':
      return Math.max(1, Math.floor(daysDiff / 7) + 1);
    case 'Monthly':
      const monthsDiff = (payDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (payDate.getMonth() - startDate.getMonth());
      return Math.max(1, monthsDiff + 1);
    default:
      return Math.max(1, daysDiff + 1);
  }
}

export function calculateExpectedDueDate(emiStartDate, loanType, installmentNumber) {
  if (!emiStartDate || !installmentNumber || installmentNumber < 1) {
    return emiStartDate;
  }
  
  const startDate = parseDateString(emiStartDate);
  const dueDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      dueDate.setDate(startDate.getDate() + (installmentNumber - 1));
      break;
    case 'Weekly':
      dueDate.setDate(startDate.getDate() + ((installmentNumber - 1) * 7));
      break;
    case 'Monthly':
      dueDate.setMonth(startDate.getMonth() + (installmentNumber - 1));
      break;
    default:
      dueDate.setDate(startDate.getDate() + (installmentNumber - 1));
  }
  
  return formatToYYYYMMDD(dueDate);
}

export function generatePartialChainId(loanId, expectedDueDate, installmentNumber) {
  if (!loanId) {
    console.error('❌ CRITICAL: Cannot generate chain ID without loanId');
    throw new Error('Loan ID is required for chain ID generation');
  }
  
  const cleanLoanId = loanId.toString().replace(/[^a-zA-Z0-9]/g, '_').slice(-12);
  const cleanDate = expectedDueDate.replace(/-/g, '');
  return `partial_${cleanLoanId}_${cleanDate}_${installmentNumber}`;
}

export function calculateLastScheduledEmiDate(emiStartDate, loanType, totalEmisPaid) {
  if (!emiStartDate || totalEmisPaid <= 0) return emiStartDate;
  
  if (!isValidYYYYMMDD(emiStartDate)) {
    console.error('Invalid emiStartDate:', emiStartDate);
    return emiStartDate;
  }
  
  const startDate = parseDateString(emiStartDate);
  let lastScheduledDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
      break;
    case 'Weekly':
      lastScheduledDate.setDate(startDate.getDate() + ((totalEmisPaid - 1) * 7));
      break;
    case 'Monthly':
      lastScheduledDate.setMonth(startDate.getMonth() + (totalEmisPaid - 1));
      break;
    default:
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
  }
  
  return formatToYYYYMMDD(lastScheduledDate);
}

export function calculateNextScheduledEmiDate(lastScheduledEmiDate, loanType, emiStartDate, emiPaidCount, totalEmiCount) {
  if (emiPaidCount >= totalEmiCount) {
    return null;
  }
  
  if (!lastScheduledEmiDate) return emiStartDate || getCurrentDateString();
  
  if (!isValidYYYYMMDD(lastScheduledEmiDate)) {
    console.error('Invalid lastScheduledEmiDate:', lastScheduledEmiDate);
    return emiStartDate || getCurrentDateString();
  }
  
  let nextDate;
  
  switch(loanType) {
    case 'Daily':
      nextDate = addDays(lastScheduledEmiDate, 1);
      break;
    case 'Weekly':
      nextDate = addDays(lastScheduledEmiDate, 7);
      break;
    case 'Monthly':
      const date = parseDateString(lastScheduledEmiDate);
      date.setMonth(date.getMonth() + 1);
      nextDate = formatToYYYYMMDD(date);
      break;
    default:
      nextDate = addDays(lastScheduledEmiDate, 1);
  }
  
  return nextDate;
}