import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  onEnterBLOApp: () => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, onEnterBLOApp }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.User_Name === username && u.Password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-primary bg-gradient p-3">
      <div className="card shadow-lg border-0 overflow-hidden" style={{ maxWidth: '450px', width: '100%', borderRadius: '1.5rem' }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-5">
            <div className="bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm" style={{ width: '80px', height: '80px' }}>
              <i className="bi bi-shield-lock text-primary fs-1"></i>
            </div>
            <h3 className="fw-bold text-dark">Portal Access</h3>
            <p className="text-muted small">Election Official Management</p>
          </div>

          <div className="mb-4">
            <h6 className="fw-bold text-muted text-uppercase extra-small text-center mb-3">Officer Authentication</h6>
            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-danger py-2 border-0 small text-center mb-4">{error}</div>}
              <div className="form-floating mb-3">
                <input type="text" className="form-control border-0 bg-light" id="floatingUser" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <label htmlFor="floatingUser">User ID</label>
              </div>
              <div className="form-floating mb-4">
                <input type="password" className="form-control border-0 bg-light" id="floatingPass" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <label htmlFor="floatingPass">Password</label>
              </div>
              <button type="submit" className="btn btn-primary w-100 py-3 fw-bold shadow-sm mb-4" style={{ borderRadius: '1rem' }}>
                SIGN IN TO PORTAL
              </button>
            </form>
          </div>

          <div className="mt-2 p-3 bg-info bg-opacity-10 rounded-4 border border-info border-opacity-25 text-center">
            <p className="extra-small text-info fw-bold mb-1">FOR FIELD BLOs ONLY</p>
            <p className="small text-muted mb-3">Access your mobile bank entry portal using your registered mobile number.</p>
            <button onClick={onEnterBLOApp} className="btn btn-info text-white w-100 fw-bold rounded-3 py-2">
              <i className="bi bi-phone-vibrate me-2"></i>
              OPEN BLO MOBILE APP
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="extra-small text-muted mb-0" style={{ fontSize: '0.75rem' }}>
              District Election Office Balodabazar 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;