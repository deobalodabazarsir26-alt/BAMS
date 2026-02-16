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
    const desg = designations.find(d => String(d.Dept_ID).trim() === String(id).trim());
    return desg ? desg.Desg_Name : 'Officer';
  };

  const formatId = (val: string | number | undefined) => {
    if (val === undefined || val === null) return '000';
    return String(val).padStart(3, '0');
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
    // Requirements fulfilled: 
    // 1. Uses filteredAccounts (handles Admin filters vs Normal User scope)
    // 2. Sorts by AC_No (numeric) then Identifier
    return filteredAccounts
      .filter(a => a.Verified === 'yes')
      .map(a => {
        const bank = banks.find(b => String(b.Bank_ID).trim() === String(a.Bank_ID).trim());
        const idVal = type === 'supervisor' ? a.Sector_No : a.Part_No;
        const identifier = type === 'supervisor' ? `S-${formatId(idVal)}` : `P-${formatId(idVal)}`;
        return {
          'Identifier': identifier,
          'AC': a.AC_No,
          'Name': a.BLO_Name,
          'Bank': bank ? bank.Bank_Name : '---',
          'IFSC': a.IFSC_Code,
          'Account': a.Account_Number,
          'Status': 'Verified'
        };
      })
      .sort((a, b) => {
        // Numeric sort for AC first
        const acA = Number(a.AC) || 0;
        const acB = Number(b.AC) || 0;
        if (acA !== acB) return acA - acB;
        // Then alphanumeric sort for Identifier
        return a.Identifier.localeCompare(b.Identifier);
      });
  };

  const handleExportExcel = () => {
    const data = getExportData();
    if (data.length === 0) {
      alert("No verified accounts to export.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Verified");
    XLSX.writeFile(wb, `${typeLabels[type]}_Verified.xlsx`);
  };

  const handleExportPDF = () => {
    const data = getExportData();
    if (data.length === 0) {
      alert("No verified accounts to export.");
      return;
    }

    const doc = new jsPDF();
    const tableColumn = Object.keys(data[0]);
    const tableRows = data.map(item => Object.values(item));

    const title = `${typeLabels[type]} Verified Bank Accounts Report`;
    const dateStr = `Generated on: ${new Date().toLocaleDateString()}`;

    doc.setFontSize(18);
    doc.text(title, 14, 15);
    doc.setFontSize(11);
    doc.text(dateStr, 14, 22);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { bottom: 45 }, // Space for footer
      didDrawPage: (dataArg) => {
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
        
        // Footer signature block
        const footerY = pageHeight - 35;
        doc.setDrawColor(200);
        doc.line(14, footerY, pageWidth - 14, footerY);
        
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text(`Verifying Authority:`, 14, footerY + 10);
        
        doc.setFont("helvetica", "normal");
        doc.text(`${user.Officer_Name}`, 14, footerY + 18);
        doc.text(`${user.Designation}`, 14, footerY + 24);
        
        doc.setFontSize(9);
        doc.text(`Signature: __________________________`, 14, footerY + 30);
        
        // Page numbering
        const str = `Page ${dataArg.pageNumber}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(str, pageWidth - 25, footerY + 10);
      }
    });

    doc.save(`${typeLabels[type]}_Verified_Accounts.pdf`);
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
            <div className="d-flex gap-2">
              <button onClick={handleExportExcel} className="btn btn-success btn-sm flex-grow-1">
                <i className="bi bi-file-earmark-excel me-2"></i>Export Excel
              </button>
              <button onClick={handleExportPDF} className="btn btn-danger btn-sm flex-grow-1">
                <i className="bi bi-file-earmark-pdf me-2"></i>Export PDF
              </button>
            </div>
          </div>

          <div className="card shadow-sm border-0 overflow-hidden bg-white">
            <div className="list-group list-group-flush" style={{maxHeight: '52vh', overflowY: 'auto'}}>
              {paginatedAccounts.map(blo => (
                <button key={blo.BLO_ID} onClick={() => setSelectedBLO(blo)} className={`list-group-item list-group-item-action p-3 border-0 border-bottom ${selectedBLO?.BLO_ID === blo.BLO_ID ? 'bg-primary-subtle' : ''}`}>
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="fw-bold mb-0">{blo.BLO_Name}</h6>
                      <small>
                        {type === 'supervisor' ? `S-${formatId(blo.Sector_No)}` : `P-${formatId(blo.Part_No)}`} | {blo.Tehsil}
                      </small>
                    </div>
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
                    <div className="small mb-1"><span className="fw-bold">{type === 'supervisor' ? 'Sector' : 'Part'}:</span> {type === 'supervisor' ? formatId(selectedBLO.Sector_No) : formatId(selectedBLO.Part_No)}</div>
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