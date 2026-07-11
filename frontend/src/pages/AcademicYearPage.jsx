import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

export default function AcademicYearPage() {
  const { get, post, apiCall } = useApi();
  const { user } = useAuth();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const isSuperAdmin = userRoles.includes('super_admin');

  const [years,   setYears]   = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [adopting,setAdopting]= useState(false);
  const [message, setMessage] = useState('');
  const [error,   setError]   = useState('');
  const [showForm,setShowForm]= useState(false);
  const [showAdoptForm, setShowAdoptForm] = useState(false);
  const [form,    setForm]    = useState({
    label: '', start_date: '', end_date: '', is_current: 0, create_terms: true
  });
  const [adoptForm, setAdoptForm] = useState({
    catalog_year_id: '', start_date: '', end_date: '', is_current: 0
  });

  const load = async () => {
    setLoading(true);
    const res = await get('/academic-years');
    setLoading(false);
    if (res.success) setYears(res.years || []);
    else setError(res.message);
  };

  const loadCatalog = async () => {
    const res = await get('/academic-year-catalog');
    if (res.success) setCatalog(res.catalog || []);
  };

  useEffect(() => { load(); if (isSuperAdmin) loadCatalog(); }, []);

  // Auto-fill label from start date
  const handleStartDate = (val) => {
    const d = new Date(val);
    if (!isNaN(d)) {
      const yr = d.getFullYear();
      const label = `${yr}/${yr+1}`;
      const endDate = `${yr+1}-07-31`;
      setForm(p => ({ ...p, start_date: val, label, end_date: endDate }));
    } else {
      setForm(p => ({ ...p, start_date: val }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    const res = await post('/academic-years', form);
    setSaving(false);
    if (res.success) {
      setMessage(res.message + (form.create_terms ? ' with 3 terms.' : '.'));
      setShowForm(false);
      setForm({ label:'', start_date:'', end_date:'', is_current:0, create_terms:true });
      load();
    } else setError(res.message);
  };

  const handleCatalogSelect = (catalogId) => {
    const cy = catalog.find(c => String(c.id) === String(catalogId));
    setAdoptForm(p => ({
      ...p,
      catalog_year_id: catalogId,
      start_date: cy?.default_start_date?.slice(0,10) || '',
      end_date: cy?.default_end_date?.slice(0,10) || '',
    }));
  };

  const handleAdoptSubmit = async e => {
    e.preventDefault();
    setAdopting(true); setMessage(''); setError('');
    const res = await apiCall('/academic-year-adopt', { method: 'POST', body: JSON.stringify(adoptForm) });
    setAdopting(false);
    if (res.success) {
      setMessage(res.message + ` (${res.institution_type === 'higher_ed' ? 'semesters' : 'terms'} generated).`);
      setShowAdoptForm(false);
      setAdoptForm({ catalog_year_id:'', start_date:'', end_date:'', is_current:0 });
      load();
    } else setError(res.message);
  };

  const setCurrent = async (id) => {
    const res = await apiCall('/academic-years/set-current?id=' + id, { method:'GET' });
    if (res.success) { setMessage('Current year updated.'); load(); }
    else setError(res.message);
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>Academic Years</h2>
        <div style={{ display:'flex', gap:10 }}>
          {isSuperAdmin && (
            <button className="btn-secondary" onClick={() => { setShowAdoptForm(p=>!p); setShowForm(false); setMessage(''); setError(''); }}>
              {showAdoptForm ? 'Cancel' : '+ Adopt from Catalog'}
            </button>
          )}
          <button className="btn-primary" onClick={() => { setShowForm(p=>!p); setShowAdoptForm(false); setMessage(''); setError(''); }}>
            {showForm ? 'Cancel' : '+ New Academic Year'}
          </button>
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {showAdoptForm && (
        <div className="form-card">
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1B2A4A' }}>Adopt Year from Catalog</h3>
          <form onSubmit={handleAdoptSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Catalog Year *</label>
                <select value={adoptForm.catalog_year_id} onChange={e => handleCatalogSelect(e.target.value)} className="select-input" required>
                  <option value="">Select a year...</option>
                  {catalog.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Start Date *</label>
                <input type="date" value={adoptForm.start_date} onChange={e => setAdoptForm(p=>({...p,start_date:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input type="date" value={adoptForm.end_date} onChange={e => setAdoptForm(p=>({...p,end_date:e.target.value}))} required />
              </div>
            </div>
            <div style={{ margin:'12px 0 16px', fontSize:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={!!adoptForm.is_current}
                  onChange={e => setAdoptForm(p=>({...p,is_current:e.target.checked?1:0}))} />
                Set as current year
              </label>
              <p style={{ color:'#5a6b8c', fontSize:12, margin:'6px 0 0' }}>
                Terms or semesters will be generated automatically based on this school's institution type.
              </p>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAdoptForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={adopting}>{adopting ? 'Adopting...' : 'Adopt Year'}</button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="form-card">
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1B2A4A' }}>Create Academic Year</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input type="date" value={form.start_date} onChange={e => handleStartDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p=>({...p,end_date:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Label *</label>
                <input value={form.label} onChange={e => setForm(p=>({...p,label:e.target.value}))} placeholder="e.g. 2026/2027" required />
              </div>
            </div>
            <div style={{ display:'flex', gap:20, margin:'12px 0 16px', fontSize:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={!!form.is_current}
                  onChange={e => setForm(p=>({...p,is_current:e.target.checked?1:0}))} />
                Set as current year
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={!!form.create_terms}
                  onChange={e => setForm(p=>({...p,create_terms:e.target.checked}))} />
                Auto-create 3 terms (First, Second, Third)
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Year'}</button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="loading-text">Loading academic years...</p>}

      {years.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Terms</th>
              <th>Classes</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {years.map(y => (
              <tr key={y.id}>
                <td><strong>{y.label}</strong></td>
                <td>{y.start_date?.slice(0,10)}</td>
                <td>{y.end_date?.slice(0,10)}</td>
                <td style={{ textAlign:'center' }}>{y.term_count||0}</td>
                <td style={{ textAlign:'center' }}>{y.class_count||0}</td>
                <td>
                  {y.is_current
                    ? <span className="status-badge active">Current</span>
                    : <span className="status-badge inactive">Inactive</span>
                  }
                </td>
                <td>
                  {!y.is_current && (
                    <button className="btn-secondary" style={{ fontSize:12, padding:'5px 12px' }}
                      onClick={() => setCurrent(y.id)}>
                      Set Current
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && years.length === 0 && (
        <div className="empty-panel">
          <p>No academic years configured yet.</p>
          <p>Click <strong>+ New Academic Year</strong> to create one.</p>
        </div>
      )}
    </div>
  );
}
