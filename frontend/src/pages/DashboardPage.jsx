import { useAuth } from '../hooks/useAuth';
import './DashboardPage.css';

function DashboardPage() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Saint Academia</h1>
          <div className="user-info">
            <span>{user?.email}</span>
            <span className="role-badge">{user?.role}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-card">
          <h2>Welcome to Saint Academia!</h2>
          <p>You are successfully logged in as <strong>{user?.email}</strong></p>
          <p>Role: <strong>{user?.role}</strong></p>
          <p className="build-message">🚀 Dashboard is being built...</p>
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
