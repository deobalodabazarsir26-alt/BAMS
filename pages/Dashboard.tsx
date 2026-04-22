
import React, { useState } from 'react';
import { BLOAccount, User, UserType } from '../types';
import { API_URL, safeFetch } from '../services/dataService';

interface MigrationLog {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  message: string;
  type: string;
  data: any;
}

interface DashboardProps {
  user: User;
  bloAccounts: BLOAccount[];
  avihitAccounts: BLOAccount[];
  supervisorAccounts: BLOAccount[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, bloAccounts, avihitAccounts, supervisorAccounts }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<MigrationLog[]>([]);
  const [migrationProgress, setMigrationProgress] = useState(0);

  const handleRenameExistingFiles = async () => {
    console.log("Migration Button Clicked");
    
    // 1. Prepare all items to migrate
    try {
      const allMigrationItems: MigrationLog[] = [
        ...(bloAccounts || []).map(a => ({ id: a.BLO_ID, name: a.BLO_Name, status: 'pending' as const, message: 'Waiting', type: 'BLO', data: a })),
        ...(avihitAccounts || []).map(a => ({ id: a.BLO_ID, name: a.BLO_Name, status: 'pending' as const, message: 'Waiting', type: 'Avihit', data: a })),
        ...(supervisorAccounts || []).map(a => ({ id: a.BLO_ID, name: a.BLO_Name, status: 'pending' as const, message: 'Waiting', type: 'Supervisor', data: a }))
      ].filter(item => {
        const doc = String(item?.data?.Account_Passbook_Doc || '');
        return doc.includes('drive.google.com') || (doc.length > 20 && !doc.includes(' '));
      });

      console.log("Filtered Migration Items:", allMigrationItems.length);

      if (allMigrationItems.length === 0) {
        alert("Found 0 files to migrate. Are you sure the accounts have Google Drive links?");
        return;
      }

      if (!window.confirm(`System found ${allMigrationItems.length} files. Start batch processing?`)) {
        console.log("Migration cancelled by user");
        return;
      }
      
      setIsRenaming(true);
      setMigrationLogs(allMigrationItems);
      setMigrationProgress(0);

      const CHUNK_SIZE = 100;
      
      for (let i = 0; i < allMigrationItems.length; i += CHUNK_SIZE) {
        const chunk = allMigrationItems.slice(i, i + CHUNK_SIZE);
        console.log(`Processing Chunk ${i / CHUNK_SIZE + 1}, Size: ${chunk.length}`);
        
        setMigrationLogs(prev => prev.map(log => 
          chunk.find(c => c.id === log.id) ? { ...log, status: 'processing', message: 'Processing batch...' } : log
        ));

        try {
          const payload = chunk.map(item => {
            const a = item.data;
            const partNo = a.Part_No || a.Sector_No || 'NA';
            const newName = `${item.type}_${a.AC_No}_${partNo}_${a.Mobile}`;
            return {
              url: a.Account_Passbook_Doc,
              newName: newName,
              id: item.id,
              type: item.type
            };
          });

          const data = await safeFetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'renameBatch', payload: payload })
          });

          if (data && data.results) {
            setMigrationLogs(prev => prev.map(log => {
              const found = data.results.find((r: any) => r.id === log.id);
              if (found) {
                return { 
                  ...log, 
                  status: found.success ? 'success' : 'error', 
                  message: found.success ? (found.skipped ? 'Already Sync' : 'Done') : (found.error || 'Failed') 
                };
              }
              return log;
            }));
          } else {
            throw new Error(data?.error || "Batch failed on server");
          }
        } catch (e: any) {
          console.error("Chunk Error:", e);
          setMigrationLogs(prev => prev.map(log => 
            chunk.find(c => c.id === log.id) ? { ...log, status: 'error', message: e.message || 'Error' } : log
          ));
        }

        setMigrationProgress(Math.round(((i + chunk.length) / allMigrationItems.length) * 100));
      }
    } catch (criticalError: any) {
      console.error("Critical Migration Error:", criticalError);
      alert("Critical Error: " + criticalError.message);
    } finally {
      setIsRenaming(false);
    }
  };

  const allAccounts = [...bloAccounts, ...avihitAccounts, ...supervisorAccounts];
  const filteredAccounts = user.User_Type === UserType.ADMIN 
    ? allAccounts 
    : allAccounts.filter(a => a.User_ID === user.User_ID);

  const total = filteredAccounts.length;
  const verified = filteredAccounts.filter(a => a.Verified === 'yes').length;
  const pending = total - verified;

  const stats = [
    { label: 'Total Accounts', value: total, icon: 'bi-people', color: 'primary' },
    { label: 'Verified', value: verified, icon: 'bi-check-circle', color: 'success' },
    { label: 'Pending', value: pending, icon: 'bi-clock-history', color: 'warning' },
  ];

  return (
    <div className="container-fluid py-2">
      <div className="row mb-4">
        <div className="col">
          <div className="card bg-white p-4">
            <h2 className="fw-bold mb-1">Welcome, {user.Officer_Name}</h2>
            <p className="text-muted mb-0">Officer Account Management Dashboard</p>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="col-12 col-md-4">
            <div className="card h-100 p-4 border-0">
              <div className="d-flex align-items-center">
                <div className={`bg-${stat.color}-subtle text-${stat.color} rounded-3 p-3 me-4`}>
                  <i className={`bi ${stat.icon} fs-2`}></i>
                </div>
                <div>
                  <h6 className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '0.75rem', letterSpacing: '0.05rem' }}>{stat.label}</h6>
                  <h3 className="fw-bold mb-0">{stat.value}</h3>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card h-100 p-4">
            <h5 className="fw-bold mb-4 d-flex align-items-center">
              <i className="bi bi-info-circle me-2 text-primary"></i>
              System Overview
            </h5>
            <div className="table-responsive">
              <table className="table table-borderless align-middle">
                <tbody>
                  <tr>
                    <td className="ps-0"><span className="text-muted">Officer Name</span></td>
                    <td className="text-end fw-semibold">{user.Officer_Name}</td>
                  </tr>
                  <tr>
                    <td className="ps-0"><span className="text-muted">Designation</span></td>
                    <td className="text-end fw-semibold">{user.Designation}</td>
                  </tr>
                  <tr>
                    <td className="ps-0"><span className="text-muted">Mobile Number</span></td>
                    <td className="text-end fw-semibold">{user.Mobile}</td>
                  </tr>
                  <tr>
                    <td className="ps-0"><span className="text-muted">Assigned Tehsil</span></td>
                    <td className="text-end fw-semibold">{user.User_Type === UserType.ADMIN ? 'All Access' : 'Mapped Area'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {user.User_Type === UserType.ADMIN && (
              <div className="mt-4 pt-4 border-top">
                <h6 className="fw-bold text-uppercase small text-secondary mb-3">Administrator Utilities</h6>
                <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded-3 mb-3">
                  <div>
                    <div className="fw-bold small">Rename Legacy Files</div>
                    <div className="extra-small text-muted">Update all existing Drive files to the new naming format with progress tracking.</div>
                  </div>
                  <button 
                    onClick={handleRenameExistingFiles} 
                    disabled={isRenaming} 
                    className="btn btn-outline-primary btn-sm fw-bold"
                  >
                    {isRenaming ? <><i className="bi bi-arrow-repeat spin me-2"></i>Processing...</> : 'Start Migration'}
                  </button>
                </div>

                {isRenaming && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small fw-bold mb-1">
                      <span>Overall Progress</span>
                      <span>{migrationProgress}%</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${migrationProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {migrationLogs.length > 0 && (
                  <div className="border rounded-3 overflow-hidden">
                    <div className="bg-dark text-white p-2 small fw-bold d-flex justify-content-between">
                      <span>Migration Activity Log</span>
                      <span>{migrationLogs.filter(l => l.status === 'success').length} / {migrationLogs.length} Done</span>
                    </div>
                    <div className="p-0" style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
                      <table className="table table-sm table-hover mb-0 extra-small">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th className="ps-3">Type</th>
                            <th>Officer</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {migrationLogs.map((log, idx) => (
                            <tr key={idx}>
                              <td className="ps-3"><span className="badge bg-secondary-subtle text-secondary pt-1">{log.type}</span></td>
                              <td className="fw-semibold">{log.name}</td>
                              <td>
                                {log.status === 'pending' && <span className="text-muted">Waiting</span>}
                                {log.status === 'processing' && <span className="text-primary fw-bold">Processing...</span>}
                                {log.status === 'success' && <span className="text-success"><i className="bi bi-check-circle-fill me-1"></i>Renamed</span>}
                                {log.status === 'error' && <span className="text-danger"><i className="bi bi-x-circle-fill me-1"></i>Failed</span>}
                              </td>
                              <td className="text-muted">{log.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card h-100 p-4 bg-primary text-white shadow-lg">
            <h5 className="fw-bold mb-3">Recent Activity</h5>
            <p className="small opacity-75 mb-4">Last data synchronization on {new Date().toLocaleDateString()}</p>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-start">
                <div className="bg-white bg-opacity-25 rounded p-2 me-3">
                  <i className="bi bi-cloud-upload"></i>
                </div>
                <div>
                  <p className="mb-0 fw-semibold small">Records Ready</p>
                  <p className="mb-0 extra-small opacity-75" style={{ fontSize: '0.75rem' }}>{pending} accounts need verification</p>
                </div>
              </div>
              <div className="d-flex align-items-start">
                <div className="bg-white bg-opacity-25 rounded p-2 me-3">
                  <i className="bi bi-person-check"></i>
                </div>
                <div>
                  <p className="mb-0 fw-semibold small">Verification Status</p>
                  <p className="mb-0 extra-small opacity-75" style={{ fontSize: '0.75rem' }}>{verified} successfully completed</p>
                </div>
              </div>
            </div>
            <button className="btn btn-light btn-sm mt-auto fw-bold">View Reports</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
