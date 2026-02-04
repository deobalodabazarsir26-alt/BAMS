import React from 'react';
import { BLOAccount, User, UserType } from '../types';

interface ReportsProps {
  user: User;
  accounts: BLOAccount[];
  users: User[];
}

const Reports: React.FC<ReportsProps> = ({ user, accounts, users }) => {
  const isAdmin = user.User_Type === UserType.ADMIN;

  // Filter accounts based on user role for the summary metrics
  const displayedAccounts = isAdmin 
    ? accounts 
    : accounts.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim());

  const globalTotal = displayedAccounts.length;
  const globalEntered = displayedAccounts.filter(a => a.Account_Number && String(a.Account_Number).trim() !== '').length;
  const globalVerified = displayedAccounts.filter(a => a.Verified === 'yes').length;

  // User Breakdown logic - only relevant/shown for Admins
  const userBreakdown = isAdmin ? users.map(u => {
    const userAccounts = accounts.filter(a => String(a.User_ID).trim() === String(u.User_ID).trim());
    const total = userAccounts.length;
    const entered = userAccounts.filter(a => a.Account_Number && String(a.Account_Number).trim() !== '').length;
    const verified = userAccounts.filter(a => a.Verified === 'yes').length;
    
    const tehsilName = userAccounts.length > 0 ? userAccounts[0].Tehsil : 'N/A';

    return {
      userId: u.User_ID,
      officerName: u.Officer_Name,
      tehsil: tehsilName,
      total,
      entered,
      verified,
      entryProgress: total > 0 ? Math.round((entered / total) * 100) : 0,
      verifyProgress: total > 0 ? Math.round((verified / total) * 100) : 0
    };
  }).filter(u => u.total > 0) : [];

  return (
    <div className="container-fluid py-2">
      <div className="row mb-4">
        <div className="col">
          <div className="card shadow-sm p-4 border-0">
            <h3 className="fw-bold mb-1">{isAdmin ? 'District Audit & Reports' : 'My Progress Report'}</h3>
            <p className="text-muted small mb-0">
              {isAdmin 
                ? 'Track account entry progress and verification milestones across the entire district.' 
                : 'Summary of your assigned Booth Level Officer account entries and verification status.'}
            </p>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm bg-primary text-white p-4">
            <div className="d-flex justify-content-between">
              <div>
                <div className="small text-uppercase opacity-75 fw-bold mb-1">{isAdmin ? 'Total Assigned Parts' : 'My Assigned Parts'}</div>
                <h2 className="fw-bold mb-0">{globalTotal}</h2>
              </div>
              <i className="bi bi-people-fill fs-1 opacity-25"></i>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm bg-info text-white p-4">
            <div className="d-flex justify-content-between">
              <div>
                <div className="small text-uppercase opacity-75 fw-bold mb-1">Entries Completed</div>
                <h2 className="fw-bold mb-0">{globalEntered}</h2>
                <div className="extra-small opacity-75 mt-2">
                  {globalTotal > 0 ? Math.round((globalEntered / globalTotal) * 100) : 0}% Completion
                </div>
              </div>
              <i className="bi bi-pencil-square fs-1 opacity-25"></i>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100 border-0 shadow-sm bg-success text-white p-4">
            <div className="d-flex justify-content-between">
              <div>
                <div className="small text-uppercase opacity-75 fw-bold mb-1">Verified Records</div>
                <h2 className="fw-bold mb-0">{globalVerified}</h2>
                <div className="extra-small opacity-75 mt-2">
                  {globalEntered > 0 ? Math.round((globalVerified / globalEntered) * 100) : 0}% Verification Rate
                </div>
              </div>
              <i className="bi bi-shield-check fs-1 opacity-25"></i>
            </div>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 border-bottom">
            <h5 className="mb-0 fw-bold">Tehsil & User Breakdown</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">TEHSIL</th>
                  <th>OFFICER / USER</th>
                  <th className="text-center">PARTS</th>
                  <th>ENTRY PROGRESS</th>
                  <th>VERIFICATION PROGRESS</th>
                </tr>
              </thead>
              <tbody>
                {userBreakdown.map(item => (
                  <tr key={item.userId}>
                    <td className="ps-4">
                      <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-3">
                        {item.tehsil}
                      </span>
                    </td>
                    <td>
                      <div className="fw-bold">{item.officerName}</div>
                      <div className="extra-small text-muted">{item.userId}</div>
                    </td>
                    <td className="text-center fw-bold">{item.total}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="progress flex-grow-1 me-2" style={{ height: '6px' }}>
                          <div 
                            className="progress-bar bg-info" 
                            role="progressbar" 
                            style={{ width: `${item.entryProgress}%` }}
                          ></div>
                        </div>
                        <span className="extra-small fw-bold text-info">{item.entryProgress}%</span>
                      </div>
                      <div className="extra-small text-muted mt-1">{item.entered} of {item.total} entered</div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="progress flex-grow-1 me-2" style={{ height: '6px' }}>
                          <div 
                            className="progress-bar bg-success" 
                            role="progressbar" 
                            style={{ width: `${item.verifyProgress}%` }}
                          ></div>
                        </div>
                        <span className="extra-small fw-bold text-success">{item.verifyProgress}%</span>
                      </div>
                      <div className="extra-small text-muted mt-1">{item.verified} of {item.total} verified</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm p-4 h-100">
              <h5 className="fw-bold mb-3 d-flex align-items-center text-info">
                <i className="bi bi-info-circle me-2"></i>
                Entry Status
              </h5>
              <p className="text-muted small">
                You have finished bank account entry for <strong>{globalEntered}</strong> out of <strong>{globalTotal}</strong> assigned booth parts. 
                {globalTotal - globalEntered > 0 
                  ? ` Please complete the remaining ${globalTotal - globalEntered} entries to reach 100%.`
                  : " Great job! All your assigned booths have bank details submitted."}
              </p>
              <div className="mt-auto">
                <div className="d-flex justify-content-between mb-1 extra-small fw-bold text-muted">
                  <span>PROGRESS</span>
                  <span>{globalTotal > 0 ? Math.round((globalEntered/globalTotal)*100) : 0}%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-info" 
                    role="progressbar" 
                    style={{ width: `${globalTotal > 0 ? (globalEntered/globalTotal)*100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm p-4 h-100">
              <h5 className="fw-bold mb-3 d-flex align-items-center text-success">
                <i className="bi bi-patch-check me-2"></i>
                Verification Summary
              </h5>
              <p className="text-muted small">
                <strong>{globalVerified}</strong> of your submitted records have been verified by the district administrator. 
                {globalEntered - globalVerified > 0 
                  ? ` Currently, ${globalEntered - globalVerified} entered records are awaiting verification.`
                  : " All your submitted records have successfully passed verification."}
              </p>
              <div className="mt-auto">
                <div className="d-flex justify-content-between mb-1 extra-small fw-bold text-muted">
                  <span>VERIFICATION RATE</span>
                  <span>{globalEntered > 0 ? Math.round((globalVerified/globalEntered)*100) : 0}%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar bg-success" 
                    role="progressbar" 
                    style={{ width: `${globalEntered > 0 ? (globalVerified/globalEntered)*100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;