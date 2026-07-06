import { useState } from 'react';
import './DashboardPage.css';
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
import WorkloadPage from './WorkloadPage';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Dashboard', icon: '🏠', roles: ['super_admin','school_admin'] },
    ]
  },
  {
    label: 'People',
    items: [
      { id: 'students',   label: 'Students',   icon: '👥', roles: ['super_admin','school_admin'] },
      { id: 'staff',      label: 'Staff',       icon: '👨‍🏫', roles: ['super_admin','school_admin'] },
    ]
  },
  {
    label: 'Academic',
    items: [
      { id: 'classes',    label: 'Classes',     icon: '🏫', roles: ['super_admin','school_admin'] },
      { id: 'subjects',   label: 'Subjects',    icon: '📚', roles: ['school_admin'] },
      { id: 'enrollment', label: 'Enrollment',  icon: '📋', roles: ['school_admin'] },
      { id: 'results',    label: 'Results',     icon: '✏️',  roles: ['school_admin'] },
      { id: 'workload',   label: 'Workload',    icon: '📅', roles: ['school_admin'] },
    ]
  },
  {
    label: 'Reports',
    items: [
      { id: 'mastersheet', label: 'Mastersheet', icon: '📊', roles: ['school_admin'] },
      { id: 'reportcard',  label: 'Report Cards',icon: '📄', roles: ['school_admin'] },
      { id: 'classlist',   label: 'Class List',  icon: '🗒️', roles: ['school_admin'] },
      { id: 'promotion',   label: 'Promotion',   icon: '🎓', roles: ['school_admin'] },
    ]
  },
  {
    label: 'Admin',
    items: [
      { id: 'school',  label: 'My School',  icon: '🏫', roles: ['school_admin'] },
      { id: 'schools', label: 'Schools',    icon: '🏢', roles: ['super_admin'] },
    ]
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab]               = useState('overview');
  const [sidebarOpen, setSidebarOpen]           = useState(true);
  const [showStudentForm, setShowStudentForm]   = useState(false);
  const [editingStudent, setEditingStudent]     = useState(null);
  const [studentRefresh, setStudentRefresh]     = useState(0);

  const handleLogout = () => { logout(); window.location.href = '/'; };

  const handleAddStudent    = () => { setEditingStudent(null); setShowStudentForm(true); };
  const handleEditStudent   = s  => { setEditingStudent(s);    setShowStudentForm(true); };
  const handleStudentSubmit = () => { setShowStudentForm(false); setEditingStudent(null); setStudentRefresh(p=>p+1); };
  const handleStudentCancel = () => { setShowStudentForm(false); setEditingStudent(null); };

  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => i.roles.includes(user?.role))
  })).filter(g => g.items.length > 0);

  const activeItem = allItems.find(i => i.id === activeTab);

  return (
    <div className="app-shell">

      {/* ── Top header ── */}
      <header className="app-header">
        <div className="app-header-left">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(p => !p)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div className="app-logo">
            <span className="app-logo-icon">🎓</span>
            <span className="app-logo-text">Saint Academia</span>
          </div>
        </div>
        <div className="app-header-right">
          <span className="header-user">{user?.email}</span>
          <span className="header-role-badge">{user?.role}</span>
          <button onClick={handleLogout} className="header-logout-btn">Logout</button>
        </div>
      </header>

      <div className="app-body">

        {/* ── Sidebar ── */}
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          {visibleGroups.map(group => (
            <div key={group.label} className="nav-group">
              {sidebarOpen && <div className="nav-group-label">{group.label}</div>}
              {group.items.map(item => (
                <button key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}>
                  <span className="nav-icon">{item.icon}</span>
                  {sidebarOpen && <span className="nav-label">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main className="app-main">
          <div className="page-header">
            <h1 className="page-title">
              {activeItem?.icon} {activeItem?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="page-content">

            {activeTab === 'overview' && (
              <>
                <DashboardSummary />
                <div className="overview-card-grid">
                  <div className="overview-card">
                    <h3>Setup order</h3>
                    <ol style={{ paddingLeft:18, fontSize:13, lineHeight:2 }}>
                      <li>Add <strong>Subjects</strong> with coefficients</li>
                      <li>Create <strong>Classes</strong></li>
                      <li>Add <strong>Students</strong></li>
                      <li><strong>Enroll</strong> students into classes</li>
                      <li>Enter marks via <strong>Results</strong></li>
                      <li>Generate the <strong>Mastersheet</strong></li>
                    </ol>
                  </div>
                  <div className="overview-card">
                    <h3>Quick access</h3>
                    <div className="overview-actions">
                      {['students','staff','classes','subjects','enrollment','results','mastersheet'].map(id => {
                        const item = allItems.find(i => i.id === id);
                        return item ? (
                          <button key={id} className="btn-secondary"
                            onClick={() => setActiveTab(id)}>
                            {item.icon} {item.label}
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'students' && (
              <div className="tab-content">
                {showStudentForm && (
                  <StudentForm student={editingStudent} onSubmit={handleStudentSubmit} onCancel={handleStudentCancel} />
                )}
                <div className="section-header">
                  <h2>Student Management</h2>
                  <button className="btn-primary" onClick={handleAddStudent}>+ Add Student</button>
                </div>
                <StudentList onEdit={handleEditStudent} refreshTrigger={studentRefresh} />
              </div>
            )}

            {activeTab === 'staff'       && <StaffPage />}
            {activeTab === 'classes'     && <ClassPage />}
            {activeTab === 'subjects'    && <SubjectsPage />}
            {activeTab === 'enrollment'  && <EnrollmentPage />}
            {activeTab === 'results'     && <ResultsPage />}
            {activeTab === 'workload'    && <WorkloadPage />}
            {activeTab === 'mastersheet' && <MastersheetPage />}
            {activeTab === 'reportcard'  && <ReportCardPage />}
            {activeTab === 'classlist'   && <ClassListPage />}
            {activeTab === 'promotion'   && <PromotionPage />}
            {activeTab === 'school'  && user?.role !== 'super_admin' && <SchoolProfile />}
            {activeTab === 'schools' && user?.role === 'super_admin'  && <SuperAdminSchools />}

          </div>
        </main>
      </div>
    </div>
  );
}
