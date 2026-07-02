import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './ClassForm.css';

function ClassForm({ classItem, onSubmit, onCancel }) {
  const { apiCall } = useApi();
  const [formData, setFormData] = useState({
    name: '',
    stream: '',
    level_name: '',
    room: ''
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (classItem) {
      setFormData({
        name: classItem.name || '',
        stream: classItem.stream || '',
        level_name: classItem.level_name || '',
        room: classItem.room || ''
      });
    }
  }, [classItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    const method = classItem ? 'PUT' : 'POST';
    const endpoint = classItem ? `/classes/${classItem.id}` : '/classes';

    const result = await apiCall(endpoint, {
      method,
      body: JSON.stringify(formData)
    });

    if (result.success) {
      onSubmit();
      setFormData({ name: '', stream: '', level_name: '', room: '' });
    } else {
      setErrors(result.data?.errors || [result.data?.message || result.error || 'Failed to save class']);
    }

    setLoading(false);
  };

  return (
    <div className="class-form-container">
      <div className="form-header">
        <h2>{classItem ? 'Edit Class' : 'Add New Class'}</h2>
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
            <label>Class Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Grade 7" required />
          </div>

          <div className="form-group">
            <label>Stream</label>
            <input type="text" name="stream" value={formData.stream} onChange={handleChange} placeholder="e.g. Science" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Level</label>
            <input type="text" name="level_name" value={formData.level_name} onChange={handleChange} placeholder="e.g. Secondary" />
          </div>

          <div className="form-group">
            <label>Room</label>
            <input type="text" name="room" value={formData.room} onChange={handleChange} placeholder="e.g. A101" />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Saving...' : (classItem ? 'Update Class' : 'Create Class')}
          </button>
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClassForm;
