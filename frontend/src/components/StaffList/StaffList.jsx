import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './StaffList.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api','') || 'http://localhost/SaintAcademia';

const ROLES = [
  { key:'teacher',           label:'Teacher' },
  { key:'class_master',      label:'Class Master' },
  { key:'hod',               label:'Head of Department' },
  { key:'discipline_master', label:'Discipline Master' },
  { key:'dean',              label:'Dean of Studies' },
  { key:'vice_principal',    label:'Vice Principal' },
  { key:'principal',         label:'Principal' },
];

const ROLE_COLORS = {
  principal:         { bg:'#fde8e8', color:'#c0392b' },
  vice_principal:    { bg:'#fde8e8', color:'#c0392b' },
  dean:              { bg:'#fdf0e6', color:'#B8730A' },
  discipline_master: { bg:'#fdf0e6', color:'#B8730A' },
  hod:               { bg:'#EBF5FB', color:'#1E88C7' },
  class_master:      { bg:'#EBF5FB', color:'#1E88C7' },
  teacher:           { bg:'#edfaf1', color:'#1e8449' },
};

function Avatar({ staff }) {
  const src = staff.photo_path ? API_BASE + staff.photo_path : null;
  const initials = ((staff.first_name?.[0]||'') + (staff.last_name?.[0]||'')).toUpperCase();
  const colors = ['#1E88C7','#2E9E4E','#B8730A','#8E44AD','#1B2A4A'];
  const color  = colors[(staff.id || 0) % colors.length];
  return src
    ? <img src={src} alt={initials} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', border:'2px solid #e5e9f0' }} />
    : <div style={{ width:40, height:40, borderRadius:'50%', background:color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>{initials}</div>;
}

function RoleBadge({ role }) {
  if (!role) return null;
  const raw     = role.split(' - ')[0].toLowerCase().trim();
  const matched = Object.keys(ROLE_COLORS).find(k => raw.includes(k.replace('_',' ')));
  const style   = ROLE_COLORS[matched] || { bg:'#f0f2f5', color:'#555' };
  const label   = role.split(' - ')[0];
  return (
    <span style={{ background:style.bg, color:style.color, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
      {label}
    </span>
  );
}

function StaffList({ onEdit, refreshTrigger }) {
  const { get, del, apiCall } = useApi();

  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalItems,  setTotalItems]  = useState(0);
  const [deleting,    setDeleting]    = useState(null);
  const [viewMode,    setViewMode]    = useState('table'); // 'table' | 'grid'

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
      setTotalItems(res.pagination?.total_items || 0);
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
    const body = { staff_id: loginPanel.id, roles: loginRoles,
                   password: loginPass || '_keep_' };
    const res = await apiCall('/staff/login', { method:'POST', body: JSON.stringify(body) });
    setLoginSaving(false);
    if (res.success) {
      setLoginMsg('Saved! Username: ' + loginPanel.staff_number + (loginPass ? ' | Password: ' + loginPass : ' (password unchanged)'));
      setLoginPass('');
      setLoginInfo(p => ({ ...(p||{}), is_active:1, role: JSON.stringify(loginRoles) }));
    } else setLoginErr(res.message);
  };

  return (
    <div className="staff-list-container">

      {/* Search + view toggle */}
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
        <input type="text" className="search-input" style={{ flex:1, minWidth:220 }}
          placeholder="Search name, staff number or role…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ fontSize:13, color:'#7a8fae', whiteSpace:'nowrap' }}>
          {totalItems} member{totalItems !== 1 ? 's' : ''}
        </span>
        <div style={{ display:'flex', border:'1px solid #d0d8e4', borderRadius:7, overflow:'hidden' }}>
          {['table','grid'].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding:'7px 14px', border:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit',
              background: viewMode===m ? '#1B2A4A' : '#fff',
              color: viewMode===m ? '#fff' : '#555',
            }}>
              {m === 'table' ? '☰ Table' : '⊞ Grid'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && <p style={{ color:'#888', fontStyle:'italic', padding:'16px 0', textAlign:'center' }}>Loading staff…</p>}

      {/* TABLE VIEW */}
      {viewMode === 'table' && !loading && (
        <div className="table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ width:48 }}></th>
                <th>Name</th>
                <th>Staff No.</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th style={{ width:80 }}>Login</th>
                <th style={{ width:120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0
                ? <tr><td colSpan="8" className="empty-state">No staff found.</td></tr>
                : staff.map(member => (
                  <tr key={member.id}>
                    <td><Avatar staff={member} /></td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:14, color:'#1B2A4A' }}>{member.last_name} {member.first_name}</div>
                      {member.department && <div style={{ fontSize:11, color:'#888' }}>{member.department}</div>}
                    </td>
                    <td style={{ fontFamily:'monospace', fontSize:12, color:'#555' }}>{member.staff_number}</td>
                    <td><RoleBadge role={member.role} /></td>
                    <td style={{ fontSize:13 }}>{member.phone || '—'}</td>
                    <td><span className={'status-badge ' + (member.status||'active')}>{member.status||'active'}</span></td>
                    <td>
                      <button onClick={() => openLogin(member)} style={{
                        padding:'4px 10px', fontSize:11, fontWeight:600,
                        background:'#edfaf1', color:'#1e8449',
                        border:'1px solid #a9dfbf', borderRadius:6, cursor:'pointer'
                      }}>Login</button>
                    </td>
                    <td className="actions">
                      <button className="btn-edit" onClick={() => onEdit(member)}>Edit</button>
                      <button className="btn-delete" disabled={deleting===member.id}
                        onClick={() => handleDelete(member.id)}>
                        {deleting===member.id ? '…' : 'Del'}
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && !loading && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
          {staff.length === 0
            ? <p className="empty-state">No staff found.</p>
            : staff.map(member => (
              <div key={member.id} style={{
                background:'#fff', border:'1px solid #e5e9f0', borderRadius:12,
                padding:16, display:'flex', flexDirection:'column', alignItems:'center',
                gap:8, textAlign:'center', transition:'box-shadow 0.15s',
                boxShadow:'0 1px 4px rgba(0,0,0,0.06)'
              }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}>
                <Avatar staff={member} />
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'#1B2A4A' }}>{member.last_name}</div>
                  <div style={{ fontSize:13, color:'#555' }}>{member.first_name}</div>
                </div>
                <RoleBadge role={member.role} />
                <div style={{ fontSize:11, color:'#888', fontFamily:'monospace' }}>{member.staff_number}</div>
                {member.phone && <div style={{ fontSize:12, color:'#7a8fae' }}>{member.phone}</div>}
                <div style={{ display:'flex', gap:6, marginTop:4, width:'100%' }}>
                  <button className="btn-edit" style={{ flex:1, fontSize:12 }} onClick={() => onEdit(member)}>Edit</button>
                  <button onClick={() => openLogin(member)} style={{
                    flex:1, padding:'5px', fontSize:11, fontWeight:600,
                    background:'#edfaf1', color:'#1e8449',
                    border:'1px solid #a9dfbf', borderRadius:6, cursor:'pointer'
                  }}>Login</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p=>p-1)} disabled={page===1}>← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p=>p+1)} disabled={page===totalPages}>Next →</button>
        </div>
      )}

      {/* Login slide-over */}
      {loginPanel && (
        <div style={{
          position:'fixed', top:0, right:0, bottom:0, width:380,
          background:'#fff', boxShadow:'-4px 0 24px rgba(0,0,0,0.18)',
          zIndex:500, display:'flex', flexDirection:'column', fontFamily:'inherit'
        }}>
          <div style={{ background:'#1B2A4A', color:'#fff', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Avatar staff={loginPanel} />
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{loginPanel.last_name} {loginPanel.first_name}</div>
                <div style={{ fontSize:12, color:'#8fa8c8', marginTop:2 }}>{loginPanel.staff_number}</div>
              </div>
            </div>
            <button onClick={() => setLoginPanel(null)}
              style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer' }}>×</button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:20 }}>
            {loginInfo
              ? <div style={{ background:'#edfaf1', border:'1px solid #a9dfbf', borderRadius:8, padding:12, marginBottom:18, fontSize:13 }}>
                  <strong style={{ color:'#1e8449' }}>✓ Login account exists</strong><br/>
                  Username: <strong>{loginPanel.staff_number}</strong> &nbsp;
                  Status: <strong style={{ color: loginInfo.is_active ? '#1e8449' : '#c0392b' }}>
                    {loginInfo.is_active ? 'Active' : 'Inactive'}
                  </strong>
                </div>
              : <div style={{ background:'#fffbf0', border:'1px solid #f0c060', borderRadius:8, padding:12, marginBottom:18, fontSize:13, color:'#7d6608' }}>
                  No login account yet.
                </div>
            }

            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#4a5568', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>
                {loginInfo ? 'New Password (blank = keep)' : 'Password *'}
              </label>
              <input type="text" value={loginPass} onChange={e=>setLoginPass(e.target.value)}
                placeholder={loginInfo ? 'Leave blank to keep…' : 'Set password…'}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #d0d8e4', borderRadius:7, fontSize:14, boxSizing:'border-box', fontFamily:'inherit' }} />
              <p style={{ fontSize:11, color:'#888', margin:'5px 0 0' }}>Username = <strong>{loginPanel.staff_number}</strong></p>
            </div>

            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#4a5568', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Roles</label>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ROLES.map(({ key, label }) => {
                  const active = loginRoles.includes(key);
                  const s = ROLE_COLORS[key] || { bg:'#f0f2f5', color:'#555' };
                  return (
                    <label key={key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, cursor:'pointer', border:'1px solid ' + (active ? s.color+'44' : '#e5e9f0'), background: active ? s.bg : '#f7f9fc', transition:'all 0.12s' }}>
                      <input type="checkbox" checked={active}
                        onChange={e => setLoginRoles(p => e.target.checked ? [...p,key] : p.filter(r=>r!==key))}
                        style={{ width:15, height:15, accentColor: s.color }} />
                      <span style={{ fontWeight: active ? 700 : 400, color: active ? s.color : '#333', fontSize:13.5 }}>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {loginMsg && <div style={{ background:'#edfaf1', color:'#1e8449', padding:'10px 14px', borderRadius:7, fontSize:13, marginBottom:12, wordBreak:'break-all', lineHeight:1.7 }}>{loginMsg}</div>}
            {loginErr && <div style={{ background:'#fef0ee', color:'#c0392b', padding:'10px 14px', borderRadius:7, fontSize:13, marginBottom:12 }}>{loginErr}</div>}
          </div>

          <div style={{ padding:'14px 20px', borderTop:'1px solid #e5e9f0' }}>
            <button onClick={saveLogin} disabled={loginSaving || loginRoles.length===0}
              style={{ width:'100%', padding:12, background: loginRoles.length===0 ? '#ccc' : '#1B2A4A', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:14, cursor: loginRoles.length===0 ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              {loginSaving ? 'Saving…' : loginInfo ? '↻ Update Login' : '+ Create Login'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffList;
