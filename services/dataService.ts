import { User, BLOAccount, Bank, BankBranch, Department, Designation } from '../types';

// The URL to your Google Apps Script Web App
const API_URL = 'https://script.google.com/macros/s/AKfycbw42OrVzKOGjU0s8FyBoKY1UszWuuXjqs5Jk8HYUPuHVYduR6RXn8fFhM5EstGizCNcAA/exec';

export const fetchAllData = async (): Promise<{ 
  users: User[], 
  accounts: BLOAccount[], 
  banks: Bank[], 
  branches: BankBranch[],
  departments: Department[],
  designations: Designation[]
}> => {
  if (!API_URL || API_URL.includes('YOUR_APPS_SCRIPT')) {
    console.error("API_URL not configured. Ensure the Web App is deployed and URL is pasted in dataService.ts");
    return { users: [], accounts: [], banks: [], branches: [], departments: [], designations: [] };
  }

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch Data Error:", error);
    throw error;
  }
};

export const updateAccountOnSheet = async (account: BLOAccount): Promise<boolean> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'updateAccount',
        payload: account
      })
    });
    const res = await response.json();
    return res.success;
  } catch (error) {
    console.error("Update Account Error:", error);
    return false;
  }
};

export const updateVerificationOnSheet = async (bloId: string, verified: 'yes' | 'no'): Promise<boolean> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'verifyAccount',
        payload: { BLO_ID: bloId, Verified: verified }
      })
    });
    const res = await response.json();
    return res.success;
  } catch (error) {
    console.error("Verify Account Error:", error);
    return false;
  }
};

export const addBankOnSheet = async (bank: Bank): Promise<boolean> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'addBank',
        payload: bank
      })
    });
    const res = await response.json();
    return res.success;
  } catch (error) {
    return false;
  }
};

export const addBranchOnSheet = async (branch: BankBranch): Promise<boolean> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'addBranch',
        payload: branch
      })
    });
    const res = await response.json();
    return res.success;
  } catch (error) {
    return false;
  }
};