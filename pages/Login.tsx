
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
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
        <div className="row g-0">
          <div className="col-12 p-4 p-md-5">
            <div className="text-center mb-5">
              <div className="bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm" style={{ width: '80px', height: '80px' }}>
                <i className="bi bi-person-badge text-primary fs-1"></i>
              </div>
              <h3 className="fw-bold text-dark">Account Portal Login</h3>
              <p className="text-muted small">Official Account Management System</p>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="alert alert-danger py-2 border-0 small text-center mb-4">
                  {error}
                </div>
              )}
              
              <div className="form-floating mb-3">
                <input 
                  type="text" 
                  className="form-control border-0 bg-light" 
                  id="floatingUser" 
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
                <label htmlFor="floatingUser">User ID</label>
              </div>

              <div className="form-floating mb-4">
                <input 
                  type="password" 
                  className="form-control border-0 bg-light" 
                  id="floatingPass" 
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <label htmlFor="floatingPass">Password</label>
              </div>

              <button type="submit" className="btn btn-primary w-100 py-3 fw-bold shadow-sm mb-4" style={{ borderRadius: '1rem' }}>
                SIGN IN TO PORTAL
              </button>

              <div className="text-center">
                <p className="extra-small text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                  Restricted to authorized election personnel only.
                  <br />
                  <span className="fw-semibold">District Election Office Balodabazar 2026</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
