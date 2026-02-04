import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  
  // Filters and Pagination
  const [filterTehsil, setFilterTehsil] = useState('');
  const [filterAC, setFilterAC] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  const [searchFeedback, setSearchFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'none', message: string }>({ type: 'none', message: '' });
  const [stagedBank, setStagedBank] = useState<Bank | null>(null);
  const [stagedBranch, setStagedBranch] = useState<BankBranch | null>(null);

  const lastSearchedRef = useRef<string>('');

  const isAdmin = user.User_Type === UserType.ADMIN;

  // Filter Logic
  const filteredAccounts = useMemo(() => {
    let list = isAdmin 
      ? accounts 
      : accounts.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim());

    if (isAdmin) {
      if (filterTehsil) list = list.filter(a => a.Tehsil === filterTehsil);
      if (filterAC) list = list.filter(a => a.AC_Name === filterAC);
    }
    return list;
  }, [accounts, user, isAdmin, filterTehsil, filterAC]);

  // Unique lists for Admin filters
  const uniqueTehsils = useMemo(() => Array.from(new Set(accounts.map(a => a.Tehsil))).sort(), [accounts]);
  const uniqueACs = useMemo(() => Array.from(new Set(accounts.map(a => a.AC_Name))).sort(), [accounts]);

  // Pagination Logic
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredAccounts.length / Number(pageSize));
  const paginatedAccounts = useMemo(() => {
    if (pageSize === 'all') return filteredAccounts;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredAccounts.slice(start, start + Number(pageSize));
  }, [filteredAccounts, currentPage, pageSize]);

  // Effect to reset page when filters or pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTehsil, filterAC, pageSize]);

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
    lastSearchedRef.current = ifscCode;
    
    const localBranch = branches.find(br => String(br.IFSC_Code).toUpperCase() === ifscCode.toUpperCase());
    if (localBranch) {
      setEditForm(prev => prev ? ({ ...prev, Bank_ID: localBranch.Bank_ID, Branch_ID: localBranch.Branch_ID }) : null);
      setSearchFeedback({ type: 'success', message: 'Bank details found in current directory.' });
      setIsSearching(false);
      return;
    }

    try {
      const result = await searchIFSCViaGemini(ifscCode);
      if (result && editForm) {
        const normalizedBankName = result.bankName.trim();
        let bank = banks.find(b => String(b.Bank_Name).toLowerCase() === normalizedBankName.toLowerCase());
        const newBankObj: Bank | undefined = !bank ? { Bank_ID: 'B_' + Date.now(), Bank_Name: result.bankName, T_STMP_ADD: new Date().toISOString(), T_STMP_UPD: new Date().toISOString() } : undefined;
        const targetBankId = bank ? bank.Bank_ID : newBankObj!.Bank_ID;
        const newBranchObj: BankBranch = { Branch_ID: 'BR_' + Date.now(), Branch_Name: result.branchName, IFSC_Code: result.ifsc.toUpperCase(), Bank_ID: targetBankId, T_STMP_ADD: new Date().toISOString(), T_STMP_UPD: new Date().toISOString() };
        
        setEditForm({ ...editForm, IFSC_Code: result.ifsc.toUpperCase(), Bank_ID: targetBankId, Branch_ID: newBranchObj.Branch_ID });
        if (newBankObj) setStagedBank(newBankObj);
        setStagedBranch(newBranchObj);
        setSearchFeedback({ type: 'info', message: `Found ${result.bankName}, ${result.branchName}` });
      }
    } catch (err) {
      setSearchFeedback({ type: 'error', message: 'Search failed.' });
    } finally { setIsSearching(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editForm) {
      const reader = new FileReader();
      reader.onloadend = () => { setEditForm({ ...editForm, Account_Passbook_Doc: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editForm) {
      onUpdate(editForm, stagedBank || undefined, stagedBranch || undefined);
      setSelectedBLO(null);
    }
  };

  if (selectedBLO && editForm) {
    const isLocked = editForm.Verified === 'yes' && user.User_Type !== UserType.ADMIN;
    return (
      <div className="container-fluid py-2">
        <div className="card shadow-lg border-0 overflow-hidden">
          <div className="card-header bg-primary text-white p-4 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Manage Account: {selectedBLO.BLO_Name}</h5>
            <button onClick={() => setSelectedBLO(null)} className="btn-close btn-close-white"></button>
          </div>
          <div className="card-body p-4 bg-light-subtle">
            <form onSubmit={handleSubmit}>
              <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted text-uppercase">IFSC Code</label>
                  <div className="input-group">
                    <input disabled={isLocked} type="text" className="form-control text-uppercase font-monospace" maxLength={11} value={editForm.IFSC_Code} onChange={e => setEditForm({...editForm, IFSC_Code: e.target.value.toUpperCase()})} />
                    <button type="button" className="btn btn-outline-primary" onClick={() => triggerIFSCSearch(editForm.IFSC_Code)} disabled={isSearching || isLocked}>{isSearching ? <i className="bi bi-arrow-repeat spin"></i> : 'Search'}</button>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-muted text-uppercase">Account Number</label>
                  <input disabled={isLocked} type="text" className="form-control font-monospace" value={String(editForm.Account_Number || '')} onChange={e => setEditForm({...editForm, Account_Number: e.target.value.replace(/\D/g, '')})} required />
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold small text-muted text-uppercase">Passbook Upload</label>
                  <input disabled={isLocked} type="file" className="form-control" onChange={handleFileChange} accept=".pdf,image/*" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-top text-end">
                <button type="button" onClick={() => setSelectedBLO(null)} className="btn btn-link text-secondary me-3">Cancel</button>
                <button type="submit" disabled={isLocked} className="btn btn-primary px-5 shadow-sm fw-bold">Save Changes</button>
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
        <h3 className="fw-bold mb-0">BLO Bank Directory</h3>
      </div>

      {isAdmin && (
        <div className="card border-0 shadow-sm mb-4 bg-white">
          <div className="card-body p-3">
            <div className="row g-3 align-items-center">
              <div className="col-md-auto"><span className="fw-bold extra-small text-muted text-uppercase">Admin Filters:</span></div>
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
              <div className="col-md-auto ms-auto">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setFilterTehsil(''); setFilterAC(''); }}>Reset Filters</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th className="py-3 px-4 fw-bold small">PART / ASSEMBLY</th>
                <th className="py-3 px-4 fw-bold small">BLO NAME / TEHSIL</th>
                <th className="py-3 px-4 fw-bold small">ACCOUNT NUMBER</th>
                <th className="py-3 px-4 fw-bold small text-center">STATUS</th>
                <th className="py-3 px-4 fw-bold small text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.map(blo => (
                <tr key={blo.BLO_ID}>
                  <td className="px-4 py-3">
                    <div className="fw-bold">P-{blo.Part_No}</div>
                    <div className="extra-small text-muted">{blo.AC_Name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="fw-semibold text-primary">{blo.BLO_Name}</div>
                    <div className="extra-small text-muted text-uppercase">{blo.Tehsil}</div>
                  </td>
                  <td className="px-4 py-3 font-monospace">
                    {blo.Account_Number ? <span className="fw-bold">{blo.Account_Number}</span> : <span className="text-danger small">Pending</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {blo.Verified === 'yes' ? <span className="badge bg-success-subtle text-success rounded-pill px-3">Verified</span> : <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3">Entry Done</span>}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button onClick={() => handleEdit(blo)} className="btn btn-sm btn-primary px-3 shadow-sm">Edit</button>
                  </td>
                </tr>
              ))}
              {paginatedAccounts.length === 0 && <tr><td colSpan={5} className="text-center py-5 text-muted">No records found.</td></tr>}
            </tbody>
          </table>
        </div>
        
        {/* Universal Pagination Footer */}
        <div className="card-footer bg-white border-top p-3">
          <div className="row g-3 align-items-center">
            <div className="col-md-auto text-muted extra-small">
              Showing {filteredAccounts.length > 0 ? (currentPage - 1) * (pageSize === 'all' ? filteredAccounts.length : Number(pageSize)) + 1 : 0} to {Math.min(currentPage * (pageSize === 'all' ? filteredAccounts.length : Number(pageSize)), filteredAccounts.length)} of {filteredAccounts.length}
            </div>
            <div className="col-md-auto ms-auto d-flex align-items-center gap-3">
              <div className="d-flex align-items-center gap-2">
                <span className="extra-small text-muted text-uppercase fw-bold">Per Page:</span>
                <select className="form-select form-select-sm" style={{ width: '80px' }} value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div className="btn-group">
                <button className="btn btn-sm btn-outline-secondary px-3" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><i className="bi bi-chevron-left me-1"></i> Prev</button>
                <button className="btn btn-sm btn-outline-secondary px-3" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next <i className="bi bi-chevron-right ms-1"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountEntry;