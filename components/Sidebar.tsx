import React from 'react';
import { User, UserType } from '../types';

interface SidebarProps {
  user: User;
  onNavigate: (page: string) => void;
  currentPage: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onNavigate, currentPage, isOpen, setIsOpen, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill', roles: [UserType.ADMIN, UserType.TEHSIL] },
    { id: 'entry', label: 'Account Entry', icon: 'bi-pencil-square', roles: [UserType.ADMIN, UserType.TEHSIL] },
    { id: 'verification', label: 'Verification', icon: 'bi-patch-check-fill', roles: [UserType.ADMIN, UserType.TEHSIL] },
    { id: 'users', label: 'User Management', icon: 'bi-people-fill', roles: [UserType.ADMIN, UserType.TEHSIL] },
    { id: 'reports', label: 'Reports', icon: 'bi-bar-chart-line-fill', roles: [UserType.ADMIN, UserType.TEHSIL] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.User_Type));

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''} d-lg-none`} onClick={() => setIsOpen(false)}></div>
      
      <div className={`app-sidebar d-flex flex-column p-3 text-white ${isOpen ? 'show' : ''}`}>
        <div className="d-flex align-items-center mb-4 px-2">
          <div className="bg-primary rounded-3 p-2 me-2">
            <i className="bi bi-shield-check text-white fs-4"></i>
          </div>
          <h5 className="mb-0 fw-bold">ACCOUNT PORTAL</h5>
        </div>

        <div className="card bg-dark border-0 mb-4 text-white p-3">
          <div className="d-flex align-items-center">
            <div className="avatar bg-secondary rounded-circle me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
              {user.Officer_Name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="mb-0 fw-semibold text-truncate">{user.Officer_Name}</p>
              <span className="badge bg-primary-subtle text-primary text-uppercase" style={{ fontSize: '0.65rem' }}>{user.User_Type}</span>
            </div>
          </div>
        </div>

        <ul className="nav nav-pills flex-column mb-auto">
          {filteredMenu.map((item) => (
            <li className="nav-item" key={item.id}>
              <button
                onClick={() => { onNavigate(item.id); setIsOpen(false); }}
                className={`nav-link w-100 text-start border-0 ${currentPage === item.id ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon} me-3`}></i>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <hr className="border-secondary opacity-25" />
        
        <button 
          onClick={onLogout}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center py-2"
        >
          <i className="bi bi-box-arrow-right me-2"></i>
          Logout
        </button>
      </div>
    </>
  );
};

export default Sidebar;