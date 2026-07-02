import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import StudentList from '../components/StudentList/StudentList';
import StudentForm from '../components/StudentForm/StudentForm';
import StaffPage from './StaffPage';
import ClassPage from './ClassPage';
import DashboardSummary from '../components/DashboardSummary/DashboardSummary';
import SuperAdminSchools from '../components/SuperAdminSchools/SuperAdminSchools';
import SchoolProfile from '../components/SchoolProfile/SchoolProfile';
import './DashboardPage.css';

function DashboardPage() {
  const { user, logout } = useAuth();
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentRefreshTrigger, setStudentRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setShowStudentForm(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setShowStudentForm(true);
  };

  const handleStudentFormSubmit = () => {
    setShowStudentForm(false);
    setEditingStudent(null);
    setStudentRefreshTrigger(prev => prev + 1);
  };

  const handleStudentFormCancel = () => {
    setShowStudentForm(false);
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
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🏠 Overview
        </button>
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
        {user?.role === 'super_admin' ? (
          <button
            className={`nav-btn ${activeTab === 'schools' ? 'active' : ''}`}
            onClick={() => setActiveTab('schools')}
          >
            🏢 Schools
          </button>
        ) : (
          <button
            className={`nav-btn ${activeTab === 'school' ? 'active' : ''}`}
            onClick={() => setActiveTab('school')}
          >
            🏫 My School
          </button>
        )}
      </nav>

      <main className="dashboard-main">
        {activeTab === 'overview' && (
          <div className="tab-content">
            <DashboardSummary />
            <div className="overview-card-grid">
              <div className="overview-card">
                <h3>Quick access</h3>
                <p>Jump directly into student, staff, and class management.</p>
                <div className="overview-actions">
                  <button className="btn-secondary" onClick={() => setActiveTab('students')}>Students</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('staff')}>Staff</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('classes')}>Classes</button>
                </div>
              </div>
              <div className="overview-card">
                <h3>Classes overview</h3>
                <p>Classes are the next module to expand. This space will eventually contain class lists, levels, streams, and academic planning.</p>
              </div>
              {user?.role === 'school_admin' && (
                <div className="overview-card">
                  <h3>School Admin Dashboard</h3>
                  <p>You can manage your school's students, staff, and classes from this portal.</p>
                  <div className="overview-actions">
                    <button className="btn-secondary" onClick={() => setActiveTab('school')}>School profile</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="tab-content">
            {showStudentForm && (
              <StudentForm 
                student={editingStudent}
                onSubmit={handleStudentFormSubmit}
                onCancel={handleStudentFormCancel}
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
              refreshTrigger={studentRefreshTrigger}
            />
          </div>
        )}

        {activeTab === 'staff' && <StaffPage />}

        {activeTab === 'classes' && <ClassPage />}

        {activeTab === 'schools' && user?.role === 'super_admin' && <SuperAdminSchools />}

        {activeTab === 'school' && user?.role !== 'super_admin' && <SchoolProfile />}
      </main>
    </div>
  );
}

export default DashboardPage;
