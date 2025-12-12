/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Customer,
  NewCustomerStep1, 
  NewCustomerStep2, 
  NewCustomerStep3,
  CustomerNumberSuggestion 
} from '@/src/types/dataEntry';
import {
  validateStep1,
  validateStep2,
  validateStep3,
  isCustomerNumberExists,
  normalizeCustomerNumber,
  generateCustomerNumberSuggestions,
  findNearestAvailableCustomerNumber,
  extractNumericPart
} from '@/src/utils/validation';
import {
  customerCategories,
  officeCategories,
  loanTypes as rawLoanTypes
} from '@/src/utils/constants';

const loanTypes = [...rawLoanTypes];

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentUserOffice: string;
  existingCustomers: Customer[];
}

interface Step1Errors {
  [key: string]: string;
}

interface Step2Errors {
  [key: string]: string;
}

interface Step3Errors {
  [key: string]: string;
}

const getTodayISTDate = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return istTime.toISOString().split('T')[0];
};

export default function AddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserOffice,
  existingCustomers
}: AddCustomerModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<NewCustomerStep1>({
    name: '',
    phone: ['', ''],
    whatsappNumber: '',
    businessName: '',
    area: '',
    customerNumber: '',
    address: '',
    category: 'A',
    officeCategory: currentUserOffice || 'Office 1',
    profilePicture: null,
    fiDocuments: {
      shop: null,
      home: null
    }
  });
  
  const [step2Data, setStep2Data] = useState<NewCustomerStep2>({
    loanSelectionType: 'single', // Changed from loanType to loanSelectionType
    loanNumber: '',
    loanDate: getTodayISTDate(),
    amount: '',
    emiStartDate: getTodayISTDate(),
    loanAmount: '',
    emiAmount: '',
    loanDays: '',
    loanType: 'Daily', // This is now only for Daily/Weekly/Monthly
    emiType: 'fixed',
    customEmiAmount: '',
  });
  
  const [step3Data, setStep3Data] = useState<NewCustomerStep3>({
    loginId: '',
    password: '',
    confirmPassword: ''
  });
  
  const [step1Errors, setStep1Errors] = useState<Step1Errors>({});
  const [step2Errors, setStep2Errors] = useState<Step2Errors>({});
  const [step3Errors, setStep3Errors] = useState<Step3Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customerNumberError, setCustomerNumberError] = useState('');
  const [customerNumberSuccess, setCustomerNumberSuccess] = useState('');
  const [customerNumberSuggestions, setCustomerNumberSuggestions] = useState<CustomerNumberSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCheckingCustomerNumber, setIsCheckingCustomerNumber] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const [checkAttempts, setCheckAttempts] = useState(0);

  const customerNumberTimerRef = useRef<NodeJS.Timeout | null>(null);

  const calculateTotalLoanAmount = (): number => {
    const emiAmount = parseFloat(step2Data.emiAmount) || 0;
    const loanDays = parseFloat(step2Data.loanDays) || 0;
    const customEmiAmount = parseFloat(step2Data.customEmiAmount || '0') || 0;
    
    if (step2Data.loanType === 'Daily') {
      return emiAmount * loanDays;
    } else if (step2Data.loanType === 'Weekly' || step2Data.loanType === 'Monthly') {
      if (step2Data.emiType === 'fixed') {
        return emiAmount * loanDays;
      } else if (step2Data.emiType === 'custom') {
        const fixedPeriods = loanDays - 1;
        const fixedAmount = emiAmount * fixedPeriods;
        return fixedAmount + customEmiAmount;
      }
    }
    return 0;
  };

  useEffect(() => {
    if (step2Data.loanSelectionType === 'single' && (step2Data.loanType === 'Daily' || step2Data.emiType === 'fixed')) {
      const totalAmount = calculateTotalLoanAmount();
      setStep2Data(prev => ({ 
        ...prev, 
        loanAmount: totalAmount > 0 ? totalAmount.toString() : '' 
      }));
    } else if (step2Data.loanSelectionType === 'single' && step2Data.loanType !== 'Daily' && step2Data.emiType === 'custom') {
      const totalAmount = calculateTotalLoanAmount();
      setStep2Data(prev => ({ 
        ...prev, 
        loanAmount: totalAmount > 0 ? totalAmount.toString() : '' 
      }));
    }
  }, [step2Data.emiAmount, step2Data.loanDays, step2Data.customEmiAmount, step2Data.loanType, step2Data.emiType, step2Data.loanSelectionType]);

  useEffect(() => {
    return () => {
      if (customerNumberTimerRef.current) {
        clearTimeout(customerNumberTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && !step1Data.customerNumber) {
      const getNextCustomerNumber = () => {
        if (existingCustomers.length === 0) return 'CN1001';
        
        const allNumbers = existingCustomers
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
      
      const nextNumber = getNextCustomerNumber();
      setStep1Data(prev => ({ ...prev, customerNumber: nextNumber }));
      
      setTimeout(() => {
        checkCustomerNumberAvailability(nextNumber);
      }, 500);
    }
  }, [isOpen, existingCustomers]);

  const handleFileUpload = (field: string, file: File | null, documentType?: 'shop' | 'home'): void => {
    if (field === 'profilePicture') {
      if (file && !file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPEG, etc.) for profile picture');
        return;
      }
      setStep1Data(prev => ({ ...prev, profilePicture: file }));
    } else if (field === 'fiDocuments' && documentType) {
      if (file && file.type !== 'application/pdf') {
        alert('Please upload a PDF file for FI documents');
        return;
      }
      setStep1Data(prev => ({
        ...prev,
        fiDocuments: {
          ...prev.fiDocuments,
          [documentType]: file
        }
      }));
    }
  };

  const generateLoginId = (): void => {
    if (!step1Data.name.trim()) {
      alert('Please enter customer name first');
      return;
    }
    
    const namePart = step1Data.name.replace(/\s+/g, '').toLowerCase().substring(0, 4);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const loginId = `${namePart}${randomPart}`;
    setStep3Data(prev => ({ ...prev, loginId }));
  };

  const generatePassword = (): void => {
  // Limited symbols as requested: #,@,$,%,!
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '#@$%!'; // Limited to specific symbols only
  
  let password = '';
  
  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Fill remaining characters with random from all allowed characters
  const allChars = uppercase + lowercase + numbers + specialChars;
  for (let i = 0; i < 4; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  setStep3Data(prev => ({ ...prev, password, confirmPassword: password }));
};

  const checkCustomerNumberAvailability = async (customerNumber: string): Promise<void> => {
    if (!customerNumber || extractNumericPart(customerNumber).length < 1) {
      setCustomerNumberError('');
      setCustomerNumberSuccess('');
      setCustomerNumberSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const numericInput = extractNumericPart(customerNumber);
    
    setIsCheckingCustomerNumber(true);
    setCustomerNumberError('');
    setCustomerNumberSuccess('');
    setCheckAttempts(prev => prev + 1);
    
    try {
      let isDuplicateLocal = false;
      let matchingCustomer: Customer | null = null;

      for (const customer of existingCustomers) {
        if (!customer.customerNumber) continue;
        
        const existingNumeric = extractNumericPart(customer.customerNumber);
        
        if (existingNumeric === numericInput) {
          isDuplicateLocal = true;
          matchingCustomer = customer;
          break;
        }
      }
      
      if (isDuplicateLocal && matchingCustomer) {
        const normalizedNumber = normalizeCustomerNumber(customerNumber);
        const errorMsg = `❌ Customer Number "${normalizedNumber}" already exists! (Currently assigned to: ${matchingCustomer.name})`;
        
        setCustomerNumberError(errorMsg);
        setCustomerNumberSuccess('');

        const suggestions = generateCustomerNumberSuggestions(customerNumber, existingCustomers);
        setCustomerNumberSuggestions(suggestions);
        setShowSuggestions(true);

        const nearestAvailable = findNearestAvailableCustomerNumber(customerNumber, existingCustomers);
        if (nearestAvailable) {
          setCustomerNumberSuggestions(prev => [
            {
              number: nearestAvailable,
              reason: 'Nearest Available',
              isAvailable: true
            },
            ...prev.filter(p => p.number !== nearestAvailable)
          ]);
        }
        return;
      }

      const normalizedNumber = normalizeCustomerNumber(customerNumber);
      setCustomerNumberError('');
      setCustomerNumberSuccess(`✅ Customer Number "${normalizedNumber}" is available!`);
      setCustomerNumberSuggestions([]);
      setShowSuggestions(false);

    } catch (error) {
      console.error('❌ Error checking customer number:', error);
      setCustomerNumberError('⚠️ Error checking customer number. Please try again.');
      setCustomerNumberSuccess('');
    } finally {
      setIsCheckingCustomerNumber(false);
    }
  };

  const handleCustomerNumberChange = (value: string): void => {
    const numbersOnly = value.replace(/\D/g, '');
    
    let customerNumber = '';
    if (numbersOnly) {
      customerNumber = `CN${numbersOnly}`;
    }
    
    setStep1Data(prev => ({ ...prev, customerNumber }));
    
    if (customerNumberTimerRef.current) {
      clearTimeout(customerNumberTimerRef.current);
    }
    
    if (step1Errors.customerNumber) {
      setStep1Errors(prev => ({ ...prev, customerNumber: '' }));
    }
    setCustomerNumberError('');
    setCustomerNumberSuccess('');
    setCustomerNumberSuggestions([]);
    setShowSuggestions(false);
    
    if (numbersOnly === '') {
      return;
    }
    
    customerNumberTimerRef.current = setTimeout(() => {
      checkCustomerNumberAvailability(customerNumber);
    }, 600);
  };

  const selectCustomerNumberSuggestion = (suggestion: CustomerNumberSuggestion): void => {
    if (suggestion.isAvailable) {
      setStep1Data(prev => ({ ...prev, customerNumber: suggestion.number }));
      setCustomerNumberError('');
      setCustomerNumberSuccess(`✅ Selected: ${suggestion.number}`);
      setCustomerNumberSuggestions([]);
      setShowSuggestions(false);
      
      setTimeout(() => {
        checkCustomerNumberAvailability(suggestion.number);
      }, 100);
    }
  };

  const autoFixCustomerNumber = (): void => {
    if (!step1Data.customerNumber) return;
    
    const normalizedNumber = normalizeCustomerNumber(step1Data.customerNumber);
    const nearestAvailable = findNearestAvailableCustomerNumber(normalizedNumber, existingCustomers);
    
    if (nearestAvailable) {
      setStep1Data(prev => ({ ...prev, customerNumber: nearestAvailable }));
      setCustomerNumberError('');
      setCustomerNumberSuccess(`✅ Auto-fixed to: ${nearestAvailable}`);
      setCustomerNumberSuggestions([]);
      setShowSuggestions(false);
      
      setTimeout(() => {
        checkCustomerNumberAvailability(nearestAvailable);
      }, 100);
    } else {
      setCustomerNumberError('⚠️ Could not find an available number. Please try a different number.');
    }
  };

  const sendApprovalRequest = async (): Promise<{success: boolean, message?: string}> => {
    try {
      console.log('📤 Sending approval request as JSON...');
      
      const totalLoanAmount = calculateTotalLoanAmount();
      
      const preparedStep1Data = {
        name: step1Data.name.trim(),
        phone: step1Data.phone.filter(p => p && p.trim() !== ''),
        whatsappNumber: step1Data.whatsappNumber || '',
        businessName: step1Data.businessName,
        area: step1Data.area,
        customerNumber: step1Data.customerNumber,
        address: step1Data.address || '',
        category: step1Data.category,
        officeCategory: step1Data.officeCategory,
        hasProfilePicture: !!step1Data.profilePicture,
        hasFiDocuments: {
          shop: !!step1Data.fiDocuments.shop,
          home: !!step1Data.fiDocuments.home
        }
      };
      
      const preparedStep2Data = {
        loanSelectionType: step2Data.loanSelectionType, // Changed from loanType
        loanNumber: step2Data.loanNumber,
        loanDate: step2Data.loanDate,
        emiStartDate: step2Data.emiStartDate,
        loanAmount: parseFloat(step2Data.loanAmount) || totalLoanAmount,
        emiAmount: parseFloat(step2Data.emiAmount) || 0,
        loanDays: parseFloat(step2Data.loanDays) || 0,
        loanType: step2Data.loanType, // This is now only for Daily/Weekly/Monthly
        emiType: step2Data.emiType,
        customEmiAmount: step2Data.customEmiAmount ? parseFloat(step2Data.customEmiAmount) : null
      };
      
      const preparedStep3Data = {
        loginId: step3Data.loginId,
        password: step3Data.password,
        confirmPassword: step3Data.confirmPassword
      };
      
      const approvalRequest = {
        type: 'New Customer',
        customerName: step1Data.name.trim(),
        customerNumber: step1Data.customerNumber,
        step1Data: preparedStep1Data,
        step2Data: preparedStep2Data,
        step3Data: preparedStep3Data,
        requestedData: {
          customerName: step1Data.name.trim(),
          customerNumber: step1Data.customerNumber,
          phone: step1Data.phone.filter(p => p && p.trim() !== ''),
          whatsappNumber: step1Data.whatsappNumber || '',
          businessName: step1Data.businessName,
          area: step1Data.area,
          address: step1Data.address || '',
          category: step1Data.category,
          officeCategory: step1Data.officeCategory,
          loanSelectionType: step2Data.loanSelectionType, // Changed from loanType
          loanNumber: step2Data.loanNumber,
          loanAmount: parseFloat(step2Data.loanAmount) || totalLoanAmount,
          emiAmount: parseFloat(step2Data.emiAmount) || 0,
          loanDays: parseFloat(step2Data.loanDays) || 0,
          loanType: step2Data.loanType, // This is now only for Daily/Weekly/Monthly
          emiType: step2Data.emiType,
          customEmiAmount: step2Data.customEmiAmount ? parseFloat(step2Data.customEmiAmount) : null,
          loginId: step3Data.loginId,
          password: step3Data.password
        },
        description: `New customer registration for ${step1Data.name} - Customer Number: ${step1Data.customerNumber}`,
        priority: 'High',
        status: 'Pending',
        createdBy: currentUserOffice || 'data_entry_operator',
        createdByRole: 'data_entry',
        requiresCustomerNotification: true,
        estimatedImpact: 'High'
      };
      
      console.log('📋 Sending approval request:', {
        type: approvalRequest.type,
        customerName: approvalRequest.customerName,
        customerNumber: approvalRequest.customerNumber,
        loanSelectionType: approvalRequest.step2Data.loanSelectionType,
        loanType: approvalRequest.step2Data.loanType,
        loanNumber: approvalRequest.step2Data.loanNumber
      });
      
      const response = await fetch('/api/data-entry/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to submit approval request (${response.status})`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.error('API Error Result:', result);
        throw new Error(result.error || 'Unknown error from API');
      }

      return { 
        success: true, 
        message: result.message || 'Request submitted successfully' 
      };
      
    } catch (error: any) {
      console.error('❌ Error in sendApprovalRequest:', error);
      throw error;
    }
  };

  const handleStep1Next = (): void => {
    console.log('Step 1 Next - Validating customer number:', step1Data.customerNumber);
    
    if (step1Data.customerNumber) {
      const numericInput = extractNumericPart(step1Data.customerNumber);
      
      if (!numericInput) {
        setCustomerNumberError('Please enter a valid customer number with digits');
        setTimeout(() => {
          const errorElement = document.getElementById('error-customerNumber');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }

      const matchingCustomer = existingCustomers.find(customer => {
        if (!customer.customerNumber) return false;
        const existingNumeric = extractNumericPart(customer.customerNumber);
        return existingNumeric === numericInput;
      });

      if (matchingCustomer) {
        const normalizedNumber = normalizeCustomerNumber(step1Data.customerNumber);
        setCustomerNumberError(`❌ Customer Number "${normalizedNumber}" already exists! (Assigned to: ${matchingCustomer.name})`);
        setCustomerNumberSuccess('');
        
        setTimeout(() => {
          const errorElement = document.getElementById('error-customerNumber');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }

      if (customerNumberError && customerNumberError.includes('already exists')) {
        setTimeout(() => {
          const errorElement = document.getElementById('error-customerNumber');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }

      if (!customerNumberSuccess && !isCheckingCustomerNumber) {
        setCustomerNumberError('⚠️ Please wait for customer number validation to complete');
        setTimeout(() => {
          const errorElement = document.getElementById('error-customerNumber');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
    }
    
    const errors = validateStep1(step1Data, existingCustomers);
    setStep1Errors(errors);
    
    if (Object.keys(errors).length === 0) {
      if (step1Data.customerNumber && (customerNumberError || !customerNumberSuccess)) {
        setCustomerNumberError('⚠️ Please fix customer number issues before proceeding');
        setTimeout(() => {
          const errorElement = document.getElementById('error-customerNumber');
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
      
      console.log('✅ Step 1 validation passed');
      setCurrentStep(2);
    } else {
      console.log('❌ Step 1 validation failed');
      setTimeout(() => {
        const firstErrorElement = document.querySelector('[id^="error-"]');
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const handleStep2Next = (): void => {
    console.log('Step 2 data:', step2Data);
    
    if (step2Data.loanSelectionType === 'single') {
      const errors = validateStep2(step2Data);
      setStep2Errors(errors);
      
      if (Object.keys(errors).length > 0) {
        console.log('Step 2 validation failed');
        setTimeout(() => {
          const firstErrorElement = document.querySelector('[id^="error-"]');
          if (firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return;
      }
    }
    
    // For multiple loans, no validation needed
    console.log('Step 2 validation passed, moving to step 3');
    setCurrentStep(3);
  };

  const handleStep2Back = (): void => {
    setCurrentStep(1);
  };

  const handleStep3Back = (): void => {
    setCurrentStep(2);
  };

  const resetForm = (): void => {
    setCurrentStep(1);
    setIsSubmitted(false);
    setIsAwaitingApproval(false);
    
    setStep1Data({
      name: '',
      phone: ['', ''],
      whatsappNumber: '',
      businessName: '',
      area: '',
      customerNumber: '',
      address: '',
      category: 'A',
      officeCategory: currentUserOffice || 'Office 1',
      profilePicture: null,
      fiDocuments: {
        shop: null,
        home: null
      }
    });
    setStep2Data({
      loanSelectionType: 'single', // Changed from loanType
      loanNumber: '',
      loanDate: getTodayISTDate(),
      amount: '',
      emiStartDate: getTodayISTDate(),
      loanAmount: '',
      emiAmount: '',
      loanDays: '',
      loanType: 'Daily',
      emiType: 'fixed',
      customEmiAmount: ''
    });
    setStep3Data({
      loginId: '',
      password: '',
      confirmPassword: ''
    });
    setStep1Errors({});
    setStep2Errors({});
    setStep3Errors({});
    setCustomerNumberError('');
    setCustomerNumberSuccess('');
    setCustomerNumberSuggestions([]);
    setShowSuggestions(false);
    setShowPassword(false);
    setCheckAttempts(0);
  };

  const handleSubmit = async (): Promise<void> => {
    const errors = validateStep3(step3Data);
    setStep3Errors(errors);
    
    if (Object.keys(errors).length > 0) {
      console.log('Step 3 validation errors:', errors);
      return;
    }

    const normalizedCustomerNumber = normalizeCustomerNumber(step1Data.customerNumber);
    const isDuplicate = isCustomerNumberExists(normalizedCustomerNumber, existingCustomers);
    
    if (isDuplicate) {
      alert('Customer number already exists. Please choose a different number.');
      setCurrentStep(1);
      return;
    }

    const totalLoanAmount = calculateTotalLoanAmount();
    
    setIsLoading(true);
    try {
      const result = await sendApprovalRequest();
      
      if (result.success) {
        setIsSubmitted(true);
        setIsAwaitingApproval(true);
        console.log('✅ Customer request submitted for admin approval');
      } else {
        alert('Failed to submit customer request. Please try again.');
      }
      
    } catch (error: any) {
      console.error('❌ Error submitting customer request:', error);
      alert('Error submitting customer request: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  const totalLoanAmount = calculateTotalLoanAmount();
  const periodLabel = step2Data.loanType === 'Daily' ? 'days' : 
                     step2Data.loanType === 'Weekly' ? 'weeks' : 'months';
  const emiAmount = parseFloat(step2Data.emiAmount) || 0;
  const loanDays = parseFloat(step2Data.loanDays) || 0;
  const customEmiAmount = parseFloat(step2Data.customEmiAmount || '0') || 0;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              {isSubmitted ? 'Approval Request Submitted' : 'Add New Customer (Requires Admin Approval)'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          <div className="flex mt-4 space-x-2">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex-1">
                <div className={`h-2 rounded-full ${
                  isSubmitted 
                    ? 'bg-green-600' 
                    : currentStep >= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}></div>
                <div className="mt-2 text-sm text-center">
                  <span className={`font-medium ${
                    isSubmitted 
                      ? 'text-green-600' 
                      : currentStep === step ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    Step {step}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Personal Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400 text-lg">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Customer Number Validation</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      System detects duplicates: "105" = "CN105" = "0105" are treated as the same number.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Number */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Number *
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      (Numbers only, e.g., 105 or CN105)
                    </span>
                  </label>
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 font-medium">CN</span>
                    </div>
                    <input
                      type="text"
                      className={`w-full pl-12 px-3 py-3 border ${
                        customerNumberError 
                          ? 'border-red-300 bg-red-50' 
                          : customerNumberSuccess
                          ? 'border-green-300 bg-green-50'
                          : step1Errors.customerNumber 
                          ? 'border-red-300'
                          : 'border-gray-300'
                      } rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300`}
                      value={step1Data.customerNumber.replace('CN', '').replace(/^cn/gi, '')}
                      onChange={(e) => handleCustomerNumberChange(e.target.value)}
                      placeholder="Enter numbers (e.g., 105)"
                      id="error-customerNumber"
                      disabled={isCheckingCustomerNumber}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                      {isCheckingCustomerNumber ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="text-xs text-blue-600">Checking...</span>
                        </>
                      ) : customerNumberSuccess ? (
                        <>
                          <span className="text-green-500 text-xl">✅</span>
                          <span className="text-xs text-green-600">Available</span>
                        </>
                      ) : customerNumberError ? (
                        <>
                          <span className="text-red-500 text-xl">❌</span>
                          <span className="text-xs text-red-600">Exists</span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-lg">🔢</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Messages */}
                  {customerNumberSuccess && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700 flex items-center">
                        <span className="mr-2">✅</span>
                        {customerNumberSuccess}
                        <span className="ml-2 text-xs text-green-600">
                          (Numeric: {extractNumericPart(step1Data.customerNumber)})
                        </span>
                      </p>
                    </div>
                  )}
                  
                  {customerNumberError && !step1Errors.customerNumber && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700 flex items-center">
                        <span className="mr-2">❌</span>
                        {customerNumberError}
                        <button
                          onClick={autoFixCustomerNumber}
                          className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Auto-fix
                        </button>
                      </p>
                    </div>
                  )}
                  
                  {step1Errors.customerNumber && !customerNumberError && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.customerNumber}</p>
                  )}
                  
                  {isCheckingCustomerNumber && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-700 flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                        Validating... (Comparing with {existingCustomers.length} customers)
                      </p>
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {showSuggestions && customerNumberSuggestions.length > 0 && (
                    <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className="text-yellow-500 mr-2">💡</span>
                          <p className="text-sm font-medium text-gray-700">Suggested Available Numbers:</p>
                        </div>
                        <button
                          onClick={() => setShowSuggestions(false)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Hide
                        </button>
                      </div>
                      <div className="space-y-2">
                        {customerNumberSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg transition-all duration-200 ${
                              suggestion.isAvailable 
                                ? 'bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 cursor-pointer' 
                                : 'bg-gray-100'
                            }`}
                            onClick={() => suggestion.isAvailable && selectCustomerNumberSuggestion(suggestion)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-mono font-bold text-green-700">
                                  {suggestion.number}
                                </span>
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                  {suggestion.reason}
                                </span>
                              </div>
                              {suggestion.isAvailable && (
                                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                  Use This
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Numeric: {extractNumericPart(suggestion.number)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Instructions */}
                  <div className="mt-2 text-xs text-gray-500">
                    <p className="font-medium">Duplicate Detection:</p>
                    <p>• "105", "CN105", "0105", "CN0105" are all treated as the SAME number</p>
                    <p>• System compares numeric values only</p>
                    <p>• Current number: <span className="font-mono font-semibold">{step1Data.customerNumber || 'CN...'}</span></p>
                  </div>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border ${step1Errors.name ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.name}
                    onChange={(e) => {
                      setStep1Data(prev => ({ ...prev, name: e.target.value }));
                      if (step1Errors.name) {
                        setStep1Errors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    placeholder="Enter customer's name"
                    id="error-name"
                  />
                  {step1Errors.name && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.name}</p>
                  )}
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border ${step1Errors.businessName ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.businessName}
                    onChange={(e) => {
                      setStep1Data(prev => ({ ...prev, businessName: e.target.value }));
                      if (step1Errors.businessName) {
                        setStep1Errors(prev => ({ ...prev, businessName: '' }));
                      }
                    }}
                    placeholder="Enter business name"
                    id="error-businessName"
                  />
                  {step1Errors.businessName && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.businessName}</p>
                  )}
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Phone Number *
                  </label>
                  <input
                    type="tel"
                    className={`w-full px-3 py-2 border ${step1Errors.phone0 ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.phone[0]}
                    onChange={(e) => {
                      const newPhones = [...step1Data.phone];
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      newPhones[0] = value;
                      setStep1Data(prev => ({ ...prev, phone: newPhones }));
                      if (step1Errors.phone0) {
                        setStep1Errors(prev => ({ ...prev, phone0: '' }));
                      }
                    }}
                    placeholder="Enter 10-digit phone number"
                    maxLength={10}
                    id="error-phone0"
                  />
                  {step1Errors.phone0 && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.phone0}</p>
                  )}
                </div>

                {/* Secondary Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Phone Number
                  </label>
                  <input
                    type="tel"
                    className={`w-full px-3 py-2 border ${step1Errors.phone1 ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.phone[1]}
                    onChange={(e) => {
                      const newPhones = [...step1Data.phone];
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      newPhones[1] = value;
                      setStep1Data(prev => ({ ...prev, phone: newPhones }));
                      if (step1Errors.phone1) {
                        setStep1Errors(prev => ({ ...prev, phone1: '' }));
                      }
                    }}
                    placeholder="Optional"
                    maxLength={10}
                    id="error-phone1"
                  />
                  {step1Errors.phone1 && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.phone1}</p>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    className={`w-full px-3 py-2 border ${step1Errors.whatsappNumber ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.whatsappNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setStep1Data(prev => ({ ...prev, whatsappNumber: value }));
                      if (step1Errors.whatsappNumber) {
                        setStep1Errors(prev => ({ ...prev, whatsappNumber: '' }));
                      }
                    }}
                    placeholder="Optional"
                    maxLength={10}
                    id="error-whatsappNumber"
                  />
                  {step1Errors.whatsappNumber && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.whatsappNumber}</p>
                  )}
                </div>

                {/* Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area *
                  </label>
                  <input
                    type="text"
                    className={`w-full px-3 py-2 border ${step1Errors.area ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.area}
                    onChange={(e) => {
                      setStep1Data(prev => ({ ...prev, area: e.target.value }));
                      if (step1Errors.area) {
                        setStep1Errors(prev => ({ ...prev, area: '' }));
                      }
                    }}
                    placeholder="Enter area"
                    id="error-area"
                  />
                  {step1Errors.area && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.area}</p>
                  )}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Address {/* Removed asterisk */}
  </label>
  <textarea
    className={`w-full px-3 py-2 border ${step1Errors.address ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
    rows={3}
    value={step1Data.address}
    onChange={(e) => setStep1Data(prev => ({ ...prev, address: e.target.value }))}
    placeholder="Enter complete address (Optional)"
    id="error-address"
  />
  {step1Errors.address && (
    <p className="mt-1 text-sm text-red-600">{step1Errors.address}</p>
  )}
</div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Category *
                  </label>
                  <select
                    className={`w-full px-3 py-2 border ${step1Errors.category ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.category}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, category: e.target.value }))}
                    id="error-category"
                  >
                    <option value="">Select Category</option>
                    {[...customerCategories].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {step1Errors.category && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.category}</p>
                  )}
                </div>

                {/* Office Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Office Category *
                  </label>
                  <select
                    className={`w-full px-3 py-2 border ${step1Errors.officeCategory ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    value={step1Data.officeCategory}
                    onChange={(e) => setStep1Data(prev => ({ ...prev, officeCategory: e.target.value }))}
                    id="error-officeCategory"
                  >
                    <option value="">Select Office</option>
                    {[...officeCategories].map(office => (
                      <option key={office} value={office}>{office}</option>
                    ))}
                  </select>
                  {step1Errors.officeCategory && (
                    <p className="mt-1 text-sm text-red-600">{step1Errors.officeCategory}</p>
                  )}
                </div>

                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {step1Data.profilePicture ? (
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(step1Data.profilePicture)}
                            alt="Profile preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleFileUpload('profilePicture', null)}
                            className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <span className="text-gray-400">👤</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="profile-picture"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('profilePicture', e.target.files?.[0] || null)}
                      />
                      <label
                        htmlFor="profile-picture"
                        className="cursor-pointer bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 inline-block"
                      >
                        {step1Data.profilePicture ? 'Change Picture' : 'Upload Picture'}
                      </label>
                    </div>
                  </div>
                </div>

                {/* FI Documents */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    FI Documents (PDF Only)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['shop', 'home'] as const).map((docType) => (
                      <div key={docType} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {docType === 'shop' ? 'Shop FI' : 'Home FI'}
                          </span>
                          {step1Data.fiDocuments[docType] && (
                            <button
                              type="button"
                              onClick={() => handleFileUpload('fiDocuments', null, docType)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <span className="text-red-600">📄</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            {step1Data.fiDocuments[docType] ? (
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {step1Data.fiDocuments[docType]?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(step1Data.fiDocuments[docType]?.size || 0) / 1024} KB
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-gray-500">No file selected</p>
                              </div>
                            )}
                          </div>
                          <div>
                            <input
                              type="file"
                              id={`fi-doc-${docType}`}
                              className="hidden"
                              accept=".pdf"
                              onChange={(e) => handleFileUpload('fiDocuments', e.target.files?.[0] || null, docType)}
                            />
                            <label
                              htmlFor={`fi-doc-${docType}`}
                              className="cursor-pointer bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 inline-block"
                            >
                              Browse
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Loan Type Selection & Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400 text-lg">💰</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Loan Type Selection</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Choose whether to create a single loan now or add multiple loans later
                    </p>
                  </div>
                </div>
              </div>

              {/* Loan Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  step2Data.loanSelectionType === 'single' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setStep2Data(prev => ({ ...prev, loanSelectionType: 'single' }))}>
                  <div className="flex items-center mb-4">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                      step2Data.loanSelectionType === 'single' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {step2Data.loanSelectionType === 'single' && (
                        <div className="h-3 w-3 rounded-full bg-white"></div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Single Loan</h3>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Create customer with a single loan immediately. All loan details are required.
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Create loan with this customer</li>
                    <li>• Loan number required (LN prefix)</li>
                    <li>• All loan details required</li>
                    <li>• Single loan entry</li>
                  </ul>
                </div>

                <div className={`border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  step2Data.loanSelectionType === 'multiple' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setStep2Data(prev => ({ ...prev, loanSelectionType: 'multiple' }))}>
                  <div className="flex items-center mb-4">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                      step2Data.loanSelectionType === 'multiple' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {step2Data.loanSelectionType === 'multiple' && (
                        <div className="h-3 w-3 rounded-full bg-white"></div>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Multiple Loans</h3>
                  </div>
                  <p className="text-gray-600 mb-3">
                    Create customer without any loans. You can add multiple loans later from customer profile.
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Create customer only</li>
                    <li>• No loan details required</li>
                    <li>• Add loans later from profile</li>
                    <li>• Multiple loans can be added</li>
                  </ul>
                </div>
              </div>

              {/* Single Loan Details */}
              {step2Data.loanSelectionType === 'single' && (
                <div className="space-y-6 border-t pt-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-yellow-500 text-lg">📝</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Single Loan Details</h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Enter loan details for the single loan. Loan number with "LN" prefix is required.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Loan Number */}
                    <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Loan Number *
    <span className="text-xs font-normal text-gray-500 ml-2">
      {step2Data.loanSelectionType === 'single' 
        ? 'Select from available loan numbers (LN1-LN15)' 
        : '(Enter manually with LN prefix, e.g., LN01, LN02)'}
    </span>
  </label>
  {step2Data.loanSelectionType === 'single' ? (
    <div className="space-y-2">
      <select
        className={`w-full px-3 py-2 border ${step2Errors.loanNumber ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
        value={step2Data.loanNumber}
        onChange={(e) => {
          setStep2Data(prev => ({ 
            ...prev, 
            loanNumber: e.target.value 
          }));
          if (step2Errors.loanNumber) {
            setStep2Errors(prev => ({ ...prev, loanNumber: '' }));
          }
        }}
        id="error-loanNumber"
      >
        <option value="">Select Loan Number</option>
        {Array.from({ length: 15 }, (_, i) => {
          const loanNum = `LN${i + 1}`;
          return (
            <option key={loanNum} value={loanNum}>
              {loanNum} {i === 0 ? '(First loan for customer)' : ''}
            </option>
          );
        })}
      </select>
      {step2Data.loanNumber === 'LN1' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
          <p className="text-sm text-blue-700 flex items-center">
            <span className="mr-2">ℹ️</span>
            This is the first loan for the customer. Loan number should be LN1.
          </p>
        </div>
      )}
    </div>
  ) : (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 font-medium">LN</span>
      </div>
      <input
        type="text"
        className={`w-full pl-10 px-3 py-2 border ${step2Errors.loanNumber ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
        value={step2Data.loanNumber.replace('LN', '').replace(/^ln/gi, '')}
        onChange={(e) => {
          const numbersOnly = e.target.value.replace(/\D/g, '');
          setStep2Data(prev => ({ 
            ...prev, 
            loanNumber: numbersOnly ? `LN${numbersOnly}` : '' 
          }));
          if (step2Errors.loanNumber) {
            setStep2Errors(prev => ({ ...prev, loanNumber: '' }));
          }
        }}
        placeholder="Enter numbers (e.g., 01, 02)"
        id="error-loanNumber"
      />
    </div>
  )}
  {step2Errors.loanNumber && (
    <p className="mt-1 text-sm text-red-600">{step2Errors.loanNumber}</p>
  )}
</div>

                    {/* Loan Type (Daily/Weekly/Monthly) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Type *
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={step2Data.loanType}
                        onChange={(e) => {
                          const newLoanType = e.target.value;
                          setStep2Data(prev => ({ 
                            ...prev, 
                            loanType: newLoanType,
                            emiType: newLoanType === 'Daily' ? 'fixed' : prev.emiType,
                            customEmiAmount: newLoanType === 'Daily' ? '' : prev.customEmiAmount,
                            loanAmount: ''
                          }));
                        }}
                      >
                        {loanTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Loan Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loan Date *
                      </label>
                      <input
                        type="date"
                        className={`w-full px-3 py-2 border ${step2Errors.loanDate ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        value={step2Data.loanDate}
                        onChange={(e) => {
                          setStep2Data(prev => ({ ...prev, loanDate: e.target.value }));
                          if (step2Errors.loanDate) {
                            setStep2Errors(prev => ({ ...prev, loanDate: '' }));
                          }
                        }}
                        id="error-loanDate"
                      />
                      {step2Errors.loanDate && (
                        <p className="mt-1 text-sm text-red-600">{step2Errors.loanDate}</p>
                      )}
                    </div>

                    {/* EMI Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        EMI Start Date *
                      </label>
                      <input
                        type="date"
                        className={`w-full px-3 py-2 border ${step2Errors.emiStartDate ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        value={step2Data.emiStartDate}
                        onChange={(e) => {
                          setStep2Data(prev => ({ ...prev, emiStartDate: e.target.value }));
                          if (step2Errors.emiStartDate) {
                            setStep2Errors(prev => ({ ...prev, emiStartDate: '' }));
                          }
                        }}
                        id="error-emiStartDate"
                      />
                      {step2Errors.emiStartDate && (
                        <p className="mt-1 text-sm text-red-600">{step2Errors.emiStartDate}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (Principal) *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">₹</span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          className={`w-full pl-10 px-3 py-2 border ${step2Errors.amount ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                          value={step2Data.amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            setStep2Data(prev => ({ ...prev, amount: value }));
                            if (step2Errors.amount) {
                              setStep2Errors(prev => ({ ...prev, amount: '' }));
                            }
                          }}
                          placeholder="Enter principal amount"
                          id="error-amount"
                        />
                      </div>
                      {step2Errors.amount && (
                        <p className="mt-1 text-sm text-red-600">{step2Errors.amount}</p>
                      )}
                    </div>

                    {/* Number of Periods */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of {step2Data.loanType === 'Daily' ? 'Days' : 
                                   step2Data.loanType === 'Weekly' ? 'Weeks' : 'Months'} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        className={`w-full px-3 py-2 border ${step2Errors.loanDays ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        value={step2Data.loanDays}
                        onChange={(e) => {
                          setStep2Data(prev => ({ ...prev, loanDays: e.target.value }));
                          if (step2Errors.loanDays) {
                            setStep2Errors(prev => ({ ...prev, loanDays: '' }));
                          }
                        }}
                        placeholder={`Enter number of ${step2Data.loanType === 'Daily' ? 'days' : 
                                     step2Data.loanType === 'Weekly' ? 'weeks' : 'months'}`}
                        id="error-loanDays"
                      />
                      {step2Errors.loanDays && (
                        <p className="mt-1 text-sm text-red-600">{step2Errors.loanDays}</p>
                      )}
                    </div>

                    {/* EMI Collection Type */}
                    {(step2Data.loanType === 'Weekly' || step2Data.loanType === 'Monthly') && (
                      <div className="md:col-span-2">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <label className="block text-lg font-semibold text-blue-800 mb-3">
                            EMI Collection Type *
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              step2Data.emiType === 'fixed' 
                                ? 'border-blue-500 bg-blue-100' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}>
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                                  checked={step2Data.emiType === 'fixed'}
                                  onChange={() => setStep2Data(prev => ({ 
                                    ...prev, 
                                    emiType: 'fixed', 
                                    customEmiAmount: '',
                                    loanAmount: (parseFloat(prev.emiAmount) * parseFloat(prev.loanDays)).toString() || ''
                                  }))}
                                />
                                <div className="ml-3">
                                  <span className="text-base font-medium text-gray-900">Fixed EMI</span>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Same EMI amount for all periods
                                  </p>
                                </div>
                              </div>
                            </label>
                            
                            <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              step2Data.emiType === 'custom' 
                                ? 'border-blue-500 bg-blue-100' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}>
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                                  checked={step2Data.emiType === 'custom'}
                                  onChange={() => setStep2Data(prev => ({ ...prev, emiType: 'custom' }))}
                                />
                                <div className="ml-3">
                                  <span className="text-base font-medium text-gray-900">Custom EMI</span>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Different last EMI amount
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* EMI Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {step2Data.emiType === 'custom' && step2Data.loanType !== 'Daily' 
                          ? 'Fixed EMI Amount *' 
                          : 'EMI Amount *'}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">₹</span>
                        </div>
                        <input
                          type="number"
                          min="1"
                          className={`w-full pl-10 px-3 py-2 border ${step2Errors.emiAmount ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                          value={step2Data.emiAmount}
                          onChange={(e) => {
                            setStep2Data(prev => ({ ...prev, emiAmount: e.target.value }));
                            if (step2Errors.emiAmount) {
                              setStep2Errors(prev => ({ ...prev, emiAmount: '' }));
                            }
                          }}
                          placeholder="Enter EMI amount"
                          id="error-emiAmount"
                        />
                      </div>
                      {step2Errors.emiAmount && (
                        <p className="mt-1 text-sm text-red-600">{step2Errors.emiAmount}</p>
                      )}
                    </div>

                    {/* Last EMI Amount */}
                    {step2Data.loanType !== 'Daily' && step2Data.emiType === 'custom' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last EMI Amount *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">₹</span>
                          </div>
                          <input
                            type="number"
                            min="1"
                            className={`w-full pl-10 px-3 py-2 border ${step2Errors.customEmiAmount ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            value={step2Data.customEmiAmount}
                            onChange={(e) => {
                              setStep2Data(prev => ({ ...prev, customEmiAmount: e.target.value }));
                              if (step2Errors.customEmiAmount) {
                                setStep2Errors(prev => ({ ...prev, customEmiAmount: '' }));
                              }
                            }}
                            placeholder="Enter last EMI amount"
                            id="error-customEmiAmount"
                          />
                        </div>
                        {step2Errors.customEmiAmount && (
                          <p className="mt-1 text-sm text-red-600">{step2Errors.customEmiAmount}</p>
                        )}
                      </div>
                    )}

                    {/* Total Loan Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total Loan Amount
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">₹</span>
                        </div>
                        <input
                          type="text"
                          className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                          value={totalLoanAmount.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loan Summary */}
                  {(step2Data.emiAmount || step2Data.loanDays) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Loan Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Loan Number</p>
                          <p className="font-semibold">{step2Data.loanNumber || 'Not set'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Loan Type</p>
                          <p className="font-semibold">{step2Data.loanType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Periods</p>
                          <p className="font-semibold">{loanDays} {periodLabel}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            {step2Data.emiType === 'custom' ? 'Fixed EMI' : 'EMI Amount'}
                          </p>
                          <p className="font-semibold">₹{emiAmount.toLocaleString('en-IN')}</p>
                        </div>
                        {step2Data.loanType !== 'Daily' && step2Data.emiType === 'custom' && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-gray-500">Last EMI Amount</p>
                            <p className="font-semibold">₹{customEmiAmount.toLocaleString('en-IN')}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Calculation:</p>
                            {step2Data.loanType === 'Daily' ? (
                              <p className="text-xs text-gray-500">
                                ₹{emiAmount.toLocaleString()} × {loanDays} days
                              </p>
                            ) : step2Data.emiType === 'fixed' ? (
                              <p className="text-xs text-gray-500">
                                ₹{emiAmount.toLocaleString()} × {loanDays} {periodLabel}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500">
                                (₹{emiAmount.toLocaleString()} × {loanDays - 1}) + ₹{customEmiAmount.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Total Loan Amount</p>
                            <p className="text-lg font-bold text-green-600">
                              ₹{totalLoanAmount.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Loans Message */}
              {step2Data.loanSelectionType === 'multiple' && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <span className="text-green-500 text-3xl">✅</span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-green-800">Customer Creation Only</h3>
                      <p className="text-green-700 mt-2">
                        Customer will be created with unique Customer Number <span className="font-bold">{step1Data.customerNumber}</span> without any loan.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-green-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Next Steps:</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>Customer will be created with unique Customer Number</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>You can add multiple loans later from the customer's profile</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>Each loan can have different loan numbers, amounts, and terms</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>No loan details are required at this stage</span>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Click <span className="font-semibold">"Next Step"</span> to proceed to login credentials
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Login Credentials */}
          {currentStep === 3 && !isSubmitted && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400 text-lg">🔐</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Login Credentials & Approval</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Generate Credentials</h4>
                  </div>

                  {/* Login ID */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Login ID *
                      </label>
                      <button
                        type="button"
                        onClick={generateLoginId}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        disabled={!step1Data.name.trim()}
                      >
                        Generate ID
                      </button>
                    </div>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border ${step3Errors.loginId ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      value={step3Data.loginId}
                      onChange={(e) => {
                        setStep3Data(prev => ({ ...prev, loginId: e.target.value }));
                        if (step3Errors.loginId) {
                          setStep3Errors(prev => ({ ...prev, loginId: '' }));
                        }
                      }}
                      placeholder="Click Generate ID or enter manually"
                      id="error-loginId"
                    />
                    {step3Errors.loginId && (
                      <p className="mt-1 text-sm text-red-600">{step3Errors.loginId}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Generate Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-2 border ${step3Errors.password ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        value={step3Data.password}
                        onChange={(e) => {
                          setStep3Data(prev => ({ ...prev, password: e.target.value }));
                          if (step3Errors.password) {
                            setStep3Errors(prev => ({ ...prev, password: '' }));
                          }
                        }}
                        placeholder="Click Generate Password or enter manually"
                        id="error-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <span className="text-gray-400">
                          {showPassword ? '🙈' : '👁️'}
                        </span>
                      </button>
                    </div>
                    {step3Errors.password && (
                      <p className="mt-1 text-sm text-red-600">{step3Errors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-2 border ${step3Errors.confirmPassword ? 'border-red-300' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        value={step3Data.confirmPassword}
                        onChange={(e) => {
                          setStep3Data(prev => ({ ...prev, confirmPassword: e.target.value }));
                          if (step3Errors.confirmPassword) {
                            setStep3Errors(prev => ({ ...prev, confirmPassword: '' }));
                          }
                        }}
                        placeholder="Confirm password"
                        id="error-confirmPassword"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <span className="text-gray-400">
                          {showPassword ? '🙈' : '👁️'}
                        </span>
                      </button>
                    </div>
                    {step3Errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{step3Errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 h-full">
                    <h4 className="font-medium text-green-800 mb-3">Credentials Summary</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Customer Name</p>
                        <p className="font-semibold text-gray-900">{step1Data.name || 'Not entered'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Customer Number</p>
                        <p className="font-semibold text-gray-900">{step1Data.customerNumber || 'Not entered'}</p>
                      </div>
                      {step2Data.loanSelectionType === 'single' && (
                        <>
                          <div>
                            <p className="text-xs text-gray-500">Loan Type</p>
                            <p className="font-semibold text-blue-600">Single Loan</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Loan Number</p>
                            <p className="font-semibold text-gray-900">{step2Data.loanNumber || 'Not set'}</p>
                          </div>
                        </>
                      )}
                      {step2Data.loanSelectionType === 'multiple' && (
                        <div>
                          <p className="text-xs text-gray-500">Loan Type</p>
                          <p className="font-semibold text-green-600">Multiple Loans (Add Later)</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Login ID</p>
                        <p className={`font-semibold ${step3Data.loginId ? 'text-blue-600' : 'text-gray-400'}`}>
                          {step3Data.loginId || 'Not generated'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Password</p>
                        <div className="flex items-center">
                          <p className={`font-semibold mr-2 ${
                            step3Data.password 
                              ? showPassword ? 'text-red-600' : 'text-gray-600'
                              : 'text-gray-400'
                          }`}>
                            {step3Data.password 
                              ? showPassword ? step3Data.password : '••••••••' 
                              : 'Not generated'}
                          </p>
                          {step3Data.password && (
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-purple-400 text-lg">📋</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-purple-800">Approval Process</h3>
                    <ul className="text-sm text-purple-700 mt-1 space-y-1">
                      <li>• Customer data will be stored as a pending request</li>
                      <li>• Admin will review and approve/reject the request</li>
                      <li>• You will be notified when the request is processed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submission Success */}
          {isSubmitted && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <span className="text-green-500 text-2xl">✅</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-green-800">Approval Request Submitted!</h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Customer Name</p>
                        <p className="font-semibold text-gray-900">{step1Data.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Customer Number</p>
                        <p className="font-semibold text-gray-900">{step1Data.customerNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Loan Type</p>
                        <p className="font-semibold text-blue-600">
                          {step2Data.loanSelectionType === 'single' ? 'Single Loan' : 'Multiple Loans (Add Later)'}
                        </p>
                      </div>
                      {step2Data.loanSelectionType === 'single' && step2Data.loanNumber && (
                        <div>
                          <p className="text-xs text-gray-500">Loan Number</p>
                          <p className="font-semibold text-gray-900">{step2Data.loanNumber}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Request Status</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Login ID</p>
                        <p className="font-semibold text-blue-600">{step3Data.loginId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Request Status</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⏳ Pending Approval
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Request Type</p>
                        <p className="font-semibold text-purple-600">New Customer Registration</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 mt-6">
          <div className="flex justify-between">
            <div>
              {currentStep > 1 && !isSubmitted && (
                <button
                  onClick={currentStep === 2 ? handleStep2Back : handleStep3Back}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              {isSubmitted ? (
                <>
                  <button
                    onClick={() => {
                      resetForm();
                      onSuccess?.();
                      onClose();
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Done & Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {currentStep < 3 ? (
                    <button
                      onClick={currentStep === 1 ? handleStep1Next : handleStep2Next}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      disabled={currentStep === 1 && (!!customerNumberError || isCheckingCustomerNumber)}
                    >
                      {currentStep === 1 && (!!customerNumberError || isCheckingCustomerNumber) ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Validating...
                        </span>
                      ) : (
                        'Next Step'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </span>
                      ) : (
                        'Submit for Approval'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {!isSubmitted && currentStep === 1 && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-700 text-center">
                {customerNumberSuccess 
                  ? '✅ Customer number validated. You can proceed.'
                  : customerNumberError
                  ? '❌ Please fix customer number issue.'
                  : isCheckingCustomerNumber
                  ? '⏳ Validating customer number...'
                  : '⚠️ Customer number must be validated.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}