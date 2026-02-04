import React, { useState, useEffect, useCallback } from 'react';
import { User, BLOAccount, Bank, BankBranch, AppState, Department, Designation } from './types';
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
      alert("Error connecting to Google Sheets. Check console and API_URL config.");
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogin = (user: User) => {
    setState(prev => ({ ...prev, currentUser: user }));
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const updateAccount = useCallback(async (updated: BLOAccount, newBank?: Bank, newBranch?: BankBranch) => {
    setIsLoading(true);
    try {
      if (newBank) await addBankOnSheet(newBank);
      if (newBranch) await addBranchOnSheet(newBranch);
      
      const result = await updateAccountOnSheet(updated);
      if (result.success) {
        // Refresh local state
        await loadData();
        alert("Record updated successfully in Google Sheets.");
      } else {
        alert("Failed to update record: " + (result.message || "Unknown error occurred on server."));
      }
    } catch (e) {
      alert("Operation failed: " + (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateUser = useCallback(async (updatedUser: User) => {
    setIsLoading(true);
    try {
      const result = await updateUserOnSheet(updatedUser);
      if (result.success) {
        if (state.currentUser?.User_ID === updatedUser.User_ID) {
          setState(prev => ({ ...prev, currentUser: updatedUser }));
        }
        await loadData();
      } else {
        throw new Error(result.message);
      }
    } catch (e) {
      alert("Update failed: " + (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [state.currentUser]);

  const handleVerify = useCallback(async (bloId: string, verified: 'yes' | 'no') => {
    setIsLoading(true);
    try {
      const success = await updateVerificationOnSheet(bloId, verified);
      if (success) {
        await loadData();
      } else {
        alert("Verification update failed.");
      }
    } catch (e) {
      alert("Operation failed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary mb-3" role="status"></div>
        <div className="fw-bold text-muted">Connecting to Google Sheets...</div>
      </div>
    );
  }

  if (!state.currentUser) {
    return <Login users={state.users} onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard user={state.currentUser!} accounts={state.accounts} />;
      case 'entry':
        return (
          <AccountEntry 
            user={state.currentUser!} 
            accounts={state.accounts} 
            banks={state.banks} 
            branches={state.branches}
            departments={state.departments}
            designations={state.designations}
            onUpdate={updateAccount}
          />
        );
      case 'verification':
        return (
          <Verification 
            user={state.currentUser!} 
            accounts={state.accounts}
            banks={state.banks} 
            branches={state.branches}
            departments={state.departments}
            designations={state.designations}
            onVerify={handleVerify}
            onUpdate={updateAccount}
          />
        );
      case 'users':
        return (
          <UserManagement 
            currentUser={state.currentUser!} 
            users={state.users} 
            onUpdateUser={handleUpdateUser} 
          />
        );
      case 'reports':
        return (
          <Reports 
            user={state.currentUser!} 
            accounts={state.accounts} 
            users={state.users}
          />
        );
      default:
        return <Dashboard user={state.currentUser!} accounts={state.accounts} />;
    }
  };

  return (
    <div className="app-container">
      {isLoading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75 z-3" style={{ zIndex: 9999 }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 fw-bold text-primary">Synchronizing...</p>
          </div>
        </div>
      )}

      <Sidebar 
        user={state.currentUser!} 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onLogout={handleLogout}
      />
      
      <div className="main-content">
        <div className="d-lg-none bg-white shadow-sm p-3 mb-4 rounded-3 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <div className="bg-primary rounded-2 p-1 me-2">
              <i className="bi bi-shield-check text-white fs-5"></i>
            </div>
            <h5 className="mb-0 fw-bold">BLO PORTAL</h5>
          </div>
          <button className="btn btn-light" onClick={() => setIsSidebarOpen(true)}>
            <i className="bi bi-list fs-4"></i>
          </button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default App;