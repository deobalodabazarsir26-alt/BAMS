
import { User, BLOAccount, Bank, BankBranch } from '../types';

// IMPORTANT: Replace this with your actual Google Apps Script Web App URL after deployment
const API_URL = 'https://script.google.com/macros/s/AKfycby2mifGNWdyHQDV43od5I5wbEqeTnFEobreOi5eFaNX6RWke_UxdowWaQCLzeIw_PRu/exec';

export const fetchAllData = async (): Promise<{ users: User[], accounts: BLOAccount[], banks: Bank[], branches: BankBranch[] }> => {
  if (!API_URL) {
    console.warn("API_URL not configured. Please deploy Apps Script and update dataService.ts");
    // Fallback to empty or mock if needed for local dev
    return { users: [], accounts: [], banks: [], branches: [] };
  }

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch data from Google Sheets');
    return await response.json();
  } catch (error) {
    console.error("Fetch Data Error:", error);
    throw error;
  }
};

export const updateAccountOnSheet = async (account: BLOAccount): Promise<boolean> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow',
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
      redirect: 'follow',
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
      redirect: 'follow',
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
      redirect: 'follow',
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
