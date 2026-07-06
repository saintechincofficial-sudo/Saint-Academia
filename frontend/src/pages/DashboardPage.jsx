import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import StudentList from '../components/StudentList/StudentList';
import StudentForm from '../components/StudentForm/StudentForm';
import StaffPage from './StaffPage';
import ClassPage from './ClassPage';
import DashboardSummary from '../components/DashboardSummary/DashboardSummary';
import SuperAdminSchools from '../components/SuperAdminSchools/SuperAdminSchools';
import SchoolProfile from '../components/SchoolProfile/SchoolProfile';
import SubjectsPage from './SubjectsPage';
import EnrollmentPage from './EnrollmentPage';
import ResultsPage from './ResultsPage';
import MastersheetPage from './MastersheetPage';
import PromotionPage from './PromotionPage';
import ClassListPage from './ClassListPage';
import ReportCardPage from './ReportCardPage';
import './DashboardPage.css';

function DashboardPage() {
  const { user, logout } = useAuth();
  const [showStudentForm, setShowStudentForm]             = useState(false);
  const [editingStudent, setEditingStudent]               = useState(null);
  const [studentRefreshTrigger, setStudentRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab]                         = useState('overview');

  const handleLogout = () => { logout(); window.location.href = '/'; };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setShowStudentForm(true);
  };
  const handleEditStudent = (s) => {
    setEditingStudent(s);
    setShowStudentForm(true);
  };
  const handleStudentSubmit = () => {
    setShowStudentForm(false);
    setEditingStudent(null);
    setStudentRefreshTrigger(p => p + 1);
  };
  const handleStudentCancel = () => {
    setShowStudentForm(false);
    setEditingStudent(null);
  };

  const allTabs = [
    { id: 'overview',    label: '🏠 Overview',    roles: ['super_admin','school_admin'] },
    { id: 'students',    label: '👥 Students',    roles: ['super_admin','school_admin'] },
    { id: 'staff',       label: '👨‍🏫 Staff',      roles: ['super_admin','school_admin'] },
    { id: 'classes',     label: '🏫 Classes',     roles: ['super_admin','school_admin'] },
    { id: 'subjects',    label: '📚 Subjects',    roles: ['school_admin'] },
    { id: 'enrollment',  label: '📋 Enrollment',  roles: ['school_admin'] },
    { id: 'results',     label: '✏️ Results',      roles: ['school_admin'] },
    { id: 'mastersheet', label: '📊 Mastersheet', roles: ['school_admin'] },
    { id: 'promotion',   label: '🎓 Promotion',   roles: ['school_admin'] },
    { id: 'classlist',   label: '📋 Class List',   roles: ['school_admin'] },
    { id: 'reportcard',  label: '📄 Report Cards',  roles: ['school_admin'] },
    { id: 'schools',     label: '🏢 Schools',     roles: ['super_admin'] },
    { id: 'school',      label: '🏫 My School',   roles: ['school_admin'] },
  ];

  const tabs = allTabs.filter(t => t.roles.includes(user?.role));

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Saint Academia</h1>
          <div className="user-info">
            <span>{user?.email}</span>
            <span className="role-badge">{user?.role}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        {tabs.map(t => (
          <button key={t.id}
            className={`nav-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="dashboard-main">

        {activeTab === 'overview' && (
          <div className="tab-content">
            <DashboardSummary />
            <div className="overview-card-grid">
              <div className="overview-card">
                <h3>Quick access</h3>
                <div className="overview-actions">
                  <button className="btn-secondary" onClick={() => setActiveTab('students')}>Students</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('staff')}>Staff</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('classes')}>Classes</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('subjects')}>Subjects</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('enrollment')}>Enrollment</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('results')}>Results</button>
                  <button className="btn-secondary" onClick={() => setActiveTab('mastersheet')}>Mastersheet</button>
                </div>
              </div>
              <div className="overview-card">
                <h3>Setup order</h3>
                <ol style={{ paddingLeft: 18, fontSize: 13, lineHeight: 2 }}>
                  <li>Add <strong>Subjects</strong> with coefficients</li>
                  <li>Create <strong>Classes</strong></li>
                  <li>Add <strong>Students</strong></li>
                  <li><strong>Enroll</strong> students into classes</li>
                  <li>Enter marks via <strong>Results</strong></li>
                  <li>Generate the <strong>Mastersheet</strong></li>
                </ol>
              </div>
              {user?.role === 'school_admin' && (
                <div className="overview-card">
                  <h3>My School</h3>
                  <div className="overview-actions">
                    <button className="btn-secondary" onClick={() => setActiveTab('school')}>
                      School Profile
                    </button>
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
                onSubmit={handleStudentSubmit}
                onCancel={handleStudentCancel}
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

        {activeTab === 'staff'       && <StaffPage />}
        {activeTab === 'classes'     && <ClassPage />}
        {activeTab === 'subjects'    && <SubjectsPage />}
        {activeTab === 'enrollment'  && <EnrollmentPage />}
        {activeTab === 'results'     && <ResultsPage />}
        {activeTab === 'mastersheet' && <MastersheetPage />}
        {activeTab === 'promotion'  && <PromotionPage />}
        {activeTab === 'classlist'  && <ClassListPage />}
        {activeTab === 'reportcard' && <ReportCardPage />}
        {activeTab === 'schools' && user?.role === 'super_admin' && <SuperAdminSchools />}
        {activeTab === 'school'  && user?.role !== 'super_admin' && <SchoolProfile />}

      </main>
    </div>
  );
}

export default DashboardPage;
