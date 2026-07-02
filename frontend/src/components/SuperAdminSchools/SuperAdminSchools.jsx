import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = 'http://localhost/SaintAcademia/api';

function SuperAdminSchools() {
  const { token } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    name_fr: '',
    address: '',
    phone: '',
    email: '',
    admin_email: '',
    admin_password: ''
  });

  const fetchSchools = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/schools`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSchools(data.schools || []);
      }
    } catch (error) {
      setMessage('Unable to load schools right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSchools();
    }
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/schools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (data.success) {
        setMessage(data.message || 'School created successfully');
        setForm({
          name: '',
          name_fr: '',
          address: '',
          phone: '',
          email: '',
          admin_email: '',
          admin_password: ''
        });
        await fetchSchools();
      } else {
        setMessage(data.message || 'Unable to create school');
      }
    } catch (error) {
      setMessage('Unable to create school right now.');
    }
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h2>School Management</h2>
      </div>

      {message && <p className="message">{message}</p>}

      <p className="info-text">Create a new school and its school admin account in one step. School admin credentials are required for onboarding.</p>
      <form onSubmit={handleSubmit} className="student-form">
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
            School email
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </label>
          <label>
            Admin email
            <input name="admin_email" type="email" value={form.admin_email} onChange={handleChange} required />
          </label>
          <label>
            Admin password
            <input name="admin_password" type="password" value={form.admin_password} onChange={handleChange} required />
          </label>
        </div>
        <button className="btn-primary" type="submit">Create school</button>
      </form>

      <div className="section-header" style={{ marginTop: '24px' }}>
        <h3>Existing schools</h3>
      </div>

      {loading ? (
        <p>Loading schools…</p>
      ) : schools.length === 0 ? (
        <p>No schools have been created yet.</p>
      ) : (
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id}>
                <td>{school.name}</td>
                <td>{school.email || 'No school email'}</td>
                <td>{school.is_active ? 'Open' : 'Locked'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SuperAdminSchools;
