import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

function LoginPage() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    
    if (result.success) {
      window.location.href = '/';
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Saint Academia</h1>
        <p className="subtitle">Cameroonian Secondary School Management System</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@saintacademia.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="demo-text">
          Demo Credentials:<br/>
          Email: admin@saintacademia.com<br/>
          Password: password123
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
