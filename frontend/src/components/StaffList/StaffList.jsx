import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './StaffList.css';

function StaffList({ onEdit, refreshTrigger }) {
  const { apiCall } = useApi();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const loadStaff = async () => {
    setLoading(true);
    setError(null);

    const endpoint = search
      ? `/staff?search=${encodeURIComponent(search)}&page=${page}`
      : `/staff?page=${page}`;

    const result = await apiCall(endpoint);

    if (result.success) {
      setStaff(result.data.staff);
      setTotalPages(result.data.pagination.total_pages);
    } else {
      setError(result.data?.message || result.error || 'Failed to load staff');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, [page, refreshTrigger, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;

    setDeleting(id);
    const result = await apiCall(`/staff/${id}`, { method: 'DELETE' });

    if (result.success) {
      setStaff(staff.filter(item => item.id !== id));
    } else {
      setError(result.data?.message || result.error || 'Failed to delete staff member');
    }

    setDeleting(null);
  };

  if (loading) return <div className="loading">Loading staff members...</div>;

  return (
    <div className="staff-list-container">
      <div className="list-header">
        <h2>Staff</h2>
        <input
          type="text"
          placeholder="Search by name, number, email, or department..."
          value={search}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {staff.length === 0 ? (
        <div className="empty-state">No staff found. Add a staff member to get started!</div>
      ) : (
        <div className="table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.staff_number}</td>
                  <td>{member.first_name} {member.last_name}</td>
                  <td>{member.role}</td>
                  <td>{member.department || '—'}</td>
                  <td>{member.email || '—'}</td>
                  <td>{member.phone || '—'}</td>
                  <td>
                    <span className={`status-badge ${member.status}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => onEdit(member)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(member.id)} disabled={deleting === member.id}>
                      {deleting === member.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(page - 1)} disabled={page === 1}>← Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  );
}

export default StaffList;
