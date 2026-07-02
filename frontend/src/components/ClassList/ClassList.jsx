import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './ClassList.css';

function ClassList({ onEdit, refreshTrigger }) {
  const { apiCall } = useApi();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const loadClasses = async () => {
    setLoading(true);
    setError(null);

    const endpoint = search
      ? `/classes?search=${encodeURIComponent(search)}&page=${page}`
      : `/classes?page=${page}`;

    const result = await apiCall(endpoint);

    if (result.success) {
      setClasses(result.classes);
      setTotalPages(result.pagination.total_pages);
    } else {
      setError(result.message || result.error || 'Failed to load classes');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, [page, refreshTrigger, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;

    setDeleting(id);
    const result = await apiCall(`/classes/${id}`, { method: 'DELETE' });

    if (result.success) {
      setClasses(classes.filter(item => item.id !== id));
    } else {
      setError(result.message || result.error || 'Failed to delete class');
    }

    setDeleting(null);
  };

  if (loading) return <div className="loading">Loading classes...</div>;

  return (
    <div className="class-list-container">
      <div className="list-header">
        <h2>Classes</h2>
        <input type="text" placeholder="Search by name, stream, or room..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
      </div>

      {error && <div className="error-message">{error}</div>}

      {classes.length === 0 ? (
        <div className="empty-state">No classes found. Create one to get started!</div>
      ) : (
        <div className="table-wrapper">
          <table className="class-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Stream</th>
                <th>Level</th>
                <th>Room</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.stream || '—'}</td>
                  <td>{item.level_name || '—'}</td>
                  <td>{item.room || '—'}</td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => onEdit(item)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(item.id)} disabled={deleting === item.id}>
                      {deleting === item.id ? 'Deleting...' : 'Delete'}
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

export default ClassList;
