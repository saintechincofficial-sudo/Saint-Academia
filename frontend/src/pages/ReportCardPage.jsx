import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './ReportCardPage.css';

// ── Reusable report card component ─────────────────────────
function RcCard({ rc, API_BASE, fmt }) {
  if (!rc) return null;
  const g = rc.general_avg;
  const photoPath = rc.student?.photo_path;
  const termNum = rc.term?.term_number || 3;

  const scoreClass = v => {
    if (v === null || v === undefined || v === '') return '';
    const n = parseFloat(v);
    if (n < 10) return 'rc-fail';
    if (n >= 18) return 'rc-vwa';
    return 'rc-pass';
  };
  const valueClass = v => {
    if (v === null || v === undefined || v === '') return '';
    return parseFloat(v) < 10 ? 'rc-value-fail' : 'rc-value-pass';
  };

  const remarkClass = remark => {
    if (!remark) return '';
    if (remark.includes('(CNA)')) return 'rc-remark-cna';
    if (remark.includes('(CAA)')) return 'rc-remark-caa';
    if (remark.includes('(CVWA)')) return 'rc-remark-cvwa';
    if (remark.includes('(CWA)')) return 'rc-remark-cwa';
    return '';
  };

  return (
    <div>
      <div className="rc-header">
        <div className="rc-letterhead">
          <p>REPUBLIC OF CAMEROON</p><p>Peace - Work - Fatherland</p>
          <p>*************</p><p>MINISTRY OF SECONDARY<br/>EDUCATION</p>
          <p>*************</p><p>REGIONAL DELEGATION<br/>FOR SOUTH WEST</p>
          <p>**********</p><p>DIVISIONAL DELEGATION<br/>FOR MEME</p>
          <p>**********</p><p>{rc.school?.name?.toUpperCase()}</p>
          <p>**********</p>
        </div>
        <div className="rc-logo-center">
          {rc.school?.logo_path
            ? <img src={API_BASE + rc.school.logo_path} alt="logo" className="rc-logo" />
            : <div className="rc-logo-ph">School Logo</div>}
        </div>
        <div className="rc-letterhead rc-letterhead-right">
          <p>REPUBLIQUE DE CAMEROUN</p><p>Paix - Travail- Patrie</p>
          <p>*************</p><p>MINISTERE DE EDUCATION<br/>L'ESEIGNEMENT SECONDAIRE</p>
          <p>*************</p><p>DELEGATION REGIONALE<br/>DU SUD OUEST</p>
          <p>**********</p><p>DELEGATION DEPARTEEMENTALE<br/>DE MEME</p>
          <p>**********</p><p>COLLEGE POLYVALENT</p>
          <p>**********</p>
        </div>
      </div>

      <div className="rc-title">
        {(rc.term?.label || 'TERM').toUpperCase()} REPORT CARD {rc.academic_year?.label}
      </div>

      <div className="rc-info-grid">
        <div className="rc-info-main">
          <div className="rc-info-row">
            <span className="rc-info-label">Name &amp; Surnames</span>
            <span className="rc-info-val">{rc.student?.last_name} {rc.student?.first_name}</span>
            <span className="rc-info-label">Class:</span>
            <span className="rc-info-val">{rc.class?.name}</span>
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
            <span className="rc-info-label">SEX/SEXE</span>
            <span className="rc-info-val">{rc.student?.gender || ''}</span>
            <span className="rc-info-label">STUDENT ID</span>
            <span className="rc-info-val">{rc.student?.local_id || rc.student?.student_number}</span>
          </div>
        </div>
        {/* QR placeholder — swap for real generated QR once verification system is built */}
        <div className="rc-qr-box">
          <div className="rc-qr-ph">QR</div>
        </div>
        <div className="rc-info-photo">
          {photoPath
            ? <img src={API_BASE + photoPath} alt="student" className="rc-photo-img" />
            : <div className="rc-photo-ph">No Photo</div>}
        </div>
      </div>

      <table className="rc-table">
        <thead>
          <tr>
            <th className="rc-subj-col">SUBJECTS</th>
            <th>{rc.seq_labels?.[0] || 'S1'}/20</th>
            <th>{rc.seq_labels?.[1] || 'S2'}/20</th>
            <th>Term<br/>Avg/20</th>
            <th>Coef</th>
            <th>Total(MxC)</th>
            <th>Position</th>
            <th>Remark</th>
            <th>Teacher's Name</th>
          </tr>
        </thead>
        <tbody>
          {rc.subjects?.map(s => (
            <tr key={s.subject_id}>
              <td className="rc-subj-name">
                {s.name}
                {s.name_fr ? <span className="rc-fr"> / {s.name_fr}</span> : ''}
              </td>
              <td className={scoreClass(s.seq1)}>{s.seq1 ?? ''}</td>
              <td className={scoreClass(s.seq2)}>{s.seq2 ?? ''}</td>
              <td className={scoreClass(s.term_avg)}>{s.term_avg ?? ''}</td>
              <td>{s.coefficient}</td>
              <td>{s.total ?? ''}</td>
              <td>{s.position || ''}</td>
              <td className={'rc-remark-cell ' + remarkClass(s.remark)}>{s.remark}</td>
              <td className="rc-teacher-cell">{s.teacher || ''}</td>
            </tr>
          ))}
          <tr className="rc-totals-row">
            <td colSpan="3"></td>
            <td>{rc.total_coeff}</td>
            <td>{rc.total_points}</td>
            <td colSpan="4"></td>
          </tr>
        </tbody>
      </table>
      <div className="rc-perf-grid">
        <div className="rc-perf-left">
          <table className="rc-summary-table">
            <tbody>
              <tr><th colSpan="4" style={{textAlign:'left'}}>STUDENT'S / CLASS PERFORMANCE</th></tr>
              {termNum >= 3 && (
                <tr>
                  <td className="rc-label-cell">Annual Average</td>
                  <td className={'rc-value-cell ' + valueClass(rc.annual_avg)}>{rc.annual_avg ?? '-'}</td>
                  <td className="rc-label-cell">Annual Position</td>
                  <td className={'rc-value-small ' + valueClass(rc.annual_avg)}>{rc.annual_position ? `${rc.annual_position}/${rc.class_size}` : '-'}</td>
                </tr>
              )}
              <tr>
                <td className="rc-label-cell">First Term Average</td>
                <td className={'rc-value-cell ' + valueClass(rc.term_averages?.[1])}>{rc.term_averages?.[1] ?? '-'}</td>
                <td className="rc-label-cell">{termNum >= 3 ? 'Term Position' : 'Position'}</td>
                <td className={'rc-value-small ' + valueClass(g)}>{rc.rank ? `${rc.rank}/${rc.class_size}` : '-'}</td>
              </tr>
              {termNum >= 2 && (
                <tr>
                  <td className="rc-label-cell">Second Term Average</td>
                  <td className={'rc-value-cell ' + valueClass(rc.term_averages?.[2])}>{rc.term_averages?.[2] ?? '-'}</td>
                  <td className="rc-label-cell"></td>
                  <td></td>
                </tr>
              )}
              {termNum >= 3 && (
                <tr>
                  <td className="rc-label-cell">Third Term Average</td>
                  <td className={'rc-value-cell ' + valueClass(rc.term_averages?.[3])}>{rc.term_averages?.[3] ?? '-'}</td>
                  <td className="rc-label-cell"></td>
                  <td></td>
                </tr>
              )}
              <tr>
                <td className="rc-label-cell">Highest Avg</td>
                <td className="rc-value-small">{rc.highest_avg ?? '-'}</td>
                <td className="rc-label-cell">Lowest Avg</td>
                <td className="rc-value-small">{rc.lowest_avg ?? '-'}</td>
              </tr>
              <tr>
                <td className="rc-label-cell">Class Avg</td>
                <td className="rc-value-small">{rc.class_avg ?? '-'}</td>
                <td className="rc-label-cell">Absences</td>
                <td className="rc-value-small">{rc.attendance?.absent || '-'}</td>
              </tr>
              <tr>
                <td className="rc-label-cell">Subjects Sat</td>
                <td className="rc-value-small">{rc.subjects_sat}</td>
                <td className="rc-label-cell">Subjects Passed</td>
                <td className="rc-value-small">{rc.subjects_passed}</td>
              </tr>
              <tr>
                <td className="rc-label-cell">Appreciation</td>
                <td colSpan="3" className="rc-appreciation-val">{rc.appreciation}</td>
              </tr>
              <tr>
                {/* PLACEHOLDER: Fees Owed hardcoded to 0 until the Fees module is built and wired to real balance data */}
                <td className="rc-label-cell">Fees Owed</td>
                <td colSpan="3" className="rc-value-small">0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="rc-perf-mid">
          <table className="rc-summary-table">
            <tbody>
              <tr><th colSpan="2">DISCIPLINE</th></tr>
              <tr><td colSpan="2">Dismissed</td></tr>
              <tr><td colSpan="2">Warning</td></tr>
              <tr><td colSpan="2">Serious W</td></tr>
            </tbody>
          </table>
        </div>

        <div className="rc-perf-right">
          <table className="rc-summary-table">
            <tbody>
              <tr><th>ACADEMIC WORK</th></tr>
              {['Distinction','Honour Roll','Credit','Pass','Below Average'].map(label => (
                <tr key={label}><td>{label}{rc.academic_work === label ? ' — X' : ''}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="rc-class-council-box">Class Council<br/>Decision</div>
        </div>
      </div>

      <div className="rc-sig-section">
        <div className="rc-sig-left">
          NEXT ACADEMIC YEAR RESUMPTION DATE
          <div className="rc-sig-area"></div>
        </div>
        <div className="rc-sig-right">
          Principal's Signature
          <div className="rc-sig-area"></div>
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
            {students.map((s, idx) => (
              <button key={s.id}
                className={'rc-student-btn' + (String(s.id) === String(studentId) ? ' active' : '')}
                onClick={() => generate(s.id)}>
                <strong>{s.last_name} {s.first_name}</strong>
                <span>{s.student_number}</span>
                {s.avg && <span className={parseFloat(s.avg) >= 10 ? 'avg-pass' : 'avg-fail'}>{s.avg}/20</span>}
                <span className="rc-position-badge">{idx + 1}{idx===0?'st':idx===1?'nd':idx===2?'rd':'th'}</span>
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
