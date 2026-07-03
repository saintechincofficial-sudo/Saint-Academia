import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import './StudentList.css';

function StudentList({ onEdit, refreshTrigger }) {
  const { get, apiCall } = useApi();

  const [students, setStudents]         = useState([]);
  const [classes, setClasses]           = useState([]);
  const [years, setYears]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [deleting, setDeleting]         = useState(null);

  const [search, setSearch]             = useState('');
  const [classId, setClassId]           = useState('');
  const [yearId, setYearId]             = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalItems, setTotalItems]     = useState(0);

  // Load filter options once
  useEffect(() => {
    get('/classes').then(r => { if (r.success) setClasses(r.classes || []); });
  }, []);

  // When class changes, filter available years from that class
  useEffect(() => {
    if (!classId) { setYears([]); setYearId(''); return; }
    const cls = classes.find(c => String(c.id) === String(classId));
    if (cls?.academic_year) {
      // We only have year label from class — fetch all years instead
    }
    // Fetch academic years for dropown
    get('/terms').then(r => {
      // terms gives us access to academic year via label; instead fetch classes again
      // to extract unique years
      const uniqueYears = [];
      const seen = new Set();
      classes.forEach(c => {
        if (c.academic_year && !seen.has(c.academic_year)) {
          seen.add(c.academic_year);
          uniqueYears.push({ label: c.academic_year, class_ids: [] });
        }
      });
    });
  }, [classId, classes]);

  const loadStudents = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page });
    if (search)  params.append('search', search);
    if (classId) params.append('class_id', classId);
    if (yearId)  params.append('academic_year_id', yearId);

    const result = await get(`/students?${params}`);

    if (result.success) {
      setStudents(result.students || []);
      setTotalPages(result.pagination?.total_pages || 1);
      setTotalItems(result.pagination?.total_items || 0);
    } else {
      setError(result.message || 'Failed to load students');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (classId && yearId) {
      loadStudents();
    } else {
      setStudents([]);
      setTotalItems(0);
      setTotalPages(1);
    }
  }, [page, refreshTrigger, search, classId, yearId]);

  useEffect(() => { setPage(1); }, [search, classId, yearId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    setDeleting(id);
    const result = await apiCall(`/students/${id}`, { method: 'DELETE' });
    if (result.success) {
      setStudents(prev => prev.filter(s => s.id !== id));
    } else {
      setError(result.message || 'Failed to delete student');
    }
    setDeleting(null);
  };

  // Get unique academic years from classes list for the year dropdown
  const uniqueYears = [];
  const seenYears   = new Set();
  classes.forEach(c => {
    if (c.academic_year_id && !seenYears.has(c.academic_year_id)) {
      seenYears.add(c.academic_year_id);
      uniqueYears.push({ id: c.academic_year_id, label: c.academic_year });
    }
  });

  // Filter classes by selected year
  const filteredClasses = yearId
    ? classes.filter(c => String(c.academic_year_id) === String(yearId))
    : classes;

  return (
    <div className="student-list-container">

      {/* ── Filter bar ── */}
      <div className="student-filter-bar">
        <div className="filter-group">
          <label>Academic Year</label>
          <select value={yearId}
            onChange={e => { setYearId(e.target.value); setClassId(''); }}
            className="filter-select">
            <option value="">— All years —</option>
            {uniqueYears.map(y => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Class</label>
          <select value={classId}
            onChange={e => setClassId(e.target.value)}
            className="filter-select">
            <option value="">— All classes —</option>
            {filteredClasses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.stream ? ` (${c.stream})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group filter-search">
          <label>Search</label>
          <input
            type="text"
            placeholder="Name or reg. number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {(classId || yearId || search) && (
          <button className="filter-clear"
            onClick={() => { setClassId(''); setYearId(''); setSearch(''); }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Count bar ── */}
      <div className="student-count-bar">
        {loading ? 'Loading…' : (
          <span>
            {totalItems} student{totalItems !== 1 ? 's' : ''}
            {classId ? ` in ${classes.find(c => String(c.id) === String(classId))?.name || 'class'}` : ''}
            {yearId  ? ` — ${uniqueYears.find(y => String(y.id) === String(yearId))?.label || ''}` : ''}
          </span>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {!loading && students.length === 0 ? (
        <div className="empty-state">
          {classId
            ? 'No students enrolled in this class. Use the Enrollment tab to enroll students.'
            : 'No students found.'}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Reg. Number</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Class</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, i) => (
                <tr key={student.id}>
                  <td>{(page - 1) * 25 + i + 1}</td>
                  <td>{student.student_number}</td>
                  <td>
                    <strong>{student.last_name}</strong> {student.first_name}
                  </td>
                  <td>{student.gender || '—'}</td>
                  <td>{student.class_name || '—'}</td>
                  <td>
                    <span className={`status-badge ${student.status}`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-edit" onClick={() => onEdit(student)}>
                      Edit
                    </button>
                    <button className="btn-delete"
                      onClick={() => handleDelete(student.id)}
                      disabled={deleting === student.id}>
                      {deleting === student.id ? 'Deleting…' : 'Delete'}
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
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            ← Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentList;
