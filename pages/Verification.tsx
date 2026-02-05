import React, { useState, useEffect, useMemo } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch, Department, Designation, AccountCategory } from '../types';
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
  onVerify: (bloId: string, verified: 'yes' | 'no', type: AccountCategory) => void;
  type: AccountCategory;
}

const Verification: React.FC<VerificationProps> = ({ user, accounts, banks, branches, departments, designations, onVerify, type }) => {
  const [selectedBLO, setSelectedBLO] = useState<BLOAccount | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [filterTehsil, setFilterTehsil] = useState('');
  const [filterAC, setFilterAC] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);

  const isAdmin = user.User_Type === UserType.ADMIN;
  const typeLabels: Record<AccountCategory, string> = { blo: 'BLO', avihit: 'Avihit', supervisor: 'Supervisor' };

  const getDesgName = (id: string) => {
    const desg = designations.find(d => String(d.Desg_ID).trim() === String(id).trim());
    return desg ? desg.Desg_Name : 'Officer';
  };
  
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

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredAccounts.length / Number(pageSize));
  const paginatedAccounts = useMemo(() => {
    if (pageSize === 'all') return filteredAccounts;
    const start = (currentPage - 1) * Number(pageSize);
    return filteredAccounts.slice(start, start + Number(pageSize));
  }, [filteredAccounts, currentPage, pageSize]);

  const uniqueTehsils = useMemo(() => Array.from(new Set(accounts.map(a => a.Tehsil))).sort(), [accounts]);
  const uniqueACs = useMemo(() => Array.from(new Set(accounts.map(a => a.AC_Name))).sort(), [accounts]);

  useEffect(() => { setCurrentPage(1); }, [filterTehsil, filterAC, pageSize]);

  const handleVerifyToggle = (blo: BLOAccount) => {
    if (blo.Verified === 'yes' && !isAdmin) {
      alert("Only administrators can un-verify.");
      return;
    }
    const nextState = blo.Verified === 'yes' ? 'no' : 'yes';
    onVerify(blo.BLO_ID, nextState, type);
    if (selectedBLO?.BLO_ID === blo.BLO_ID) {
      setSelectedBLO({...blo, Verified: nextState});
    }
  };

  const getExportData = () => {
    return accounts.filter(a => a.Verified === 'yes').map(a => {
      const bank = banks.find(b => String(b.Bank_ID).trim() === String(a.Bank_ID).trim());
      return {
        'Identifier': type === 'supervisor' ? `S-${a.Sector_No}` : `P-${a.Part_No}`,
        'AC': a.AC_No,
        'Name': a.BLO_Name,
        'Bank': bank ? bank.Bank_Name : '---',
        'IFSC': a.IFSC_Code,
        'Account': a.Account_Number,
        'Status': 'Verified'
      };
    });
  };

  const handleExportExcel = () => {
    const data = getExportData();
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Verified");
    XLSX.writeFile(wb, `${typeLabels[type]}_Verified.xlsx`);
  };

  const renderDocumentViewer = (doc: string) => {
    if (!doc) return <div className="text-center text-muted p-5">No Document</div>;
    if (doc.includes('drive.google.com')) {
      const previewUrl = doc.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
      return <iframe src={previewUrl} className="w-100 h-100 rounded border-0"></iframe>;
    }
    if (doc.startsWith('data:image')) return <img src={doc} alt="Passbook" className="img-fluid m-auto" style={{maxHeight: '95%'}} />;
    if (doc.startsWith('data:application/pdf')) return <iframe src={doc} className="w-100 h-100 rounded border-0"></iframe>;
    return <div className="p-4 text-center">Format not viewable.</div>;
  };

  return (
    <div className="container-fluid py-2">
      <div className="row g-4">
        <div className={`col-12 col-lg-4 ${selectedBLO ? 'd-none d-lg-block' : ''}`}>
          <div className="d-flex flex-column gap-3 mb-3">
            <h3 className="fw-bold mb-0">{typeLabels[type]} Audit</h3>
            {isAdmin && (
              <div className="card border-0 shadow-sm bg-white p-3">
                <div className="row g-2">
                  <div className="col-6"><select className="form-select form-select-sm" value={filterTehsil} onChange={e => setFilterTehsil(e.target.value)}><option value="">Tehsils</option>{uniqueTehsils.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="col-6"><select className="form-select form-select-sm" value={filterAC} onChange={e => setFilterAC(e.target.value)}><option value="">ACs</option>{uniqueACs.map(ac => <option key={ac} value={ac}>{ac}</option>)}</select></div>
                </div>
              </div>
            )}
            <button onClick={handleExportExcel} className="btn btn-success btn-sm w-100">Export Verified</button>
          </div>

          <div className="card shadow-sm border-0 overflow-hidden bg-white">
            <div className="list-group list-group-flush" style={{maxHeight: '52vh', overflowY: 'auto'}}>
              {paginatedAccounts.map(blo => (
                <button key={blo.BLO_ID} onClick={() => setSelectedBLO(blo)} className={`list-group-item list-group-item-action p-3 border-0 border-bottom ${selectedBLO?.BLO_ID === blo.BLO_ID ? 'bg-primary-subtle' : ''}`}>
                  <div className="d-flex justify-content-between">
                    <div><h6 className="fw-bold mb-0">{blo.BLO_Name}</h6><small>{type === 'supervisor' ? `S-${blo.Sector_No}` : `P-${blo.Part_No}`} | {blo.Tehsil}</small></div>
                    {blo.Verified === 'yes' && <i className="bi bi-check-circle-fill text-success"></i>}
                  </div>
                </button>
              ))}
            </div>
            <div className="card-footer bg-white border-top p-2 d-flex justify-content-between align-items-center">
              <span className="extra-small">Page {currentPage}/{totalPages}</span>
              <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                <button className="btn btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>

        {selectedBLO ? (
          <div className="col-12 col-lg-8">
            <div className="card shadow-lg border-0 h-100 flex-column overflow-hidden bg-white">
              <div className="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Audit: {selectedBLO.BLO_Name}</h5>
                <button onClick={() => setSelectedBLO(null)} className="btn btn-sm btn-outline-light">Close</button>
              </div>
              <div className="row g-0 flex-grow-1">
                <div className="col-md-7 bg-dark bg-opacity-10 d-flex flex-column border-end" style={{ minHeight: '500px' }}>{renderDocumentViewer(selectedBLO.Account_Passbook_Doc)}</div>
                <div className="col-md-5 p-4 bg-white d-flex flex-column">
                  <div className="mb-4">
                    <div className="card border-0 bg-primary bg-opacity-10 mb-3 text-center p-3">
                      <small className="fw-bold text-uppercase">{banks.find(b => String(b.Bank_ID).trim() === String(selectedBLO.Bank_ID).trim())?.Bank_Name || '---'}</small>
                      <div className="h3 fw-bold mb-0 font-monospace">{selectedBLO.Account_Number}</div>
                    </div>
                    <div className="card border-0 bg-info bg-opacity-10 text-center p-3">
                      <small className="fw-bold text-uppercase">{branches.find(br => String(br.Branch_ID).trim() === String(selectedBLO.Branch_ID).trim())?.Branch_Name || '---'}</small>
                      <div className="h4 fw-bold mb-0 font-monospace">{selectedBLO.IFSC_Code}</div>
                    </div>
                  </div>
                  <div className="bg-light p-3 rounded mb-4">
                    <div className="small mb-1"><span className="fw-bold">Tehsil:</span> {selectedBLO.Tehsil}</div>
                    <div className="small mb-1"><span className="fw-bold">{type === 'supervisor' ? 'Sector' : 'Part'}:</span> {type === 'supervisor' ? selectedBLO.Sector_No : selectedBLO.Part_No}</div>
                    <div className="small"><span className="fw-bold">Mobile:</span> {selectedBLO.Mobile}</div>
                  </div>
                  <button onClick={() => handleVerifyToggle(selectedBLO)} className={`btn ${selectedBLO.Verified === 'yes' ? 'btn-danger' : 'btn-success'} py-3 mt-auto fw-bold`}>
                    {selectedBLO.Verified === 'yes' ? 'REVOKE VERIFICATION' : 'VERIFY ACCOUNT'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-lg-8 d-none d-lg-flex align-items-center justify-content-center bg-light border border-dashed rounded-4">
            <div className="text-center"><i className="bi bi-shield-check display-1 opacity-25"></i><h4 className="text-muted mt-3">Ready to Audit</h4></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;