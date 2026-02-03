import React, { useState } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch, Department, Designation } from '../types';

interface VerificationProps {
  user: User;
  accounts: BLOAccount[];
  banks: Bank[];
  branches: BankBranch[];
  departments: Department[];
  designations: Designation[];
  onVerify: (bloId: string, verified: 'yes' | 'no') => void;
}

const Verification: React.FC<VerificationProps> = ({ user, accounts, banks, branches, departments, designations, onVerify }) => {
  const [selectedBLO, setSelectedBLO] = useState<BLOAccount | null>(null);
  const isAdmin = user.User_Type === UserType.ADMIN;
  
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
    return fallbackKey ? String(obj[fallbackKey]) : 'Unknown';
  };

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

  const renderDocumentViewer = (doc: string) => {
    if (!doc) return (
      <div className="text-center text-muted m-auto p-5">
        <i className="bi bi-file-earmark-excel fs-1 mb-3 d-block"></i>
        <p className="fw-bold">No Proof Document Uploaded</p>
        <p className="small">Please ask the Tehsil user to upload the document before verification.</p>
      </div>
    );

    // If it's a Drive URL
    if (doc.includes('drive.google.com')) {
      // Try to convert to preview mode if it's a direct view link
      const previewUrl = doc.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
      return (
        <iframe src={previewUrl} className="w-100 h-100 rounded shadow" frameBorder="0"></iframe>
      );
    }

    // Base64 logic
    if (doc.startsWith('data:application/pdf')) {
      return <embed src={doc} className="w-100 h-100 rounded shadow" />;
    } else if (doc.startsWith('data:image')) {
      return (
        <img 
          src={doc} 
          alt="Passbook" 
          className="img-fluid rounded shadow-lg m-auto" 
          style={{maxHeight: '90%'}}
        />
      );
    }

    return (
      <div className="text-center p-4">
        <p>Document format not directly viewable. <a href={doc} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">Open in New Tab</a></p>
      </div>
    );
  };

  return (
    <div className="container-fluid py-2">
      <div className="row g-4">
        <div className={`col-12 col-lg-4 ${selectedBLO ? 'd-none d-lg-block' : ''}`}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold mb-0">Verification Queue</h3>
          </div>
          <div className="card shadow-sm border-0 overflow-hidden">
            <div className="list-group list-group-flush scrollable-list" style={{maxHeight: '75vh', overflowY: 'auto'}}>
              {filteredAccounts.length === 0 && <div className="p-5 text-center text-muted">No records found.</div>}
              {filteredAccounts.map(blo => (
                <button
                  key={blo.BLO_ID}
                  onClick={() => setSelectedBLO(blo)}
                  className={`list-group-item list-group-item-action p-3 border-0 border-bottom ${selectedBLO?.BLO_ID === blo.BLO_ID ? 'bg-primary-subtle' : ''}`}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="overflow-hidden">
                      <h6 className="fw-bold mb-1 text-truncate">{blo.BLO_Name}</h6>
                      <p className="small text-muted mb-1 text-truncate">P-{blo.Part_No} | {blo.AC_Name}</p>
                      <div className="font-monospace small text-primary">{blo.Account_Number || '---'}</div>
                    </div>
                    {blo.Verified === 'yes' ? (
                      <span className="badge bg-success rounded-circle p-1"><i className="bi bi-check text-white"></i></span>
                    ) : (
                      <span className="badge bg-warning-subtle text-warning border p-1 rounded-circle"><i className="bi bi-clock"></i></span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedBLO ? (
          <div className="col-12 col-lg-8">
            <div className="card shadow-lg border-0 h-100 flex-column overflow-hidden">
              <div className="card-header bg-dark text-white p-4 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <i className="bi bi-search me-3 fs-4 text-warning"></i>
                  <h5 className="mb-0 fw-bold">Verification Workbench</h5>
                </div>
                <button onClick={() => setSelectedBLO(null)} className="btn btn-sm btn-outline-light d-lg-none">Close</button>
              </div>
              
              <div className="row g-0 flex-grow-1">
                <div className="col-12 col-md-7 bg-dark bg-opacity-10 d-flex flex-column border-end" style={{ minHeight: '600px' }}>
                  <div className="p-3 bg-secondary bg-opacity-25 fw-bold small text-dark text-uppercase border-bottom d-flex justify-content-between">
                    <span>Passbook / Cheque Image</span>
                    <span className="text-primary"><i className="bi bi-zoom-in me-1"></i> Document View</span>
                  </div>
                  <div className="flex-grow-1 p-2 d-flex align-items-start justify-content-center overflow-auto bg-slate-900">
                    {renderDocumentViewer(selectedBLO.Account_Passbook_Doc)}
                  </div>
                </div>

                <div className="col-12 col-md-5 d-flex flex-column p-4 bg-white">
                  <div className="mb-4">
                    <h6 className="fw-bold text-uppercase text-muted extra-small mb-3">Compare With Document</h6>
                    
                    <div className="card border-0 bg-primary bg-opacity-10 p-4 mb-4 text-center">
                      <label className="fw-bold text-primary text-uppercase mb-2" style={{fontSize: '0.7rem'}}>Entered Account Number</label>
                      <div className="display-6 fw-bold text-dark font-monospace mb-0" style={{letterSpacing: '0.1rem'}}>
                        {selectedBLO.Account_Number || 'NOT FOUND'}
                      </div>
                      <div className="mt-2">
                        <button 
                          className="btn btn-sm btn-light border py-1 px-3 fw-bold" 
                          onClick={() => {navigator.clipboard.writeText(selectedBLO.Account_Number); alert('Copied!')}}
                        >
                          <i className="bi bi-copy me-1"></i> Copy
                        </button>
                      </div>
                    </div>

                    <div className="card border-0 bg-secondary bg-opacity-10 p-3 mb-4">
                      <div className="row g-2">
                        <div className="col-6">
                          <label className="extra-small text-muted text-uppercase fw-bold" style={{fontSize: '0.65rem'}}>IFSC Code</label>
                          <div className="h5 fw-bold text-dark font-monospace mb-0">{selectedBLO.IFSC_Code || '---'}</div>
                        </div>
                        <div className="col-6">
                          <label className="extra-small text-muted text-uppercase fw-bold" style={{fontSize: '0.65rem'}}>EPIC No.</label>
                          <div className="h6 fw-semibold text-secondary mb-0">{selectedBLO.EPIC || '---'}</div>
                        </div>
                        <div className="col-12 mt-3 pt-3 border-top">
                          <label className="extra-small text-muted text-uppercase fw-bold" style={{fontSize: '0.65rem'}}>Personnel Info</label>
                          <div className="fw-bold text-dark mb-1">
                            {getEntityLabel(designations.find(d => String(d.Desg_ID).trim() === String(selectedBLO.Desg_ID).trim()), ['Desg_Name', 'Designation', 'Name'])}
                          </div>
                          <div className="small text-secondary">
                            {getEntityLabel(departments.find(d => String(d.Dept_ID).trim() === String(selectedBLO.Dept_ID).trim()), ['Dept_Name', 'Department', 'Name'])}
                          </div>
                        </div>
                        <div className="col-12 mt-3 pt-3 border-top">
                          <label className="extra-small text-muted text-uppercase fw-bold" style={{fontSize: '0.65rem'}}>Bank & Branch</label>
                          <div className="fw-bold text-dark mb-1">
                            {banks.find(b => String(b.Bank_ID).trim() === String(selectedBLO.Bank_ID).trim())?.Bank_Name || 'Unknown Bank'}
                          </div>
                          <div className="small text-secondary">
                            {branches.find(br => String(br.Branch_ID).trim() === String(selectedBLO.Branch_ID).trim())?.Branch_Name || 'Unknown Branch'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card border-0 shadow-sm p-3 bg-light mt-auto">
                    <div className="d-flex align-items-start gap-2 mb-3">
                      <i className="bi bi-info-circle-fill text-info mt-1"></i>
                      <p className="small text-dark mb-0">
                        Check the digits carefully. Once verified, the Tehsil user cannot edit this record without Admin intervention.
                      </p>
                    </div>

                    <div className="d-grid">
                      {selectedBLO.Verified === 'yes' ? (
                        <button 
                          onClick={() => handleVerifyToggle(selectedBLO)}
                          className="btn btn-danger py-3 shadow fw-bold d-flex align-items-center justify-content-center"
                          disabled={!isAdmin}
                        >
                          <i className="bi bi-unlock-fill me-2 fs-5"></i>
                          UN-VERIFY & UNLOCK
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleVerifyToggle(selectedBLO)}
                          className={`btn btn-success py-3 shadow fw-bold d-flex align-items-center justify-content-center ${!selectedBLO.Account_Number ? 'disabled' : ''}`}
                        >
                          <i className="bi bi-shield-fill-check me-2 fs-5"></i>
                          CONFIRM & VERIFY
                        </button>
                      )}
                      {selectedBLO.Verified === 'yes' && !isAdmin && <p className="text-center text-danger extra-small mt-2 mb-0">Administrator privileges required to unlock.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-lg-8 d-none d-lg-flex align-items-center justify-content-center">
            <div className="text-center p-5 border-2 border-dashed rounded-4 bg-white shadow-sm" style={{width: '100%', maxWidth: '500px'}}>
              <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{width: '100px', height: '100px'}}>
                <i className="bi bi-check2-all text-primary fs-1"></i>
              </div>
              <h5 className="fw-bold text-dark">Ready for Verification</h5>
              <p className="text-muted">Select an entry from the list to start matching data with the uploaded documents.</p>
              <div className="badge bg-primary-subtle text-primary px-3 py-2">
                {filteredAccounts.filter(a => a.Verified === 'no' && a.Account_Number).length} Pending Tasks
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;