import React, { useState, useEffect } from 'react';
import { User, UserType } from '../types';

interface UserManagementProps {
  currentUser: User;
  users: User[];
  onUpdateUser: (updatedUser: User) => Promise<void>;
}

interface UserEditFormProps {
  isSelf: boolean;
  isAdmin: boolean;
  isSaving: boolean;
  editForm: User | null;
  setEditForm: React.Dispatch<React.SetStateAction<User | null>>;
  handleSave: (e: React.FormEvent) => Promise<void>;
  onBack?: () => void;
}

const UserEditForm: React.FC<UserEditFormProps> = ({ 
  isSelf, 
  isAdmin, 
  isSaving, 
  editForm, 
  setEditForm, 
  handleSave, 
  onBack 
}) => {
  if (!editForm) return null;
  
  return (
    <div className="card shadow-lg border-0 mb-4">
      <div className="card-header bg-primary text-white py-3 border-0">
        <h5 className="mb-0 fw-bold d-flex align-items-center">
          <i className={`bi ${isSelf ? 'bi-person-circle' : 'bi-person-gear'} me-2`}></i>
          {isSelf ? 'My Official Profile' : `Update System Record: ${editForm.Officer_Name}`}
        </h5>
      </div>
      <div className="card-body p-4 bg-white">
        <form onSubmit={handleSave}>
          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label extra-small fw-bold text-muted text-uppercase mb-2">Officer Full Name</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-person-fill text-primary"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0 bg-light" 
                  value={editForm.Officer_Name || ''} 
                  onChange={e => setEditForm(prev => prev ? {...prev, Officer_Name: e.target.value} : null)}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label extra-small fw-bold text-muted text-uppercase mb-2">Mobile Number (Contact)</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-phone-fill text-primary"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0 bg-light" 
                  value={editForm.Mobile || ''} 
                  onChange={e => setEditForm(prev => prev ? {...prev, Mobile: e.target.value} : null)}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label extra-small fw-bold text-muted text-uppercase mb-2">Login User ID (Permanent)</label>
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0"><i className="bi bi-shield-lock-fill text-muted"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0 bg-light-subtle" 
                  value={editForm.User_Name || ''} 
                  disabled
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label extra-small fw-bold text-muted text-uppercase mb-2">Portal Password</label>
              <div className="input-group shadow-sm">
                <span className="input-group-text bg-white border-end-0"><i className="bi bi-key-fill text-warning"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  value={editForm.Password || ''} 
                  onChange={e => setEditForm(prev => prev ? {...prev, Password: e.target.value} : null)}
                  required
                  placeholder="Set new portal password"
                />
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label extra-small fw-bold text-muted text-uppercase mb-2">Official Designation</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-briefcase-fill text-primary"></i></span>
                <input 
                  type="text" 
                  className="form-control border-start-0 bg-light" 
                  value={editForm.Designation || ''} 
                  onChange={e => setEditForm(prev => prev ? {...prev, Designation: e.target.value} : null)}
                  disabled={!isAdmin}
                />
              </div>
            </div>
            {isAdmin && (
              <div className="col-md-6">
                <label className="form-label extra-small fw-bold text-muted text-uppercase mb-2">System Access Level</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-ui-checks-grid text-primary"></i></span>
                  <select 
                    className="form-select border-start-0 bg-light" 
                    value={editForm.User_Type} 
                    onChange={e => setEditForm(prev => prev ? {...prev, User_Type: e.target.value as UserType} : null)}
                  >
                    <option value={UserType.ADMIN}>Administrator</option>
                    <option value={UserType.TEHSIL}>Tehsil Level User</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 d-flex gap-3 justify-content-end align-items-center">
            {isAdmin && onBack && (
              <button 
                type="button" 
                className="btn btn-outline-secondary px-4 fw-bold" 
                onClick={onBack}
              >
                Back to Directory
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary px-5 py-2 shadow-lg fw-bold" 
              disabled={isSaving}
            >
              {isSaving ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Saving Changes...</>
              ) : (
                <><i className="bi bi-cloud-arrow-up-fill me-2"></i> Update Official Record</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, onUpdateUser }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUser.User_Type === UserType.ADMIN;

  // Initialize form with deep copy to avoid direct mutation issues
  useEffect(() => {
    if (!isAdmin) {
      setEditForm({ ...currentUser });
    }
  }, [currentUser, isAdmin]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({ ...user });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    
    setIsSaving(true);
    try {
      await onUpdateUser(editForm);
      if (isAdmin) {
        setSelectedUser(null);
        setEditForm(null);
      }
      alert('Officer details updated successfully in the system.');
    } catch (err) {
      alert('Failed to update details. Please check your network connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.Officer_Name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.User_Name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container-fluid py-2">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">User Management & Security</h3>
          <p className="text-muted small mb-0">
            {isAdmin ? 'Manage all system users and regional access permissions.' : 'Manage your official officer profile and secure portal credentials.'}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="row g-4">
          <div className="col-12">
            {selectedUser ? (
              <div className="row justify-content-center">
                <div className="col-lg-10">
                  <UserEditForm 
                    isSelf={selectedUser.User_ID === currentUser.User_ID}
                    isAdmin={isAdmin}
                    isSaving={isSaving}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    handleSave={handleSave}
                    onBack={() => { setSelectedUser(null); setEditForm(null); }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="card border-0 shadow-sm mb-4 bg-white">
                  <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                      <div className="col-md-6">
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0"><i className="bi bi-search text-muted"></i></span>
                          <input 
                            type="text" 
                            className="form-control border-start-0 shadow-none" 
                            placeholder="Search by Officer Name or User ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-auto ms-auto">
                         <div className="btn-group shadow-sm">
                            <button className="btn btn-light btn-sm fw-bold border" onClick={() => handleEdit(currentUser)}>
                               <i className="bi bi-person-circle me-2"></i> My Profile
                            </button>
                            <span className="btn btn-primary btn-sm fw-bold border-0 disabled">{users.length} Total Users</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm overflow-hidden bg-white">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-dark">
                        <tr>
                          <th className="py-3 px-4 fw-bold small">OFFICER NAME / DESIGNATION</th>
                          <th className="py-3 px-4 fw-bold small">PORTAL ID</th>
                          <th className="py-3 px-4 fw-bold small">CONTACT</th>
                          <th className="py-3 px-4 fw-bold small">ACCESS TYPE</th>
                          <th className="py-3 px-4 fw-bold small text-end">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.User_ID}>
                            <td className="px-4 py-3">
                              <div className="fw-bold text-dark">{u.Officer_Name}</div>
                              <div className="extra-small text-muted fw-semibold">{u.Designation}</div>
                            </td>
                            <td className="px-4 py-3 font-monospace small text-primary">{u.User_Name}</td>
                            <td className="px-4 py-3 small"><i className="bi bi-phone me-1"></i> {u.Mobile}</td>
                            <td className="px-4 py-3">
                              <span className={`badge ${u.User_Type === UserType.ADMIN ? 'bg-primary' : 'bg-info'} text-uppercase`} style={{ fontSize: '0.6rem' }}>
                                {u.User_Type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-end">
                              <button 
                                onClick={() => handleEdit(u)} 
                                className="btn btn-sm btn-outline-primary px-3 fw-bold border-2"
                              >
                                {u.User_ID === currentUser.User_ID ? 'Self Manage' : 'Modify Access'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <UserEditForm 
              isSelf={true}
              isAdmin={isAdmin}
              isSaving={isSaving}
              editForm={editForm}
              setEditForm={setEditForm}
              handleSave={handleSave}
            />
            <div className="mt-4 card border-0 shadow-sm bg-primary bg-opacity-10 p-4 border-start border-primary border-5">
               <h6 className="fw-bold text-primary mb-2"><i className="bi bi-shield-lock-fill me-2"></i> Access Credentials</h6>
               <p className="small text-muted mb-0">
                 Your official credentials allow access to Booth Level Officer data management. If you suspect any security breach, please update your portal password immediately and notify the District Administrator.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;