import { User, BLOAccount, Bank, BankBranch, Department, Designation, AccountCategory } from '../types';

const API_URL = 'https://script.google.com/macros/s/AKfycbxZ5347MkDNTJD1AX7KTE7zDCZXb2ckjccyJuGDClnHZTdHrBq4iuZ_YkHJ61WjCV5-Dw/exec';

const safeFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`Network response error: ${response.status}`);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid server response format");
  }
};

export const fetchAllData = async (): Promise<{ 
  users: User[], 
  accounts: BLOAccount[], 
  avihitAccounts: BLOAccount[],
  supervisorAccounts: BLOAccount[],
  banks: Bank[], 
  branches: BankBranch[],
  departments: Department[],
  designations: Designation[]
}> => {
  try {
    return await safeFetch(API_URL);
  } catch (error) {
    console.error("Fetch Data Error:", error);
    throw error;
  }
};

export const updateAccountOnSheet = async (account: BLOAccount, type: AccountCategory = 'blo'): Promise<{success: boolean, message?: string}> => {
  const actionMap: Record<AccountCategory, string> = {
    blo: 'updateAccount',
    avihit: 'updateAvihitAccount',
    supervisor: 'updateSupervisorAccount'
  };

  try {
    return await safeFetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: actionMap[type], payload: account })
    });
  } catch (error) {
    return { success: false, message: error.toString() };
  }
};

export const updateVerificationOnSheet = async (bloId: string, verified: 'yes' | 'no', type: AccountCategory = 'blo'): Promise<boolean> => {
  const actionMap: Record<AccountCategory, string> = {
    blo: 'verifyAccount',
    avihit: 'verifyAvihitAccount',
    supervisor: 'verifySupervisorAccount'
  };

  try {
    const res = await safeFetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: actionMap[type], payload: { BLO_ID: bloId, Verified: verified } })
    });
    return res.success;
  } catch (error) {
    return false;
  }
};

export const updateUserOnSheet = async (user: User): Promise<{success: boolean, message?: string}> => {
  try {
    return await safeFetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'updateUser', payload: user })
    });
  } catch (error) {
    return { success: false, message: error.toString() };
  }
};

export const addBankOnSheet = async (bank: Bank): Promise<boolean> => {
  try {
    const res = await safeFetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addBank', payload: bank })
    });
    return res.success;
  } catch (error) { return false; }
};

export const addBranchOnSheet = async (branch: BankBranch): Promise<boolean> => {
  try {
    const res = await safeFetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addBranch', payload: branch })
    });
    return res.success;
  } catch (error) { return false; }
};