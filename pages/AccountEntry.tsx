import React, { useState, useEffect, useRef } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch, Department, Designation } from '../types';
import { searchIFSCViaGemini } from '../services/geminiService';

interface AccountEntryProps {
  user: User;
  accounts: BLOAccount[];
  banks: Bank[];
  branches: BankBranch[];
  departments: Department[];
  designations: Designation[];
  onUpdate: (updated: BLOAccount, newBank?: Bank, newBranch?: BankBranch) => void;
}

const AccountEntry: React.FC<AccountEntryProps> = ({ user, accounts, banks, branches, departments, designations, onUpdate }) => {
  const [selectedBLO, setSelectedBLO] = useState<BLOAccount | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [editForm, setEditForm] = useState<BLOAccount | null>(null);
  
  const [searchFeedback, setSearchFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'none', message: string }>({ type: 'none', message: '' });
  const [stagedBank, setStagedBank] = useState<Bank | null>(null);
  const [stagedBranch, setStagedBranch] = useState<BankBranch | null>(null);

  const lastSearchedRef = useRef<string>('');

  const filteredAccounts = user.User_Type === UserType.ADMIN 
    ? accounts 
    : accounts.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim());

  const getEntityLabel = (obj: any, preferredKeys: string[]): string => {
    if (!obj) return '---';
    for (const key of preferredKeys) {
      if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
        return String(obj[key]).trim();
      }
    }
    const keys = Object.keys(obj);
    const fallbackKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('designation') || k.toLowerCase().includes('department'));
    if (fallbackKey) return String(obj[fallbackKey]);
    return 'Unknown';
  };

  const getDeptName = (id: any) => {
    const dept = departments.find(d => String(d.Dept_ID).trim() === String(id).trim());
    return getEntityLabel(dept, ['Dept_Name', 'Department', 'Name']);
  };

  const getDesgName = (id: any) => {
    const desg = designations.find(d => String(d.Desg_ID).trim() === String(id).trim());
    return getEntityLabel(desg, ['Desg_Name', 'Designation', 'Name']);
  };

  const handleEdit = (blo: BLOAccount) => {
    setSelectedBLO(blo);
    setEditForm({ ...blo });
    setSearchFeedback({ type: 'none', message: '' });
    setStagedBank(null);
    setStagedBranch(null);
    lastSearchedRef.current = blo.IFSC_Code || '';
  };

  const triggerIFSCSearch = async (ifscCode: string) => {
    if (!ifscCode || ifscCode.length !== 11) {
      setSearchFeedback({ type: 'error', message: 'Please enter a valid 11-digit IFSC code.' });
      return;
    }

    setIsSearching(true);
    setSearchFeedback({ type: 'none', message: '' });
    setStagedBank(null);
    setStagedBranch(null);
    lastSearchedRef.current = ifscCode;
    
    const localBranch = branches.find(br => String(br.IFSC_Code).toUpperCase() === ifscCode.toUpperCase());
    if (localBranch) {
      setEditForm(prev => prev ? ({
        ...prev,
        Bank_ID: localBranch.Bank_ID,
        Branch_ID: localBranch.Branch_ID
      }) : null);
      
      setSearchFeedback({ type: 'success', message: 'Bank details found in current directory.' });
      setIsSearching(false);
      return;
    }

    try {
      const result = await searchIFSCViaGemini(ifscCode);
      if (result) {
        const normalizedBankName = result.bankName.trim().toLowerCase();
        let bank = banks.find(b => String(b.Bank_Name).toLowerCase() === normalizedBankName);
        
        const newBankObj: Bank | undefined = !bank ? {
          Bank_ID: 'B_' + Date.now(),
          Bank_Name: result.bankName,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        } : undefined;

        const targetBankId = bank ? bank.Bank_ID : newBankObj!.Bank_ID;

        const newBranchObj: BankBranch = {
          Branch_ID: 'BR_' + Date.now(),
          Branch_Name: result.branchName,
          IFSC_Code: result.ifsc.toUpperCase(),
          Bank_ID: targetBankId,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        };

        setEditForm(prev => prev ? ({
          ...prev,
          IFSC_Code: result.ifsc.toUpperCase(),
          Bank_ID: targetBankId,
          Branch_ID: newBranchObj.Branch_ID
        }) : null);

        if (newBankObj) setStagedBank(newBankObj);
        setStagedBranch(newBranchObj);
        
        setSearchFeedback({ 
          type: 'info', 
          message: `Discovered new details! Bank: ${result.bankName}, Branch: ${result.branchName}. This will be added to the directory upon save.` 
        });
      } else {
        setSearchFeedback({ type: 'error', message: 'Could not find bank details for this IFSC code. Please verify the code.' });
      }
    } catch (err) {
      setSearchFeedback({ type: 'error', message: 'Search failed. Please check your internet connection.' });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (editForm && String(editForm.IFSC_Code).length === 11 && String(editForm.IFSC_Code) !== lastSearchedRef.current) {
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

  const handleDeptChange = (deptId: string) => {
    if (editForm) {
      setEditForm({
        ...editForm,
        Dept_ID: String(deptId).trim(),
        Desg_ID: '' 
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm) {
      if (!editForm.Account_Number || !editForm.IFSC_Code || !editForm.Account_Passbook_Doc) {
        alert("Account Number, IFSC Code, and Passbook Document are mandatory fields.");
        return;
      }
      onUpdate(editForm, stagedBank || undefined, stagedBranch || undefined);
      setSelectedBLO(null);
      setEditForm(null);
      setStagedBank(null);
      setStagedBranch(null);
    }
  };

  const renderPreview = (doc: string) => {
    if (!doc) return null;

    // Handle Google Drive links
    if (doc.includes('drive.google.com')) {
      const previewUrl = doc.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
      return (
        <iframe 
          src={previewUrl} 
          className="w-100 rounded border-0 shadow-sm" 
          style={{ height: '500px' }}
          title="Drive Document Preview"
        ></iframe>
      );
    }

    // Handle local browse (Base64) PDF
    if (doc.startsWith('data:application/pdf')) {
      return (
        <iframe 
          src={doc} 
          className="w-100 rounded border-0" 
          style={{ height: '500px' }} 
          title="PDF Preview"
        ></iframe>
      );
    } 
    
    // Handle local browse (Base64) Image
    if (doc.startsWith('data:image')) {
      return <img src={doc} alt="Passbook" className="img-fluid" style={{ maxHeight: '500px' }} />;
    }

    return (
      <div className="alert alert-secondary py-3 text-center">
        <i className="bi bi-file-earmark-text fs-2 mb-2 d-block"></i>
        <span>Unsupported document format for instant preview. <a href={doc} target="_blank" rel="noreferrer">Open in new tab</a></span>
      </div>
    );
  };

  if (selectedBLO && editForm) {
    const isLocked = editForm.Verified === 'yes' && user.User_Type !== UserType.ADMIN;
    const isFileNew = editForm.Account_Passbook_Doc && editForm.Account_Passbook_Doc.startsWith('data:');
    
    const currentBank = banks.find(b => String(b.Bank_ID).trim() === String(editForm.Bank_ID).trim()) || (stagedBank?.Bank_ID === editForm.Bank_ID ? stagedBank : null);
    const currentBranch = branches.find(br => String(br.Branch_ID).trim() === String(editForm.Branch_ID).trim()) || (stagedBranch?.Branch_ID === editForm.Branch_ID ? stagedBranch : null);

    const availableDesignations = designations.filter(d => 
      editForm.Dept_ID && 
      String(d.Dept_ID).trim() === String(editForm.Dept_ID).trim()
    );

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

              {/* 1. Assembly Details Section - VIEW ONLY */}
              <div className="card border-0 shadow-sm mb-4 bg-light">
                <div className="card-body p-4">
                  <h6 className="text-secondary fw-bold text-uppercase small mb-4 d-flex align-items-center">
                    <i className="bi bi-geo-alt-fill me-2"></i>
                    Assembly Details (View Only)
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-2">
                      <label className="form-label extra-small fw-bold text-muted">AC No.</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.AC_No} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label extra-small fw-bold text-muted">AC Name</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.AC_Name} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label extra-small fw-bold text-muted">Tehsil</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Tehsil} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label extra-small fw-bold text-muted">Part No.</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Part_No} />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label extra-small fw-bold text-muted">Part Name (English)</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Part_Name_EN} />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label extra-small fw-bold text-muted">Part Name (Hindi)</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Part_Name_HI} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. BLO Details Section */}
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                  <h6 className="text-primary fw-bold text-uppercase small mb-4 d-flex align-items-center">
                    <i className="bi bi-person-badge-fill me-2"></i>
                    BLO Details
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label extra-small fw-bold text-muted">BLO Name</label>
                      <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.BLO_Name} onChange={e => setEditForm({...editForm, BLO_Name: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label extra-small fw-bold text-muted">Gender</label>
                      <select disabled={isLocked} className="form-select form-select-sm" value={editForm.Gender} onChange={e => setEditForm({...editForm, Gender: e.target.value as any})}>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label extra-small fw-bold text-muted">Mobile</label>
                      <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.Mobile} onChange={e => setEditForm({...editForm, Mobile: e.target.value})} />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label extra-small fw-bold text-muted">Department</label>
                      <select 
                        disabled={isLocked} 
                        className="form-select form-select-sm shadow-sm" 
                        value={editForm.Dept_ID} 
                        onChange={e => handleDeptChange(e.target.value)}
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={String(d.Dept_ID)} value={String(d.Dept_ID)}>
                            {getEntityLabel(d, ['Dept_Name', 'Department', 'Name'])}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label extra-small fw-bold text-muted">Designation</label>
                      <select 
                        disabled={isLocked || !editForm.Dept_ID} 
                        className="form-select form-select-sm shadow-sm" 
                        value={editForm.Desg_ID} 
                        onChange={e => setEditForm({...editForm, Desg_ID: e.target.value})}
                      >
                        <option value="">{editForm.Dept_ID ? (availableDesignations.length > 0 ? 'Select Designation' : 'No Designations Found') : 'Select Department First'}</option>
                        {availableDesignations.map(d => (
                          <option key={String(d.Desg_ID)} value={String(d.Desg_ID)}>
                            {getEntityLabel(d, ['Desg_Name', 'Designation', 'Name'])}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label extra-small fw-bold text-muted">EPIC (Voter ID)</label>
                      <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.EPIC} onChange={e => setEditForm({...editForm, EPIC: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Account Details Section */}
              <div className="card border-0 shadow-sm mb-5">
                <div className="card-body p-4 bg-white border-start border-primary border-5 rounded-end">
                  <h6 className="text-primary fw-bold text-uppercase small mb-4 d-flex align-items-center">
                    <i className="bi bi-credit-card-2-front me-2"></i>
                    Account Details <span className="text-danger ms-2 fw-normal" style={{ fontSize: '0.6rem' }}>(All Fields Required)</span>
                  </h6>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light">
                        <label className="form-label fw-bold text-dark mb-2">IFSC Code <span className="text-danger">*</span></label>
                        <div className="input-group input-group-lg shadow-sm">
                          <input 
                            disabled={isLocked} 
                            type="text" 
                            className="form-control fw-bold text-primary text-uppercase" 
                            placeholder="Enter 11-digit IFSC" 
                            maxLength={11}
                            value={editForm.IFSC_Code} 
                            onChange={e => setEditForm({...editForm, IFSC_Code: e.target.value.toUpperCase().trim()})} 
                            required
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
                          <div className={`mt-2 small fw-bold text-${searchFeedback.type === 'error' ? 'danger' : searchFeedback.type === 'info' ? 'primary' : 'success'}`}>
                            {searchFeedback.message}
                          </div>
                        )}

                        <div className="mt-3 p-3 rounded bg-white border border-info-subtle shadow-sm">
                          <div className="small text-muted text-uppercase fw-bold mb-2" style={{fontSize: '0.65rem'}}>System Verification:</div>
                          
                          {(currentBank || currentBranch) ? (
                            <>
                              <div className="fw-bold text-dark d-flex align-items-center">
                                {currentBank?.Bank_Name || '---'}
                                {(stagedBank || stagedBranch) && <span className="ms-2 badge bg-info extra-small text-uppercase" style={{fontSize: '0.55rem'}}>New Discovery</span>}
                              </div>
                              <div className="small text-secondary">{currentBranch?.Branch_Name || '---'}</div>
                            </>
                          ) : (
                            <div className="text-muted italic small">No record found. Type valid IFSC and click Search.</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light">
                        <label className="form-label fw-bold text-dark mb-2">Account Number <span className="text-danger">*</span></label>
                        <input 
                          disabled={isLocked} 
                          type="text" 
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="form-control form-control-lg shadow-sm fw-bold text-dark" 
                          placeholder="Enter Full Account Number"
                          value={String(editForm.Account_Number || '')} 
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setEditForm({...editForm, Account_Number: val});
                          }} 
                          required
                        />
                        <div className="form-text mt-2"><i className="bi bi-info-circle me-1"></i> Digits only. Leading zeros are preserved.</div>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold text-secondary">Account Passbook Doc (Upload PDF/JPG) <span className="text-danger">*</span></label>
                      <input disabled={isLocked} type="file" className="form-control bg-white shadow-sm mb-3" onChange={handleFileChange} accept=".pdf,image/*" required={!editForm.Account_Passbook_Doc} />
                      
                      {editForm.Account_Passbook_Doc && (
                        <div className="mt-2">
                          <div className="p-3 border rounded bg-white shadow-sm mb-3">
                            <h6 className="fw-bold extra-small text-muted text-uppercase mb-3 d-flex align-items-center">
                              <i className="bi bi-eye me-2"></i>
                              Document Preview
                              {isFileNew ? <span className="ms-auto badge bg-info">Live Preview</span> : <span className="ms-auto badge bg-success">Existing Cloud File</span>}
                            </h6>
                            <div className="bg-light rounded overflow-hidden d-flex align-items-center justify-content-center" style={{ minHeight: '300px', maxHeight: '500px' }}>
                              {renderPreview(editForm.Account_Passbook_Doc)}
                            </div>
                          </div>
                          
                          <div className="d-flex align-items-center gap-2">
                            {isFileNew ? (
                              <div className="alert alert-info py-2 px-3 small border-0 d-flex align-items-center mb-0 w-100 shadow-sm">
                                <i className="bi bi-cloud-arrow-up-fill fs-5 me-2"></i>
                                <span>New document selected. The old file on Drive will be replaced upon saving.</span>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center gap-2 w-100">
                                <span className="badge bg-success px-3 py-2 shadow-sm"><i className="bi bi-check2-circle me-1"></i> Cloud Link Active</span>
                                <span className="small text-muted ms-auto">Using file previously uploaded to Drive.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {!editForm.Account_Passbook_Doc && (
                        <div className="text-danger extra-small mt-1"><i className="bi bi-exclamation-triangle me-1"></i> Passbook document is mandatory for registration.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-top d-flex gap-3 justify-content-end align-items-center">
                <button type="button" onClick={() => setSelectedBLO(null)} className="btn btn-outline-secondary px-4">Cancel</button>
                <button type="submit" disabled={isLocked} className="btn btn-primary btn-lg px-5 shadow-sm fw-bold">
                  Save & Push to Cloud
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
                <th className="py-3 px-4 fw-bold small">BLO NAME / DEPT</th>
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
                    <div className="fw-semibold text-primary">{blo.BLO_Name}</div>
                    <div className="extra-small fw-bold text-uppercase text-muted">
                      {getDesgName(blo.Desg_ID)} | {getDeptName(blo.Dept_ID)}
                    </div>
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
                    <div className="d-flex flex-column align-items-center">
                      {blo.Verified === 'yes' ? (
                        <span className="badge bg-success-subtle text-success rounded-pill px-3">
                          <i className="bi bi-shield-check me-1"></i> Verified
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3">
                          Pending
                        </span>
                      )}
                      {blo.Account_Passbook_Doc && blo.Account_Passbook_Doc.startsWith('http') && (
                        <i className="bi bi-cloud-check text-success extra-small mt-1" title="Document Available"></i>
                      )}
                    </div>
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