import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './StaffForm.css';

const roles = ['Teacher', 'Administrator', 'Counselor', 'Support', 'Accountant', 'Librarian'];
const departments = ['Administration', 'Academics', 'Finance', 'Support', 'Admissions', 'Exams'];

function StaffForm({ staff, onSubmit, onCancel }) {
  const { apiCall } = useApi();
  const [formData, setFormData] = useState({
    staff_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'Teacher',
    department: '',
    status: 'active'
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staff) {
      setFormData({
        staff_number: staff.staff_number || '',
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role || 'Teacher',
        department: staff.department || '',
        status: staff.status || 'active'
      });
    }
  }, [staff]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    const method = staff ? 'PUT' : 'POST';
    const endpoint = staff ? `/staff/${staff.id}` : '/staff';

    const result = await apiCall(endpoint, {
      method,
      body: JSON.stringify(formData)
    });

    if (result.success) {
      onSubmit(result || {});
      setFormData({
        staff_number: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'Teacher',
        department: '',
        status: 'active'
      });
    } else {
      setErrors(result.errors || [result.message || result.error || 'Failed to save staff member']);
    }

    setLoading(false);
  };

  return (
    <div className="staff-form-container">
      <div className="form-header">
        <h2>{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
        <button className="btn-close" onClick={onCancel}>✕</button>
      </div>

      {errors.length > 0 && (
        <div className="form-errors">
          {errors.map((error, idx) => (
            <div key={idx} className="error-item">• {error}</div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Staff Number *</label>
            <input
              type="text"
              name="staff_number"
              value={formData.staff_number}
              onChange={handleChange}
              placeholder="e.g., ST1001"
              required
              disabled={!!staff}
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select name="role" value={formData.role} onChange={handleChange} required>
              {roles.map(roleOption => (
                <option key={roleOption} value={roleOption}>{roleOption}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="First name"
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Department</label>
            <select name="department" value={formData.department} onChange={handleChange}>
              <option value="">Select department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
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

        <div className="form-row">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="650000000"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Saving...' : (staff ? 'Update Staff' : 'Create Staff')}
          </button>
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default StaffForm;
