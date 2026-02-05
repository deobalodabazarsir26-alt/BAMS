import React from 'react';
import { BLOAccount, User, UserType, AccountCategory } from '../types';

interface ReportsProps {
  user: User;
  accounts: BLOAccount[];
  users: User[];
  type: AccountCategory;
}

const Reports: React.FC<ReportsProps> = ({ user, accounts, users, type }) => {
  const isAdmin = user.User_Type === UserType.ADMIN;
  const typeLabels: Record<AccountCategory, string> = { blo: 'BLO', avihit: 'Avihit', supervisor: 'Supervisor' };

  const displayedAccounts = isAdmin 
    ? accounts 
    : accounts.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim());

  const globalTotal = displayedAccounts.length;
  const globalEntered = displayedAccounts.filter(a => a.Account_Number && String(a.Account_Number).trim() !== '').length;
  const globalVerified = displayedAccounts.filter(a => a.Verified === 'yes').length;

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
    <div className="container-fluid py-2">
      <div className="card shadow-sm p-4 border-0 mb-4">
        <h3 className="fw-bold mb-1">{typeLabels[type]} Report</h3>
        <p className="text-muted small mb-0">Milestones for {typeLabels[type]} data entries.</p>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-primary text-white p-4">
            <small className="opacity-75">TOTAL PARTS</small><h2 className="fw-bold">{globalTotal}</h2>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-info text-white p-4">
            <small className="opacity-75">ENTRIES DONE</small><h2 className="fw-bold">{globalEntered}</h2>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm bg-success text-white p-4">
            <small className="opacity-75">VERIFIED</small><h2 className="fw-bold">{globalVerified}</h2>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th className="ps-4">TEHSIL</th><th>OFFICER</th><th className="text-center">COUNT</th><th>ENTRY %</th><th>VERIFY %</th></tr>
              </thead>
              <tbody>
                {userBreakdown.map(item => (
                  <tr key={item.userId}>
                    <td className="ps-4"><span className="badge bg-light text-dark border">{item.tehsil}</span></td>
                    <td><div className="fw-bold">{item.officerName}</div></td>
                    <td className="text-center">{item.total}</td>
                    <td>
                      <div className="progress mb-1" style={{ height: '4px' }}><div className="progress-bar bg-info" style={{ width: `${item.entryProgress}%` }}></div></div>
                      <small className="extra-small">{item.entryProgress}%</small>
                    </td>
                    <td>
                      <div className="progress mb-1" style={{ height: '4px' }}><div className="progress-bar bg-success" style={{ width: `${item.verifyProgress}%` }}></div></div>
                      <small className="extra-small">{item.verifyProgress}%</small>
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