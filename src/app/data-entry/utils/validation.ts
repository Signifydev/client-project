import { 
  Customer, 
  NewCustomerStep1, 
  NewCustomerStep2, 
  NewCustomerStep3,
  CustomerNumberSuggestion 
} from '@/src/app/data-entry/types/dataEntry';

// ==================== CUSTOMER NUMBER FIXES ====================

/**
 * Extract ONLY the numeric part from customer number
 * Removes "CN", letters, spaces, and leading zeros
 * Examples: "CN105" → "105", "0105" → "105", "CN0105" → "105"
 */
export const extractNumericPart = (customerNumber: string): string => {
  if (!customerNumber) return '';
  // Remove all non-digit characters
  const numbersOnly = customerNumber.replace(/\D/g, '');
  // Remove leading zeros
  return numbersOnly.replace(/^0+/, '');
};

/**
 * Normalize customer number to standard format
 * Examples: "105" → "CN105", "0105" → "CN105"
 */
export const normalizeCustomerNumber = (customerNumber: string): string => {
  const numericPart = extractNumericPart(customerNumber);
  if (!numericPart) return '';
  return `CN${numericPart}`;
};

/**
 * Check if customer number already exists (COMPARE BY NUMERIC VALUE ONLY)
 */
export const isCustomerNumberExists = (customerNumber: string, customers: Customer[]): boolean => {
  if (!customerNumber || !customers || customers.length === 0) return false;
  
  const inputNumeric = extractNumericPart(customerNumber);
  if (!inputNumeric) return false;
  
  return customers.some(customer => {
    if (!customer.customerNumber) return false;
    const existingNumeric = extractNumericPart(customer.customerNumber);
    return existingNumeric === inputNumeric;
  });
};

export const getNextAvailableCustomerNumber = (customers: Customer[]): string => {
  if (customers.length === 0) return 'CN1001';
  
  const allNumbers = customers
    .map(customer => {
      if (!customer.customerNumber) return 0;
      const numericPart = extractNumericPart(customer.customerNumber);
      return parseInt(numericPart) || 0;
    })
    .filter(num => num > 0);
  
  if (allNumbers.length === 0) return 'CN1001';
  
  const maxNumber = Math.max(...allNumbers);
  const nextNumber = maxNumber + 1;
  
  return `CN${nextNumber}`;
};

/**
 * Generate customer number suggestions based on existing numbers
 */
export const generateCustomerNumberSuggestions = (
  customerNumber: string,
  existingCustomers: Customer[]
): CustomerNumberSuggestion[] => {
  const suggestions: CustomerNumberSuggestion[] = [];
  
  const numericInput = extractNumericPart(customerNumber);
  const baseNumber = parseInt(numericInput) || 1001;
  
  if (baseNumber === 0) return suggestions;
  
  // Get all existing numeric numbers
  const existingNumericNumbers = existingCustomers
    .map(c => {
      if (!c.customerNumber) return 0;
      const num = parseInt(extractNumericPart(c.customerNumber)) || 0;
      return num;
    })
    .filter(num => num > 0);
  
  // Check nearby numbers
  const checkNumbers = [];
  
  for (let offset = 1; offset <= 10; offset++) {
    // Check higher number
    const higherNumber = baseNumber + offset;
    checkNumbers.push({ number: higherNumber, offset: offset, type: 'higher' });
    
    // Check lower number (if > 1)
    if (baseNumber - offset >= 1) {
      const lowerNumber = baseNumber - offset;
      checkNumbers.push({ number: lowerNumber, offset: -offset, type: 'lower' });
    }
  }
  
  // Sort by closeness
  checkNumbers.sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset));
  
  for (const { number, offset } of checkNumbers) {
    if (!existingNumericNumbers.includes(number)) {
      suggestions.push({
        number: `CN${number}`,
        reason: offset > 0 ? `+${offset}` : `${offset}`,
        isAvailable: true
      });
    }
    
    if (suggestions.length >= 6) break;
  }
  
  return suggestions.slice(0, 6);
};

/**
 * Validate customer number format
 */
export const validateCustomerNumberFormat = (customerNumber: string): { isValid: boolean; message?: string } => {
  if (!customerNumber.trim()) {
    return { isValid: false, message: 'Customer number is required' };
  }
  
  const numericPart = extractNumericPart(customerNumber);
  
  if (!numericPart) {
    return { isValid: false, message: 'Customer number must contain digits' };
  }
  
  if (numericPart.length < 1) {
    return { isValid: false, message: 'Customer number must be at least 1 digit' };
  }
  
  const numberValue = parseInt(numericPart);
  if (numberValue < 1 || numberValue > 999999) {
    return { isValid: false, message: 'Customer number must be between 1 and 999999' };
  }
  
  return { isValid: true };
};

/**
 * Find nearest available customer number
 */
export const findNearestAvailableCustomerNumber = (
  requestedNumber: string,
  existingCustomers: Customer[],
  maxAttempts: number = 100
): string | null => {
  const numericInput = extractNumericPart(requestedNumber);
  const baseNumber = parseInt(numericInput) || 1001;
  
  const existingNumericNumbers = existingCustomers
    .map(c => {
      if (!c.customerNumber) return 0;
      return parseInt(extractNumericPart(c.customerNumber)) || 0;
    })
    .filter(num => num > 0);
  
  for (let offset = 0; offset <= maxAttempts; offset++) {
    const higherNumber = baseNumber + offset;
    if (!existingNumericNumbers.includes(higherNumber)) {
      return `CN${higherNumber}`;
    }
    
    if (baseNumber - offset > 0) {
      const lowerNumber = baseNumber - offset;
      if (!existingNumericNumbers.includes(lowerNumber)) {
        return `CN${lowerNumber}`;
      }
    }
  }
  
  return null;
};

// ==================== DATE HELPERS ====================

/**
 * Convert date string to IST Date (UTC+5:30)
 */
export const getIndianDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  const date = new Date(dateString);
  const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  
  istTime.setHours(0, 0, 0, 0);
  return istTime;
};

/**
 * Get today's date in Indian timezone
 */
export const getTodayIndianDate = (): Date => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  
  istTime.setHours(0, 0, 0, 0);
  return istTime;
};

/**
 * Check if date is valid and not in the future
 */
export const isValidIndianDateNotFuture = (dateString: string): { isValid: boolean; message?: string } => {
  if (!dateString) {
    return { isValid: false, message: 'Date is required' };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { isValid: false, message: 'Invalid date format' };
  }
  
  const istDate = getIndianDate(dateString);
  const todayIST = getTodayIndianDate();
  
  if (istDate > todayIST) {
    return { isValid: false, message: 'Date cannot be in the future' };
  }
  
  const oneYearAgo = new Date(todayIST);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (istDate < oneYearAgo) {
    return { isValid: false, message: 'Date cannot be more than 1 year in the past' };
  }
  
  return { isValid: true };
};

// ==================== STEP VALIDATIONS ====================

export const validateStep1 = (step1Data: NewCustomerStep1, customers: Customer[]): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  // Name validation
  if (!step1Data.name.trim()) {
    errors.name = 'Customer name is required';
  } else if (!/^[A-Za-z\s\-'.]+$/.test(step1Data.name)) {
    errors.name = 'Name can only contain alphabets, spaces, hyphens, apostrophes, and periods';
  } else if (step1Data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (step1Data.name.trim().length > 100) {
    errors.name = 'Name cannot exceed 100 characters';
  }
  
  // Phone numbers
  const validPhones = step1Data.phone.filter(p => p && p.trim() !== '');
  
  if (validPhones.length === 0) {
    errors.phone0 = 'At least one phone number is required';
  } else {
    if (!validPhones[0] || !/^\d{10}$/.test(validPhones[0])) {
      errors.phone0 = 'Valid primary phone number is required (10 digits)';
    }

    if (validPhones[1] && !/^\d{10}$/.test(validPhones[1])) {
      errors.phone1 = 'Secondary phone number must be a valid 10-digit number';
    }
    
    if (validPhones[0] && validPhones[1] && validPhones[0] === validPhones[1]) {
      errors.phone1 = 'Secondary phone number cannot be the same as primary';
    }
  }

  // WhatsApp number
  if (step1Data.whatsappNumber && step1Data.whatsappNumber.trim()) {
    if (!/^\d{10}$/.test(step1Data.whatsappNumber)) {
      errors.whatsappNumber = 'WhatsApp number must be a valid 10-digit number';
    }
    
    if (validPhones.some(phone => phone === step1Data.whatsappNumber)) {
      errors.whatsappNumber = 'WhatsApp number cannot be the same as phone number';
    }
  }
  
  // Business name
  if (!step1Data.businessName.trim()) {
    errors.businessName = 'Business name is required';
  } else if (step1Data.businessName.trim().length < 2) {
    errors.businessName = 'Business name must be at least 2 characters';
  } else if (step1Data.businessName.trim().length > 100) {
    errors.businessName = 'Business name cannot exceed 100 characters';
  } else if (!/^[A-Za-z0-9\s\-&.'",]+$/.test(step1Data.businessName)) {
    errors.businessName = 'Business name contains invalid characters';
  }
  
  // Area
  if (!step1Data.area.trim()) {
    errors.area = 'Area is required';
  } else if (step1Data.area.trim().length < 2) {
    errors.area = 'Area must be at least 2 characters';
  } else if (step1Data.area.trim().length > 50) {
    errors.area = 'Area cannot exceed 50 characters';
  }
  
  // CUSTOMER NUMBER - FIXED VERSION
  if (!step1Data.customerNumber.trim()) {
    errors.customerNumber = 'Customer number is required';
  } else {
    const formatValidation = validateCustomerNumberFormat(step1Data.customerNumber);
    if (!formatValidation.isValid) {
      errors.customerNumber = formatValidation.message || 'Invalid customer number format';
    } else if (isCustomerNumberExists(step1Data.customerNumber, customers)) {
      // Find matching customer for better error message
      const numericInput = extractNumericPart(step1Data.customerNumber);
      const matchingCustomer = customers.find(customer => {
        const existingNumeric = extractNumericPart(customer.customerNumber || '');
        return existingNumeric === numericInput;
      });
      
      if (matchingCustomer) {
        errors.customerNumber = `Customer number "${step1Data.customerNumber}" already exists! (Assigned to: ${matchingCustomer.name})`;
      } else {
        errors.customerNumber = 'Customer number already exists';
      }
    }
  }
  
  // Address - UPDATED: Now optional, removed minimum length requirement
  if (step1Data.address && step1Data.address.trim()) {
    // Only validate if address is provided
    if (step1Data.address.trim().length > 500) {
      errors.address = 'Address cannot exceed 500 characters';
    }
  }
  // Removed the "required" validation and 10-character minimum

  // Category
  if (!step1Data.category) {
    errors.category = 'Category is required';
  }
  
  // Office category
  if (!step1Data.officeCategory) {
    errors.officeCategory = 'Office category is required';
  }
  
  return errors;
};

export const validateStep2 = (step2Data: NewCustomerStep2): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  // Only validate if it's a single loan - UPDATED to check loanSelectionType
  if (step2Data.loanSelectionType === 'single') { // Changed from loanType to loanSelectionType
    // Loan number validation - Updated for dropdown selection
if (!step2Data.loanNumber || !step2Data.loanNumber.trim()) {
  errors.loanNumber = 'Loan number is required for single loan';
} else if (!step2Data.loanNumber.toUpperCase().startsWith('L')) {
  errors.loanNumber = 'Loan number must start with "L" prefix';
} else {
  // Validate it's one of the allowed values (L1 to L15)
  const loanNum = step2Data.loanNumber.replace('L', '').replace(/^l/gi, '');
  const loanNumValue = parseInt(loanNum);
  if (isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
    errors.loanNumber = 'Please select a valid loan number between L1 and L15';
  }
}
    
    // Loan date
    if (!step2Data.loanDate) {
      errors.loanDate = 'Loan date is required';
    } else {
      const dateValidation = isValidIndianDateNotFuture(step2Data.loanDate);
      if (!dateValidation.isValid) {
        errors.loanDate = dateValidation.message || 'Invalid loan date';
      }
    }
    
    // Amount
    const amount = parseFloat(step2Data.amount);
    if (!step2Data.amount || isNaN(amount)) {
      errors.amount = 'Amount is required';
    } else if (amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    } else if (amount > 10000000) {
      errors.amount = 'Amount cannot exceed ₹10,000,000';
    } else if (amount < 100) {
      errors.amount = 'Amount must be at least ₹100';
    }
    
    // EMI start date
    if (!step2Data.emiStartDate) {
      errors.emiStartDate = 'EMI starting date is required';
    } else {
      const dateValidation = isValidIndianDateNotFuture(step2Data.emiStartDate);
      if (!dateValidation.isValid) {
        errors.emiStartDate = dateValidation.message || 'Invalid EMI start date';
      } else if (step2Data.loanDate) {
        const emiStartDate = getIndianDate(step2Data.emiStartDate);
        const loanDate = getIndianDate(step2Data.loanDate);
        
        if (emiStartDate < loanDate) {
          errors.emiStartDate = 'EMI start date cannot be before loan date';
        }
      }
    }
    
    // Loan days
    const loanDays = parseInt(step2Data.loanDays);
    if (!step2Data.loanDays || isNaN(loanDays)) {
      errors.loanDays = `Valid number of ${step2Data.loanType === 'Daily' ? 'days' : step2Data.loanType === 'Weekly' ? 'weeks' : 'months'} is required`;
    } else if (loanDays <= 0) {
      errors.loanDays = `Number of ${step2Data.loanType === 'Daily' ? 'days' : step2Data.loanType === 'Weekly' ? 'weeks' : 'months'} must be greater than 0`;
    } else if (step2Data.loanType === 'Daily' && loanDays > 365) {
      errors.loanDays = 'Daily loans cannot exceed 365 days';
    } else if (step2Data.loanType === 'Weekly' && loanDays > 52) {
      errors.loanDays = 'Weekly loans cannot exceed 52 weeks';
    } else if (step2Data.loanType === 'Monthly' && loanDays > 36) {
      errors.loanDays = 'Monthly loans cannot exceed 36 months';
    }
    
    // EMI validation
    if (step2Data.loanType === 'Daily') {
      const emiAmount = parseFloat(step2Data.emiAmount);
      if (!step2Data.emiAmount || isNaN(emiAmount)) {
        errors.emiAmount = 'Valid EMI amount is required for Daily loans';
      } else if (emiAmount <= 0) {
        errors.emiAmount = 'EMI amount must be greater than 0';
      } else if (emiAmount > 50000) {
        errors.emiAmount = 'Daily EMI amount cannot exceed ₹50,000';
      } else if (emiAmount < 10) {
        errors.emiAmount = 'Daily EMI amount must be at least ₹10';
      }
      
      if (loanDays > 0 && emiAmount > 0) {
        const calculatedTotal = emiAmount * loanDays;
        const enteredAmount = parseFloat(step2Data.loanAmount) || 0;
        if (Math.abs(calculatedTotal - enteredAmount) > 1) {
          errors.loanAmount = `Loan amount should be ₹${(emiAmount * loanDays).toFixed(2)} for ${loanDays} days at ₹${emiAmount} per day`;
        }
      }
      
    } else if (step2Data.loanType === 'Weekly' || step2Data.loanType === 'Monthly') {
      if (step2Data.emiType === 'fixed') {
        const emiAmount = parseFloat(step2Data.emiAmount);
        if (!step2Data.emiAmount || isNaN(emiAmount)) {
          errors.emiAmount = 'Valid EMI amount is required for Fixed EMI type';
        } else if (emiAmount <= 0) {
          errors.emiAmount = 'EMI amount must be greater than 0';
        } else if (emiAmount > 100000) {
          errors.emiAmount = 'EMI amount cannot exceed ₹100,000';
        }
        
        if (loanDays > 0 && emiAmount > 0) {
          const calculatedTotal = emiAmount * loanDays;
          const enteredAmount = parseFloat(step2Data.loanAmount) || 0;
          if (Math.abs(calculatedTotal - enteredAmount) > 1) {
            errors.loanAmount = `Loan amount should be ₹${(emiAmount * loanDays).toFixed(2)} for ${loanDays} ${step2Data.loanType === 'Weekly' ? 'weeks' : 'months'} at ₹${emiAmount} per ${step2Data.loanType === 'Weekly' ? 'week' : 'month'}`;
          }
        }
        
      } else if (step2Data.emiType === 'custom') {
        const emiAmount = parseFloat(step2Data.emiAmount);
        const customEmiAmount = parseFloat(step2Data.customEmiAmount || '0');
        
        if (!step2Data.emiAmount || isNaN(emiAmount) || emiAmount <= 0) {
          errors.emiAmount = 'Valid fixed EMI amount is required for Custom EMI type';
        } else if (emiAmount > 100000) {
          errors.emiAmount = 'Fixed EMI amount cannot exceed ₹100,000';
        }
        
        if (!step2Data.customEmiAmount || isNaN(customEmiAmount) || customEmiAmount <= 0) {
          errors.customEmiAmount = 'Valid last EMI amount is required for Custom EMI type';
        } else if (customEmiAmount > 200000) {
          errors.customEmiAmount = 'Last EMI amount cannot exceed ₹200,000';
        }
        
        if (emiAmount === customEmiAmount) {
          errors.customEmiAmount = 'Last EMI amount must be different from fixed EMI amount';
        }
        
        if (loanDays > 0 && emiAmount > 0 && customEmiAmount > 0) {
          const fixedPeriods = loanDays - 1;
          const calculatedTotal = (emiAmount * fixedPeriods) + customEmiAmount;
          const enteredAmount = parseFloat(step2Data.loanAmount) || 0;
          if (Math.abs(calculatedTotal - enteredAmount) > 1) {
            errors.customEmiAmount = `Last EMI amount should be ₹${(enteredAmount - (emiAmount * fixedPeriods)).toFixed(2)} to match total loan amount`;
          }
        }
      }
    }
    
    // Loan amount
    if (!errors.loanAmount) {
      const loanAmount = parseFloat(step2Data.loanAmount);
      if (!step2Data.loanAmount || isNaN(loanAmount)) {
        errors.loanAmount = 'Valid loan amount is required';
      } else if (loanAmount <= 0) {
        errors.loanAmount = 'Loan amount must be greater than 0';
      } else if (loanAmount > 10000000) {
        errors.loanAmount = 'Loan amount cannot exceed ₹10,000,000';
      } else if (loanAmount < 100) {
        errors.loanAmount = 'Loan amount must be at least ₹100';
      }
    }
  }
  
  return errors;
};

export const validateStep3 = (step3Data: NewCustomerStep3): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  // Login ID
  if (!step3Data.loginId.trim()) {
    errors.loginId = 'Login ID is required';
  } else if (step3Data.loginId.trim().length < 4) {
    errors.loginId = 'Login ID must be at least 4 characters';
  } else if (step3Data.loginId.trim().length > 20) {
    errors.loginId = 'Login ID cannot exceed 20 characters';
  } else if (!/^[a-zA-Z0-9_]+$/.test(step3Data.loginId)) {
    errors.loginId = 'Login ID can only contain letters, numbers, and underscores';
  }
  
  // Password
  if (!step3Data.password) {
    errors.password = 'Password is required';
  } else if (step3Data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (step3Data.password.length > 50) {
    errors.password = 'Password cannot exceed 50 characters';
  } else {
    const hasUpperCase = /[A-Z]/.test(step3Data.password);
    const hasLowerCase = /[a-z]/.test(step3Data.password);
    const hasNumbers = /\d/.test(step3Data.password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(step3Data.password);
    
    const strengthChecks = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar];
    const passedChecks = strengthChecks.filter(Boolean).length;
    
    if (passedChecks < 3) {
      errors.password = 'Password must contain at least 3 of: uppercase, lowercase, numbers, and special characters';
    }
  }
  
  // Confirm password
  if (step3Data.password !== step3Data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return errors;
};

// ==================== UTILITY FUNCTIONS ====================

export const validatePhoneNumber = (phone: string): boolean => {
  return /^\d{10}$/.test(phone);
};

export const validatePhoneNumbers = (phones: string[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const validPhones = phones.filter(phone => phone && phone.trim() !== '');
  if (validPhones.length === 0) {
    errors.push('At least one phone number is required');
  } else {
    if (!validatePhoneNumber(validPhones[0])) {
      errors.push('Primary phone number must be a valid 10-digit number');
    }
    
    if (validPhones[1] && !validatePhoneNumber(validPhones[1])) {
      errors.push('Secondary phone number must be a valid 10-digit number');
    }
    
    if (validPhones[0] && validPhones[1] && validPhones[0] === validPhones[1]) {
      errors.push('Primary and secondary phone numbers cannot be the same');
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

/**
 * Validate customer details for editing
 */
export const validateEditCustomer = (
  customerData: any,
  existingCustomers: Customer[],
  currentCustomerId?: string
): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  
  // Name validation
  if (!customerData.name?.trim()) {
    errors.name = 'Customer name is required';
  } else if (!/^[A-Za-z\s\-'.]+$/.test(customerData.name)) {
    errors.name = 'Name can only contain alphabets, spaces, hyphens, apostrophes, and periods';
  }
  
  // Customer number validation
  if (customerData.customerNumber) {
    const otherCustomers = existingCustomers.filter(
      customer => customer._id !== currentCustomerId
    );
    
    if (isCustomerNumberExists(customerData.customerNumber, otherCustomers)) {
      errors.customerNumber = 'Customer number already exists';
    }
  }
  
  // Phone validation
  if (customerData.phone && Array.isArray(customerData.phone)) {
    const phoneErrors = validatePhoneNumbers(customerData.phone);
    if (!phoneErrors.isValid) {
      if (phoneErrors.errors[0]?.includes('Primary')) {
        errors.phone = phoneErrors.errors[0];
      }
    }
  }
  
  return errors;
};

/**
 * Calculate total loan amount
 */
export const calculateTotalLoanAmount = (
  loanType: string,
  emiType: string,
  emiAmount: number,
  loanDays: number,
  customEmiAmount?: number
): number => {
  if (!emiAmount || !loanDays) return 0;
  
  if (loanType === 'Daily') {
    return emiAmount * loanDays;
  } else if (loanType === 'Weekly' || loanType === 'Monthly') {
    if (emiType === 'fixed') {
      return emiAmount * loanDays;
    } else if (emiType === 'custom' && customEmiAmount) {
      const fixedPeriods = loanDays - 1;
      const fixedAmount = emiAmount * fixedPeriods;
      return fixedAmount + customEmiAmount;
    }
  }
  
  return 0;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Validate amount field
 */
export const validateAmount = (amount: string): { isValid: boolean; message?: string } => {
  const amountValue = parseFloat(amount);
  
  if (!amount || isNaN(amountValue)) {
    return { isValid: false, message: 'Amount is required' };
  }
  
  if (amountValue <= 0) {
    return { isValid: false, message: 'Amount must be greater than 0' };
  }
  
  if (amountValue > 10000000) {
    return { isValid: false, message: 'Amount cannot exceed ₹10,000,000' };
  }
  
  if (amountValue < 100) {
    return { isValid: false, message: 'Amount must be at least ₹100' };
  }
  
  return { isValid: true };
};

/**
 * Validate loan number format
 */
export const validateLoanNumber = (loanNumber: string): { isValid: boolean; message?: string } => {
  if (!loanNumber.trim()) {
    return { isValid: false, message: 'Loan number is required' };
  }
  
  // UPDATED: Changed from 'LN' to 'L' prefix
  if (!loanNumber.toUpperCase().startsWith('L')) {
    return { isValid: false, message: 'Loan number must start with "L" prefix' };
  }
  
  const numericPart = loanNumber.substring(1);
  if (!numericPart || !/^\d+$/.test(numericPart)) {
    return { isValid: false, message: 'Loan number must contain digits after "L" prefix' };
  }
  
  const loanNumValue = parseInt(numericPart);
  if (loanNumValue < 1 || loanNumValue > 99) {
    return { isValid: false, message: 'Loan number must be between L1 and L99' };
  }
  
  return { isValid: true };
};