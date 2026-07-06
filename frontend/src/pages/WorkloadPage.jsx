import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function WorkloadPage() {
  const { get, post, del } = useApi();
  const printRef = useRef(null);

  const [years,      setYears]      = useState([]);
  const [classes,    setClasses]    = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [staff,      setStaff]      = useState([]);
  const [workload,   setWorkload]   = useState([]);
  const [yearId,     setYearId]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [message,    setMessage]    = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({
    staff_id: '', subject_id: '', class_id: '', periods_per_week: 1
  });

  useEffect(() => {
    get('/classes').then(r => {
      if (!r.success) return;
      const all = r.classes || [];
      setClasses(all);
      const seen = new Set(); const uy = [];
      all.forEach(c => {
        const id = c.academic_year_id || c.year_id;
        if (id && !seen.has(id)) { seen.add(id); uy.push({ id, label: c.academic_year }); }
      });
      setYears(uy);
    });
    get('/subjects').then(r => { if (r.success) setSubjects(r.subjects || []); });
    get('/staff').then(r => { if (r.success) setStaff(r.staff || []); });
  }, []);

  const filteredClasses = yearId
    ? classes.filter(c => String(c.academic_year_id || c.year_id) === String(yearId))
    : [];

  const loadWorkload = async (yid) => {
    if (!yid) return;
    setLoading(true); setError('');
    const res = await get(`/workload?academic_year_id=${yid}`);
    setLoading(false);
    if (res.success) setWorkload(res.workload || []);
    else setError(res.message);
  };

  const handleYearChange = e => {
    const yid = e.target.value;
    setYearId(yid);
    setWorkload([]);
    loadWorkload(yid);
  };

  const handleAssign = async e => {
    e.preventDefault();
    if (!form.staff_id || !form.subject_id || !form.class_id || !yearId) {
      setError('All fields are required'); return;
    }
    setSaving(true); setError(''); setMessage('');
    const res = await post('/workload', { ...form, academic_year_id: parseInt(yearId) });
    setSaving(false);
    if (res.success) {
      setMessage(res.message);
      setShowForm(false);
      setForm({ staff_id: '', subject_id: '', class_id: '', periods_per_week: 1 });
      loadWorkload(yearId);
    } else setError(res.message);
  };

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove assignment for ${name}?`)) return;
    const res = await del(`/workload/${id}`);
    if (res.success) loadWorkload(yearId);
    else setError(res.message);
  };

  const downloadPdf = async () => {
    const el = printRef.current;
    if (!el) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: el.scrollWidth });
      const imgData = canvas.toDataURL('image/png');
      const margin = 8;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth()  - margin * 2;
      const pdfH = pdf.internal.pageSize.getHeight() - margin * 2;
      const ratio = pdfW / canvas.width;
      const scaledH = canvas.height * ratio;
      if (scaledH <= pdfH) {
        pdf.addImage(imgData, 'PNG', margin, margin, pdfW, scaledH);
      } else {
        let yPos = 0; let page = 0;
        const ph = pdfH / ratio;
        while (yPos < canvas.height) {
          if (page > 0) pdf.addPage();
          const sh = Math.min(ph, canvas.height - yPos);
          const tmp = document.createElement('canvas');
          tmp.width = canvas.width; tmp.height = Math.ceil(sh);
          tmp.getContext('2d').drawImage(canvas, 0, yPos, canvas.width, sh, 0, 0, canvas.width, sh);
          pdf.addImage(tmp.toDataURL('image/png'), 'PNG', margin, margin, pdfW, sh * ratio);
          yPos += sh; page++;
        }
      }
      const yr = years.find(y => String(y.id) === String(yearId));
      pdf.save('Workload_' + (yr?.label || '').replace('/', '-') + '.pdf');
    } catch(e) { console.error(e); }
    setPdfLoading(false);
  };

  const totalPeriods = workload.reduce((sum, w) => sum + (w.total_periods || 0), 0);

  return (
    <div className="tab-content">
      <div className="section-header no-print">
        <h2>📅 Teacher Workload</h2>
        <div style={{ display:'flex', gap:8 }}>
          {workload.length > 0 && <>
            <button className="btn-secondary" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-secondary" onClick={downloadPdf} disabled={pdfLoading}>
              {pdfLoading ? 'Generating...' : '⬇️ PDF'}
            </button>
          </>}
          <button className="btn-primary" onClick={() => setShowForm(p => !p)}>
            {showForm ? 'Cancel' : '+ Assign Teacher'}
          </button>
        </div>
      </div>

      <div className="filter-bar no-print">
        <div className="form-group">
          <label>Academic Year</label>
          <select value={yearId} onChange={handleYearChange} className="select-input">
            <option value="">— Select year —</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="form-card no-print">
          <h3>Assign Teacher to Subject</h3>
          <form onSubmit={handleAssign}>
            <div className="form-row">
              <div className="form-group">
                <label>Teacher *</label>
                <select value={form.staff_id} onChange={e => setForm(p => ({...p, staff_id: e.target.value}))} className="select-input" required>
                  <option value="">— Select teacher —</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.last_name} {s.first_name} {s.role ? '('+s.role+')' : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <select value={form.subject_id} onChange={e => setForm(p => ({...p, subject_id: e.target.value}))} className="select-input" required>
                  <option value="">— Select subject —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (×{s.coefficient})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Class *</label>
                <select value={form.class_id} onChange={e => setForm(p => ({...p, class_id: e.target.value}))} className="select-input" required disabled={!yearId}>
                  <option value="">— Select class —</option>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name} {c.stream||''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Periods/week</label>
                <input type="number" min="1" max="20" value={form.periods_per_week}
                  onChange={e => setForm(p => ({...p, periods_per_week: parseInt(e.target.value)}))}
                  className="select-input" style={{ maxWidth: 80 }} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Assign'}</button>
            </div>
          </form>
        </div>
      )}

      {message && <div className="success-banner no-print">{message}</div>}
      {error   && <div className="error-banner no-print">{error}</div>}
      {loading && <p className="loading-text no-print">Loading workload...</p>}

      {workload.length > 0 && (
        <div ref={printRef}>
          <div className="wl-summary-bar no-print">
            <span><strong>{workload.length}</strong> teachers assigned</span>
            <span><strong>{totalPeriods}</strong> total periods/week</span>
            <span><strong>{totalPeriods * 36}</strong> annual periods</span>
          </div>

          {workload.map(teacher => (
            <div key={teacher.staff_id} className="wl-teacher-block">
              <div className="wl-teacher-header">
                <div>
                  <strong>{teacher.last_name} {teacher.first_name}</strong>
                  <span className="wl-staff-num"> — {teacher.staff_number}</span>
                  {teacher.staff_role && <span className="wl-role-badge">{teacher.staff_role}</span>}
                </div>
                <div className="wl-totals">
                  <span>{teacher.total_periods} periods/week</span>
                  <span>{teacher.total_periods * 36} annual periods</span>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Coef</th>
                    <th>Periods/Week</th>
                    <th>Annual Periods</th>
                    <th className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teacher.assignments.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.subject_name}</strong>{a.subject_name_fr ? <span style={{color:'#888',fontSize:11}}> / {a.subject_name_fr}</span> : ''}</td>
                      <td>{a.class_name} {a.class_stream||''}</td>
                      <td>×{a.coefficient}</td>
                      <td>{a.periods_per_week}</td>
                      <td>{a.periods_per_week * 36}</td>
                      <td className="no-print">
                        <button className="btn-icon danger"
                          onClick={() => handleRemove(a.id, teacher.last_name + ' ' + a.subject_name)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {yearId && !loading && workload.length === 0 && (
        <div className="empty-panel">
          <p>No workload assignments yet for this year.</p>
          <p>Click <strong>+ Assign Teacher</strong> to get started.</p>
        </div>
      )}
    </div>
  );
}
