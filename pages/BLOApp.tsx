import React, { useState, useEffect, useRef } from 'react';
import { BLOAccount, Bank, BankBranch, Department, Designation, AccountCategory } from '../types';
import { searchIFSC } from '../services/ifscService';

interface BLOAppProps {
  accounts: BLOAccount[];
  banks: Bank[];
  branches: BankBranch[];
  departments: Department[];
  designations: Designation[];
  onUpdateAccount: (updated: BLOAccount, type: AccountCategory, newBank?: Bank, newBranch?: BankBranch) => Promise<void>;
  onLogout: () => void;
}

const BLOApp: React.FC<BLOAppProps> = ({ accounts, banks, branches, departments, designations, onUpdateAccount, onLogout }) => {
  const [authStep, setAuthStep] = useState<'login' | 'change-pin' | 'dashboard' | 'edit'>('login');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [currentBLO, setCurrentBLO] = useState<BLOAccount | null>(null);
  const [error, setError] = useState('');
  
  const [editForm, setEditForm] = useState<BLOAccount | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stagedBank, setStagedBank] = useState<Bank | null>(null);
  const [stagedBranch, setStagedBranch] = useState<BankBranch | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const blo = accounts.find(a => String(a.Mobile).trim() === mobile.trim());
    
    if (!blo) {
      setError('Mobile number not found in our records.');
      return;
    }

    const storedPin = (blo.Secret_PIN || '123456').trim();
    if (storedPin === pin.trim()) {
      // Normalize Gender for state initialization
      const normalizedGender = (blo.Gender === 'Male' || blo.Gender === 'Female' || blo.Gender === 'Other') 
        ? blo.Gender 
        : 'Male';
        
      const finalBlo = { ...blo, Gender: normalizedGender };
      
      setCurrentBLO(finalBlo);
      setEditForm(finalBlo);
      
      if (storedPin === '123456' && blo.PIN_Changed !== 'yes') {
        setAuthStep('change-pin');
      } else {
        setAuthStep('dashboard');
      }
    } else {
      setError('Invalid Security PIN.');
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '123456') {
      setError('You must choose a PIN other than the default 123456.');
      return;
    }
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.');
      return;
    }

    if (currentBLO) {
      const updated = { ...currentBLO, Secret_PIN: pin, PIN_Changed: 'yes' as const };
      await onUpdateAccount(updated, 'blo');
      setCurrentBLO(updated);
      setAuthStep('dashboard');
      alert('PIN updated successfully. Welcome!');
    }
  };

  const handleIFSCSearch = async () => {
    if (!editForm?.IFSC_Code || editForm.IFSC_Code.length !== 11) return;
    setIsSearching(true);
    setFeedback('');
    setStagedBank(null);
    setStagedBranch(null);

    const ifscToSearch = editForm.IFSC_Code.toUpperCase();
    
    const localBranch = branches.find(br => br.IFSC_Code.toUpperCase() === ifscToSearch);
    if (localBranch) {
      setEditForm(prev => prev ? ({
        ...prev,
        Bank_ID: localBranch.Bank_ID,
        Branch_ID: localBranch.Branch_ID
      }) : null);
      setStagedBranch(localBranch);
      setFeedback('Success: Branch found in records!');
      setIsSearching(false);
      return;
    }
    
    const res = await searchIFSC(ifscToSearch);
    if (res) {
      const normalizedBankName = res.bankName.trim().toUpperCase();
      let bank = banks.find(b => b.Bank_Name.toUpperCase() === normalizedBankName);
      
      let targetBankId = '';
      let newBankObj: Bank | null = null;

      if (bank) {
        targetBankId = bank.Bank_ID;
      } else {
        const bankNums = banks.map(b => {
          const match = b.Bank_ID.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        });
        const nextBankNum = bankNums.length > 0 ? Math.max(...bankNums) + 1 : 1;
        targetBankId = `B_${nextBankNum}`;

        newBankObj = {
          Bank_ID: targetBankId,
          Bank_Name: res.bankName.toUpperCase(),
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        };
      }

      const branchNums = branches.map(br => {
        const match = br.Branch_ID.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      });
      const nextBranchNum = branchNums.length > 0 ? Math.max(...branchNums) + 1 : 1;
      const targetBranchId = `BR_${nextBranchNum}`;

      const newBranchObj: BankBranch = {
        Branch_ID: targetBranchId,
        Branch_Name: res.branchName.toUpperCase(),
        IFSC_Code: res.ifsc.toUpperCase(),
        Bank_ID: targetBankId,
        T_STMP_ADD: new Date().toISOString(),
        T_STMP_UPD: new Date().toISOString()
      };

      setEditForm(prev => prev ? ({
        ...prev,
        Bank_ID: targetBankId,
        Branch_ID: targetBranchId
      }) : null);

      if (newBankObj) setStagedBank(newBankObj);
      setStagedBranch(newBranchObj);
      setFeedback('Success: New details fetched!');
    } else {
      setFeedback('Error: IFSC not found.');
    }
    setIsSearching(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editForm) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, Account_Passbook_Doc: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAccount = async () => {
    if (!editForm) return;
    if (!editForm.Account_Number || !editForm.IFSC_Code || !editForm.Account_Passbook_Doc) {
      alert("All bank details are mandatory.");
      return;
    }
    await onUpdateAccount(editForm, 'blo', stagedBank || undefined, stagedBranch || undefined);
    setAuthStep('dashboard');
    alert('Bank account updated successfully!');
  };

  if (authStep === 'login') {
    return (
      <div className="container-fluid min-vh-100 bg-white p-4 d-flex flex-column align-items-center">
        <div className="text-center mt-5 mb-5">
          <i className="bi bi-phone-vibrate text-primary display-3"></i>
          <h2 className="fw-bold mt-3">BLO Mobile App</h2>
          <p className="text-muted">Secure Bank Entry System</p>
        </div>
        
        <form onSubmit={handleLogin} className="w-100" style={{ maxWidth: '400px' }}>
          {error && <div className="alert alert-danger py-2 small text-center">{error}</div>}
          <div className="mb-3">
            <label className="form-label small fw-bold">Mobile Number</label>
            <input type="tel" className="form-control form-control-lg bg-light border-0 shadow-sm" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="Enter Registered Mobile" required />
          </div>
          <div className="mb-4">
            <label className="form-label small fw-bold">Secret PIN (Default: 123456)</label>
            <input type="password" underline-none className="form-control form-control-lg bg-light border-0 shadow-sm text-center fw-bold" style={{ letterSpacing: '0.5rem' }} value={pin} onChange={e => setPin(e.target.value)} placeholder="••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-100 py-3 rounded-4 shadow-lg fw-bold">
            LOGIN AS BLO
          </button>
        </form>

        <div className="mt-auto text-center p-3 opacity-50 extra-small">
          District Election Office Portal
        </div>
      </div>
    );
  }

  if (authStep === 'change-pin') {
    return (
      <div className="container-fluid min-vh-100 bg-primary p-4 d-flex flex-column align-items-center justify-content-center">
        <div className="card w-100 border-0 shadow-lg rounded-5 p-4" style={{ maxWidth: '400px' }}>
          <div className="text-center mb-4">
            <i className="bi bi-shield-lock-fill text-warning display-4"></i>
            <h4 className="fw-bold mt-2">Create New PIN</h4>
            <p className="text-muted small">For security, please set a new personal PIN.</p>
          </div>
          <form onSubmit={handleChangePin}>
            {error && <div className="alert alert-danger py-2 small text-center">{error}</div>}
            <div className="mb-4 text-center">
              <input type="password" autoFocus className="form-control form-control-lg bg-light border-0 text-center fs-2 fw-bold" style={{ letterSpacing: '0.8rem' }} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="0000" required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-100 rounded-4 py-3 fw-bold">UPDATE PIN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100 d-flex flex-column">
      <div className="bg-primary text-white p-3 shadow-sm flex-shrink-0">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="extra-small opacity-75 fw-bold">BLO PORTAL</div>
            <div className="fw-bold">{currentBLO?.BLO_Name}</div>
          </div>
          <button onClick={onLogout} className="btn btn-sm btn-light rounded-pill px-3 fw-bold">LOGOUT</button>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto p-3">
        {authStep === 'dashboard' ? (
          <div className="animate-fade-in">
            <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-4 me-3">
                  <i className="bi bi-geo-alt fs-3"></i>
                </div>
                <div>
                  <div className="extra-small text-muted fw-bold">ASSIGNED AREA</div>
                  <div className="fw-bold fs-5">Part {currentBLO?.Part_No}</div>
                  <div className="small text-secondary">{currentBLO?.AC_Name}</div>
                </div>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-6">
                <div className="card border-0 shadow-sm rounded-4 p-3 text-center h-100">
                  <i className={`bi bi-${currentBLO?.Verified === 'yes' ? 'patch-check-fill text-success' : 'clock-history text-warning'} fs-2 mb-2`}></i>
                  <div className="extra-small fw-bold">STATUS</div>
                  <div className="fw-bold small">{currentBLO?.Verified === 'yes' ? 'Verified' : 'Pending'}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="card border-0 shadow-sm rounded-4 p-3 text-center h-100">
                  <i className={`bi bi-${currentBLO?.Account_Number ? 'credit-card-fill text-info' : 'plus-circle text-muted'} fs-2 mb-2`}></i>
                  <div className="extra-small fw-bold">ACCOUNT</div>
                  <div className="fw-bold small">{currentBLO?.Account_Number ? 'Saved' : 'Not Added'}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <button onClick={() => setAuthStep('edit')} className="btn btn-primary btn-lg rounded-pill px-5 shadow-lg fw-bold">
                <i className="bi bi-pencil-square me-2"></i>
                {currentBLO?.Account_Number ? 'UPDATE ACCOUNT' : 'ADD ACCOUNT'}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in pb-5">
            <h5 className="fw-bold mb-4">Edit Details</h5>
            
            <div className="mb-4">
              <label className="form-label small fw-bold">Full Name</label>
              <input type="text" className="form-control form-control-lg border-0 shadow-sm" value={editForm?.BLO_Name || ''} onChange={e => setEditForm(prev => prev ? ({ ...prev, BLO_Name: e.target.value }) : null)} required />
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold">Gender</label>
              <select className="form-select form-select-lg border-0 shadow-sm" value={editForm?.Gender} onChange={e => setEditForm(prev => prev ? ({ ...prev, Gender: e.target.value as any }) : null)} required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold">IFSC Code</label>
              <div className="input-group shadow-sm">
                <input type="text" className="form-control border-0 bg-white fw-bold text-uppercase" placeholder="Enter IFSC" maxLength={11} value={editForm?.IFSC_Code} onChange={e => setEditForm(prev => prev ? ({ ...prev, IFSC_Code: e.target.value.toUpperCase().trim() }) : null)} />
                <button onClick={handleIFSCSearch} className="btn btn-dark" disabled={isSearching}>
                  FETCH
                </button>
              </div>
              {feedback && <div className={`extra-small mt-1 fw-bold ${feedback.includes('Error') ? 'text-danger' : 'text-primary'}`}>{feedback}</div>}
              {stagedBranch && (
                <div className="mt-2 p-2 bg-white rounded shadow-sm extra-small">
                  <div className="fw-bold">{banks.find(b => b.Bank_ID === editForm?.Bank_ID)?.Bank_Name || stagedBank?.Bank_Name}</div>
                  <div className="text-muted">{stagedBranch.Branch_Name}</div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold">Account Number</label>
              <input type="text" className="form-control form-control-lg border-0 shadow-sm" value={editForm?.Account_Number} onChange={e => setEditForm(prev => prev ? ({ ...prev, Account_Number: e.target.value.replace(/\D/g, '') }) : null)} placeholder="Enter Account Number" />
            </div>

            <div className="mb-4">
              <label className="form-label small fw-bold">Passbook Copy</label>
              <input type="file" className="form-control border-0 shadow-sm mb-2" accept="image/*,.pdf" onChange={handleFileChange} />
              {editForm?.Account_Passbook_Doc && (
                <div className="rounded border bg-white p-2 text-center">
                  {editForm.Account_Passbook_Doc.startsWith('data:image') ? (
                    <img src={editForm.Account_Passbook_Doc} className="img-fluid rounded" alt="Preview" style={{ maxHeight: '150px' }} />
                  ) : (
                    <span className="small text-muted">File selected</span>
                  )}
                </div>
              )}
            </div>

            <div className="fixed-bottom p-3 bg-white border-top shadow-lg d-flex gap-2">
              <button onClick={() => setAuthStep('dashboard')} className="btn btn-outline-secondary flex-grow-1 rounded-3 py-3 fw-bold">CANCEL</button>
              <button onClick={handleSaveAccount} className="btn btn-primary flex-grow-2 rounded-3 py-3 fw-bold shadow">SAVE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BLOApp;