import React, { useState, useEffect, useCallback } from 'react';
import { User, BLOAccount, Bank, BankBranch, AppState, Department, Designation, AccountCategory } from './types';
import { fetchAllData, updateAccountOnSheet, updateVerificationOnSheet, addBankOnSheet, addBranchOnSheet, updateUserOnSheet } from './services/dataService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccountEntry from './pages/AccountEntry';
import Verification from './pages/Verification';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    accounts: [],
    avihitAccounts: [],
    supervisorAccounts: [],
    banks: [],
    branches: [],
    users: [],
    departments: [],
    designations: []
  });
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllData();
      setState(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error("Could not load data:", error);
      alert("Cloud Database Error. Check API_URL.");
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => { loadData(); }, []);

  const checkDuplicates = (updated: BLOAccount): string | null => {
    // Combine all lists for a global uniqueness check
    const allAccounts = [
      ...state.accounts, 
      ...state.avihitAccounts, 
      ...state.supervisorAccounts
    ];

    const cleanMobile = updated.Mobile.trim();
    const cleanAccount = updated.Account_Number.trim();
    const cleanIFSC = updated.IFSC_Code.trim().toUpperCase();

    for (const acc of allAccounts) {
      // Skip the current record being edited
      if (acc.BLO_ID === updated.BLO_ID) continue;

      // Check Mobile Uniqueness
      if (acc.Mobile.trim() === cleanMobile) {
        const identifier = acc.Sector_No ? `Sector: ${acc.Sector_No}` : `Part: ${acc.Part_No}`;
        return `DUPLICATE MOBILE DETECTED\n\nThe mobile number "${cleanMobile}" is already registered in the system.\n\nExisting Record Details:\n• Name: ${acc.BLO_Name}\n• Assembly: ${acc.AC_Name}\n• ${identifier}\n• Tehsil: ${acc.Tehsil}\n\nPlease use a unique mobile number for this official.`;
      }

      // Check IFSC + Account Number Uniqueness
      if (acc.Account_Number.trim() === cleanAccount && acc.IFSC_Code.trim().toUpperCase() === cleanIFSC) {
        const identifier = acc.Sector_No ? `Sector: ${acc.Sector_No}` : `Part: ${acc.Part_No}`;
        return `DUPLICATE BANK ACCOUNT DETECTED\n\nThis specific Bank Account (${cleanAccount}) and IFSC (${cleanIFSC}) combination is already assigned to another record.\n\nExisting Record Details:\n• Name: ${acc.BLO_Name}\n• Assembly: ${acc.AC_Name}\n• ${identifier}\n• Tehsil: ${acc.Tehsil}\n\nA bank account cannot be registered more than once in the portal.`;
      }
    }

    return null;
  };

  const updateAccount = useCallback(async (updated: BLOAccount, type: AccountCategory, newBank?: Bank, newBranch?: BankBranch) => {
    // Perform uniqueness check before any network calls
    const duplicateError = checkDuplicates(updated);
    if (duplicateError) {
      alert(duplicateError);
      return;
    }

    setIsLoading(true);
    try {
      if (newBank) await addBankOnSheet(newBank);
      if (newBranch) await addBranchOnSheet(newBranch);
      const result = await updateAccountOnSheet(updated, type);
      if (result.success) { 
        await loadData(); 
        alert("Record updated successfully."); 
      }
      else { alert("Update failed: " + result.message); }
    } catch (e) { alert("Operation failed."); }
    finally { setIsLoading(false); }
  }, [state.accounts, state.avihitAccounts, state.supervisorAccounts]); // Dependencies for global list access

  const handleVerify = useCallback(async (bloId: string, verified: 'yes' | 'no', type: AccountCategory) => {
    setIsLoading(true);
    try {
      const success = await updateVerificationOnSheet(bloId, verified, type);
      if (success) { await loadData(); }
      else { alert("Verification update failed."); }
    } catch (e) { alert("Operation failed."); }
    finally { setIsLoading(false); }
  }, []);

  const handleUpdateUser = useCallback(async (updatedUser: User) => {
    setIsLoading(true);
    try {
      const result = await updateUserOnSheet(updatedUser);
      if (result.success) {
        if (state.currentUser?.User_ID === updatedUser.User_ID) setState(prev => ({ ...prev, currentUser: updatedUser }));
        await loadData();
      } else throw new Error(result.message);
    } catch (e) { alert("Update failed: " + (e as Error).message); }
    finally { setIsLoading(false); }
  }, [state.currentUser]);

  if (!isInitialized) return <div className="min-vh-100 d-flex align-items-center justify-content-center">Loading...</div>;
  if (!state.currentUser) return <Login users={state.users} onLogin={u => { setState(p => ({...p, currentUser: u})); setCurrentPage('dashboard'); }} />;

  const renderContent = () => {
    if (currentPage.startsWith('entry-')) {
      const type = currentPage.split('-')[1] as AccountCategory;
      const data = type === 'blo' ? state.accounts : type === 'avihit' ? state.avihitAccounts : state.supervisorAccounts;
      return <AccountEntry type={type} accounts={data} user={state.currentUser!} banks={state.banks} branches={state.branches} departments={state.departments} designations={state.designations} onUpdate={updateAccount} />;
    }
    if (currentPage.startsWith('verification-')) {
      const type = currentPage.split('-')[1] as AccountCategory;
      const data = type === 'blo' ? state.accounts : type === 'avihit' ? state.avihitAccounts : state.supervisorAccounts;
      return <Verification type={type} accounts={data} user={state.currentUser!} banks={state.banks} branches={state.branches} departments={state.departments} designations={state.designations} onVerify={handleVerify} />;
    }
    if (currentPage.startsWith('reports-')) {
      const type = currentPage.split('-')[1] as AccountCategory;
      const data = type === 'blo' ? state.accounts : type === 'avihit' ? state.avihitAccounts : state.supervisorAccounts;
      return <Reports type={type} accounts={data} users={state.users} user={state.currentUser!} />;
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard user={state.currentUser!} accounts={[...state.accounts, ...state.avihitAccounts, ...state.supervisorAccounts]} />;
      case 'users': return <UserManagement currentUser={state.currentUser!} users={state.users} onUpdateUser={handleUpdateUser} />;
      default: return <Dashboard user={state.currentUser!} accounts={[...state.accounts, ...state.avihitAccounts, ...state.supervisorAccounts]} />;
    }
  };

  return (
    <div className="app-container">
      {isLoading && <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 z-3"><div className="spinner-border text-primary"></div></div>}
      <Sidebar user={state.currentUser!} currentPage={currentPage} onNavigate={setCurrentPage} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onLogout={() => setState(p => ({...p, currentUser: null}))} />
      <div className="main-content">
        <div className="d-lg-none bg-white p-3 mb-4 d-flex justify-content-between"><h5>ACCOUNT PORTAL</h5><button className="btn btn-light" onClick={() => setIsSidebarOpen(true)}><i className="bi bi-list"></i></button></div>
        {renderContent()}
      </div>
    </div>
  );
};

export default App;