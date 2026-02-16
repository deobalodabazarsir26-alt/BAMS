import React, { useMemo } from 'react';
import { BLOAccount, User, UserType } from '../types';
import * as XLSX from 'xlsx';

interface ConsolidatedReportProps {
  user: User;
  bloAccounts: BLOAccount[];
  avihitAccounts: BLOAccount[];
  supervisorAccounts: BLOAccount[];
}

const ConsolidatedReport: React.FC<ConsolidatedReportProps> = ({ user, bloAccounts, avihitAccounts, supervisorAccounts }) => {
  const isAdmin = user.User_Type === UserType.ADMIN;

  const filterByContext = (list: BLOAccount[]) => {
    return isAdmin 
      ? list 
      : list.filter(a => String(a.User_ID).trim() === String(user.User_ID).trim());
  };

  const tehsilSummary = useMemo(() => {
    const contextBlo = filterByContext(bloAccounts);
    const contextAvihit = filterByContext(avihitAccounts);
    const contextSup = filterByContext(supervisorAccounts);

    const allTehsils = Array.from(new Set([
      ...contextBlo.map(a => a.Tehsil),
      ...contextAvihit.map(a => a.Tehsil),
      ...contextSup.map(a => a.Tehsil)
    ])).filter(t => t && t.trim() !== '').sort();

    return allTehsils.map(tehsil => {
      const getStats = (list: BLOAccount[]) => {
        const tAccounts = list.filter(a => a.Tehsil === tehsil);
        const target = tAccounts.length;
        const entry = tAccounts.filter(a => a.Account_Number && String(a.Account_Number).trim() !== '').length;
        const verified = tAccounts.filter(a => a.Verified === 'yes').length;
        return { target, entry, verified, remaining: target - entry };
      };

      return {
        tehsil,
        blo: getStats(contextBlo),
        avihit: getStats(contextAvihit),
        supervisor: getStats(contextSup)
      };
    });
  }, [bloAccounts, avihitAccounts, supervisorAccounts, isAdmin, user.User_ID]);

  const totals = useMemo(() => {
    return tehsilSummary.reduce((acc, row) => ({
      blo: { 
        target: acc.blo.target + row.blo.target, 
        entry: acc.blo.entry + row.blo.entry, 
        verified: acc.blo.verified + row.blo.verified,
        remaining: acc.blo.remaining + row.blo.remaining 
      },
      avihit: { 
        target: acc.avihit.target + row.avihit.target, 
        entry: acc.avihit.entry + row.avihit.entry, 
        verified: acc.avihit.verified + row.avihit.verified,
        remaining: acc.avihit.remaining + row.avihit.remaining 
      },
      supervisor: { 
        target: acc.supervisor.target + row.supervisor.target, 
        entry: acc.supervisor.entry + row.supervisor.entry, 
        verified: acc.supervisor.verified + row.supervisor.verified,
        remaining: acc.supervisor.remaining + row.supervisor.remaining 
      }
    }), {
      blo: { target: 0, entry: 0, verified: 0, remaining: 0 },
      avihit: { target: 0, entry: 0, verified: 0, remaining: 0 },
      supervisor: { target: 0, entry: 0, verified: 0, remaining: 0 }
    });
  }, [tehsilSummary]);

  const handleExportExcel = () => {
    const exportData = tehsilSummary.map(row => ({
      'Tehsil': row.tehsil,
      'BLO Target': row.blo.target, 'BLO Entry': row.blo.entry, 'BLO Verified': row.blo.verified, 'BLO Remaining': row.blo.remaining,
      'Avihit Target': row.avihit.target, 'Avihit Entry': row.avihit.entry, 'Avihit Verified': row.avihit.verified, 'Avihit Remaining': row.avihit.remaining,
      'Supervisor Target': row.supervisor.target, 'Supervisor Entry': row.supervisor.entry, 'Supervisor Verified': row.supervisor.verified, 'Supervisor Remaining': row.supervisor.remaining
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Consolidated Summary");
    XLSX.writeFile(wb, "Consolidated_Tehsil_Summary.xlsx");
  };

  return (
    <div className="container-fluid py-2 pb-5">
      <div className="card shadow-sm p-4 border-0 mb-4 bg-white d-flex flex-row justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold mb-1">Consolidated Tehsil Summary</h3>
          <p className="text-muted small mb-0">Cross-category comparison of Target vs Actual entries.</p>
        </div>
        <button onClick={handleExportExcel} className="btn btn-success shadow-sm">
          <i className="bi bi-file-earmark-excel me-2"></i>Export Summary
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-5 bg-white">
        <div className="table-responsive">
          <table className="table table-bordered align-middle mb-0 text-center">
            <thead className="table-light">
              <tr className="extra-small fw-bold">
                <th rowSpan={2} className="align-middle bg-light text-start ps-4" style={{ width: '15%' }}>TEHSIL NAME</th>
                <th colSpan={4} className="bg-primary bg-opacity-10 text-primary py-2 border-bottom-0">BLO (PARTS)</th>
                <th colSpan={4} className="bg-info bg-opacity-10 text-info py-2 border-bottom-0">AVIHIT (PARTS)</th>
                <th colSpan={4} className="bg-success bg-opacity-10 text-success py-2 border-bottom-0">SUPERVISOR (SECTORS)</th>
              </tr>
              <tr className="extra-small fw-bold" style={{ fontSize: '0.65rem' }}>
                <th className="bg-primary text-white py-1">Target</th>
                <th className="bg-primary text-white py-1">Entry</th>
                <th className="bg-primary text-white py-1">Verf.</th>
                <th className="bg-primary text-white py-1">Rem.</th>
                <th className="bg-info text-white py-1">Target</th>
                <th className="bg-info text-white py-1">Entry</th>
                <th className="bg-info text-white py-1">Verf.</th>
                <th className="bg-info text-white py-1">Rem.</th>
                <th className="bg-success text-white py-1">Target</th>
                <th className="bg-success text-white py-1">Entry</th>
                <th className="bg-success text-white py-1">Verf.</th>
                <th className="bg-success text-white py-1">Rem.</th>
              </tr>
            </thead>
            <tbody className="small">
              {tehsilSummary.map(row => (
                <tr key={row.tehsil}>
                  <td className="text-start ps-4 fw-bold">{row.tehsil}</td>
                  <td className="bg-primary bg-opacity-10">{row.blo.target}</td>
                  <td className="bg-primary bg-opacity-10">{row.blo.entry}</td>
                  <td className="bg-primary bg-opacity-10 text-success">{row.blo.verified}</td>
                  <td className={`bg-primary bg-opacity-10 fw-bold ${row.blo.remaining > 0 ? 'text-danger' : 'text-success'}`}>{row.blo.remaining}</td>
                  <td className="bg-info bg-opacity-10">{row.avihit.target}</td>
                  <td className="bg-info bg-opacity-10">{row.avihit.entry}</td>
                  <td className="bg-info bg-opacity-10 text-success">{row.avihit.verified}</td>
                  <td className={`bg-info bg-opacity-10 fw-bold ${row.avihit.remaining > 0 ? 'text-danger' : 'text-success'}`}>{row.avihit.remaining}</td>
                  <td className="bg-success bg-opacity-10">{row.supervisor.target}</td>
                  <td className="bg-success bg-opacity-10">{row.supervisor.entry}</td>
                  <td className="bg-success bg-opacity-10 text-success">{row.supervisor.verified}</td>
                  <td className={`bg-success bg-opacity-10 fw-bold ${row.supervisor.remaining > 0 ? 'text-danger' : 'text-success'}`}>{row.supervisor.remaining}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-dark">
              <tr className="fw-bold">
                <td className="text-start ps-4">GRAND TOTAL</td>
                <td>{totals.blo.target}</td>
                <td>{totals.blo.entry}</td>
                <td className="text-success">{totals.blo.verified}</td>
                <td className="text-warning">{totals.blo.remaining}</td>
                <td>{totals.avihit.target}</td>
                <td>{totals.avihit.entry}</td>
                <td className="text-success">{totals.avihit.verified}</td>
                <td className="text-warning">{totals.avihit.remaining}</td>
                <td>{totals.supervisor.target}</td>
                <td>{totals.supervisor.entry}</td>
                <td className="text-success">{totals.supervisor.verified}</td>
                <td className="text-warning">{totals.supervisor.remaining}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card p-4 border-0 shadow-sm bg-white text-center">
            <h1 className="fw-bold text-primary mb-0">{Math.round((totals.blo.entry / (totals.blo.target || 1)) * 100)}%</h1>
            <div className="extra-small fw-bold text-muted">BLO COMPLETION</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-4 border-0 shadow-sm bg-white text-center">
            <h1 className="fw-bold text-info mb-0">{Math.round((totals.avihit.entry / (totals.avihit.target || 1)) * 100)}%</h1>
            <div className="extra-small fw-bold text-muted">AVIHIT COMPLETION</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-4 border-0 shadow-sm bg-white text-center">
            <h1 className="fw-bold text-success mb-0">{Math.round((totals.supervisor.entry / (totals.supervisor.target || 1)) * 100)}%</h1>
            <div className="extra-small fw-bold text-muted">SUPERVISOR COMPLETION</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedReport;