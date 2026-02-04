import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch, Department, Designation } from '../types';
import { searchIFSCViaGemini } from '../services/geminiService';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface VerificationProps {
  user: User;
  accounts: BLOAccount[];
  banks: Bank[];
  branches: BankBranch[];
  departments: Department[];
  designations: Designation[];
  onVerify: (bloId: string, verified: 'yes' | 'no') => void;
  onUpdate?: (updated: BLOAccount, newBank?: Bank, newBranch?: BankBranch) => void;
}

const Verification: React.FC<VerificationProps> = ({ user, accounts, banks, branches, departments, designations, onVerify, onUpdate }) => {
  const [selectedBLO, setSelectedBLO] = useState<BLOAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<BLOAccount | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filtering & Pagination States
  const [filterTehsil, setFilterTehsil] = useState('');
  const [filterAC, setFilterAC] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  const lastSearchedRef = useRef<string>('');
  const isAdmin = user.User_Type === UserType.ADMIN;
  
  // Scoped filtering logic
  const filteredAccounts = useMemo(() => {
    let list = (user.User_Type === UserType.ADMIN 
      ? accounts 
      : accounts.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim()))
      .filter(a => a.Account_Number && String(a.Account_Number).trim() !== '');

    if (isAdmin) {
      if (filterTehsil) list = list.filter(a => a.Tehsil === filterTehsil);
      if (filterAC) list = list.filter(a => a.AC_Name === filterAC);
    }
    return list;
  }, [accounts, user, isAdmin, filterTehsil, filterAC]);

  // Pagination Logic
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredAccounts.length / Number(pageSize));
  const paginatedAccounts = useMemo(() => {
    if (pageSize === 'all') return filteredAccounts;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredAccounts.slice(start, start + Number(pageSize));
  }, [filteredAccounts, currentPage, pageSize]);

  // Unique Lists for Filters
  const uniqueTehsils = useMemo(() => Array.from(new Set(accounts.map(a => a.Tehsil))).sort(), [accounts]);
  const uniqueACs = useMemo(() => Array.from(new Set(accounts.map(a => a.AC_Name))).sort(), [accounts]);

  // Reset page when settings change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTehsil, filterAC, pageSize]);

  const handleVerifyToggle = (blo: BLOAccount) => {
    if (blo.Verified === 'yes' && !isAdmin) { alert("Admin authorization required."); return; }
    const nextState = blo.Verified === 'yes' ? 'no' : 'yes';
    onVerify(blo.BLO_ID, nextState);
    if (selectedBLO?.BLO_ID === blo.BLO_ID) { setSelectedBLO({...blo, Verified: nextState}); }
  };

  const renderDocumentViewer = (doc: string) => {
    if (!doc) return <div className="text-center text-muted m-auto p-5"><i className="bi bi-file-earmark-excel fs-1 mb-3 d-block"></i> No Document Found</div>;
    if (doc.includes('drive.google.com')) {
      const previewUrl = doc.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
      return <iframe src={previewUrl} title="Drive Viewer" className="w-100 h-100 rounded shadow border-0"></iframe>;
    }
    if (doc.startsWith('data:image')) return <img src={doc} alt="Passbook" className="img-fluid rounded shadow-lg m-auto" style={{maxHeight: '90%'}} />;
    return <div className="text-center p-4">Unsupported file format.</div>;
  };

  return (
    <div className="container-fluid py-2">
      <div className="row g-4">
        {/* Sidebar Navigation */}
        <div className={`col-12 col-lg-4 ${selectedBLO ? 'd-none d-lg-block' : ''}`}>
          <div className="d-flex flex-column gap-3 mb-3">
            <h3 className="fw-bold mb-0">Pending Audits</h3>
            
            {isAdmin && (
              <div className="card border-0 shadow-sm bg-white p-3">
                <div className="d-flex flex-column gap-2">
                  <span className="extra-small fw-bold text-muted text-uppercase mb-1">Administrative Filters:</span>
                  <select className="form-select form-select-sm" value={filterTehsil} onChange={e => setFilterTehsil(e.target.value)}>
                    <option value="">All Tehsils</option>
                    {uniqueTehsils.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="form-select form-select-sm" value={filterAC} onChange={e => setFilterAC(e.target.value)}>
                    <option value="">All Assemblies</option>
                    {uniqueACs.map(ac => <option key={ac} value={ac}>{ac}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="card shadow-sm border-0 overflow-hidden">
            <div className="list-group list-group-flush" style={{maxHeight: '60vh', overflowY: 'auto'}}>
              {paginatedAccounts.length === 0 && <div className="p-4 text-center text-muted italic">No matching entries found.</div>}
              {paginatedAccounts.map(blo => (
                <button key={blo.BLO_ID} onClick={() => { setSelectedBLO(blo); setIsEditing(false); }} className={`list-group-item list-group-item-action p-3 border-0 border-bottom ${selectedBLO?.BLO_ID === blo.BLO_ID ? 'bg-primary-subtle' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="overflow-hidden">
                      <h6 className="fw-bold mb-1 text-truncate">{blo.BLO_Name}</h6>
                      <p className="extra-small text-muted mb-1">P-{blo.Part_No} | {blo.Tehsil}</p>
                      <div className="extra-small font-monospace text-primary fw-bold">{blo.Account_Number}</div>
                    </div>
                    {blo.Verified === 'yes' ? <span className="badge bg-success rounded-circle p-1"><i className="bi bi-check text-white"></i></span> : <span className="badge bg-warning-subtle text-warning p-1 rounded-circle"><i className="bi bi-clock"></i></span>}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Consistent Sidebar Pagination */}
            <div className="card-footer bg-white border-top p-3">
              <div className="d-flex align-items-center justify-content-between">
                <select className="form-select form-select-sm w-auto" style={{ fontSize: '0.7rem' }} value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value="all">All</option>
                </select>
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
                  <button className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button>
                </div>
              </div>
              <div className="extra-small text-muted text-center mt-2">Page {currentPage} of {totalPages || 1}</div>
            </div>
          </div>
        </div>

        {/* Audit Workspace */}
        {selectedBLO ? (
          <div className="col-12 col-lg-8">
            <div className="card shadow-lg border-0 h-100 flex-column overflow-hidden">
              <div className="card-header bg-dark text-white p-4 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Verification Workbench</h5>
                <button onClick={() => { setSelectedBLO(null); setIsEditing(false); }} className="btn btn-sm btn-outline-light">Close View</button>
              </div>
              <div className="row g-0 flex-grow-1">
                <div className="col-md-7 bg-dark bg-opacity-10 d-flex flex-column border-end" style={{ minHeight: '500px' }}>
                  <div className="p-3 bg-secondary bg-opacity-25 fw-bold small text-dark text-uppercase border-bottom">Document Proof</div>
                  <div className="flex-grow-1 p-2 d-flex align-items-start justify-content-center overflow-auto">{renderDocumentViewer(selectedBLO.Account_Passbook_Doc)}</div>
                </div>
                <div className="col-md-5 p-4 bg-white d-flex flex-column">
                  <div className="flex-grow-1 d-flex flex-column">
                    <div className="card border-0 bg-primary bg-opacity-10 p-4 mb-4 text-center">
                      <label className="fw-bold text-primary text-uppercase mb-2 extra-small">Account Number</label>
                      <div className="h3 fw-bold text-dark font-monospace mb-0">{selectedBLO.Account_Number}</div>
                    </div>
                    <div className="card border-0 bg-secondary bg-opacity-10 p-3 mb-4">
                      <div className="row g-2">
                        <div className="col-6"><label className="extra-small text-muted text-uppercase fw-bold">IFSC</label><div className="fw-bold font-monospace">{selectedBLO.IFSC_Code}</div></div>
                        <div className="col-6"><label className="extra-small text-muted text-uppercase fw-bold">Tehsil</label><div className="fw-bold">{selectedBLO.Tehsil}</div></div>
                      </div>
                    </div>
                    <div className="mt-auto d-grid gap-2">
                      <button onClick={() => handleVerifyToggle(selectedBLO)} className={`btn ${selectedBLO.Verified === 'yes' ? 'btn-danger' : 'btn-success'} py-3 shadow fw-bold`} disabled={selectedBLO.Verified === 'yes' && !isAdmin}>
                        <i className={`bi ${selectedBLO.Verified === 'yes' ? 'bi-unlock-fill' : 'bi-shield-fill-check'} me-2`}></i> 
                        {selectedBLO.Verified === 'yes' ? 'UN-VERIFY RECORD' : 'CONFIRM & VERIFY'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-lg-8 d-none d-lg-flex align-items-center justify-content-center bg-white rounded-4 border">
            <div className="text-center p-5">
              <i className="bi bi-clipboard-check text-primary display-1 mb-3"></i>
              <h4 className="fw-bold">Ready for Audit</h4>
              <p className="text-muted">Select an officer from the sidebar to verify their uploaded documents.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;