import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import './StaffForm.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api','') || 'http://localhost/SaintAcademia';

function StaffForm({ staff, onSubmit, onCancel }) {
  const { apiCall } = useApi();
  const photoRef = useRef(null);

  const [formData, setFormData] = useState({
    staff_number: '', first_name: '', last_name: '',
    gender: '', role: '', department: '', phone: '', email: '', status: 'active',
  });
  const [photoPreview,   setPhotoPreview]   = useState(null);
  const [errors,         setErrors]         = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (staff) setFormData({ ...formData, ...staff });
  }, [staff]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handlePhotoChange = e => {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); setErrors([]);

    const method = staff?.id ? 'PUT' : 'POST';
    const url    = staff?.id ? `/staff/${staff.id}` : '/staff';
    const res    = await apiCall(url, { method, body: JSON.stringify(formData) });

    if (!res.success) {
      setErrors(res.errors || [res.message]);
      setLoading(false);
      return;
    }

    const savedId = res.id || staff?.id;
    if (savedId && photoRef.current?.files?.[0]) {
      setPhotoUploading(true);
      const fd = new FormData();
      fd.append('photo', photoRef.current.files[0]);
      await apiCall(`/staff/photo?id=${savedId}`, { method:'POST', body: fd });
      setPhotoUploading(false);
    }

    setLoading(false);
    onSubmit();
  };

  const currentPhoto = photoPreview || (staff?.photo_path ? API_BASE + staff.photo_path : null);

  return (
    <div className="staff-form">
      <h3>{staff?.id ? 'Edit Staff Member' : 'Add Staff Member'}</h3>

      {errors.length > 0 && (
        <div className="error-banner">
          {errors.map((e,i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display:'flex', gap:24 }}>

          {/* Photo */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, minWidth:110 }}>
            <div style={{
              width:90, height:110, border:'2px dashed #d0d8e4', borderRadius:8,
              overflow:'hidden', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              {currentPhoto
                ? <img src={currentPhoto} alt="Staff" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:11, color:'#aaa', textAlign:'center', padding:8 }}>No Photo</span>
              }
            </div>
            <input ref={photoRef} type="file" accept="image/*"
              id="staff-photo-input" style={{ display:'none' }}
              onChange={handlePhotoChange} />
            <label htmlFor="staff-photo-input"
              style={{ padding:'5px 10px', background:'#1B2A4A', color:'#fff', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 }}>
              {currentPhoto ? 'Change' : 'Upload Photo'}
            </label>
            {photoPreview && <p style={{ fontSize:11, color:'#2E9E4E', margin:0, textAlign:'center' }}>Save to apply</p>}
          </div>

          {/* Fields */}
          <div style={{ flex:1 }}>
            <div className="form-grid">
              <div className="form-group">
                <label>Staff Number *</label>
                <input name="staff_number" value={formData.staff_number} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={formData.gender||''} onChange={handleChange}>
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>First Name *</label>
                <input name="first_name" value={formData.first_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input name="last_name" value={formData.last_name} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Role / Function</label>
                <input name="role" value={formData.role||''} onChange={handleChange} placeholder="e.g. Teacher, Principal, Bursar" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input name="department" value={formData.department||''} onChange={handleChange} placeholder="e.g. Sciences, Languages" />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={formData.phone||''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email||''} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop:16 }}>
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-submit" disabled={loading || photoUploading}>
            {loading ? 'Saving…' : photoUploading ? 'Uploading…' : staff?.id ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StaffForm;
