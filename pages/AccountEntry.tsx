import React, { useState, useEffect, useRef } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch } from '../types';
import { searchIFSCViaGemini } from '../services/geminiService';

interface AccountEntryProps {
  user: User;
  accounts: BLOAccount[];
  banks: Bank[];
  branches: BankBranch[];
  onUpdate: (updated: BLOAccount, newBank?: Bank, newBranch?: BankBranch) => void;
}

const AccountEntry: React.FC<AccountEntryProps> = ({ user, accounts, banks, branches, onUpdate }) => {
  const [selectedBLO, setSelectedBLO] = useState<BLOAccount | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [editForm, setEditForm] = useState<BLOAccount | null>(null);
  
  // Local state for manual override names if Gemini fails or user wants to override
  const [manualBankName, setManualBankName] = useState('');
  const [manualBranchName, setManualBranchName] = useState('');
  const [searchFeedback, setSearchFeedback] = useState<{ type: 'success' | 'error' | 'none', message: string }>({ type: 'none', message: '' });

  // Track the last searched IFSC to avoid redundant auto-searches
  const lastSearchedRef = useRef<string>('');

  const filteredAccounts = user.User_Type === UserType.ADMIN 
    ? accounts 
    : accounts.filter(a => a.User_ID === user.User_ID);

  const handleEdit = (blo: BLOAccount) => {
    setSelectedBLO(blo);
    setEditForm({ ...blo });
    setSearchFeedback({ type: 'none', message: '' });
    setManualBankName('');
    setManualBranchName('');
    lastSearchedRef.current = blo.IFSC_Code || '';
    (window as any)._stagedBank = undefined;
    (window as any)._stagedBranch = undefined;
  };

  const triggerIFSCSearch = async (ifscCode: string) => {
    if (!ifscCode || ifscCode.length !== 11) {
      setSearchFeedback({ type: 'error', message: 'Please enter a valid 11-digit IFSC code.' });
      return;
    }

    setIsSearching(true);
    setSearchFeedback({ type: 'none', message: '' });
    lastSearchedRef.current = ifscCode;
    
    try {
      const result = await searchIFSCViaGemini(ifscCode);
      if (result) {
        let bank = banks.find(b => b.Bank_Name.toLowerCase() === result.bankName.toLowerCase());
        let branch = branches.find(br => br.IFSC_Code === result.ifsc);

        const newBank: Bank | undefined = !bank ? {
          Bank_ID: 'B_' + Date.now(),
          Bank_Name: result.bankName,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        } : undefined;

        const targetBankId = bank ? bank.Bank_ID : newBank!.Bank_ID;

        const newBranch: BankBranch | undefined = !branch ? {
          Branch_ID: 'BR_' + Date.now(),
          Branch_Name: result.branchName,
          IFSC_Code: result.ifsc,
          Bank_ID: targetBankId,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        } : undefined;

        setEditForm(prev => prev ? ({
          ...prev,
          IFSC_Code: result.ifsc, // Sync casing just in case
          Bank_ID: targetBankId,
          Branch_ID: branch ? branch.Branch_ID : newBranch!.Branch_ID
        }) : null);

        (window as any)._stagedBank = newBank;
        (window as any)._stagedBranch = newBranch;
        setSearchFeedback({ type: 'success', message: 'Bank details found successfully.' });
      } else {
        setSearchFeedback({ type: 'error', message: 'Could not find bank details automatically. You can enter details manually.' });
      }
    } catch (err) {
      setSearchFeedback({ type: 'error', message: 'Search failed. Manual entry is enabled.' });
    } finally {
      setIsSearching(false);
    }
  };

  // Automatic search when IFSC reaches 11 characters
  useEffect(() => {
    if (editForm && editForm.IFSC_Code.length === 11 && editForm.IFSC_Code !== lastSearchedRef.current) {
      triggerIFSCSearch(editForm.IFSC_Code);
    }
  }, [editForm?.IFSC_Code]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm) {
      if (!editForm.Account_Number || !editForm.IFSC_Code) {
        alert("Account Number and IFSC Code are mandatory.");
        return;
      }

      let finalBank = (window as any)._stagedBank;
      let finalBranch = (window as any)._stagedBranch;

      // If search failed, allow user to save with manual values
      if (!finalBank && manualBankName) {
        finalBank = {
          Bank_ID: 'B_' + Date.now(),
          Bank_Name: manualBankName,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        };
        editForm.Bank_ID = finalBank.Bank_ID;
      }

      if (!finalBranch && manualBranchName) {
        finalBranch = {
          Branch_ID: 'BR_' + Date.now(),
          Branch_Name: manualBranchName,
          IFSC_Code: editForm.IFSC_Code,
          Bank_ID: editForm.Bank_ID,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        };
        editForm.Branch_ID = finalBranch.Branch_ID;
      }

      // Even if Bank/Branch IDs are missing (search failed and no manual name given), 
      // we still let it update to allow partial saves as requested.
      onUpdate(editForm, finalBank, finalBranch);
      setSelectedBLO(null);
      setEditForm(null);
      delete (window as any)._stagedBank;
      delete (window as any)._stagedBranch;
    }
  };

  if (selectedBLO && editForm) {
    const isLocked = editForm.Verified === 'yes' && user.User_Type !== UserType.ADMIN;
    const currentBank = banks.find(b => b.Bank_ID === editForm.Bank_ID);
    const currentBranch = branches.find(br => br.Branch_ID === editForm.Branch_ID);

    return (
      <div className="container-fluid py-2">
        <div className="card shadow-lg border-0 overflow-hidden">
          <div className="card-header bg-primary text-white p-4 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold d-flex align-items-center">
              <i className="bi bi-bank2 me-3 fs-4"></i>
              Manage Bank Account: {selectedBLO.BLO_Name}
            </h5>
            <button onClick={() => setSelectedBLO(null)} className="btn-close btn-close-white"></button>
          </div>
          <div className="card-body p-4 bg-light-subtle">
            <form onSubmit={handleSubmit}>
              {isLocked && (
                <div className="alert alert-warning mb-4 shadow-sm border-0 d-flex align-items-center">
                  <i className="bi bi-lock-fill fs-4 me-3"></i>
                  <div>This record is <strong>Verified</strong>. Changes are restricted.</div>
                </div>
              )}

              {/* Priority Section: Bank Account Details */}
              <div className="card border-0 shadow-sm mb-5">
                <div className="card-body p-4 bg-white border-start border-primary border-5 rounded-end">
                  <h6 className="text-primary fw-bold text-uppercase small mb-4 d-flex align-items-center">
                    <i className="bi bi-credit-card-2-front me-2"></i>
                    Core Bank Account Information
                  </h6>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light">
                        <label className="form-label fw-bold text-dark mb-2">IFSC Code</label>
                        <div className="input-group input-group-lg shadow-sm">
                          <input 
                            disabled={isLocked} 
                            type="text" 
                            className="form-control fw-bold text-primary" 
                            placeholder="Enter 11-digit IFSC" 
                            maxLength={11}
                            value={editForm.IFSC_Code} 
                            onChange={e => setEditForm({...editForm, IFSC_Code: e.target.value.toUpperCase().trim()})} 
                          />
                          <button 
                            type="button" 
                            className="btn btn-primary px-4" 
                            onClick={() => triggerIFSCSearch(editForm.IFSC_Code)}
                            disabled={isSearching || isLocked}
                          >
                            {isSearching ? <i className="bi bi-arrow-repeat spin"></i> : <><i className="bi bi-search me-2"></i>Search</>}
                          </button>
                        </div>
                        
                        {searchFeedback.type !== 'none' && (
                          <div className={`mt-2 small fw-bold text-${searchFeedback.type === 'error' ? 'danger' : 'success'}`}>
                            {searchFeedback.message}
                          </div>
                        )}

                        <div className="mt-3 p-3 rounded bg-white border border-info-subtle shadow-sm">
                          <div className="small text-muted text-uppercase fw-bold mb-2" style={{fontSize: '0.65rem'}}>Directory Lookup:</div>
                          
                          {(currentBank || currentBranch) ? (
                            <>
                              <div className="fw-bold text-dark">{currentBank?.Bank_Name || '---'}</div>
                              <div className="small text-secondary">{currentBranch?.Branch_Name || '---'}</div>
                            </>
                          ) : (
                            <div className="text-muted italic small">No record found in sheets. Type names below if search failed.</div>
                          )}

                          {/* Manual entry fallback */}
                          {!isLocked && (!currentBank || !currentBranch) && (
                            <div className="mt-3 pt-3 border-top">
                              <label className="form-label extra-small text-muted fw-bold">Manual Bank Details</label>
                              <input 
                                type="text" 
                                className="form-control form-control-sm mb-2" 
                                placeholder="Bank Name (e.g. State Bank of India)" 
                                value={manualBankName} 
                                onChange={e => setManualBankName(e.target.value)}
                              />
                              <input 
                                type="text" 
                                className="form-control form-control-sm" 
                                placeholder="Branch Name (e.g. Main Branch Mumbai)" 
                                value={manualBranchName} 
                                onChange={e => setManualBranchName(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light">
                        <label className="form-label fw-bold text-dark mb-2">Account Number</label>
                        <input 
                          disabled={isLocked} 
                          type="text" 
                          className="form-control form-control-lg shadow-sm fw-bold text-dark" 
                          placeholder="Enter Full Account Number"
                          value={editForm.Account_Number} 
                          onChange={e => setEditForm({...editForm, Account_Number: e.target.value.replace(/\D/g, '')})} 
                        />
                        <div className="form-text mt-2"><i className="bi bi-info-circle me-1"></i> Digits only. No spaces.</div>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold text-secondary">Passbook Proof (Upload PDF or Image)</label>
                      <input disabled={isLocked} type="file" className="form-control bg-white" onChange={handleFileChange} />
                      {editForm.Account_Passbook_Doc && (
                        <div className="mt-2">
                          <span className="badge bg-success px-3 py-2"><i className="bi bi-check2-circle me-1"></i> Document Attached</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-4 mb-4">
                <div className="col-md-6">
                  <div className="card h-100 border-0 shadow-sm p-3">
                    <h6 className="text-secondary fw-bold text-uppercase extra-small mb-3">BLO Identity</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label small text-muted">Full Name</label>
                        <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.BLO_Name} onChange={e => setEditForm({...editForm, BLO_Name: e.target.value})} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">Mobile</label>
                        <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.Mobile} onChange={e => setEditForm({...editForm, Mobile: e.target.value})} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">EPIC (Voter ID)</label>
                        <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.EPIC} onChange={e => setEditForm({...editForm, EPIC: e.target.value})} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small text-muted">Gender</label>
                        <select disabled={isLocked} className="form-select form-select-sm" value={editForm.Gender} onChange={e => setEditForm({...editForm, Gender: e.target.value as any})}>
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="card h-100 border-0 shadow-sm p-3">
                    <h6 className="text-secondary fw-bold text-uppercase extra-small mb-3">Election Mapping</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label small text-muted">AC No.</label>
                        <input type="text" className="form-control form-control-sm bg-light" value={editForm.AC_No} disabled />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label small text-muted">AC Name</label>
                        <input type="text" className="form-control form-control-sm bg-light" value={editForm.AC_Name} disabled />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small text-muted">Part No.</label>
                        <input type="text" className="form-control form-control-sm bg-light" value={editForm.Part_No} disabled />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label small text-muted">Tehsil</label>
                        <input type="text" className="form-control form-control-sm bg-light" value={editForm.Tehsil} disabled />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-top d-flex gap-3 justify-content-end">
                <button type="button" onClick={() => setSelectedBLO(null)} className="btn btn-outline-secondary px-4">Cancel</button>
                <button type="submit" disabled={isLocked} className="btn btn-primary btn-lg px-5 shadow-sm fw-bold">
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-2">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold mb-1">BLO Bank Directory</h3>
          <p className="text-muted small mb-0">Update and manage bank account details for election personnel.</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary px-3 py-2">{filteredAccounts.length} Total Records</span>
        </div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th className="py-3 px-4 fw-bold small">PART / AC</th>
                <th className="py-3 px-4 fw-bold small">BLO NAME</th>
                <th className="py-3 px-4 fw-bold small bg-primary-subtle text-primary">ACCOUNT NUMBER</th>
                <th className="py-3 px-4 fw-bold small bg-primary-subtle text-primary">IFSC CODE</th>
                <th className="py-3 px-4 fw-bold small text-center">STATUS</th>
                <th className="py-3 px-4 fw-bold small text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(blo => (
                <tr key={blo.BLO_ID} className={blo.Verified === 'yes' ? 'table-success-subtle' : ''}>
                  <td className="px-4 py-3">
                    <div className="fw-bold text-dark">P-{blo.Part_No}</div>
                    <div className="extra-small text-muted">{blo.AC_Name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="fw-semibold">{blo.BLO_Name}</div>
                    <div className="small text-secondary">{blo.Mobile}</div>
                  </td>
                  <td className="px-4 py-3 bg-light font-monospace">
                    {blo.Account_Number ? (
                      <span className="fw-bold text-dark">{blo.Account_Number}</span>
                    ) : (
                      <span className="text-danger small italic"><i className="bi bi-x-circle me-1"></i> Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 bg-light font-monospace">
                    {blo.IFSC_Code ? (
                      <span className="fw-bold text-primary">{blo.IFSC_Code}</span>
                    ) : (
                      <span className="text-danger small italic">---</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {blo.Verified === 'yes' ? (
                      <span className="badge bg-success-subtle text-success rounded-pill px-3">
                        <i className="bi bi-shield-check me-1"></i> Verified
                      </span>
                    ) : (
                      <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button 
                      onClick={() => handleEdit(blo)} 
                      className={`btn btn-sm px-3 ${blo.Verified === 'yes' && user.User_Type !== UserType.ADMIN ? 'btn-outline-secondary' : 'btn-primary shadow-sm'}`}
                    >
                      <i className={`bi ${blo.Verified === 'yes' && user.User_Type !== UserType.ADMIN ? 'bi-eye' : 'bi-pencil'} me-1`}></i> 
                      {blo.Verified === 'yes' && user.User_Type !== UserType.ADMIN ? 'View' : 'Edit'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountEntry;