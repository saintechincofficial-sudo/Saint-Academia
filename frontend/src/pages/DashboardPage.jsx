import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Users, UserCheck, School, BookOpen,
  ClipboardList, PenLine, BarChart3, GraduationCap,
  FileText, List, Calendar, Building2, ChevronLeft, ChevronRight, Settings
} from 'lucide-react';
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
import IDCardPage from './IDCardPage';
import './DashboardPage.css';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id:'overview',    label:'Dashboard',    Icon:LayoutDashboard, roles:['super_admin','school_admin','principal','vice_principal','dean','discipline_master','hod','class_master','teacher'] },
    ]
  },
  {
    label: 'People',
    items: [
      { id:'students',    label:'Students',     Icon:Users,           roles:['super_admin','school_admin','principal','vice_principal','dean','discipline_master','hod','class_master'] },
      { id:'staff',       label:'Staff',        Icon:UserCheck,       roles:['super_admin','school_admin','principal'] },
    ]
  },
  {
    label: 'Academic',
    items: [
      { id:'classes',     label:'Classes',      Icon:School,          roles:['super_admin','school_admin','principal','vice_principal','dean','discipline_master','hod','class_master'] },
      { id:'subjects',    label:'Subjects',     Icon:BookOpen,        roles:['super_admin','school_admin','principal'] },
      { id:'enrollment',  label:'Enrollment',   Icon:ClipboardList,   roles:['super_admin','school_admin'] },
      { id:'results',     label:'Results',      Icon:PenLine,         roles:['super_admin','school_admin','principal','vice_principal','dean','hod','class_master','teacher'] },
      { id:'workload',    label:'Workload',     Icon:Calendar,        roles:['super_admin','school_admin','principal','vice_principal','dean','discipline_master','hod','class_master'] },
    ]
  },
  {
    label: 'Reports',
    items: [
      { id:'mastersheet', label:'Mastersheet',  Icon:BarChart3,       roles:['super_admin','school_admin','principal'] },
      { id:'reportcard',  label:'Report Cards', Icon:FileText,        roles:['super_admin','school_admin','principal'] },
      { id:'classlist',   label:'Class List',   Icon:List,            roles:['super_admin','school_admin','principal','vice_principal','dean','discipline_master','hod','class_master'] },
      { id:'promotion',   label:'Promotion',    Icon:GraduationCap,   roles:['super_admin','school_admin'] },
      { id:'idcards',     label:'ID Cards',     Icon:Users,           roles:['school_admin','principal'] },
    ]
  },
  {
    label: 'Admin',
    items: [
      { id:'school',      label:'My School',    Icon:Settings,        roles:['super_admin','school_admin'] },
      { id:'schools',     label:'Schools',      Icon:Building2,       roles:['super_admin'] },
    ]
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [activeTab,    setActiveTab]    = useState('overview');
  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [contextSchoolId, setContextSchoolId] = useState(null);
  const [contextSchool,   setContextSchool]   = useState(null);
  const [showStudentForm,  setShowStudentForm]  = useState(false);
  const [editingStudent,   setEditingStudent]   = useState(null);
  const [studentRefresh,   setStudentRefresh]   = useState(0);

  const handleLogout        = () => { logout(); window.location.href = '/'; };
  const handleAddStudent    = () => { setEditingStudent(null); setShowStudentForm(true); };
  const handleEditStudent   = s  => { setEditingStudent(s);   setShowStudentForm(true); };
  const handleStudentSubmit = () => { setShowStudentForm(false); setEditingStudent(null); setStudentRefresh(p=>p+1); };
  const handleStudentCancel = () => { setShowStudentForm(false); setEditingStudent(null); };

  const allItems = NAV_GROUPS.flatMap(g => g.items);
  // user.roles is array e.g. ['teacher','principal'], user.role is primary (backward compat)
  const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const hasRole   = (required) => required.some(r => userRoles.includes(r));

  const isSuperAdmin = userRoles.includes('super_admin') && !contextSchoolId;

  const visibleGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => {
      // Super admin without school context only sees Schools tab
      if (isSuperAdmin) return i.id === 'schools' || i.id === 'idcards';
      return hasRole(i.roles);
    })
  })).filter(g => g.items.length > 0);

  const activeItem = allItems.find(i => i.id === activeTab);
  const ActiveIcon = activeItem?.Icon;

  return (
    <div className="app-shell">

      {/* Header */}
      <header className="app-header">
        <div className="app-header-left">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(p => !p)}>
            {sidebarOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
          </button>
          <div className="app-logo">
            <GraduationCap size={22} color="#7ec8f0" />
            <span className="app-logo-text">Saint Academia</span>
          </div>
        </div>
        <div className="app-header-right">
          <span className="header-user">{user?.email}</span>
          <span className="header-role-badge">{user?.role}</span>
          <button onClick={handleLogout} className="header-logout-btn">Logout</button>
        </div>
      </header>

      {contextSchool && (
        <div style={{ background:'#B8730A', color:'#fff', padding:'8px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
          <span>Viewing school: <strong>{contextSchool.name}</strong></span>
          <button onClick={() => { setContextSchoolId(null); setContextSchool(null); setActiveTab('schools'); }}
            style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', padding:'4px 12px', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>
            Exit School View
          </button>
        </div>
      )}
      <div className="app-body">

        {/* Sidebar */}
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          {visibleGroups.map(group => (
            <div key={group.label} className="nav-group">
              {sidebarOpen && <div className="nav-group-label">{group.label}</div>}
              {group.items.map(({ id, label, Icon }) => (
                <button key={id}
                  className={`nav-item ${activeTab === id ? 'active' : ''}`}
                  onClick={() => setActiveTab(id)}
                  title={!sidebarOpen ? label : undefined}>
                  <span className="nav-icon"><Icon size={17} strokeWidth={1.8}/></span>
                  {sidebarOpen && <span className="nav-label">{label}</span>}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="app-main">
          <div className="page-header">
            {ActiveIcon && <ActiveIcon size={20} color="#1B2A4A" strokeWidth={2}/>}
            <h1 className="page-title">{activeItem?.label || 'Dashboard'}</h1>
          </div>

          <div className="page-content">

            {activeTab === 'overview' && (
              <>
                <DashboardSummary />
                <div className="overview-card-grid">
                  <div className="overview-card">
                    <h3>Setup order</h3>
                    <ol style={{ paddingLeft:18, fontSize:13.5, lineHeight:2, color:'#4a5568' }}>
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
                        if (!item) return null;
                        const Ic = item.Icon;
                        return (
                          <button key={id} className="btn-secondary"
                            onClick={() => setActiveTab(id)}
                            style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <Ic size={14} strokeWidth={2}/> {item.label}
                          </button>
                        );
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
            {activeTab === 'idcards'     && <IDCardPage />}
            {activeTab === 'school'  && user?.role !== 'super_admin' && <SchoolProfile />}
            {activeTab === 'schools' && user?.role === 'super_admin' && !contextSchoolId && (
              <SuperAdminSchools
                onEnterSchool={(school) => {
                  setContextSchoolId(school.id);
                  setContextSchool(school);
                  setActiveTab('overview');
                }}
              />
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
