import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';

function SchoolProfile() {
  const { get, put, apiCall } = useApi();
  const [school, setSchool]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    name: '', name_fr: '', address: '', phone: '', email: '',
    motto: '', po_box: '', region: '', delegation: '',
  });
  const [logoFile, setLogoFile]           = useState(null);
  const [letterheadFile, setLetterheadFile] = useState(null);
  const [logoPreview, setLogoPreview]     = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost/SaintAcademia';

  const loadSchool = async () => {
    setLoading(true);
    const res = await get('/schools/me');
    if (res.success && res.school) {
      setSchool(res.school);
      setForm({
        name:       res.school.name       || '',
        name_fr:    res.school.name_fr    || '',
        address:    res.school.address    || '',
        phone:      res.school.phone      || '',
        email:      res.school.email      || '',
        motto:      res.school.motto      || '',
        po_box:     res.school.po_box     || '',
        region:     res.school.region     || '',
        delegation: res.school.delegation || '',
      });
    } else {
      setError(res.message || 'Unable to load school profile');
    }
    setLoading(false);
  };

  useEffect(() => { loadSchool(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLetterheadChange = (e) => {
    setLetterheadFile(e.target.files[0] || null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    // Use FormData so we can send files alongside text fields
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (logoFile)       fd.append('logo',        logoFile);
    if (letterheadFile) fd.append('letterhead',  letterheadFile);

    const response = await fetch(
      (import.meta.env.VITE_API_BASE_URL || 'http://localhost/SaintAcademia/api') + '/schools/me',
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        body: fd,
      }
    );
    const res = await response.json();

    setSaving(false);
    if (res.success && res.school) {
      setSchool(res.school);
      setMessage(res.message || 'School updated successfully');
      setIsEditing(false);
      setLogoFile(null);
      setLetterheadFile(null);
      setLogoPreview(null);
    } else {
      setError(res.message || 'Unable to update school');
    }
  };

  const handleToggleActive = async () => {
    const res = await put('/schools/me', {
      ...form,
      is_active: !school.is_active,
    });
    if (res.success && res.school) {
      setSchool(res.school);
      setMessage(res.message);
    } else {
      setError(res.message);
    }
  };

  if (loading) return <p className="loading-text">Loading school profile…</p>;

  if (!school) return (
    <div className="tab-content">
      <div className="error-banner">{error || 'School profile not available.'}</div>
    </div>
  );

  const logoSrc = logoPreview || (school.logo_path ? API_BASE + school.logo_path : null);

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>🏫 My School</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={handleToggleActive}>
            {school.is_active ? '🔒 Lock school' : '🔓 Open school'}
          </button>
          <button className="btn-primary" onClick={() => setIsEditing(p => !p)}>
            {isEditing ? 'Cancel' : '✏️ Edit Profile'}
          </button>
        </div>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      {/* View mode */}
      {!isEditing && (
        <div className="overview-card-grid">
          <div className="overview-card">
            {logoSrc && (
              <img src={logoSrc} alt="School logo"
                style={{ maxWidth: 120, maxHeight: 120, objectFit: 'contain', marginBottom: 12 }} />
            )}
            <h3>{school.name}</h3>
            {school.name_fr    && <p><strong>French name:</strong> {school.name_fr}</p>}
            {school.motto      && <p><em>"{school.motto}"</em></p>}
            <p><strong>Status:</strong>{' '}
              <span style={{ color: school.is_active ? '#2E9E4E' : '#c0392b' }}>
                {school.is_active ? 'Open' : 'Locked'}
              </span>
            </p>
          </div>

          <div className="overview-card">
            <h3>Contact &amp; Location</h3>
            <p><strong>Email:</strong>      {school.email      || '—'}</p>
            <p><strong>Phone:</strong>      {school.phone      || '—'}</p>
            <p><strong>P.O. Box:</strong>   {school.po_box     || '—'}</p>
            <p><strong>Address:</strong>    {school.address    || '—'}</p>
            <p><strong>Region:</strong>     {school.region     || '—'}</p>
            <p><strong>Delegation:</strong> {school.delegation || '—'}</p>
          </div>

          <div className="overview-card">
            <h3>System Info</h3>
            <p><strong>School ID:</strong> {school.id}</p>
            <p><strong>Created:</strong> {new Date(school.created_at).toLocaleDateString()}</p>
            <p><strong>Logo:</strong>{' '}
              {school.logo_path ? '✅ Uploaded' : '❌ Not uploaded'}
            </p>
            <p><strong>Letterhead:</strong>{' '}
              {school.letterhead_path ? '✅ Uploaded' : '❌ Not uploaded'}
            </p>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <form onSubmit={handleSave} encType="multipart/form-data">
          <div className="form-card">
            <h3>School Identity</h3>
            <div className="form-row">
              <div className="form-group">
                <label>School name (English) *</label>
                <input name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Nom de l'école (Français)</label>
                <input name="name_fr" value={form.name_fr} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Motto / Devise</label>
              <input name="motto" value={form.motto} onChange={handleChange}
                placeholder="e.g. Excellence through hard work" />
            </div>
          </div>

          <div className="form-card">
            <h3>Contact &amp; Location</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>P.O. Box</label>
                <input name="po_box" value={form.po_box} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input name="address" value={form.address} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Region</label>
                <select name="region" value={form.region} onChange={handleChange}
                  className="select-input">
                  <option value="">— Select region —</option>
                  <option>Adamaoua</option>
                  <option>Centre</option>
                  <option>Est</option>
                  <option>Extrême-Nord</option>
                  <option>Littoral</option>
                  <option>Nord</option>
                  <option>Nord-Ouest</option>
                  <option>Ouest</option>
                  <option>Sud</option>
                  <option>Sud-Ouest</option>
                </select>
              </div>
              <div className="form-group">
                <label>Délégation / Division</label>
                <input name="delegation" value={form.delegation} onChange={handleChange}
                  placeholder="e.g. Délégation Régionale du Sud-Ouest" />
              </div>
            </div>
          </div>

          <div className="form-card">
            <h3>Logo &amp; Letterhead</h3>
            <div className="form-row">
              <div className="form-group">
                <label>School Logo (JPG or PNG, max 2MB)</label>
                {logoSrc && (
                  <img src={logoSrc} alt="Current logo"
                    style={{ width: 80, height: 80, objectFit: 'contain',
                             border: '1px solid #ddd', borderRadius: 6, marginBottom: 8 }} />
                )}
                <input type="file" accept="image/jpeg,image/png"
                  onChange={handleLogoChange} />
                <span style={{ fontSize: 12, color: '#888' }}>
                  Used on mastersheets and report cards
                </span>
              </div>
              <div className="form-group">
                <label>Letterhead Image (JPG or PNG, max 5MB)</label>
                {school.letterhead_path && (
                  <span style={{ fontSize: 12, color: '#2E9E4E' }}>
                    ✅ Letterhead currently uploaded
                  </span>
                )}
                <input type="file" accept="image/jpeg,image/png"
                  onChange={handleLetterheadChange} />
                <span style={{ fontSize: 12, color: '#888' }}>
                  Printed at the top of official documents
                </span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary"
              onClick={() => setIsEditing(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : '💾 Save school profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default SchoolProfile;
