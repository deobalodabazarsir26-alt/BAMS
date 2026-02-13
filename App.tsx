import React, { useState, useEffect, useCallback } from 'react';
import { User, BLOAccount, Bank, BankBranch, AppState, Department, Designation, AccountCategory } from './types';
import { fetchAllData, updateAccountOnSheet, updateVerificationOnSheet, addBankOnSheet, addBranchOnSheet, updateUserOnSheet } from './services/dataService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AccountEntry from './pages/AccountEntry';
import Verification from './pages/Verification';
import Reports from './pages/Reports';
import ConsolidatedReport from './pages/ConsolidatedReport';
import UserManagement from './pages/UserManagement';
import Sidebar from './components/Sidebar';
import BLOApp from './pages/BLOApp';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentBLO: null,
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
  const [isMobileMode, setIsMobileMode] = useState(false);

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

  const updateAccount = useCallback(async (updated: BLOAccount, type: AccountCategory, newBank?: Bank, newBranch?: BankBranch) => {
    setIsLoading(true);
    try {
      if (newBank) await addBankOnSheet(newBank);
      if (newBranch) await addBranchOnSheet(newBranch);

      const result = await updateAccountOnSheet(updated, type);
      if (result.success) { 
        await loadData(); 
      } else { 
        alert("Failed to update: " + result.message); 
      }
    } catch (e) { 
      alert("Error updating record."); 
    } finally { setIsLoading(false); }
  }, [loadData]);

  const handleLogout = () => {
    setState(p => ({ ...p, currentUser: null, currentBLO: null }));
    setIsMobileMode(false);
    setCurrentPage('dashboard');
  };

  if (!isInitialized) return <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
    <div className="text-center"><div className="spinner-border text-primary mb-3"></div><div>Syncing Cloud Database...</div></div>
  </div>;

  if (isMobileMode) {
    return <BLOApp 
      accounts={state.accounts} 
      banks={state.banks} 
      branches={state.branches} 
      departments={state.departments} 
      designations={state.designations} 
      onUpdateAccount={updateAccount}
      onLogout={handleLogout}
    />;
  }

  if (!state.currentUser) {
    return <Login 
      users={state.users} 
      onLogin={u => { setState(p => ({...p, currentUser: u})); setCurrentPage('dashboard'); }}
      onEnterBLOApp={() => setIsMobileMode(true)}
    />;
  }

  const renderContent = () => {
    if (currentPage.startsWith('entry-')) {
      const type = currentPage.split('-')[1] as AccountCategory;
      const data = type === 'blo' ? state.accounts : type === 'avihit' ? state.avihitAccounts : state.supervisorAccounts;
      return <AccountEntry type={type} accounts={data} user={state.currentUser!} banks={state.banks} branches={state.branches} departments={state.departments} designations={state.designations} onUpdate={updateAccount} />;
    }
    if (currentPage.startsWith('verification-')) {
      const type = currentPage.split('-')[1] as AccountCategory;
      const data = type === 'blo' ? state.accounts : type === 'avihit' ? state.avihitAccounts : state.supervisorAccounts;
      return <Verification type={type} accounts={data} user={state.currentUser!} banks={state.banks} branches={state.branches} departments={state.departments} designations={state.designations} onVerify={async (id, v, t) => {
        setIsLoading(true);
        const success = await updateVerificationOnSheet(id, v, t);
        if (success) await loadData();
        setIsLoading(false);
      }} />;
    }
    if (currentPage.startsWith('reports-')) {
      const type = currentPage.split('-')[1] as AccountCategory;
      const data = type === 'blo' ? state.accounts : type === 'avihit' ? state.avihitAccounts : state.supervisorAccounts;
      return (
        <Reports 
          type={type} 
          accounts={data} 
          bloAccounts={state.accounts}
          avihitAccounts={state.avihitAccounts}
          supervisorAccounts={state.supervisorAccounts}
          users={state.users} 
          user={state.currentUser!} 
        />
      );
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard user={state.currentUser!} accounts={[...state.accounts, ...state.avihitAccounts, ...state.supervisorAccounts]} />;
      case 'consolidated-report': return <ConsolidatedReport user={state.currentUser!} bloAccounts={state.accounts} avihitAccounts={state.avihitAccounts} supervisorAccounts={state.supervisorAccounts} />;
      case 'users': return <UserManagement currentUser={state.currentUser!} users={state.users} onUpdateUser={async (u) => { await updateUserOnSheet(u); await loadData(); }} />;
      default: return <Dashboard user={state.currentUser!} accounts={[...state.accounts, ...state.avihitAccounts, ...state.supervisorAccounts]} />;
    }
  };

  return (
    <div className="app-container">
      {isLoading && <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 z-3"><div className="spinner-border text-primary"></div></div>}
      <Sidebar user={state.currentUser!} currentPage={currentPage} onNavigate={setCurrentPage} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onLogout={handleLogout} />
      <div className="main-content">
        <div className="d-lg-none bg-white p-3 mb-4 d-flex justify-content-between"><h5>ACCOUNT PORTAL</h5><button className="btn btn-light" onClick={() => setIsSidebarOpen(true)}><i className="bi bi-list"></i></button></div>
        {renderContent()}
      </div>
    </div>
  );
};

export default App;