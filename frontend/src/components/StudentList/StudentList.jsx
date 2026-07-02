import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './StudentList.css';

function StudentList({ onEdit, refreshTrigger }) {
  const { apiCall } = useApi();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState(null);

  const loadStudents = async () => {
    setLoading(true);
    setError(null);
    
    const endpoint = search 
      ? `/students?search=${encodeURIComponent(search)}&page=${page}`
      : `/students?page=${page}`;
    
    const result = await apiCall(endpoint);
    
    if (result.success) {
      setStudents(result.data.students);
      setTotalPages(result.data.pagination.total_pages);
    } else {
      setError(result.data?.message || 'Failed to load students');
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, [page, refreshTrigger]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    setDeleting(id);
    const result = await apiCall(`/students/${id}`, { method: 'DELETE' });
    
    if (result.success) {
      setStudents(students.filter(s => s.id !== id));
    } else {
      setError(result.data?.message || 'Failed to delete student');
    }
    
    setDeleting(null);
  };

  if (loading) return <div className="loading">Loading students...</div>;

  return (
    <div className="student-list-container">
      <div className="list-header">
        <h2>Students</h2>
        <input
          type="text"
          placeholder="Search by name, number, or email..."
          value={search}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {students.length === 0 ? (
        <div className="empty-state">No students found. Create one to get started!</div>
      ) : (
        <div className="table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>{student.student_number}</td>
                  <td>{student.first_name} {student.last_name}</td>
                  <td>{student.email || '—'}</td>
                  <td>{student.phone || '—'}</td>
                  <td>
                    <span className={`status-badge ${student.status}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      className="btn-edit"
                      onClick={() => onEdit(student)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(student.id)}
                      disabled={deleting === student.id}
                    >
                      {deleting === student.id ? 'Deleting...' : 'Delete'}
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
          <button 
            onClick={() => setPage(page - 1)} 
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button 
            onClick={() => setPage(page + 1)} 
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentList;
