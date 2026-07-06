import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import './StudentForm.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api','') || 'http://localhost/SaintAcademia';

function StudentForm({ student, onSubmit, onCancel }) {
  const { apiCall } = useApi();
  const photoRef = useRef(null);

  const [formData, setFormData] = useState({
    student_number: '', first_name: '', last_name: '',
    email: '', phone: '', gender: '', date_of_birth: '',
    place_of_birth: '', father_name: '', mother_name: '',
    local_id: '', entry_status: 'new',
  });
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const [errors,        setErrors]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [photoUploading,setPhotoUploading]= useState(false);

  useEffect(() => {
    if (student) setFormData({ ...formData, ...student });
  }, [student]);

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

    const method = student?.id ? 'PUT' : 'POST';
    const url    = student?.id ? `/students/${student.id}` : '/students';
    const res    = await apiCall(url, { method, body: JSON.stringify(formData) });

    if (!res.success) {
      setErrors(res.errors || [res.message]);
      setLoading(false);
      return;
    }

    // Upload photo if selected
    const savedId = res.id || student?.id;
    if (savedId && photoRef.current?.files?.[0]) {
      setPhotoUploading(true);
      const fd = new FormData();
      fd.append('photo', photoRef.current.files[0]);
      await apiCall(`/students/photo?id=${savedId}`, { method:'POST', body: fd });
      setPhotoUploading(false);
    }

    setLoading(false);
    onSubmit();
  };

  const currentPhoto = photoPreview || (student?.photo_path ? API_BASE + student.photo_path : null);

  return (
    <div className="student-form-card">
      <h3 className="student-form-title">
        {student?.id ? 'Edit Student' : 'Add New Student'}
      </h3>

      {errors.length > 0 && (
        <div className="error-banner">
          {errors.map((e,i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="sf-layout">

          {/* Photo column */}
          <div className="sf-photo-col">
            <div className="sf-photo-box">
              {currentPhoto
                ? <img src={currentPhoto} alt="Student" className="sf-photo-img" />
                : <div className="sf-photo-placeholder">No Photo</div>
              }
            </div>
            <input ref={photoRef} type="file" accept="image/*"
              id="student-photo-input" style={{ display:'none' }}
              onChange={handlePhotoChange} />
            <label htmlFor="student-photo-input" className="sf-photo-btn">
              {currentPhoto ? 'Change Photo' : 'Upload Photo'}
            </label>
            {photoPreview && <p className="sf-photo-hint">Save to apply photo</p>}
          </div>

          {/* Fields column */}
          <div className="sf-fields-col">

            <div className="sf-section-label">Identity</div>
            <div className="sf-row">
              <div className="form-group">
                <label>Reg. Number *</label>
                <input name="student_number" value={formData.student_number} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">—</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="entry_status" value={formData.entry_status} onChange={handleChange}>
                  <option value="new">New</option>
                  <option value="old">Old</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>
            <div className="sf-row">
              <div className="form-group">
                <label>First Name *</label>
                <input name="first_name" value={formData.first_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input name="last_name" value={formData.last_name} onChange={handleChange} required />
              </div>
            </div>
            <div className="sf-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth?.slice(0,10)||''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Place of Birth</label>
                <input name="place_of_birth" value={formData.place_of_birth||''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>ID Number</label>
                <input name="local_id" value={formData.local_id||''} onChange={handleChange} placeholder="National ID / Birth cert no." />
              </div>
            </div>

            <div className="sf-section-label">Parents / Guardian</div>
            <div className="sf-row">
              <div className="form-group">
                <label>Father's Name</label>
                <input name="father_name" value={formData.father_name||''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Mother's Name</label>
                <input name="mother_name" value={formData.mother_name||''} onChange={handleChange} />
              </div>
            </div>

            <div className="sf-section-label">Contact</div>
            <div className="sf-row">
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

        <div className="sf-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading || photoUploading}>
            {loading ? 'Saving…' : photoUploading ? 'Uploading photo…' : student?.id ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StudentForm;
