import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';

const REGIONS = [
  'Adamawa','Centre','East','Far North','Littoral',
  'North','North West','South','South West','West'
];

export default function SchoolProfile() {
  const { get, apiCall } = useApi();
  const logoRef        = useRef(null);
  const letterheadRef  = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api','') || 'http://localhost/SaintAcademia';

  const [school,   setSchool]   = useState(null);
  const [form,     setForm]     = useState({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState('');
  const [error,    setError]    = useState('');
  const [logoPreview, setLogoPreview]             = useState(null);
  const [letterheadPreview, setLetterheadPreview] = useState(null);

  useEffect(() => {
    get('/schools/me').then(r => {
      if (r.success) {
        setSchool(r.school);
        setForm({
          name:       r.school.name       || '',
          name_fr:    r.school.name_fr    || '',
          address:    r.school.address    || '',
          phone:      r.school.phone      || '',
          email:      r.school.email      || '',
          motto:      r.school.motto      || '',
          region:     r.school.region     || '',
          delegation: r.school.delegation || '',
          po_box:     r.school.po_box     || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleFileChange = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (field === 'logo')       setLogoPreview(url);
    if (field === 'letterhead') setLetterheadPreview(url);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true); setMessage(''); setError('');

    const fd = new FormData();
    Object.entries(form).forEach(([k,v]) => fd.append(k, v));
    if (logoRef.current?.files?.[0])       fd.append('logo',       logoRef.current.files[0]);
    if (letterheadRef.current?.files?.[0]) fd.append('letterhead', letterheadRef.current.files[0]);

    const res = await apiCall('/schools/me', { method:'PUT', body: fd, isFormData: true });
    setSaving(false);
    if (res.success) {
      setSchool(res.school);
      setMessage('School profile saved successfully.');
      setLogoPreview(null);
      setLetterheadPreview(null);
      if (logoRef.current)       logoRef.current.value = '';
      if (letterheadRef.current) letterheadRef.current.value = '';
    } else {
      setError(res.message || 'Failed to save.');
    }
  };

  if (loading) return <p className="loading-text">Loading school profile…</p>;

  const logoSrc       = logoPreview       || (school?.logo_path       ? API_BASE + school.logo_path       : null);
  const letterheadSrc = letterheadPreview || (school?.letterhead_path ? API_BASE + school.letterhead_path : null);

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>My School — School Profile</h2>
      </div>

      {message && <div className="success-banner">{message}</div>}
      {error   && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

          {/* ── Left column: text fields ── */}
          <div>
            <div style={{ background:'#f7f9fc', border:'1px solid #e5e9f0', borderRadius:10, padding:20, marginBottom:20 }}>
              <h3 style={{ margin:'0 0 16px', fontSize:13, fontWeight:700, color:'#1B2A4A', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Basic Information
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label>School Name (English) *</label>
                  <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label>School Name (French)</label>
                  <input value={form.name_fr} onChange={e=>setForm(p=>({...p,name_fr:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label>Motto</label>
                  <input value={form.motto} onChange={e=>setForm(p=>({...p,motto:e.target.value}))} placeholder="e.g. Knowledge With Integrity" />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label>Phone</label>
                    <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label>P.O. Box</label>
                    <input value={form.po_box} onChange={e=>setForm(p=>({...p,po_box:e.target.value}))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} />
                </div>
              </div>
            </div>

            <div style={{ background:'#f7f9fc', border:'1px solid #e5e9f0', borderRadius:10, padding:20 }}>
              <h3 style={{ margin:'0 0 16px', fontSize:13, fontWeight:700, color:'#1B2A4A', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Regional Information
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label>Region</label>
                  <select value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value}))} className="select-input">
                    <option value="">— Select region —</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Divisional Delegation</label>
                  <input value={form.delegation} onChange={e=>setForm(p=>({...p,delegation:e.target.value}))} placeholder="e.g. Meme" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column: logo + letterhead ── */}
          <div>
            {/* Logo upload */}
            <div style={{ background:'#f7f9fc', border:'1px solid #e5e9f0', borderRadius:10, padding:20, marginBottom:20 }}>
              <h3 style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#1B2A4A', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                School Logo
              </h3>
              <p style={{ fontSize:12, color:'#888', margin:'0 0 14px' }}>
                Used on report cards, class lists and mastersheets. PNG or JPG, max 2MB.
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:14 }}>
                <div style={{
                  width:100, height:100, border:'2px dashed #d0d8e4', borderRadius:10,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:'#fff', overflow:'hidden', flexShrink:0
                }}>
                  {logoSrc
                    ? <img src={logoSrc} alt="Logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                    : <span style={{ fontSize:12, color:'#aaa', textAlign:'center', padding:8 }}>No logo</span>
                  }
                </div>
                <div>
                  <input ref={logoRef} type="file" accept="image/*"
                    onChange={e => handleFileChange('logo', e)}
                    style={{ display:'none' }} id="logo-input" />
                  <label htmlFor="logo-input" style={{
                    display:'inline-block', padding:'8px 16px',
                    background:'#1B2A4A', color:'#fff', borderRadius:7,
                    cursor:'pointer', fontSize:13, fontWeight:600
                  }}>
                    {logoSrc ? 'Change Logo' : 'Upload Logo'}
                  </label>
                  {logoPreview && (
                    <p style={{ fontSize:12, color:'#2E9E4E', marginTop:6 }}>✓ New logo selected — save to apply</p>
                  )}
                </div>
              </div>
            </div>

            {/* Letterhead upload */}
            <div style={{ background:'#f7f9fc', border:'1px solid #e5e9f0', borderRadius:10, padding:20 }}>
              <h3 style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#1B2A4A', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                Official Letterhead
              </h3>
              <p style={{ fontSize:12, color:'#888', margin:'0 0 14px' }}>
                Full bilingual header image used on official documents. PNG or JPG, landscape, max 5MB.
              </p>
              <div style={{ marginBottom:14 }}>
                <div style={{
                  width:'100%', minHeight:80, border:'2px dashed #d0d8e4', borderRadius:10,
                  background:'#fff', overflow:'hidden', marginBottom:10
                }}>
                  {letterheadSrc
                    ? <img src={letterheadSrc} alt="Letterhead" style={{ width:'100%', display:'block' }} />
                    : <div style={{ padding:20, textAlign:'center', color:'#aaa', fontSize:12 }}>No letterhead uploaded</div>
                  }
                </div>
                <input ref={letterheadRef} type="file" accept="image/*,.pdf"
                  onChange={e => handleFileChange('letterhead', e)}
                  style={{ display:'none' }} id="letterhead-input" />
                <label htmlFor="letterhead-input" style={{
                  display:'inline-block', padding:'8px 16px',
                  background:'#1B2A4A', color:'#fff', borderRadius:7,
                  cursor:'pointer', fontSize:13, fontWeight:600
                }}>
                  {letterheadSrc ? 'Change Letterhead' : 'Upload Letterhead'}
                </label>
                {letterheadPreview && (
                  <p style={{ fontSize:12, color:'#2E9E4E', marginTop:6 }}>✓ New letterhead selected — save to apply</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop:24, display:'flex', justifyContent:'flex-end', gap:12 }}>
          <button type="button" className="btn-secondary"
            onClick={() => { setMessage(''); setError(''); setLogoPreview(null); setLetterheadPreview(null); }}>
            Reset
          </button>
          <button type="submit" className="btn-primary btn-large" disabled={saving}>
            {saving ? 'Saving…' : '💾 Save School Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
