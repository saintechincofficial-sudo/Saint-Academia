import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function WorkloadPage() {
  const { get, post, del } = useApi();
  const printRef = useRef(null);

  const [years,     setYears]     = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [staff,     setStaff]     = useState([]);
  const [workload,  setWorkload]  = useState([]);
  const [yearId,    setYearId]    = useState('');
  const [staffId,   setStaffId]   = useState('');
  const [classId,   setClassId]   = useState('');
  const [viewMode,  setViewMode]  = useState('teacher'); // 'teacher' | 'class'
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [message,   setMessage]   = useState('');
  const [pdfLoading,setPdfLoading]= useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ staff_id:'', subject_id:'', class_id:'', periods_per_week:1 });

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
    setYearId(yid); setWorkload([]); setStaffId(''); setClassId('');
    if (yid) loadWorkload(yid);
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
      setMessage(res.message); setShowForm(false);
      setForm({ staff_id:'', subject_id:'', class_id:'', periods_per_week:1 });
      loadWorkload(yearId);
    } else setError(res.message);
  };

  const handleRemove = async (id, label) => {
    if (!window.confirm(`Remove assignment: ${label}?`)) return;
    const res = await del(`/workload/${id}`);
    if (res.success) loadWorkload(yearId);
    else setError(res.message);
  };

  const downloadPdf = async () => {
    const el = printRef.current;
    if (!el) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#fff', windowWidth:el.scrollWidth });
      const imgData = canvas.toDataURL('image/png');
      const margin = 8;
      const pdf = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
      const pdfW = pdf.internal.pageSize.getWidth() - margin*2;
      const pdfH = pdf.internal.pageSize.getHeight() - margin*2;
      const ratio = pdfW / canvas.width;
      const scaledH = canvas.height * ratio;
      if (scaledH <= pdfH) {
        pdf.addImage(imgData, 'PNG', margin, margin, pdfW, scaledH);
      } else {
        let yPos=0; let page=0;
        const ph = pdfH/ratio;
        while (yPos < canvas.height) {
          if (page>0) pdf.addPage();
          const sh = Math.min(ph, canvas.height-yPos);
          const tmp = document.createElement('canvas');
          tmp.width=canvas.width; tmp.height=Math.ceil(sh);
          tmp.getContext('2d').drawImage(canvas,0,yPos,canvas.width,sh,0,0,canvas.width,sh);
          pdf.addImage(tmp.toDataURL('image/png'),'PNG',margin,margin,pdfW,sh*ratio);
          yPos+=sh; page++;
        }
      }
      const yr = years.find(y=>String(y.id)===String(yearId));
      pdf.save('Workload_'+(yr?.label||'').replace('/','_')+'.pdf');
    } catch(e) { console.error(e); }
    setPdfLoading(false);
  };

  // ── Derived data ──────────────────────────────────────────

  // For Teacher view: filter by selected teacher if any
  const teacherData = staffId
    ? workload.filter(w => String(w.staff_id) === String(staffId))
    : workload;

  // For Class view: group assignments by class
  const classData = (() => {
    if (!workload.length) return [];
    const map = {};
    workload.forEach(teacher => {
      teacher.assignments.forEach(a => {
        if (!map[a.class_id]) {
          map[a.class_id] = {
            class_id: a.class_id,
            class_name: a.class_name + (a.class_stream ? ' '+a.class_stream : ''),
            assignments: [],
            total_periods: 0,
          };
        }
        map[a.class_id].assignments.push({
          ...a,
          teacher_name: teacher.last_name + ' ' + teacher.first_name,
          staff_number: teacher.staff_number,
        });
        map[a.class_id].total_periods += a.periods_per_week;
      });
    });
    const filtered = Object.values(map);
    return classId
      ? filtered.filter(c => String(c.class_id) === String(classId))
      : filtered;
  })();

  const totalPeriods = workload.reduce((s,w) => s + (w.total_periods||0), 0);

  return (
    <div className="tab-content">
      <div className="section-header no-print">
        <h2>Teacher Workload</h2>
        <div style={{ display:'flex', gap:8 }}>
          {workload.length > 0 && <>
            <button className="btn-secondary" onClick={() => window.print()}>Print</button>
            <button className="btn-secondary" onClick={downloadPdf} disabled={pdfLoading}>
              {pdfLoading ? 'Generating...' : 'Download PDF'}
            </button>
          </>}
          <button className="btn-primary" onClick={() => { setShowForm(p=>!p); setError(''); }}>
            {showForm ? 'Cancel' : '+ Assign Teacher'}
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filter-bar no-print">
        <div className="form-group">
          <label>Academic Year</label>
          <select value={yearId} onChange={handleYearChange} className="select-input">
            <option value="">— Select year —</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>

        {/* View toggle */}
        <div className="form-group">
          <label>View by</label>
          <div style={{ display:'flex', gap:0, border:'1px solid #d0d8e4', borderRadius:7, overflow:'hidden' }}>
            {['teacher','class'].map(m => (
              <button key={m}
                onClick={() => { setViewMode(m); setStaffId(''); setClassId(''); }}
                style={{
                  padding:'8px 18px', border:'none', cursor:'pointer',
                  background: viewMode===m ? '#1B2A4A' : '#fff',
                  color: viewMode===m ? '#fff' : '#4a5568',
                  fontWeight: viewMode===m ? 600 : 400, fontSize:13,
                  fontFamily:'inherit',
                }}>
                {m === 'teacher' ? 'By Teacher' : 'By Class'}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher filter (only in teacher view) */}
        {viewMode === 'teacher' && yearId && workload.length > 0 && (
          <div className="form-group">
            <label>Teacher</label>
            <select value={staffId} onChange={e => setStaffId(e.target.value)} className="select-input">
              <option value="">— All teachers —</option>
              {workload.map(w => (
                <option key={w.staff_id} value={w.staff_id}>
                  {w.last_name} {w.first_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Class filter (only in class view) */}
        {viewMode === 'class' && yearId && filteredClasses.length > 0 && (
          <div className="form-group">
            <label>Class</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} className="select-input">
              <option value="">— All classes —</option>
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.stream||''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Assign form ── */}
      {showForm && (
        <div className="form-card no-print">
          <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#1B2A4A' }}>
            Assign Teacher to Subject
          </h3>
          <form onSubmit={handleAssign}>
            <div className="form-row">
              <div className="form-group">
                <label>Teacher *</label>
                <select value={form.staff_id} onChange={e=>setForm(p=>({...p,staff_id:e.target.value}))} className="select-input" required>
                  <option value="">— Select teacher —</option>
                  {[...staff].sort((a,b)=>a.last_name.localeCompare(b.last_name)).map(s => (
                    <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject *</label>
                <select value={form.subject_id} onChange={e=>setForm(p=>({...p,subject_id:e.target.value}))} className="select-input" required>
                  <option value="">— Select subject —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (×{s.coefficient})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Class *</label>
                <select value={form.class_id} onChange={e=>setForm(p=>({...p,class_id:e.target.value}))} className="select-input" required disabled={!yearId}>
                  <option value="">— Select class —</option>
                  {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name} {c.stream||''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Periods/week</label>
                <input type="number" min="1" max="20" value={form.periods_per_week}
                  onChange={e=>setForm(p=>({...p,periods_per_week:parseInt(e.target.value)||1}))}
                  className="select-input" style={{ maxWidth:80 }} />
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
      {loading && <p className="loading-text no-print">Loading workload data...</p>}

      {/* ── Content ── */}
      {workload.length > 0 && (
        <div ref={printRef}>

          {/* Summary bar */}
          <div className="wl-summary-bar no-print">
            <span><strong>{workload.length}</strong> teachers assigned</span>
            <span><strong>{totalPeriods}</strong> total periods/week</span>
            <span><strong>{totalPeriods * 36}</strong> annual periods</span>
            {viewMode==='teacher' && staffId && <span style={{color:'#1E88C7',fontWeight:600}}>
              Showing: {workload.find(w=>String(w.staff_id)===staffId)?.last_name} {workload.find(w=>String(w.staff_id)===staffId)?.first_name}
            </span>}
          </div>

          {/* ── TEACHER VIEW ── */}
          {viewMode === 'teacher' && teacherData.map(teacher => (
            <div key={teacher.staff_id} className="wl-teacher-block">
              <div className="wl-teacher-header">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <strong style={{ fontSize:14 }}>{teacher.last_name} {teacher.first_name}</strong>
                  <span className="wl-staff-num">{teacher.staff_number}</span>
                  {teacher.staff_role && (
                    <span className="wl-role-badge">{teacher.staff_role.split(' - ')[0]}</span>
                  )}
                </div>
                <div className="wl-totals">
                  <span>{teacher.total_periods} periods/week</span>
                  <span>{teacher.total_periods * 36} annual</span>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Coefficient</th>
                    <th>Periods/Week</th>
                    <th>Annual Periods</th>
                    <th className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teacher.assignments.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.subject_name}</strong>
                        {a.subject_name_fr && <span style={{color:'#888',fontSize:11,marginLeft:4}}>/ {a.subject_name_fr}</span>}
                      </td>
                      <td>{a.class_name} {a.class_stream||''}</td>
                      <td><span className="coef-badge">×{a.coefficient}</span></td>
                      <td>{a.periods_per_week}</td>
                      <td>{a.periods_per_week * 36}</td>
                      <td className="no-print">
                        <button className="btn-icon danger"
                          onClick={() => handleRemove(a.id, `${teacher.last_name} — ${a.subject_name}`)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'#f7f9fc', fontWeight:600 }}>
                    <td colSpan="3" style={{ padding:'9px 14px', color:'#1B2A4A' }}>Total</td>
                    <td style={{ padding:'9px 14px' }}>{teacher.total_periods}</td>
                    <td style={{ padding:'9px 14px' }}>{teacher.total_periods * 36}</td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          {/* ── CLASS VIEW ── */}
          {viewMode === 'class' && classId > 0 && (() => {
            // Show ALL subjects, with teacher if assigned
            const assignedMap = {};
            classData.forEach(cls => {
              if (String(cls.class_id) === String(classId)) {
                cls.assignments.forEach(a => { assignedMap[a.subject_id] = a; });
              }
            });
            const cls = classData.find(c => String(c.class_id) === String(classId));
            const clsName = filteredClasses.find(c => String(c.id) === String(classId));
            return (
              <div className="wl-teacher-block">
                <div className="wl-teacher-header">
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <strong style={{ fontSize:14 }}>{clsName?.name} {clsName?.stream||''} — Subject Assignments</strong>
                    <span className="wl-staff-num">
                      {Object.keys(assignedMap).length}/{subjects.length} subjects assigned
                    </span>
                  </div>
                  {cls && <div className="wl-totals">
                    <span>{cls.total_periods} periods/week</span>
                    <span>{cls.total_periods * 36} annual</span>
                  </div>}
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Coef</th>
                      <th>Assigned Teacher</th>
                      <th>Periods/Week</th>
                      <th>Annual</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...subjects].sort((a,b)=>a.name.localeCompare(b.name)).map(subj => {
                      const assigned = assignedMap[subj.id];
                      return (
                        <tr key={subj.id} style={{ background: assigned ? '#fff' : '#fffbf0' }}>
                          <td><strong>{subj.name}</strong></td>
                          <td><span className="coef-badge">×{subj.coefficient}</span></td>
                          <td>
                            {assigned
                              ? <span style={{ color:'#1B2A4A', fontWeight:600 }}>{assigned.teacher_name}</span>
                              : (
                                <select
                                  defaultValue=""
                                  id={"staff-"+subj.id}
                                  className="select-input"
                                  style={{ minWidth:180, fontSize:12, padding:'5px 8px' }}>
                                  <option value="">— Assign teacher —</option>
                                  {[...staff].sort((a,b)=>a.last_name.localeCompare(b.last_name)).map(s => (
                                    <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>
                                  ))}
                                </select>
                              )
                            }
                          </td>
                          <td>
                            {assigned
                              ? assigned.periods_per_week
                              : <input type="number" min="1" max="20" defaultValue="2"
                                  id={"periods-"+subj.id}
                                  style={{ width:50, padding:'4px 6px', border:'1px solid #d0d8e4', borderRadius:6, textAlign:'center', fontSize:13 }} />
                            }
                          </td>
                          <td>{assigned ? assigned.periods_per_week * 36 : '—'}</td>
                          <td>
                            {assigned
                              ? <button className="btn-icon danger"
                                  onClick={() => handleRemove(assigned.id, subj.name)}>🗑️</button>
                              : <button className="btn-primary"
                                  style={{ padding:'5px 12px', fontSize:12 }}
                                  onClick={async () => {
                                    const sid = document.getElementById("staff-"+subj.id)?.value;
                                    const per = parseInt(document.getElementById("periods-"+subj.id)?.value) || 2;
                                    if (!sid) { setError('Select a teacher first'); return; }
                                    setSaving(true); setError('');
                                    const res = await post('/workload', {
                                      staff_id: parseInt(sid),
                                      subject_id: subj.id,
                                      class_id: parseInt(classId),
                                      academic_year_id: parseInt(yearId),
                                      periods_per_week: per
                                    });
                                    setSaving(false);
                                    if (res.success) { setMessage('Assigned!'); loadWorkload(yearId); }
                                    else setError(res.message);
                                  }}>
                                  Assign
                                </button>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {viewMode === 'class' && !classId && (
            <div className="empty-panel">
              <p>Select a class above to view and manage its subject assignments.</p>
            </div>
          )}

          {viewMode === 'class' && false && classData.map(cls => (
            <div key={cls.class_id} className="wl-teacher-block">
              <div className="wl-teacher-header">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <strong style={{ fontSize:14 }}>{cls.class_name}</strong>
                  <span className="wl-staff-num">{cls.assignments.length} subjects assigned</span>
                </div>
                <div className="wl-totals">
                  <span>{cls.total_periods} periods/week</span>
                  <span>{cls.total_periods * 36} annual</span>
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Coefficient</th>
                    <th>Teacher</th>
                    <th>Staff No.</th>
                    <th>Periods/Week</th>
                    <th>Annual Periods</th>
                    <th className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cls.assignments
                    .sort((a,b) => a.subject_name.localeCompare(b.subject_name))
                    .map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.subject_name}</strong></td>
                      <td><span className="coef-badge">×{a.coefficient}</span></td>
                      <td>{a.teacher_name}</td>
                      <td style={{ color:'#888', fontSize:12 }}>{a.staff_number}</td>
                      <td>{a.periods_per_week}</td>
                      <td>{a.periods_per_week * 36}</td>
                      <td className="no-print">
                        <button className="btn-icon danger"
                          onClick={() => handleRemove(a.id, `${a.subject_name} — ${a.teacher_name}`)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'#f7f9fc', fontWeight:600 }}>
                    <td colSpan="4" style={{ padding:'9px 14px', color:'#1B2A4A' }}>Total</td>
                    <td style={{ padding:'9px 14px' }}>{cls.total_periods}</td>
                    <td style={{ padding:'9px 14px' }}>{cls.total_periods * 36}</td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
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
