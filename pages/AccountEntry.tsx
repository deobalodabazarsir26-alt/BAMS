import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch, Department, Designation, AccountCategory } from '../types';
import { searchIFSC } from '../services/ifscService';

interface AccountEntryProps {
  user: User;
  accounts: BLOAccount[];
  banks: Bank[];
  branches: BankBranch[];
  departments: Department[];
  designations: Designation[];
  onUpdate: (updated: BLOAccount, type: AccountCategory, newBank?: Bank, newBranch?: BankBranch) => void;
  type: AccountCategory;
}

const AccountEntry: React.FC<AccountEntryProps> = ({ user, accounts, banks, branches, departments, designations, onUpdate, type }) => {
  const [selectedBLO, setSelectedBLO] = useState<BLOAccount | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [editForm, setEditForm] = useState<BLOAccount | null>(null);
  
  const [filterTehsil, setFilterTehsil] = useState('');
  const [filterAC, setFilterAC] = useState('');
  
  const [searchFeedback, setSearchFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'none', message: string }>({ type: 'none', message: '' });
  const [stagedBank, setStagedBank] = useState<Bank | null>(null);
  const [stagedBranch, setStagedBranch] = useState<BankBranch | null>(null);

  const lastSearchedRef = useRef<string>('');
  const isAdmin = user.User_Type === UserType.ADMIN;

  const typeLabels: Record<AccountCategory, string> = {
    blo: 'BLO',
    avihit: 'Avihit',
    supervisor: 'Supervisor'
  };

  const uniqueTehsils = useMemo(() => Array.from(new Set(accounts.map(a => a.Tehsil))).sort(), [accounts]);
  const uniqueACs = useMemo(() => Array.from(new Set(accounts.map(a => a.AC_Name))).sort(), [accounts]);

  const filteredAccounts = useMemo(() => {
    let list = user.User_Type === UserType.ADMIN 
      ? accounts 
      : accounts.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim());

    if (isAdmin) {
      if (filterTehsil) list = list.filter(a => a.Tehsil === filterTehsil);
      if (filterAC) list = list.filter(a => a.AC_Name === filterAC);
    }
    
    return list;
  }, [accounts, user, isAdmin, filterTehsil, filterAC]);

  const getEntityLabel = (obj: any, preferredKeys: string[]): string => {
    if (!obj) return '---';
    for (const key of preferredKeys) {
      if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
        return String(obj[key]).trim();
      }
    }
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
    // Critical Fix: Ensure Gender has a valid initial value if empty in sheet
    const normalizedGender = (blo.Gender === 'Male' || blo.Gender === 'Female' || blo.Gender === 'Other') 
      ? blo.Gender 
      : 'Male';
    
    // Critical Fix: Ensure BLO_Name is prioritized if aliased key was used
    const normalizedName = blo.BLO_Name || '';

    setSelectedBLO(blo);
    setEditForm({ 
      ...blo, 
      Gender: normalizedGender,
      BLO_Name: normalizedName
    });
    
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
      setStagedBranch(localBranch);
      setSearchFeedback({ type: 'success', message: 'Bank details found in current directory.' });
      setIsSearching(false);
      return;
    }

    try {
      const result = await searchIFSC(ifscCode);
      if (result) {
        const normalizedBankName = result.bankName.trim().toUpperCase();
        let bank = banks.find(b => String(b.Bank_Name).toUpperCase() === normalizedBankName);
        
        let targetBankId = '';
        let newBankObj: Bank | null = null;

        if (bank) {
          targetBankId = bank.Bank_ID;
        } else {
          const bankNums = banks.map(b => {
            const m = b.Bank_ID.match(/\d+/);
            return m ? parseInt(m[0]) : 0;
          });
          const nextBankNum = bankNums.length > 0 ? Math.max(...bankNums) + 1 : 1;
          targetBankId = `B_${nextBankNum}`;

          newBankObj = {
            Bank_ID: targetBankId,
            Bank_Name: result.bankName.toUpperCase(),
            T_STMP_ADD: new Date().toISOString(),
            T_STMP_UPD: new Date().toISOString()
          };
        }

        const branchNums = branches.map(br => {
          const m = br.Branch_ID.match(/\d+/);
          return m ? parseInt(m[0]) : 0;
        });
        const nextBranchNum = branchNums.length > 0 ? Math.max(...branchNums) + 1 : 1;
        const targetBranchId = `BR_${nextBranchNum}`;

        const newBranchObj: BankBranch = {
          Branch_ID: targetBranchId,
          Branch_Name: result.branchName.toUpperCase(),
          IFSC_Code: result.ifsc.toUpperCase(),
          Bank_ID: targetBankId,
          T_STMP_ADD: new Date().toISOString(),
          T_STMP_UPD: new Date().toISOString()
        };

        setEditForm(prev => prev ? ({
          ...prev,
          IFSC_Code: result.ifsc.toUpperCase(),
          Bank_ID: targetBankId,
          Branch_ID: targetBranchId
        }) : null);

        if (newBankObj) setStagedBank(newBankObj);
        setStagedBranch(newBranchObj);
        
        setSearchFeedback({ 
          type: 'info', 
          message: `Discovered new details! Bank: ${result.bankName}, Branch: ${result.branchName}.` 
        });
      } else {
        setSearchFeedback({ type: 'error', message: 'Could not find bank details for this IFSC code.' });
      }
    } catch (err) {
      setSearchFeedback({ type: 'error', message: 'Search failed.' });
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
        alert("Account Number, IFSC Code, and Passbook Document are mandatory.");
        return;
      }
      onUpdate(editForm, type, stagedBank || undefined, stagedBranch || undefined);
      setSelectedBLO(null);
      setEditForm(null);
    }
  };

  const renderPreview = (doc: string) => {
    if (!doc) return null;
    if (doc.includes('drive.google.com')) {
      const previewUrl = doc.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
      return <iframe src={previewUrl} title="Passbook Preview" className="w-100 rounded border-0 shadow-sm" style={{ height: '500px' }}></iframe>;
    }
    if (doc.startsWith('data:application/pdf')) return <iframe src={doc} title="Passbook PDF" className="w-100 rounded border-0" style={{ height: '500px' }}></iframe>;
    if (doc.startsWith('data:image')) return <img src={doc} alt="Passbook" className="img-fluid" style={{ maxHeight: '500px' }} />;
    return <div className="alert alert-secondary text-center">Format not instantly viewable.</div>;
  };

  if (selectedBLO && editForm) {
    const isLocked = editForm.Verified === 'yes' && user.User_Type !== UserType.ADMIN;
    
    const currentBank = banks.find(b => String(b.Bank_ID).trim() === String(editForm.Bank_ID).trim()) || stagedBank;
    const currentBranch = branches.find(br => String(br.Branch_ID).trim() === String(editForm.Branch_ID).trim()) || stagedBranch;

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
              Manage {typeLabels[type]} Account: {selectedBLO.BLO_Name}
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

              <div className="card border-0 shadow-sm mb-4 bg-light">
                <div className="card-body p-4">
                  <h6 className="text-secondary fw-bold text-uppercase small mb-4 d-flex align-items-center">
                    <i className="bi bi-geo-alt-fill me-2"></i>
                    Administrative Details (View Only)
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-2">
                      <label className="form-label extra-small fw-bold text-muted">AC No.</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.AC_No} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label extra-small fw-bold text-muted">AC Name</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.AC_Name} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label extra-small fw-bold text-muted">Tehsil</label>
                      <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Tehsil} />
                    </div>
                    
                    {type === 'supervisor' ? (
                      <div className="col-md-3">
                        <label className="form-label extra-small fw-bold text-muted">Sector No.</label>
                        <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Sector_No || ''} />
                      </div>
                    ) : (
                      <>
                        <div className="col-md-3">
                          <label className="form-label extra-small fw-bold text-muted">Part No.</label>
                          <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Part_No} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label extra-small fw-bold text-muted">Part Name (English)</label>
                          <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Part_Name_EN} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label extra-small fw-bold text-muted">Part Name (Hindi)</label>
                          <input type="text" readOnly disabled className="form-control form-control-sm bg-white-50 border-0" value={editForm.Part_Name_HI} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body p-4">
                  <h6 className="text-primary fw-bold text-uppercase small mb-4 d-flex align-items-center">
                    <i className="bi bi-person-badge-fill me-2"></i>
                    Personnel Details
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label extra-small fw-bold text-muted">Full Name</label>
                      <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.BLO_Name || ''} onChange={e => setEditForm({...editForm, BLO_Name: e.target.value})} required />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label extra-small fw-bold text-muted">Gender</label>
                      <select disabled={isLocked} className="form-select form-select-sm" value={editForm.Gender} onChange={e => setEditForm({...editForm, Gender: e.target.value as any})} required>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
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
                      <input disabled={isLocked} type="text" className="form-control form-control-sm" value={editForm.EPIC || ''} onChange={e => setEditForm({...editForm, EPIC: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-5">
                <div className="card-body p-4 bg-white border-start border-primary border-5 rounded-end">
                  <h6 className="text-primary fw-bold text-uppercase small mb-4 d-flex align-items-center">
                    <i className="bi bi-credit-card-2-front me-2"></i>
                    Account Data
                  </h6>
                  <div className="row g-4">
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light">
                        <label className="form-label fw-bold text-dark mb-2">IFSC Code <span className="text-danger">*</span></label>
                        <div className="input-group input-group-lg shadow-sm">
                          <input disabled={isLocked} type="text" className="form-control fw-bold text-primary text-uppercase" placeholder="Enter IFSC" maxLength={11} value={editForm.IFSC_Code} onChange={e => setEditForm({...editForm, IFSC_Code: e.target.value.toUpperCase().trim()})} required />
                          <button type="button" className="btn btn-primary" onClick={() => triggerIFSCSearch(editForm.IFSC_Code)} disabled={isSearching || isLocked}>{isSearching ? <i className="bi bi-arrow-repeat spin"></i> : 'Search'}</button>
                        </div>
                        {searchFeedback.type !== 'none' && <div className={`mt-2 small fw-bold text-${searchFeedback.type === 'error' ? 'danger' : 'success'}`}>{searchFeedback.message}</div>}
                        <div className="mt-3 p-3 rounded bg-white border border-info-subtle shadow-sm">
                          <div className="fw-bold text-dark">{currentBank?.Bank_Name || '---'}</div>
                          <div className="small text-secondary">{currentBranch?.Branch_Name || '---'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 border rounded-3 bg-light">
                        <label className="form-label fw-bold text-dark mb-2">Account Number <span className="text-danger">*</span></label>
                        <input disabled={isLocked} type="text" className="form-control form-control-lg shadow-sm fw-bold text-dark" value={String(editForm.Account_Number || '')} onChange={e => setEditForm({...editForm, Account_Number: e.target.value.replace(/\D/g, '')})} required />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-bold text-secondary">Passbook Document Proof <span className="text-danger">*</span></label>
                      <input disabled={isLocked} type="file" className="form-control bg-white shadow-sm mb-3" onChange={handleFileChange} accept=".pdf,image/*" required={!editForm.Account_Passbook_Doc} />
                      {editForm.Account_Passbook_Doc && <div className="p-3 border rounded bg-white shadow-sm">{renderPreview(editForm.Account_Passbook_Doc)}</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-top d-flex gap-3 justify-content-end">
                <button type="button" onClick={() => setSelectedBLO(null)} className="btn btn-outline-secondary px-4">Cancel</button>
                <button type="submit" disabled={isLocked} className="btn btn-primary btn-lg px-5 shadow-sm fw-bold">Update Account</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">{typeLabels[type]} Bank Directory</h3>
          <p className="text-muted small mb-0">Update cloud records for {typeLabels[type]} personnel.</p>
        </div>
        <span className="badge bg-primary px-3 py-2">{filteredAccounts.length} Total</span>
      </div>

      {isAdmin && (
        <div className="card border-0 shadow-sm bg-white p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterTehsil} onChange={e => setFilterTehsil(e.target.value)}>
                <option value="">All Tehsils</option>
                {uniqueTehsils.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filterAC} onChange={e => setFilterAC(e.target.value)}>
                <option value="">All Assemblies</option>
                {uniqueACs.map(ac => <option key={ac} value={ac}>{ac}</option>)}
              </select>
            </div>
            <div className="col-auto ms-auto"><button className="btn btn-link btn-sm extra-small fw-bold" onClick={() => { setFilterTehsil(''); setFilterAC(''); }}>Reset</button></div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th className="py-3 px-4 fw-bold small">{type === 'supervisor' ? 'SECTOR' : 'PART'} / AC</th>
                <th className="py-3 px-4 fw-bold small">OFFICER NAME</th>
                <th className="py-3 px-4 fw-bold small bg-primary-subtle text-primary">ACCOUNT NO</th>
                <th className="py-3 px-4 fw-bold small bg-primary-subtle text-primary">IFSC</th>
                <th className="py-3 px-4 fw-bold small text-center">STATUS</th>
                <th className="py-3 px-4 fw-bold small text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map(blo => (
                <tr key={blo.BLO_ID} className={blo.Verified === 'yes' ? 'table-success-subtle' : ''}>
                  <td className="px-4 py-3">
                    <div className="fw-bold">{type === 'supervisor' ? `S-${blo.Sector_No || 'NA'}` : `P-${blo.Part_No}`}</div>
                    <div className="extra-small text-muted">{blo.AC_Name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="fw-semibold text-primary">{blo.BLO_Name}</div>
                    <div className="extra-small text-muted">{getDesgName(blo.Desg_ID)}</div>
                  </td>
                  <td className="px-4 py-3 bg-light font-monospace">{blo.Account_Number || 'Pending'}</td>
                  <td className="px-4 py-3 bg-light font-monospace">{blo.IFSC_Code || '---'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${blo.Verified === 'yes' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} rounded-pill px-3`}>
                      {blo.Verified === 'yes' ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button onClick={() => handleEdit(blo)} className="btn btn-sm btn-primary">Edit</button>
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