import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function CatalogPage() {
  const { get, post } = useApi();

  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState('');
  const [error,   setError]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '', applicable_type: 'both', default_start_date: '', default_end_date: ''
  });

  const load = async () => {
    setLoading(true);
    const res = await get('/academic-year-catalog');
    setLoading(false);
    if (res.success) setCatalog(res.catalog || []);
    else setError(res.message);
  };

  useEffect(() => { load(); }, []);

  const handleStartDate = (val) => {
    const d = new Date(val);
    if (!isNaN(d)) {
      const yr = d.getFullYear();
      setForm(p => ({ ...p, default_start_date: val, label: `${yr}/${yr+1}`, default_end_date: `${yr+1}-07-31` }));
    } else {
      setForm(p => ({ ...p, default_start_date: val }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');
    const res = await post('/academic-year-catalog', form);
    setSaving(false);
    if (res.success) {
      setMessage('Catalog year created.');
      setShowForm(false);
      setForm({ label:'', applicable_type:'both', default_start_date:'', default_end_date:'' });
      load();
    } else setError(res.message);
  };

  const typeLabel = t => t === 'secondary' ? 'Secondary Only' : t === 'higher_ed' ? 'Higher Ed Only' : 'All Institutions';

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>Academic Year Catalog</h2>
        <button className="btn-primary" onClick={() => { setShowForm(p=>!p); setMessage(''); setError(''); }}>
          {showForm ? 'Cancel' : '+ New Catalog Year'}
        </button>
      </div>

      <p style={{ color:'#5a6b8c', fontSize:13, margin:'-8px 0 16px' }}>
        Global year labels available for any school to adopt into their own academic calendar.
      </p>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1B2A4A' }}>Create Catalog Year</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Default Start Date *</label>
                <input type="date" value={form.default_start_date} onChange={e => handleStartDate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Default End Date *</label>
                <input type="date" value={form.default_end_date} onChange={e => setForm(p=>({...p,default_end_date:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label>Label *</label>
                <input value={form.label} onChange={e => setForm(p=>({...p,label:e.target.value}))} placeholder="e.g. 2026/2027" required />
              </div>
              <div className="form-group">
                <label>Applicable To</label>
                <select value={form.applicable_type} onChange={e => setForm(p=>({...p,applicable_type:e.target.value}))} className="select-input">
                  <option value="both">All Institutions</option>
                  <option value="secondary">Secondary Only</option>
                  <option value="higher_ed">Higher Ed Only</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Catalog Year'}</button>
            </div>
          </form>
        </div>
      )}

      {loading && <p className="loading-text">Loading catalog...</p>}

      {catalog.length > 0 && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Default Start</th>
              <th>Default End</th>
              <th>Applicable To</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map(c => (
              <tr key={c.id}>
                <td><strong>{c.label}</strong></td>
                <td>{c.default_start_date?.slice(0,10)}</td>
                <td>{c.default_end_date?.slice(0,10)}</td>
                <td>{typeLabel(c.applicable_type)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && catalog.length === 0 && (
        <div className="empty-panel">
          <p>No catalog years yet.</p>
          <p>Click <strong>+ New Catalog Year</strong> to create one.</p>
        </div>
      )}
    </div>
  );
}
