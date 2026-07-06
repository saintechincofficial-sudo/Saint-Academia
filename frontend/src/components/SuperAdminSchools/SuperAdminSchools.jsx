import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api','') || 'http://localhost/SaintAcademia';

const VIEWS = [
  { key:'schools', label:'All Schools' },
  { key:'create',  label:'+ New School' },
  { key:'billing', label:'📊 Billing Overview' },
];

function StatPill({ label, value, color }) {
  return (
    <div style={{ textAlign:'center', minWidth:60 }}>
      <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:10, color:'#888', marginTop:2, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
    </div>
  );
}

export default function SuperAdminSchools() {
  const { get, post, apiCall } = useApi();
  const [schools,  setSchools]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState('schools');
  const [search,   setSearch]   = useState('');
  const [message,  setMessage]  = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [toggling, setToggling] = useState(null);

  const [form, setForm] = useState({
    name:'', name_fr:'', address:'', phone:'', email:'',
    admin_email:'', admin_password:'', region:'', motto:'',
  });

  const REGIONS = ['Adamawa','Centre','East','Far North','Littoral','North','North West','South','South West','West'];

  const loadSchools = async () => {
    setLoading(true);
    const res = await get('/schools');
    if (res.success) setSchools(res.schools || []);
    setLoading(false);
  };

  useEffect(() => { loadSchools(); }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    const res = await post('/schools', form);
    setSaving(false);
    if (res.success) {
      setMessage('School created successfully.');
      setForm({ name:'', name_fr:'', address:'', phone:'', email:'', admin_email:'', admin_password:'', region:'', motto:'' });
      setView('schools');
      loadSchools();
    } else setError(res.message);
  };

  const handleToggle = async (school) => {
    if (!window.confirm(`${school.is_active ? 'Deactivate' : 'Activate'} ${school.name}?`)) return;
    setToggling(school.id);
    const res = await apiCall(`/schools/toggle?id=${school.id}`, { method:'POST' });
    if (res.success) {
      setSchools(p => p.map(s => s.id === school.id ? { ...s, is_active: res.is_active } : s));
    } else setError(res.message);
    setToggling(null);
  };

  const filtered = schools.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.region||'').toLowerCase().includes(search.toLowerCase())
  );

  const totalStudents = schools.reduce((n, s) => n + (parseInt(s.student_count)||0), 0);
  const totalStaff    = schools.reduce((n, s) => n + (parseInt(s.staff_count)||0), 0);
  const activeSchools = schools.filter(s => s.is_active).length;

  return (
    <div className="tab-content">
      {/* Header */}
      <div className="section-header">
        <h2>Super Admin — Schools</h2>
        <div style={{ display:'flex', gap:8 }}>
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => { setView(v.key); setMessage(''); setError(''); }}
              className={view === v.key ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize:13 }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {/* ── SCHOOLS LIST ── */}
      {view === 'schools' && (
        <>
          {/* Global stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
            {[
              { label:'Total Schools', value:schools.length,  color:'#1E88C7' },
              { label:'Active',        value:activeSchools,   color:'#2E9E4E' },
              { label:'Students',      value:totalStudents,   color:'#B8730A' },
              { label:'Staff',         value:totalStaff,      color:'#8E44AD' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', border:'1px solid #e5e9f0', borderRadius:10, padding:'14px 18px', textAlign:'center', borderTop:`3px solid ${s.color}` }}>
                <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:'#888', textTransform:'uppercase', letterSpacing:'0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <input type="text" placeholder="Search schools…" value={search}
            onChange={e => setSearch(e.target.value)} className="search-input"
            style={{ marginBottom:16, maxWidth:320 }} />

          {loading ? <p className="loading-text">Loading schools…</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {filtered.map(school => (
                <div key={school.id} style={{
                  background:'#fff', border:'1px solid #e5e9f0', borderRadius:12,
                  padding:18, display:'flex', alignItems:'center', gap:16,
                  opacity: school.is_active ? 1 : 0.65,
                  boxShadow:'0 1px 4px rgba(0,0,0,0.06)'
                }}>
                  {/* Logo */}
                  <div style={{ width:52, height:52, borderRadius:10, background:'#EBF1F8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                    {school.logo_path
                      ? <img src={API_BASE + school.logo_path} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                      : <span style={{ fontSize:22 }}>🏫</span>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <strong style={{ fontSize:15, color:'#1B2A4A' }}>{school.name}</strong>
                      <span style={{
                        padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700,
                        background: school.is_active ? '#edfaf1' : '#fef0ee',
                        color: school.is_active ? '#1e8449' : '#c0392b'
                      }}>
                        {school.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {school.name_fr && <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{school.name_fr}</div>}
                    {school.region   && <div style={{ fontSize:12, color:'#7a8fae' }}>{school.region}</div>}
                  </div>

                  {/* Stats */}
                  <div style={{ display:'flex', gap:20, padding:'0 16px', borderLeft:'1px solid #e5e9f0', borderRight:'1px solid #e5e9f0' }}>
                    <StatPill label="Students" value={school.student_count||0} color="#1E88C7" />
                    <StatPill label="Staff"    value={school.staff_count||0}   color="#2E9E4E" />
                    <StatPill label="Classes"  value={school.class_count||0}   color="#B8730A" />
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:100 }}>
                    <button onClick={() => handleToggle(school)}
                      disabled={toggling === school.id}
                      style={{
                        padding:'6px 12px', border:'none', borderRadius:6, cursor:'pointer',
                        fontSize:12, fontWeight:600, fontFamily:'inherit',
                        background: school.is_active ? '#fef0ee' : '#edfaf1',
                        color: school.is_active ? '#c0392b' : '#1e8449'
                      }}>
                      {toggling === school.id ? '…' : school.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p className="empty-text">No schools found.</p>}
            </div>
          )}
        </>
      )}

      {/* ── CREATE SCHOOL ── */}
      {view === 'create' && (
        <div style={{ maxWidth:700 }}>
          <p style={{ fontSize:14, color:'#7a8fae', marginBottom:20 }}>
            Creates a new school and its administrator account in one step.
          </p>
          <form onSubmit={handleCreate}>
            <div style={{ background:'#f7f9fc', border:'1px solid #e5e9f0', borderRadius:10, padding:20, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1B2A4A', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>School Information</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label>School Name (English) *</label>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label>School Name (French)</label>
                  <input value={form.name_fr} onChange={e=>setForm(p=>({...p,name_fr:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Region</label>
                  <select value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value}))} className="select-input">
                    <option value="">— Select —</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label>Motto</label>
                  <input value={form.motto} onChange={e=>setForm(p=>({...p,motto:e.target.value}))} />
                </div>
              </div>
            </div>

            <div style={{ background:'#f7f9fc', border:'1px solid #e5e9f0', borderRadius:10, padding:20, marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#1B2A4A', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>Admin Account</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label>Admin Email *</label>
                  <input type="email" value={form.admin_email} onChange={e=>setForm(p=>({...p,admin_email:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label>Admin Password *</label>
                  <input type="text" value={form.admin_password} onChange={e=>setForm(p=>({...p,admin_password:e.target.value}))} required placeholder="Visible password for handover" />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setView('schools')}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating…' : '🏫 Create School'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BILLING ── */}
      {view === 'billing' && (
        <div>
          <div style={{ background:'#1B2A4A', color:'#fff', borderRadius:10, padding:18, marginBottom:20, display:'flex', gap:32 }}>
            <div><div style={{ fontSize:28, fontWeight:800 }}>{schools.length}</div><div style={{ fontSize:12, color:'#8fa8c8' }}>TOTAL SCHOOLS</div></div>
            <div><div style={{ fontSize:28, fontWeight:800 }}>{activeSchools}</div><div style={{ fontSize:12, color:'#8fa8c8' }}>ACTIVE</div></div>
            <div><div style={{ fontSize:28, fontWeight:800 }}>{totalStudents}</div><div style={{ fontSize:12, color:'#8fa8c8' }}>TOTAL STUDENTS</div></div>
            <div><div style={{ fontSize:28, fontWeight:800 }}>{totalStaff}</div><div style={{ fontSize:12, color:'#8fa8c8' }}>TOTAL STAFF</div></div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>School</th>
                <th>Region</th>
                <th>Students</th>
                <th>Staff</th>
                <th>Classes</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s, i) => (
                <tr key={s.id}>
                  <td>{i+1}</td>
                  <td>
                    <strong>{s.name}</strong>
                    {s.name_fr && <div style={{ fontSize:11, color:'#888' }}>{s.name_fr}</div>}
                  </td>
                  <td>{s.region || '—'}</td>
                  <td style={{ fontWeight:700, color:'#1E88C7' }}>{s.student_count||0}</td>
                  <td style={{ fontWeight:700, color:'#2E9E4E' }}>{s.staff_count||0}</td>
                  <td>{s.class_count||0}</td>
                  <td>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600,
                      background: s.is_active ? '#edfaf1' : '#fef0ee',
                      color: s.is_active ? '#1e8449' : '#c0392b' }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'#888' }}>{s.created_at?.slice(0,10) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
