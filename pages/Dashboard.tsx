
import React from 'react';
import { BLOAccount, User, UserType } from '../types';

interface DashboardProps {
  user: User;
  accounts: BLOAccount[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, accounts }) => {
  const filteredAccounts = user.User_Type === UserType.ADMIN 
    ? accounts 
    : accounts.filter(a => a.User_ID === user.User_ID);

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
