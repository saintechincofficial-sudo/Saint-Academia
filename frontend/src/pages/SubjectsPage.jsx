import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function SubjectsPage() {
  const { get, post, put, del } = useApi();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ name: '', name_fr: '', code: '', coefficient: 1 });

  const load = async () => {
    setLoading(true);
    const res = await get('/subjects');
    if (res.success) setSubjects(res.subjects || []);
    else setError(res.message);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', name_fr: '', code: '', coefficient: 1 });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, name_fr: s.name_fr || '', code: s.code || '', coefficient: s.coefficient || 1 });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = editing
      ? await put(`/subjects/${editing.id}`, form)
      : await post('/subjects', form);
    setSaving(false);
    if (res.success) { setShowForm(false); load(); }
    else setError(res.message);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    const res = await del(`/subjects/${id}`);
    if (res.success) load();
    else setError(res.message);
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>📚 Subjects</h2>
        <button className="btn-primary" onClick={openNew}>+ Add Subject</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="form-card">
          <h3>{editing ? 'Edit Subject' : 'New Subject'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Name (English) *</label>
                <input required value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Mathematics" />
              </div>
              <div className="form-group">
                <label>Nom (Français)</label>
                <input value={form.name_fr}
                  onChange={e => setForm(p => ({ ...p, name_fr: e.target.value }))}
                  placeholder="ex: Mathématiques" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Code</label>
                <input value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  placeholder="e.g. MATH" />
              </div>
              <div className="form-group">
                <label>Coefficient (1–10) *</label>
                <input type="number" min="1" max="10" required
                  value={form.coefficient}
                  onChange={e => setForm(p => ({ ...p, coefficient: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary"
                onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? <p className="loading-text">Loading subjects…</p> : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject (EN)</th>
              <th>Matière (FR)</th>
              <th>Code</th>
              <th>Coefficient</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 && (
              <tr><td colSpan="5" className="empty-row">
                No subjects yet. Add your first subject above.
              </td></tr>
            )}
            {subjects.map(s => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td>{s.name_fr || '—'}</td>
                <td>{s.code || '—'}</td>
                <td><span className="coef-badge">×{s.coefficient}</span></td>
                <td>
                  <button className="btn-icon" onClick={() => openEdit(s)}>✏️</button>
                  <button className="btn-icon danger" onClick={() => handleDelete(s.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {subjects.length > 0 && (
        <div className="coef-total">
          Total Coefficient (TC):&nbsp;
          <strong>{subjects.reduce((sum, s) => sum + (parseInt(s.coefficient) || 0), 0)}</strong>
        </div>
      )}
    </div>
  );
}
