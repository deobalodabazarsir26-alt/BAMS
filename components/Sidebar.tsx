import React, { useState } from 'react';
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
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'entry': true,
    'verification': false,
    'reports': false
  });

  const toggleMenu = (menuId: string) => {
    setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const menuSections = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill', type: 'single' },
    { 
      id: 'entry', label: 'Account Entry', icon: 'bi-pencil-square', type: 'dropdown',
      items: [
        { id: 'entry-blo', label: 'BLO Accounts' },
        { id: 'entry-avihit', label: 'Avihit Accounts' },
        { id: 'entry-supervisor', label: 'Supervisor Accounts' }
      ]
    },
    { 
      id: 'verification', label: 'Verification', icon: 'bi-patch-check-fill', type: 'dropdown',
      items: [
        { id: 'verification-blo', label: 'BLO Verification' },
        { id: 'verification-avihit', label: 'Avihit Verification' },
        { id: 'verification-supervisor', label: 'Supervisor Verification' }
      ]
    },
    { 
      id: 'reports', label: 'Reports', icon: 'bi-bar-chart-line-fill', type: 'dropdown',
      items: [
        { id: 'reports-blo', label: 'BLO Report' },
        { id: 'reports-avihit', label: 'Avihit Report' },
        { id: 'reports-supervisor', label: 'Supervisor Report' }
      ]
    },
    { id: 'users', label: 'User Management', icon: 'bi-people-fill', type: 'single' },
  ];

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
          {menuSections.map((section) => (
            <li className="nav-item" key={section.id}>
              {section.type === 'single' ? (
                <button
                  onClick={() => { onNavigate(section.id); setIsOpen(false); }}
                  className={`nav-link w-100 text-start border-0 ${currentPage === section.id ? 'active' : ''}`}
                >
                  <i className={`bi ${section.icon} me-3`}></i>
                  {section.label}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => toggleMenu(section.id)}
                    className="nav-link w-100 text-start border-0 d-flex justify-content-between align-items-center"
                    style={{ background: 'transparent' }}
                  >
                    <span>
                      <i className={`bi ${section.icon} me-3`}></i>
                      {section.label}
                    </span>
                    <i className={`bi bi-chevron-${openMenus[section.id] ? 'up' : 'down'} extra-small`}></i>
                  </button>
                  <div className={`ps-4 overflow-hidden transition-all ${openMenus[section.id] ? 'd-block' : 'd-none'}`} style={{ marginTop: '-0.5rem' }}>
                    {section.items?.map(subItem => (
                      <button
                        key={subItem.id}
                        onClick={() => { onNavigate(subItem.id); setIsOpen(false); }}
                        className={`nav-link w-100 text-start border-0 extra-small py-2 ${currentPage === subItem.id ? 'active text-white' : 'text-white-50'}`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        <hr className="border-secondary opacity-25" />
        
        <button 
          onClick={onLogout}
          className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center py-2 btn-sm"
        >
          <i className="bi bi-box-arrow-right me-2"></i>
          Logout
        </button>
      </div>
    </>
  );
};

export default Sidebar;