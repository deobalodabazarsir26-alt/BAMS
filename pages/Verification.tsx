import React, { useState, useEffect, useMemo } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch, Department, Designation } from '../types';
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

const Verification: React.FC<VerificationProps> = ({ user, accounts, banks, branches, departments, designations, onVerify }) => {
  const [selectedBLO, setSelectedBLO] = useState<BLOAccount | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filtering & Pagination States
  const [filterTehsil, setFilterTehsil] = useState('');
  const [filterAC, setFilterAC] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  const isAdmin = user.User_Type === UserType.ADMIN;

  // Helper to map Designation ID to Name
  const getDesgName = (id: string) => {
    const desg = designations.find(d => String(d.Desg_ID).trim() === String(id).trim());
    return desg ? desg.Desg_Name : 'Booth Level Officer';
  };
  
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTehsil, filterAC, pageSize]);

  const handleVerifyToggle = (blo: BLOAccount) => {
    if (blo.Verified === 'yes' && !isAdmin) {
      alert("Only administrators can un-verify records.");
      return;
    }
    const nextState = blo.Verified === 'yes' ? 'no' : 'yes';
    onVerify(blo.BLO_ID, nextState);
    if (selectedBLO?.BLO_ID === blo.BLO_ID) {
      setSelectedBLO({...blo, Verified: nextState});
    }
  };

  const getExportData = () => {
    const verifiedOnly = accounts.filter(a => a.Verified === 'yes');
    return verifiedOnly.map(a => {
      const bank = banks.find(b => String(b.Bank_ID).trim() === String(a.Bank_ID).trim());
      const branch = branches.find(br => String(br.Branch_ID).trim() === String(a.Branch_ID).trim());
      return {
        'AC_No': a.AC_No,
        'Part_No': a.Part_No,
        'Part_Name_HI': a.Part_Name_HI,
        'BLO_Name': a.BLO_Name,
        'Mobile': a.Mobile,
        'Bank_Name': bank ? bank.Bank_Name : '---',
        'Branch_Name': branch ? branch.Branch_Name : '---',
        'IFSC_Code': a.IFSC_Code,
        'Account_Number': a.Account_Number,
        'Status': 'Verified'
      };
    });
  };

  const handleExportExcel = () => {
    const data = getExportData();
    if (data.length === 0) { alert("No verified records found."); return; }
    setIsExporting(true);
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Verified_Accounts");
      XLSX.writeFile(wb, `BLO_Verified_${new Date().toISOString().split('T')[0]}.xlsx`);
    } finally { setIsExporting(false); }
  };

  const handleExportPDF = () => {
    const data = getExportData();
    if (data.length === 0) { alert("No verified records found."); return; }
    setIsExporting(true);
    try {
      const doc = new jsPDF('l', 'pt', 'a4');
      const rows = data.map(item => [item.AC_No, item.Part_No, item.BLO_Name, item.Mobile, item.Bank_Name, item.IFSC_Code, item.Account_Number, 'Verified']);
      doc.text("Verified BLO Bank Accounts", 40, 40);
      autoTable(doc, {
        head: [['AC', 'Part', 'Name', 'Mobile', 'Bank', 'IFSC', 'Account No', 'Status']],
        body: rows,
        startY: 60,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [13, 110, 253] }
      });
      doc.save(`BLO_Verified_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally { setIsExporting(false); }
  };

  const renderDocumentViewer = (doc: string) => {
    if (!doc) return <div className="text-center text-muted m-auto p-5"><i className="bi bi-file-earmark-excel fs-1 mb-3 d-block"></i> No Proof Document</div>;
    if (doc.includes('drive.google.com')) {
      const previewUrl = doc.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
      return <iframe src={previewUrl} title="Drive PDF Viewer" className="w-100 h-100 rounded shadow-sm border-0"></iframe>;
    }
    if (doc.startsWith('data:image')) return <img src={doc} alt="Passbook" className="img-fluid rounded shadow-lg m-auto" style={{maxHeight: '95%'}} />;
    if (doc.startsWith('data:application/pdf')) return <iframe src={doc} title="PDF Viewer" className="w-100 h-100 rounded border-0"></iframe>;
    return <div className="text-center p-4">Format not viewable. <a href={doc} target="_blank" rel="noreferrer">Open document</a></div>;
  };

  return (
    <div className="container-fluid py-2">
      <div className="row g-4">
        {/* Sidebar Navigation */}
        <div className={`col-12 col-lg-4 ${selectedBLO ? 'd-none d-lg-block' : ''}`}>
          <div className="d-flex flex-column gap-3 mb-3">
            <h3 className="fw-bold mb-0">Audit Workbench</h3>
            
            {isAdmin && (
              <div className="card border-0 shadow-sm bg-white p-3">
                <div className="d-flex flex-column gap-2">
                  <span className="extra-small fw-bold text-muted text-uppercase mb-1">Queue Filters:</span>
                  <div className="row g-2">
                    <div className="col-6">
                      <select className="form-select form-select-sm" value={filterTehsil} onChange={e => setFilterTehsil(e.target.value)}>
                        <option value="">Tehsils</option>
                        {uniqueTehsils.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <select className="form-select form-select-sm" value={filterAC} onChange={e => setFilterAC(e.target.value)}>
                        <option value="">Assemblies</option>
                        {uniqueACs.map(ac => <option key={ac} value={ac}>{ac}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="btn-group w-100 shadow-sm">
              <button onClick={handleExportExcel} disabled={isExporting} className="btn btn-success btn-sm"><i className="bi bi-file-earmark-excel me-2"></i> Excel</button>
              <button onClick={handleExportPDF} disabled={isExporting} className="btn btn-danger btn-sm"><i className="bi bi-file-earmark-pdf me-2"></i> PDF</button>
            </div>
          </div>

          <div className="card shadow-sm border-0 overflow-hidden bg-white">
            <div className="list-group list-group-flush" style={{maxHeight: '52vh', overflowY: 'auto'}}>
              {paginatedAccounts.length === 0 && <div className="p-5 text-center text-muted italic">No records to audit.</div>}
              {paginatedAccounts.map(blo => (
                <button key={blo.BLO_ID} onClick={() => setSelectedBLO(blo)} className={`list-group-item list-group-item-action p-3 border-0 border-bottom ${selectedBLO?.BLO_ID === blo.BLO_ID ? 'bg-primary-subtle border-start border-primary border-4 shadow-sm' : ''}`}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="overflow-hidden">
                      <h6 className="fw-bold mb-0 text-truncate">{blo.BLO_Name}</h6>
                      <p className="extra-small text-dark fw-bold text-uppercase mb-1">{getDesgName(blo.Desg_ID)}</p>
                      <p className="extra-small text-muted mb-0">Part P-{blo.Part_No} | {blo.Tehsil}</p>
                    </div>
                    {blo.Verified === 'yes' ? <span className="badge bg-success rounded-circle p-1"><i className="bi bi-check text-white"></i></span> : <span className="badge bg-warning-subtle text-warning p-1 rounded-circle border border-warning"><i className="bi bi-clock"></i></span>}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="card-footer bg-white border-top p-3">
              <div className="d-flex align-items-center justify-content-between">
                <select className="form-select form-select-sm w-auto" style={{ fontSize: '0.7rem' }} value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value="all">All</option>
                </select>
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
                  <button className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Workspace */}
        {selectedBLO ? (
          <div className="col-12 col-lg-8">
            <div className="card shadow-lg border-0 h-100 flex-column overflow-hidden bg-white">
              <div className="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold"><i className="bi bi-shield-check me-2"></i> Audit Terminal</h5>
                <button onClick={() => setSelectedBLO(null)} className="btn btn-sm btn-outline-light px-3">Close Auditor</button>
              </div>
              <div className="row g-0 flex-grow-1">
                {/* Proof Viewer */}
                <div className="col-md-7 bg-dark bg-opacity-10 d-flex flex-column border-end" style={{ minHeight: '500px' }}>
                  <div className="p-3 bg-secondary bg-opacity-25 fw-bold small text-dark text-uppercase border-bottom">Uploaded Document Proof</div>
                  <div className="flex-grow-1 p-2 d-flex align-items-start justify-content-center overflow-auto">{renderDocumentViewer(selectedBLO.Account_Passbook_Doc)}</div>
                </div>
                
                {/* Audit Information Panel */}
                <div className="col-md-5 p-4 bg-white d-flex flex-column">
                  {/* Highlighted Bank Details - FIRST */}
                  <div className="mb-4">
                    <h6 className="text-primary fw-bold text-uppercase extra-small mb-3 border-bottom pb-2">Verification Data</h6>
                    
                    <div className="card border-0 bg-primary bg-opacity-10 mb-3 shadow-sm overflow-hidden">
                       <div className="p-3 text-center">
                          {/* Added Bank Name */}
                          <div className="text-secondary extra-small fw-bold text-uppercase mb-1">
                            {banks.find(b => String(b.Bank_ID).trim() === String(selectedBLO.Bank_ID).trim())?.Bank_Name || '---'}
                          </div>
                          <label className="fw-bold text-primary text-uppercase mb-1" style={{fontSize: '0.65rem'}}>Account Number</label>
                          <div className="h3 fw-bold text-dark font-monospace mb-0">{selectedBLO.Account_Number}</div>
                       </div>
                    </div>

                    <div className="card border-0 bg-info bg-opacity-10 shadow-sm">
                       <div className="p-3 text-center">
                          {/* Added Branch Name */}
                          <div className="text-secondary extra-small fw-bold text-uppercase mb-1">
                            {branches.find(br => String(br.Branch_ID).trim() === String(selectedBLO.Branch_ID).trim())?.Branch_Name || '---'}
                          </div>
                          <label className="fw-bold text-info text-uppercase mb-1" style={{fontSize: '0.65rem'}}>IFSC Code</label>
                          <div className="h4 fw-bold text-dark font-monospace mb-0">{selectedBLO.IFSC_Code}</div>
                       </div>
                    </div>
                  </div>

                  {/* Summarized BLO Profile - BELOW */}
                  <div className="mb-4">
                    <h6 className="text-secondary fw-bold text-uppercase extra-small mb-3 border-bottom pb-2">Officer Profile Summary</h6>
                    <div className="bg-light p-3 rounded border">
                      <div className="mb-2">
                        <label className="extra-small text-muted text-uppercase fw-bold d-block">Full Name</label>
                        <span className="fw-bold text-dark">{selectedBLO.BLO_Name}</span>
                      </div>
                      <div className="mb-2">
                        <label className="extra-small text-muted text-uppercase fw-bold d-block">Designation</label>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">{getDesgName(selectedBLO.Desg_ID)}</span>
                      </div>
                      <div className="mb-2">
                        <label className="extra-small text-muted text-uppercase fw-bold d-block">Contact Mobile</label>
                        <span className="fw-semibold text-dark"><i className="bi bi-phone me-1"></i> {selectedBLO.Mobile}</span>
                      </div>
                      <div className="mt-3 pt-3 border-top">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <label className="extra-small text-muted text-uppercase fw-bold d-block">Part No.</label>
                            <span className="fw-bold">P-{selectedBLO.Part_No}</span>
                          </div>
                          <div className="text-end">
                            <label className="extra-small text-muted text-uppercase fw-bold d-block">Tehsil</label>
                            <span className="fw-bold">{selectedBLO.Tehsil}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit Actions */}
                  <div className="mt-auto d-grid gap-2 pt-4 border-top">
                    <button onClick={() => handleVerifyToggle(selectedBLO)} className={`btn ${selectedBLO.Verified === 'yes' ? 'btn-danger' : 'btn-success'} py-3 shadow-lg fw-bold`} disabled={selectedBLO.Verified === 'yes' && !isAdmin}>
                      <i className={`bi ${selectedBLO.Verified === 'yes' ? 'bi-unlock-fill' : 'bi-shield-fill-check'} me-2`}></i> 
                      {selectedBLO.Verified === 'yes' ? 'REVOKE VERIFICATION' : 'AUTHORIZE & VERIFY'}
                    </button>
                    <p className="extra-small text-muted text-center mt-2 px-3 italic">
                      Verify that the account number in the document matches the data shown above.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-lg-8 d-none d-lg-flex align-items-center justify-content-center bg-white rounded-4 border border-dashed">
            <div className="text-center p-5">
              <i className="bi bi-clipboard-check text-primary opacity-25 display-1 mb-3"></i>
              <h4 className="fw-bold text-muted">Auditor Hub Ready</h4>
              <p className="text-muted small px-5">Select a pending account from the left panel to begin the verification process.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;