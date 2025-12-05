import { useState, useCallback } from 'react';
import { Loan, EditLoanData, RenewLoanData } from '@/src/types/dataEntry';
import { getAllCustomerLoans, calculateEMICompletion, calculatePaymentBehavior, calculateTotalLoanAmount } from '@/src/utils/loanCalculations';

interface UseLoansReturn {
  isLoading: boolean;
  error: string | null;
  addLoan: (loanData: any) => Promise<boolean>;
  editLoan: (editData: EditLoanData) => Promise<boolean>;
  renewLoan: (renewData: RenewLoanData) => Promise<boolean>;
  deleteLoan: (loan: Loan) => Promise<boolean>;
  getCustomerLoans: (customer: any, customerDetails: any) => Loan[];
  calculateLoanCompletion: (loan: Loan) => any;
  calculateLoanBehavior: (loan: Loan) => any;
  calculateTotalLoan: (loan: Loan) => number;
}

export const useLoans = (): UseLoansReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLoan = useCallback(async (loanData: any): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-entry/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data.success;
    } catch (err) {
      console.error('Error adding loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to add loan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editLoan = useCallback(async (editData: EditLoanData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-entry/edit-loan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid JSON');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data.success;
    } catch (err) {
      console.error('Error editing loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit loan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renewLoan = useCallback(async (renewData: RenewLoanData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-entry/renew-loan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(renewData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid JSON');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data.success;
    } catch (err) {
      console.error('Error renewing loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to renew loan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteLoan = useCallback(async (loan: Loan): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-entry/delete-loan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId: loan._id,
          customerId: loan.customerId,
          customerName: loan.customerName,
          customerNumber: loan.customerNumber,
          loanNumber: loan.loanNumber,
          requestedBy: 'data_entry_operator_1',
          requestType: 'delete_loan'
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid JSON');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data.success;
    } catch (err) {
      console.error('Error deleting loan:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete loan');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCustomerLoans = useCallback((customer: any, customerDetails: any): Loan[] => {
    return getAllCustomerLoans(customer, customerDetails);
  }, []);

  const calculateLoanCompletion = useCallback((loan: Loan) => {
    return calculateEMICompletion(loan);
  }, []);

  const calculateLoanBehavior = useCallback((loan: Loan) => {
    return calculatePaymentBehavior(loan);
  }, []);

  const calculateTotalLoan = useCallback((loan: Loan) => {
    return calculateTotalLoanAmount(loan);
  }, []);

  return {
    isLoading,
    error,
    addLoan,
    editLoan,
    renewLoan,
    deleteLoan,
    getCustomerLoans,
    calculateLoanCompletion,
    calculateLoanBehavior,
    calculateTotalLoan,
  };
};