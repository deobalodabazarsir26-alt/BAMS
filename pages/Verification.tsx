import React, { useState, useEffect, useRef } from 'react';
import { BLOAccount, User, UserType, Bank, BankBranch, Department, Designation } from '../types';
import { searchIFSCViaGemini } from '../services/geminiService';

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
  const lastSearchedRef = useRef<string>('');
  
  const isAdmin = user.User_Type === UserType.ADMIN;
  
  // Filter logic: Show only those records for which bank account entry is done (Account_Number is present)
  const filteredAccounts = (user.User_Type === UserType.ADMIN 
    ? accounts 
    : accounts.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim()))
    .filter(a => a.Account_Number && String(a.Account_Number).trim() !== '');

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

  const startEditing = () => {
    if (!selectedBLO) return;
    setEditForm({ ...selectedBLO });
    lastSearchedRef.current = selectedBLO.IFSC_Code || '';
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm || !onUpdate) return;
    
    if (!editForm.Account_Number || !editForm.IFSC_Code) {
      alert("Account Number and IFSC Code are mandatory for correction.");
      return;
    }

    onUpdate(editForm);
    setSelectedBLO(editForm);
    setIsEditing(false);
  };

  const triggerIFSCSearch = async (ifscCode: string) => {
    if (!ifscCode || ifscCode.length !== 11) return;
    setIsSearching(true);
    lastSearchedRef.current = ifscCode;
    const result = await searchIFSCViaGemini(ifscCode);
    if (result && editForm) {
      setEditForm({
        ...editForm,
        IFSC_Code: result.ifsc.toUpperCase()
      });
    }
    setIsSearching(false);
  };

  const renderDocumentViewer = (doc: string) => {
    if (!doc) return (
      <div className="text-center text-muted m-auto p-5">
        <i className="bi bi-file-earmark-excel fs-1 mb-3 d-block"></i>
        <p className="fw-bold">No Proof Document Uploaded</p>
      </div>
    );

    // Handle Google Drive links
    if (doc.includes('drive.google.com')) {
      const previewUrl = doc.replace('/view?usp=sharing', '/preview').replace('/view', '/preview');
      return (
        <iframe src={previewUrl} title="Drive PDF Viewer" className="w-100 h-100 rounded shadow border-0" frameBorder="0"></iframe>
      );
    }

    // Handle Local Base64 PDF
    if (doc.startsWith('data:application/pdf')) {
      return (
        <iframe 
          src={doc} 
          title="Local PDF Viewer"
          className="w-100 h-100 rounded shadow border-0" 
        ></iframe>
      );
    } 
    
    // Handle Local Base64 Image
    if (doc.startsWith('data:image')) {
      return (
        <img src={doc} alt="Passbook" className="img-fluid rounded shadow-lg m-auto" style={{maxHeight: '90%'}} />
      );
    }

    return (
      <div className="text-center p-4">
        <p>Format not instantly viewable. <a href={doc} target="_blank" rel="noreferrer">Open document in new tab</a></p>
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
            <div className="list-group list-group-flush" style={{maxHeight: '75vh', overflowY: 'auto'}}>
              {filteredAccounts.length === 0 && (
                <div className="p-4 text-center text-muted italic">
                  No records with completed bank entries found.
                </div>
              )}
              {filteredAccounts.map(blo => (
                <button
                  key={blo.BLO_ID}
                  onClick={() => { setSelectedBLO(blo); setIsEditing(false); }}
                  className={`list-group-item list-group-item-action p-3 border-0 border-bottom ${selectedBLO?.BLO_ID === blo.BLO_ID ? 'bg-primary-subtle' : ''}`}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="fw-bold mb-1">{blo.BLO_Name}</h6>
                      <p className="small text-muted mb-1">P-{blo.Part_No} | {blo.AC_Name}</p>
                      <div className="extra-small font-monospace text-primary">{blo.Account_Number}</div>
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
                <h5 className="mb-0 fw-bold d-flex align-items-center">
                  <i className="bi bi-search me-3 fs-4 text-warning"></i>
                  {isEditing ? 'Correcting Record' : 'Verification Workbench'}
                </h5>
                <button onClick={() => { setSelectedBLO(null); setIsEditing(false); }} className="btn btn-sm btn-outline-light d-lg-none">Close</button>
              </div>
              
              <div className="row g-0 flex-grow-1">
                <div className="col-12 col-md-7 bg-dark bg-opacity-10 d-flex flex-column border-end" style={{ minHeight: '600px' }}>
                  <div className="p-3 bg-secondary bg-opacity-25 fw-bold small text-dark text-uppercase border-bottom">Document Proof</div>
                  <div className="flex-grow-1 p-2 d-flex align-items-start justify-content-center overflow-auto bg-slate-900">
                    {renderDocumentViewer(isEditing && editForm ? editForm.Account_Passbook_Doc : selectedBLO.Account_Passbook_Doc)}
                  </div>
                </div>

                <div className="col-12 col-md-5 d-flex flex-column p-4 bg-white">
                  {isEditing && editForm ? (
                    <div className="flex-grow-1">
                      <h6 className="fw-bold text-primary mb-4 text-uppercase extra-small">Quick Detail Correction</h6>
                      <div className="mb-3">
                        <label className="form-label extra-small fw-bold text-muted">Account Number <span className="text-danger">*</span></label>
                        <input 
                          type="text" 
                          className="form-control fw-bold font-monospace" 
                          value={editForm.Account_Number} 
                          onChange={e => setEditForm({...editForm, Account_Number: e.target.value.replace(/\D/g, '')})} 
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label extra-small fw-bold text-muted">IFSC Code <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <input 
                            type="text" 
                            className="form-control font-monospace text-uppercase" 
                            value={editForm.IFSC_Code} 
                            onChange={e => setEditForm({...editForm, IFSC_Code: e.target.value.toUpperCase().trim()})} 
                            required
                          />
                          <button 
                            className="btn btn-outline-primary" 
                            type="button" 
                            onClick={() => triggerIFSCSearch(editForm.IFSC_Code)}
                            disabled={isSearching}
                          >
                            {isSearching ? <i className="bi bi-arrow-repeat spin"></i> : <i className="bi bi-search"></i>}
                          </button>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="form-label extra-small fw-bold text-muted">BLO Mobile</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={editForm.Mobile} 
                          onChange={e => setEditForm({...editForm, Mobile: e.target.value})} 
                        />
                      </div>
                      
                      <div className="d-grid gap-2">
                        <button onClick={handleSaveEdit} className="btn btn-primary py-2 fw-bold shadow-sm">Update Details</button>
                        <button onClick={() => setIsEditing(false)} className="btn btn-outline-secondary py-2">Cancel Edit</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow-1 d-flex flex-column">
                      <div className="card border-0 bg-primary bg-opacity-10 p-4 mb-4 text-center">
                        <label className="fw-bold text-primary text-uppercase mb-2" style={{fontSize: '0.7rem'}}>Account Number</label>
                        <div className="h3 fw-bold text-dark font-monospace mb-0">{selectedBLO.Account_Number || 'NOT ENTERED'}</div>
                      </div>

                      <div className="card border-0 bg-secondary bg-opacity-10 p-3 mb-4">
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="extra-small text-muted text-uppercase fw-bold">IFSC Code</label>
                            <div className="fw-bold font-monospace">{selectedBLO.IFSC_Code || '---'}</div>
                          </div>
                          <div className="col-6">
                            <label className="extra-small text-muted text-uppercase fw-bold">EPIC</label>
                            <div className="fw-bold">{selectedBLO.EPIC || '---'}</div>
                          </div>
                          <div className="col-12 pt-3 mt-2 border-top">
                            <label className="extra-small text-muted text-uppercase fw-bold">Designation</label>
                            <div className="small fw-semibold">{getEntityLabel(designations.find(d => String(d.Dept_ID).trim() === String(selectedBLO.Dept_ID).trim() && String(d.Desg_ID).trim() === String(selectedBLO.Desg_ID).trim()), ['Desg_Name', 'Designation', 'Name'])}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto d-grid gap-2">
                        {selectedBLO.Verified === 'no' && (
                          <button onClick={startEditing} className="btn btn-outline-primary py-2 fw-bold d-flex align-items-center justify-content-center">
                            <i className="bi bi-pencil-square me-2"></i> Edit Details
                          </button>
                        )}
                        
                        {selectedBLO.Verified === 'yes' ? (
                          <button onClick={() => handleVerifyToggle(selectedBLO)} className="btn btn-danger py-3 shadow fw-bold" disabled={!isAdmin}>
                            <i className="bi bi-unlock-fill me-2"></i> UN-VERIFY
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleVerifyToggle(selectedBLO)} 
                            className={`btn btn-success py-3 shadow fw-bold ${!selectedBLO.Account_Number ? 'disabled' : ''}`}
                          >
                            <i className="bi bi-shield-fill-check me-2"></i> CONFIRM & VERIFY
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-lg-8 d-none d-lg-flex align-items-center justify-content-center bg-white rounded-4 border">
            <div className="text-center p-5">
              <i className="bi bi-check2-all text-primary display-1 mb-3"></i>
              <h4 className="fw-bold">Ready for Matching</h4>
              <p className="text-muted">Select an officer to verify their bank details against the uploaded document.</p>
              <div className="mt-3 badge bg-info-subtle text-info px-3 py-2">
                Showing {filteredAccounts.length} accounts with completed entries.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;