import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ReportCardPage.css';

// ── Reusable report card component ─────────────────────────
function RcCard({ rc, API_BASE, fmt }) {
  if (!rc) return null;
  const g = rc.general_avg;
  return (
    <div>
      <div className="rc-header">
        <div className="rc-letterhead">
          <p><strong>REPUBLIC OF CAMEROON</strong></p><p>Peace - Work - Fatherland</p>
          <p>***********</p><p>MINISTRY OF SECONDARY EDUCATION</p>
          <p>***********</p><p>REGIONAL DELEGATION FOR SOUTH WEST</p>
          <p>***********</p><p>DIVISIONAL DELEGATION FOR MEME</p>
          <p>***********</p><p><strong>{rc.school?.name}</strong></p><p>***********</p>
        </div>
        <div className="rc-logo-center">
          {rc.school?.logo_path
            ? <img src={API_BASE + rc.school.logo_path} alt="logo" className="rc-logo" />
            : <div className="rc-logo-ph">School</div>}
        </div>
        <div className="rc-letterhead rc-letterhead-right">
          <p><strong>REPUBLIQUE DU CAMEROUN</strong></p><p>Paix - Travail - Patrie</p>
          <p>***********</p><p>MINISTERE DE L'ENSEIGNEMENT SECONDAIRE</p>
          <p>***********</p><p>DELEGATION REGIONALE DU SUD OUEST</p>
          <p>***********</p><p>DELEGATION DEPARTEEMENTALE DE MEME</p>
          <p>***********</p><p><strong>COLLEGE POLYVALENT</strong></p><p>***********</p>
        </div>
      </div>

      <div className="rc-title">
        {(rc.term?.label || 'TERM').toUpperCase()} REPORT CARD {rc.academic_year?.label}
      </div>

      <div className="rc-info-grid">
        <div className="rc-info-row">
          <span className="rc-info-label">Name &amp; Surnames</span>
          <span className="rc-info-val"><strong>{rc.student?.last_name} {rc.student?.first_name}</strong></span>
          <span className="rc-info-label">Class:</span>
          <span className="rc-info-val"><strong>{rc.class?.name}</strong></span>
        </div>
        <div className="rc-info-row">
          <span className="rc-info-label">Date of Birth :</span>
          <span className="rc-info-val">{fmt(rc.student?.date_of_birth)}</span>
          <span className="rc-info-label">Class number:</span>
          <span className="rc-info-val">{rc.rank}</span>
        </div>
        <div className="rc-info-row">
          <span className="rc-info-label">Place of Birth:</span>
          <span className="rc-info-val">{rc.student?.place_of_birth || ''}</span>
          <span className="rc-info-label">ENROLMENT:</span>
          <span className="rc-info-val">{rc.class_size}</span>
        </div>
        <div className="rc-info-row">
          <span className="rc-info-label">SEX</span>
          <span className="rc-info-val">{rc.student?.gender || ''}</span>
          <span className="rc-info-label">STUDENT ID</span>
          <span className="rc-info-val">{rc.student?.local_id || rc.student?.student_number}</span>
        </div>
      </div>

      <table className="rc-table">
        <thead>
          <tr>
            <th className="rc-subj-col">SUBJECTS/DISCIPLINES</th>
            <th className="rc-score">{rc.seq_labels?.[0] || 'S1'}/20</th>
            <th className="rc-score">{rc.seq_labels?.[1] || 'S2'}/20</th>
            <th className="rc-score">Term(M)/20</th>
            <th className="rc-coef">Coef(C)</th>
            <th className="rc-total">Total(MxC)</th>
            <th className="rc-pos">Position</th>
            <th className="rc-remark">Remark</th>
            <th className="rc-teacher">Teacher's Name</th>
          </tr>
        </thead>
        <tbody>
          {rc.subjects?.map((s, i) => (
            <tr key={s.subject_id} className={i%2===0?'rc-even':'rc-odd'}>
              <td className="rc-subj-name">
                <strong>{s.name}</strong>
                {s.name_fr ? <span className="rc-fr"> / {s.name_fr}</span> : ''}
              </td>
              <td className={'rc-num ' + (s.seq1 !== null && s.seq1 < 10 ? 'rc-fail' : 'rc-pass')}>{s.seq1 ?? ''}</td>
              <td className={'rc-num ' + (s.seq2 !== null && s.seq2 < 10 ? 'rc-fail' : 'rc-pass')}>{s.seq2 ?? ''}</td>
              <td className={'rc-num ' + (s.term_avg !== null && s.term_avg < 10 ? 'rc-fail' : 'rc-pass')}><strong>{s.term_avg ?? ''}</strong></td>
              <td className="rc-num">{s.coefficient}</td>
              <td className={'rc-num rc-total-cell ' + (s.total !== null && s.total < s.coefficient*10 ? 'rc-fail' : '')}>{s.total ?? ''}</td>
              <td className="rc-num">{s.position || ''}</td>
              <td className="rc-remark-cell">{s.remark}</td>
              <td className="rc-teacher-cell">{s.teacher || ''}</td>
            </tr>
          ))}
          <tr className="rc-perf-row">
            <td><strong>STUDENT'S PERFORMANCE</strong></td>
            <td colSpan="2" className="rc-num"><strong>FIRST TERM</strong><br/>{rc.term_averages?.[1] ?? ''}</td>
            <td colSpan="2" className="rc-num"><strong>SECOND TERM</strong><br/>{rc.term_averages?.[2] ?? ''}</td>
            <td className="rc-num"><strong>{rc.total_coeff}</strong></td>
            <td className="rc-num"><strong>{rc.total_points}</strong></td>
            <td colSpan="2" className="rc-remark-cell">Subjects Sat :{rc.subjects_sat}<br/>Subjects Passed :{rc.subjects_passed}</td>
          </tr>
        </tbody>
      </table>

      <div className="rc-bottom">
        <table className="rc-stats-table">
          <tbody>
            <tr>
              <th>Total Marks</th><td>{rc.total_points}</td>
              <th rowSpan="4" style={{padding:'4px 8px',background:'#f0f0f0'}}>class Performance</th>
              <th rowSpan="4" style={{verticalAlign:'top',padding:'4px 8px',background:'#f0f0f0'}}>
                Highest Avg<br/><strong style={{color:'#2E9E4E'}}>{rc.highest_avg}</strong><br/>
                Lowest Avg<br/><strong style={{color:'#c0392b'}}>{rc.lowest_avg}</strong>
              </th>
              <th rowSpan="4" colSpan="2" style={{padding:'4px 8px',fontWeight:'bold',color:'#1B2A4A',background:'#EBF1F8'}}>PRINCIPAL'S REMARKS</th>
            </tr>
            <tr><th>Total Coeff</th><td>{rc.total_coeff}</td></tr>
            <tr><th>Avg</th><td><strong style={{color:g>=10?'#2E9E4E':'#c0392b'}}>{g}</strong></td></tr>
            <tr><th>Position</th><td><strong>{rc.rank} /{rc.class_size}</strong></td></tr>
            <tr><th>Remark</th><td colSpan="2">{rc.appreciation}</td><td>Class Avg</td><td colSpan="2">{rc.class_avg}</td></tr>
          </tbody>
        </table>

        <div className="rc-conduct-grid">
          <div className="rc-conduct">
            <div className="rc-conduct-title">GENERAL CONDUCT/DISCIPLINE</div>
            <table className="rc-conduct-table"><tbody>
              <tr><td>Absences in hours</td><td>{rc.attendance?.absent || '.'}</td></tr>
              <tr><td>Dismissed</td><td></td></tr>
              <tr><td>Warning</td><td></td></tr>
              <tr><td>Serious Warning</td><td></td></tr>
              <tr><td>Suspension in days</td><td></td></tr>
            </tbody></table>
            <div className="rc-fees">FEES OWED:<strong> 0</strong></div>
            <div className="rc-council">
              <strong>CLASS COUNCIL DECISION</strong>
              <p>{g >= 14 ? 'Satisfactory' : g >= 10 ? 'Could do better' : 'Must Work Harder'}</p>
            </div>
          </div>
          <div className="rc-academic">
            <div className="rc-conduct-title">ACADEMIC WORK</div>
            <table className="rc-conduct-table"><tbody>
              <tr><td>Distinction</td><td>{g >= 16 ? 'X' : ''}</td></tr>
              <tr><td>Credit</td><td>{g >= 12 && g < 16 ? 'X' : ''}</td></tr>
              <tr><td>Honour roll</td><td>{g >= 14 && g < 16 ? 'X' : ''}</td></tr>
              <tr><td>Average</td><td>{g >= 10 && g < 12 ? 'X' : ''}</td></tr>
              <tr><td>Dismissed</td><td>{g < 10 ? 'X' : ''}</td></tr>
              <tr><td>Warning</td><td></td></tr>
              <tr><td>Serious Waring</td><td></td></tr>
            </tbody></table>
            <div className="rc-parent-sig">
              <strong>PARENT'S SIGNATURE</strong>
              <div className="rc-sig-line"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────
export default function ReportCardPage() {
  const { get } = useApi();
  const printRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api','') || 'http://localhost/SaintAcademia';

  const [years,     setYears]     = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [terms,     setTerms]     = useState([]);
  const [students,  setStudents]  = useState([]);
  const [yearId,    setYearId]    = useState('');
  const [classId,   setClassId]   = useState('');
  const [termId,    setTermId]    = useState('');
  const [studentId, setStudentId] = useState('');
  const [rc,        setRc]        = useState(null);
  const [allRcs,    setAllRcs]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [loadingSt, setLoadingSt] = useState(false);
  const [loadingAll,setLoadingAll]= useState(false);
  const [error,     setError]     = useState('');
  const [pdfLoading,setPdfLoading]= useState(false);

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
    get('/terms').then(r => { if (r.success) setTerms(r.terms || []); });
  }, []);

  const filteredClasses = yearId
    ? classes.filter(c => String(c.academic_year_id || c.year_id) === String(yearId))
    : [];

  const loadStudents = async (cid, yid, tid) => {
    if (!cid || !yid || !tid) return;
    setLoadingSt(true); setStudents([]); setStudentId(''); setRc(null); setAllRcs([]);
    const res = await get(`/report-card/overview?class_id=${cid}&academic_year_id=${yid}&term_id=${tid}`);
    setLoadingSt(false);
    if (res.success) setStudents(res.students || []);
    else setError(res.message);
  };

  const generate = async (sid) => {
    const id = sid || studentId;
    if (!id || !classId || !yearId || !termId) return;
    setStudentId(id); setLoading(true); setError(''); setRc(null); setAllRcs([]);
    const res = await get(`/report-card?student_id=${id}&class_id=${classId}&academic_year_id=${yearId}&term_id=${termId}`);
    setLoading(false);
    if (res.success) setRc(res.report_card);
    else setError(res.message);
  };

  const printAll = async () => {
    if (!classId || !yearId || !termId) return;
    setLoadingAll(true); setAllRcs([]); setRc(null);
    const res = await get(`/report-card/all?class_id=${classId}&academic_year_id=${yearId}&term_id=${termId}`);
    setLoadingAll(false);
    if (res.success) setAllRcs(res.report_cards || []);
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
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth()  - margin * 2;
      const pdfH = pdf.internal.pageSize.getHeight() - margin * 2;
      const ratio = pdfW / canvas.width;
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
      const name = (rc?.student?.last_name || 'Student').replace(/\s+/g,'_');
      const term = (rc?.term?.label || '').replace(/\s+/g,'_');
      pdf.save('ReportCard_' + name + '_' + term + '.pdf');
    } catch(e) { console.error(e); }
    setPdfLoading(false);
  };

  const fmt = d => { if (!d) return ''; try { return new Date(d).toLocaleDateString('en-GB'); } catch { return d; } };

  return (
    <div className="tab-content">
      <div className="section-header no-print">
        <h2>Report Cards</h2>
        <div style={{ display:'flex', gap:8 }}>
          {rc && <>
            <button className="btn-secondary" onClick={() => window.print()}>Print</button>
            <button className="btn-primary" onClick={downloadPdf} disabled={pdfLoading}>
              {pdfLoading ? 'Generating...' : 'Download PDF'}
            </button>
          </>}
          {allRcs.length > 0 && <>
            <button className="btn-secondary" onClick={() => setAllRcs([])}>Clear All</button>
            <button className="btn-primary" onClick={() => window.print()}>Print All ({allRcs.length})</button>
          </>}
        </div>
      </div>

      <div className="filter-bar no-print">
        <div className="form-group">
          <label>Academic Year</label>
          <select value={yearId} onChange={e => { setYearId(e.target.value); setClassId(''); setTermId(''); setStudents([]); setRc(null); setAllRcs([]); }} className="select-input">
            <option value="">-- Year --</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Class</label>
          <select value={classId} onChange={e => { setClassId(e.target.value); setStudents([]); setRc(null); setAllRcs([]); }} className="select-input" disabled={!yearId}>
            <option value="">-- Class --</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name} {c.stream||''}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Term</label>
          <select value={termId} onChange={e => setTermId(e.target.value)} className="select-input" disabled={!classId}>
            <option value="">-- Term --</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.label || 'Term '+t.term_number}</option>)}
          </select>
        </div>
        <button className="btn-primary" onClick={() => loadStudents(classId, yearId, termId)}
          disabled={loadingSt || !classId || !yearId || !termId}>
          {loadingSt ? 'Loading...' : 'Load Students'}
        </button>
        <button className="btn-secondary" onClick={printAll}
          disabled={loadingAll || !classId || !yearId || !termId}>
          {loadingAll ? 'Loading all...' : 'Print All'}
        </button>
      </div>

      {error && <div className="error-banner no-print">{error}</div>}
      {loading && <p className="loading-text no-print">Generating report card...</p>}
      {loadingAll && <p className="loading-text no-print">Generating all report cards...</p>}

      {students.length > 0 && !allRcs.length && (
        <div className="rc-student-list no-print">
          <h3>Select a student ({students.length})</h3>
          <div className="rc-student-grid">
            {students.map(s => (
              <button key={s.id}
                className={'rc-student-btn' + (String(s.id) === String(studentId) ? ' active' : '')}
                onClick={() => generate(s.id)}>
                <strong>{s.last_name} {s.first_name}</strong>
                <span>{s.student_number}</span>
                {s.avg && <span className={parseFloat(s.avg) >= 10 ? 'avg-pass' : 'avg-fail'}>{s.avg}/20</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {rc && !allRcs.length && (
        <div ref={printRef} className="rc-wrapper">
          <RcCard rc={rc} API_BASE={API_BASE} fmt={fmt} />
        </div>
      )}

      {allRcs.length > 0 && (
        <div>
          {allRcs.map((card, idx) => (
            <div key={idx} className="rc-wrapper" style={{ pageBreakAfter: 'always', marginBottom: 24 }}>
              <RcCard rc={card} API_BASE={API_BASE} fmt={fmt} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
