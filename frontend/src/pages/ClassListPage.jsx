import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ClassListPage.css';

export default function ClassListPage() {
  const { get } = useApi();
  const printRef = useRef(null);

  const [years,     setYears]     = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [yearId,    setYearId]    = useState('');
  const [classId,   setClassId]   = useState('');
  const [students,  setStudents]  = useState([]);
  const [school,    setSchool]    = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [yearInfo,  setYearInfo]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [pdfLoading,setPdfLoading]= useState(false);

  useEffect(() => {
    get('/classes').then(r => {
      if (!r.success) return;
      const all = r.classes || [];
      setClasses(all);
      const seen = new Set();
      const uy = [];
      all.forEach(c => {
        const id = c.academic_year_id || c.year_id;
        if (id && !seen.has(id)) { seen.add(id); uy.push({ id, label: c.academic_year }); }
      });
      setYears(uy);
    });
    get('/schools/me').then(r => { if (r.success) setSchool(r.school); });
  }, []);

  const filteredClasses = yearId
    ? classes.filter(c => String(c.academic_year_id || c.year_id) === String(yearId))
    : [];

  const handleYearChange = e => {
    setYearId(e.target.value);
    setClassId('');
    setStudents([]);
    setError('');
  };

  const generate = async () => {
    if (!classId || !yearId) { setError('Select year and class'); return; }
    setLoading(true); setError('');
    setClassInfo(classes.find(c => String(c.id) === String(classId)));
    setYearInfo(years.find(y => String(y.id) === String(yearId)));
    const res = await get(`/students?class_id=${classId}&academic_year_id=${yearId}&limit=100`);
    setLoading(false);
    if (res.success) setStudents(res.students || []);
    else setError(res.message);
  };

  const downloadPdf = async () => {
    const el = printRef.current;
    if (!el) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        windowWidth: el.scrollWidth,
      });
      const imgData = canvas.toDataURL('image/png');
      const margin = 8;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth()  - margin * 2;
      const pdfH = pdf.internal.pageSize.getHeight() - margin * 2;
      const ratio   = pdfW / canvas.width;
      const scaledH = canvas.height * ratio;
      if (scaledH <= pdfH) {
        pdf.addImage(imgData, 'PNG', margin, margin, pdfW, scaledH);
      } else {
        let yPos = 0; let page = 0;
        const pageSliceH = pdfH / ratio;
        while (yPos < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceH = Math.min(pageSliceH, canvas.height - yPos);
          const tmp = document.createElement('canvas');
          tmp.width = canvas.width; tmp.height = Math.ceil(sliceH);
          tmp.getContext('2d').drawImage(canvas, 0, yPos, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          pdf.addImage(tmp.toDataURL('image/png'), 'PNG', margin, margin, pdfW, sliceH * ratio);
          yPos += sliceH; page++;
        }
      }
      const cn = (classInfo?.name || 'Class').replace(/\s+/g, '_');
      const yr = (yearInfo?.label || '').replace('/', '-');
      pdf.save('Classlist_' + cn + '_' + yr + '.pdf');
    } catch (e) { console.error(e); }
    setPdfLoading(false);
  };

  const formatDate = d => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d; }
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost/SaintAcademia';

  const sorted = [...students].sort((a, b) =>
    (a.last_name + ' ' + a.first_name).localeCompare(b.last_name + ' ' + b.first_name)
  );

  return (
    <div className="tab-content">
      <div className="section-header no-print">
        <h2>📋 Class List</h2>
        {students.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary" onClick={downloadPdf} disabled={pdfLoading}>
              {pdfLoading ? 'Generating…' : '⬇️ Download PDF'}
            </button>
          </div>
        )}
      </div>

      <div className="filter-bar no-print">
        <div className="form-group">
          <label>Academic Year</label>
          <select value={yearId} onChange={handleYearChange} className="select-input">
            <option value="">— Select year —</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Class</label>
          <select value={classId}
            onChange={e => { setClassId(e.target.value); setStudents([]); }}
            className="select-input" disabled={!yearId}>
            <option value="">— Select class —</option>
            {filteredClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.stream || ''}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={generate} disabled={loading || !classId || !yearId}>
          {loading ? 'Loading…' : '📋 Generate List'}
        </button>
      </div>

      {error && <div className="error-banner no-print">{error}</div>}

      {students.length > 0 && (
        <div ref={printRef} className="classlist-wrapper">

          <div className="cl-header">
            <div className="cl-letterhead-left">
              <p><strong>REPUBLIC OF CAMEROON</strong></p>
              <p>Peace – Work – Fatherland</p>
              <p>* * * * * * * * *</p>
              <p>MINISTRY OF SECONDARY EDUCATION</p>
              <p>* * * * * * * * *</p>
              {school?.region     && <p>REGIONAL DELEGATION {school.region?.toUpperCase()}</p>}
              <p>* * * * * * * * *</p>
              {school?.delegation && <p>DIVISIONAL DELEGATION {school.delegation?.toUpperCase()}</p>}
              <p>* * * * * * * * *</p>
              <p><strong>{school?.name}</strong></p>
              <p>* * * * * * * * *</p>
            </div>
            <div className="cl-logo-center">
              {school?.logo_path
                ? <img src={API_BASE + school.logo_path} alt="logo" className="cl-logo" />
                : <div className="cl-logo-placeholder">🏫</div>
              }
            </div>
            <div className="cl-letterhead-right">
              <p><strong>REPUBLIQUE DU CAMEROUN</strong></p>
              <p>Paix – Travail – Patrie</p>
              <p>* * * * * * * * *</p>
              <p>MINISTERE DE L'ENSEIGNEMENT SECONDAIRE</p>
              <p>* * * * * * * * *</p>
              {school?.region     && <p>DELEGATION REGIONALE {school.region?.toUpperCase()}</p>}
              <p>* * * * * * * * *</p>
              {school?.delegation && <p>DELEGATION DEPARTEEMENTALE {school.delegation?.toUpperCase()}</p>}
              <p>* * * * * * * * *</p>
              <p><strong>COLLEGE POLYVALENT</strong></p>
              <p>* * * * * * * * *</p>
            </div>
          </div>

          <div className="cl-title">
            {classInfo?.name} Classlist For the Academic Year {yearInfo?.label}
          </div>

          <table className="cl-table">
            <thead>
              <tr>
                <th className="cl-name">NAME/Nom</th>
                <th className="cl-sex">SEXE</th>
                <th className="cl-dob">DOB</th>
                <th className="cl-pob">POB</th>
                <th className="cl-contact">CONTACT</th>
                <th className="cl-status">STATUS</th>
                <th className="cl-parent">FATHER'S NAME</th>
                <th className="cl-parent">MOTHER'S NAME</th>
                <th className="cl-id">Identification Number</th>
                <th className="cl-ev">EV1</th>
                <th className="cl-ev">EV2</th>
                <th className="cl-ev">EV3</th>
                <th className="cl-ev">EV4</th>
                <th className="cl-ev">EV5</th>
                <th className="cl-ev">EV6</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'cl-even' : 'cl-odd'}>
                  <td className="cl-name-cell"><strong>{s.last_name} {s.first_name}</strong></td>
                  <td className="cl-center">{s.gender?.[0] || ''}</td>
                  <td className="cl-center">{formatDate(s.date_of_birth)}</td>
                  <td>{s.place_of_birth || ''}</td>
                  <td>{s.phone || ''}</td>
                  <td className="cl-center">{s.entry_status || 'new'}</td>
                  <td>{s.father_name || ''}</td>
                  <td>{s.mother_name || ''}</td>
                  <td className="cl-center">{s.local_id || ''}</td>
                  <td className="cl-ev-cell"></td>
                  <td className="cl-ev-cell"></td>
                  <td className="cl-ev-cell"></td>
                  <td className="cl-ev-cell"></td>
                  <td className="cl-ev-cell"></td>
                  <td className="cl-ev-cell"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="cl-footer">
            <div className="cl-sig">
              <div className="cl-sig-line"></div>
              <p>Class Teacher / Prof. Principal</p>
            </div>
            <div className="cl-sig">
              <div className="cl-sig-line"></div>
              <p>Vice Principal / Censeur</p>
            </div>
            <div className="cl-sig">
              <div className="cl-sig-line"></div>
              <p>Principal / Proviseur</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
