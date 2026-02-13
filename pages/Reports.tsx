import React from 'react';
import { BLOAccount, User, UserType, AccountCategory } from '../types';

interface ReportsProps {
  user: User;
  accounts: BLOAccount[]; // This is the 'active' category filtered for current view
  bloAccounts?: BLOAccount[];
  avihitAccounts?: BLOAccount[];
  supervisorAccounts?: BLOAccount[];
  users: User[];
  type: AccountCategory;
}

const Reports: React.FC<ReportsProps> = ({ user, accounts, users, type }) => {
  const isAdmin = user.User_Type === UserType.ADMIN;
  const typeLabels: Record<AccountCategory, string> = { blo: 'BLO', avihit: 'Avihit', supervisor: 'Supervisor' };

  // Helper to filter data by user context
  const filterByContext = (list: BLOAccount[]) => {
    return isAdmin 
      ? list 
      : list.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim());
  };

  const displayedAccounts = filterByContext(accounts);

  const globalTotal = displayedAccounts.length;
  const globalEntered = displayedAccounts.filter(a => a.Account_Number && String(a.Account_Number).trim() !== '').length;
  const globalVerified = displayedAccounts.filter(a => a.Verified === 'yes').length;
  
  const globalEntryPct = globalTotal > 0 ? Math.round((globalEntered / globalTotal) * 100) : 0;
  const globalVerifyPct = globalTotal > 0 ? Math.round((globalVerified / globalTotal) * 100) : 0;

  // User breakdown for the active category
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
      total, entered, verified,
      entryProgress: total > 0 ? Math.round((entered / total) * 100) : 0,
      verifyProgress: total > 0 ? Math.round((verified / total) * 100) : 0
    };
  }).filter(u => u.total > 0) : [];

  return (
    <div className="container-fluid py-2 pb-5">
      <div className="card shadow-sm p-4 border-0 mb-4">
        <h3 className="fw-bold mb-1">{typeLabels[type]} Report</h3>
        <p className="text-muted small mb-0">Milestones for {typeLabels[type]} data entries.</p>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-primary text-white p-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="opacity-75">TOTAL {type === 'supervisor' ? 'SECTORS' : 'PARTS'}</small>
                <h2 className="fw-bold mb-0">{globalTotal}</h2>
              </div>
              <i className="bi bi-people-fill fs-1 opacity-25"></i>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-info text-white p-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="opacity-75">ENTRIES DONE</small>
                <h2 className="fw-bold mb-0">{globalEntered} <small className="fs-6 opacity-75">({globalEntryPct}%)</small></h2>
              </div>
              <i className="bi bi-pencil-fill fs-1 opacity-25"></i>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-success text-white p-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="opacity-75">VERIFIED</small>
                <h2 className="fw-bold mb-0">{globalVerified} <small className="fs-6 opacity-75">({globalVerifyPct}%)</small></h2>
              </div>
              <i className="bi bi-patch-check-fill fs-1 opacity-25"></i>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card border-0 shadow-sm overflow-hidden bg-white">
          <div className="card-header bg-light py-3 px-4">
            <h6 className="mb-0 fw-bold text-muted text-uppercase small">Officer Performance: {typeLabels[type]}</h6>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 py-3">TEHSIL</th>
                  <th className="py-3">OFFICER</th>
                  <th className="py-3 text-center">TOTAL</th>
                  <th className="py-3">ENTRY STATUS (COUNT)</th>
                  <th className="py-3">VERIFY STATUS (COUNT)</th>
                </tr>
              </thead>
              <tbody>
                {userBreakdown.map(item => (
                  <tr key={item.userId}>
                    <td className="ps-4">
                      <span className="badge bg-light text-dark border px-2 py-1">{item.tehsil}</span>
                    </td>
                    <td>
                      <div className="fw-bold text-primary">{item.officerName}</div>
                    </td>
                    <td className="text-center fw-bold">{item.total}</td>
                    <td>
                      <div className="progress mb-1" style={{ height: '6px' }}>
                        <div className="progress-bar bg-info" style={{ width: `${item.entryProgress}%` }}></div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="fw-bold text-info">{item.entryProgress}%</small>
                        <small className="extra-small text-muted">{item.entered} / {item.total}</small>
                      </div>
                    </td>
                    <td>
                      <div className="progress mb-1" style={{ height: '6px' }}>
                        <div className="progress-bar bg-success" style={{ width: `${item.verifyProgress}%` }}></div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="fw-bold text-success">{item.verifyProgress}%</small>
                        <small className="extra-small text-muted">{item.verified} / {item.total}</small>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;