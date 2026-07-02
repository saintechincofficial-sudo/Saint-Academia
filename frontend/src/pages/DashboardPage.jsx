import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import StudentList from '../components/StudentList/StudentList';
import StudentForm from '../components/StudentForm/StudentForm';
import './DashboardPage.css';

function DashboardPage() {
  const { user, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('students');

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingStudent(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingStudent(null);
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

      <nav className="dashboard-nav">
        <button 
          className={`nav-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          👥 Students
        </button>
        <button 
          className={`nav-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          👨‍🏫 Staff
        </button>
        <button 
          className={`nav-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          🏫 Classes
        </button>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'students' && (
          <div className="tab-content">
            {showForm && (
              <StudentForm 
                student={editingStudent}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            )}

            <div className="section-header">
              <h2>Student Management</h2>
              <button className="btn-primary" onClick={handleAddStudent}>
                + Add Student
              </button>
            </div>

            <StudentList 
              onEdit={handleEditStudent}
              refreshTrigger={refreshTrigger}
            />
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="tab-content">
            <div className="coming-soon">
              <h2>Staff Management</h2>
              <p>Coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="tab-content">
            <div className="coming-soon">
              <h2>Class Management</h2>
              <p>Coming soon...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
