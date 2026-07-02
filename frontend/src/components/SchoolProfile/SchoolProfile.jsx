import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';

function SchoolProfile() {
  const { apiCall } = useApi();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    name_fr: '',
    address: '',
    phone: '',
    email: ''
  });

  const loadSchool = async () => {
    const response = await apiCall('/schools/me');

    if (response.success && response.data && response.data.success) {
      setSchool(response.data.school);
      setForm({
        name: response.data.school.name || '',
        name_fr: response.data.school.name_fr || '',
        address: response.data.school.address || '',
        phone: response.data.school.phone || '',
        email: response.data.school.email || ''
      });
    } else {
      setMessage(response.data?.message || 'Unable to load school profile.');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSchool();
  }, [apiCall]);

  const updateSchool = async (payload) => {
    const response = await apiCall('/schools/me', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (response.success && response.data && response.data.success) {
      setSchool(response.data.school);
      setForm({
        name: response.data.school.name || '',
        name_fr: response.data.school.name_fr || '',
        address: response.data.school.address || '',
        phone: response.data.school.phone || '',
        email: response.data.school.email || ''
      });
      setMessage(response.data.message || 'School updated successfully');
      setIsEditing(false);
    } else {
      setMessage(response.data?.message || 'Unable to update school');
    }
  };

  if (loading) {
    return <p>Loading school profile…</p>;
  }

  if (!school) {
    return <p>{message || 'School profile not available.'}</p>;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    await updateSchool(form);
  };

  const handleToggleActive = async () => {
    await updateSchool({ is_active: !school.is_active, name: school.name, name_fr: school.name_fr, address: school.address, phone: school.phone, email: school.email });
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>My School</h2>
      </div>

      {message && <p className="message">{message}</p>}

      <div className="overview-card-grid">
        <div className="overview-card">
          <h3>{school.name}</h3>
          <p><strong>Status:</strong> {school.is_active ? 'Open' : 'Locked'}</p>
          {school.name_fr && <p><strong>French name:</strong> {school.name_fr}</p>}
          <p><strong>Email:</strong> {school.email || 'Not provided'}</p>
          <p><strong>Phone:</strong> {school.phone || 'Not provided'}</p>
          <p><strong>Address:</strong> {school.address || 'Not provided'}</p>
          <button className="btn-secondary" onClick={handleToggleActive}>
            {school.is_active ? 'Lock school' : 'Open school'}
          </button>
          <button className="btn-secondary" onClick={() => setIsEditing((prev) => !prev)}>
            {isEditing ? 'Cancel edit' : 'Edit profile'}
          </button>
        </div>
        <div className="overview-card">
          <h3>School details</h3>
          <p><strong>School ID:</strong> {school.id}</p>
          <p><strong>Created at:</strong> {new Date(school.created_at).toLocaleDateString()}</p>
          <p>Use this profile to confirm your school context before managing students, staff, and classes.</p>
        </div>
      </div>

      {isEditing && (
        <form className="student-form" onSubmit={handleSave}>
          <div className="form-grid">
            <label>
              School name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              French name
              <input name="name_fr" value={form.name_fr} onChange={handleChange} />
            </label>
            <label>
              Address
              <input name="address" value={form.address} onChange={handleChange} />
            </label>
            <label>
              Phone
              <input name="phone" value={form.phone} onChange={handleChange} />
            </label>
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </label>
          </div>
          <button className="btn-primary" type="submit">Save school profile</button>
        </form>
      )}
    </div>
  );
}

export default SchoolProfile;
