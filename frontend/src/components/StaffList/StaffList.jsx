import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './StaffList.css';

const ROLES = [
  { key:'teacher',          label:'Teacher' },
  { key:'class_master',     label:'Class Master' },
  { key:'hod',              label:'Head of Department' },
  { key:'discipline_master',label:'Discipline Master' },
  { key:'dean',             label:'Dean of Studies' },
  { key:'vice_principal',   label:'Vice Principal' },
  { key:'principal',        label:'Principal' },
];

function StaffList({ onEdit, refreshTrigger }) {
  const { get, del, apiCall } = useApi();

  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [deleting,    setDeleting]    = useState(null);

  // Login panel state
  const [loginPanel,  setLoginPanel]  = useState(null);
  const [loginInfo,   setLoginInfo]   = useState(null);
  const [loginRoles,  setLoginRoles]  = useState(['teacher']);
  const [loginPass,   setLoginPass]   = useState('');
  const [loginSaving, setLoginSaving] = useState(false);
  const [loginMsg,    setLoginMsg]    = useState('');
  const [loginErr,    setLoginErr]    = useState('');

  const loadStaff = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (search) params.append('search', search);
    const res = await get('/staff?' + params);
    if (res.success) {
      setStaff(res.staff || []);
      setTotalPages(res.pagination?.total_pages || 1);
    } else setError(res.message);
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, [page, refreshTrigger, search]);
  useEffect(() => { setPage(1); }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    setDeleting(id);
    const res = await del('/staff/' + id);
    if (res.success) setStaff(p => p.filter(s => s.id !== id));
    else setError(res.message);
    setDeleting(null);
  };

  const openLogin = async (member) => {
    setLoginPanel(member); setLoginMsg(''); setLoginErr('');
    setLoginPass(''); setLoginRoles(['teacher']); setLoginInfo(null);
    const res = await apiCall('/staff/login?staff_id=' + member.id);
    if (res.success && res.login) {
      setLoginInfo(res.login);
      try {
        const r = JSON.parse(res.login.role);
        setLoginRoles(Array.isArray(r) ? r : [r]);
      } catch { setLoginRoles([res.login.role]); }
    }
  };

  const saveLogin = async () => {
    if (!loginPass && !loginInfo) { setLoginErr('Password is required'); return; }
    setLoginSaving(true); setLoginMsg(''); setLoginErr('');
    const body = { staff_id: loginPanel.id, roles: loginRoles };
    if (loginPass) body.password = loginPass;
    else body.password = loginInfo ? '_keep_' : '';
    const res = await apiCall('/staff/login', { method:'POST', body: JSON.stringify(body) });
    setLoginSaving(false);
    if (res.success) {
      const msg = 'Saved! Username: ' + (loginPanel.staff_number) + (loginPass ? ' | Password: ' + loginPass : '');
      setLoginMsg(msg); setLoginPass('');
      setLoginInfo(p => ({ ...p, role: JSON.stringify(loginRoles) }));
    } else setLoginErr(res.message);
  };

  const toggleRole = (role, checked) => {
    setLoginRoles(p => checked ? [...p, role] : p.filter(r => r !== role));
  };

  return (
    <div className="staff-list-container">
      <div className="list-header">
        <input type="text" className="search-input" placeholder="Search by name, number or role…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && <p style={{ color:'#888', fontStyle:'italic', padding:'16px 0' }}>Loading…</p>}

      <div className="table-wrapper">
        <table className="staff-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Staff No.</th>
              <th>Name</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && !loading ? (
              <tr><td colSpan="8" className="empty-state">No staff found.</td></tr>
            ) : staff.map((member, i) => (
              <tr key={member.id}>
                <td>{(page-1)*25 + i + 1}</td>
                <td style={{ fontFamily:'monospace', fontSize:12 }}>{member.staff_number}</td>
                <td><strong>{member.last_name}</strong> {member.first_name}</td>
                <td>
                  {member.role
                    ? <span className="role-badge">{member.role.split(' - ')[0]}</span>
                    : '—'}
                </td>
                <td>{member.phone || '—'}</td>
                <td><span className={'status-badge ' + (member.status || 'active')}>{member.status || 'active'}</span></td>
                <td>
                  <button style={{
                    padding:'4px 10px', fontSize:12, fontWeight:600, cursor:'pointer',
                    background:'#edfaf1', color:'#1e8449', border:'1px solid #a9dfbf',
                    borderRadius:6, transition:'all 0.12s'
                  }} onClick={() => openLogin(member)}>
                    Manage
                  </button>
                </td>
                <td className="actions">
                  <button className="btn-edit" onClick={() => onEdit(member)}>Edit</button>
                  <button className="btn-delete" disabled={deleting === member.id}
                    onClick={() => handleDelete(member.id)}>
                    {deleting === member.id ? '…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => p-1)} disabled={page===1}>← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page===totalPages}>Next →</button>
        </div>
      )}

      {/* Login management slide-over */}
      {loginPanel && (
        <div style={{
          position:'fixed', top:0, right:0, bottom:0, width:380,
          background:'#fff', boxShadow:'-4px 0 24px rgba(0,0,0,0.18)',
          zIndex:500, display:'flex', flexDirection:'column',
          fontFamily:'inherit'
        }}>
          {/* Header */}
          <div style={{ background:'#1B2A4A', color:'#fff', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>{loginPanel.last_name} {loginPanel.first_name}</div>
              <div style={{ fontSize:12, color:'#8fa8c8', marginTop:2 }}>{loginPanel.staff_number} — {loginPanel.role?.split(' - ')[0] || 'Staff'}</div>
            </div>
            <button onClick={() => setLoginPanel(null)}
              style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
          </div>

          {/* Body */}
          <div style={{ flex:1, overflowY:'auto', padding:20 }}>
            {/* Status */}
            {loginInfo
              ? <div style={{ background:'#edfaf1', border:'1px solid #a9dfbf', borderRadius:8, padding:12, marginBottom:18, fontSize:13 }}>
                  <strong style={{ color:'#1e8449' }}>✓ Login account exists</strong><br/>
                  <span style={{ color:'#555' }}>Username: </span><strong>{loginPanel.staff_number}</strong><br/>
                  <span style={{ color:'#555' }}>Status: </span>
                  <span style={{ color: loginInfo.is_active ? '#1e8449' : '#c0392b', fontWeight:600 }}>
                    {loginInfo.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              : <div style={{ background:'#fffbf0', border:'1px solid #f0c060', borderRadius:8, padding:12, marginBottom:18, fontSize:13, color:'#7d6608' }}>
                  No login account yet. Create one below.
                </div>
            }

            {/* Password */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#4a5568', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>
                {loginInfo ? 'New Password (leave blank to keep)' : 'Password *'}
              </label>
              <input type="text" value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                placeholder={loginInfo ? 'Leave blank to keep current…' : 'Set a password…'}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #d0d8e4', borderRadius:7, fontSize:14, boxSizing:'border-box', fontFamily:'inherit' }} />
              <p style={{ fontSize:11, color:'#888', margin:'5px 0 0' }}>
                Username = <strong>{loginPanel.staff_number}</strong>
              </p>
            </div>

            {/* Roles */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#4a5568', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
                Roles (select all that apply)
              </label>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {ROLES.map(({ key, label }) => (
                  <label key={key} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13.5, cursor:'pointer', padding:'6px 10px', borderRadius:6, background: loginRoles.includes(key) ? '#EBF5FB' : '#f7f9fc', border:'1px solid ' + (loginRoles.includes(key) ? '#bde0f7' : '#e5e9f0') }}>
                    <input type="checkbox" checked={loginRoles.includes(key)}
                      onChange={e => toggleRole(key, e.target.checked)}
                      style={{ width:16, height:16 }} />
                    <span style={{ fontWeight: loginRoles.includes(key) ? 600 : 400, color: loginRoles.includes(key) ? '#1E88C7' : '#333' }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {loginMsg && <div style={{ background:'#edfaf1', color:'#1e8449', padding:'10px 14px', borderRadius:7, fontSize:13, marginBottom:12, wordBreak:'break-all', lineHeight:1.6 }}>{loginMsg}</div>}
            {loginErr && <div style={{ background:'#fef0ee', color:'#c0392b', padding:'10px 14px', borderRadius:7, fontSize:13, marginBottom:12 }}>{loginErr}</div>}
          </div>

          {/* Footer */}
          <div style={{ padding:'14px 20px', borderTop:'1px solid #e5e9f0' }}>
            <button onClick={saveLogin} disabled={loginSaving || loginRoles.length === 0}
              style={{ width:'100%', padding:12, background:'#1B2A4A', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
              {loginSaving ? 'Saving…' : loginInfo ? '↻ Update Login' : '+ Create Login'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffList;
