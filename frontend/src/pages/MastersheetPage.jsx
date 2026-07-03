import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import './MastersheetPage.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const VIEW_MODES = [
  { value: 'term1',  label: 'First Term  (Seq 1 & 2)' },
  { value: 'term2',  label: 'Second Term (Seq 3 & 4)' },
  { value: 'term3',  label: 'Third Term  (Seq 5 & 6) + Annual' },
  { value: 'annual', label: 'Annual Results Only' },
];

function MastersheetTable({ data, rows, stats, title }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      {title && (
        <div className="ms-section-title">{title}</div>
      )}

      {/* Stats bar */}
      <div className="ms-stats">
        <div className="stat-box">
          <span className="stat-num">{stats?.sat_count ?? stats?.total_students}</span>
          <span>Effectif</span>
        </div>
        <div className="stat-box pass">
          <span className="stat-num">{stats?.pass_count}</span>
          <span>Admis</span>
        </div>
        <div className="stat-box fail">
          <span className="stat-num">{stats?.fail_count}</span>
          <span>Refusés</span>
        </div>
        <div className="stat-box avg">
          <span className="stat-num">{stats?.class_average ?? '—'}</span>
          <span>Moy. Classe</span>
        </div>
        <div className="stat-box rate">
          <span className="stat-num">{stats?.pass_rate}%</span>
          <span>Taux Réussite</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{stats?.highest_avg ?? '—'}</span>
          <span>Moy. Max</span>
        </div>
        <div className="stat-box">
          <span className="stat-num">{stats?.lowest_avg ?? '—'}</span>
          <span>Moy. Min</span>
        </div>
      </div>

      {/* Main table */}
      <div className="ms-table-wrapper">
        <table className="ms-table">
          <thead>
            <tr>
              <th className="ms-num">#</th>
              <th className="ms-name-col">Name / Nom</th>
              {data.subjects?.map(s => (
                <th key={s.id} className="ms-subject-header">
                  {s.code || s.name}
                  {s.name_fr ? ` / ${s.name_fr}` : ''}
                </th>
              ))}
              <th className="ms-tm">TM</th>
              <th className="ms-avg">AVG/20</th>
              <th className="ms-rank">P</th>
            </tr>
            <tr className="ms-coef-row">
              <th></th>
              <th>Coefficients</th>
              {data.subjects?.map(s => <th key={s.id}>{s.coefficient}</th>)}
              <th>{data.total_coefficients}</th>
              <th>/20</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.student_id}
                className={idx % 2 === 0 ? 'ms-row-even' : 'ms-row-odd'}>
                <td className="ms-num">{idx + 1}</td>
                <td className="ms-name-cell">
                  <span className="ms-student-name">{row.last_name} {row.first_name}</span>
                  <span className="ms-student-num">{row.student_number}</span>
                </td>
                {row.cells?.map((cell, ci) => (
                  <td key={ci} className={
                    cell.points === null ? 'cell-null' :
                    cell.avg_score >= 10 ? 'cell-pass' : 'cell-fail'
                  }>
                    {cell.points !== null ? cell.points.toFixed(2) : '—'}
                  </td>
                ))}
                <td className="ms-tm">{row.tm?.toFixed(2) ?? '—'}</td>
                <td className={`ms-avg ${row.avg >= 10 ? 'avg-pass' : 'avg-fail'}`}>
                  {row.avg?.toFixed(2) ?? '—'}
                </td>
                <td className="ms-rank">{row.rank}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="ms-footer-row">
              <td colSpan="2">Moyenne de classe / Class Average</td>
              {data.subjects?.map((s, i) => <td key={i}>—</td>)}
              <td>—</td>
              <td>{stats?.class_average?.toFixed(2) ?? '—'}</td>
              <td>—</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Analysis section */}
      <div className="ms-analysis">
        <table className="ms-analysis-table">
          <tbody>
            <tr>
              <th>Effectif total</th>
              <td>{stats?.total_students}</td>
              <th>Admis (≥10/20)</th>
              <td className="pass-cell">{stats?.pass_count}</td>
              <th>Refusés (&lt;10/20)</th>
              <td className="fail-cell">{stats?.fail_count}</td>
            </tr>
            <tr>
              <th>Moy. de classe</th>
              <td>{stats?.class_average?.toFixed(2) ?? '—'}</td>
              <th>Moy. la plus haute</th>
              <td>{stats?.highest_avg?.toFixed(2) ?? '—'}</td>
              <th>Moy. la plus basse</th>
              <td>{stats?.lowest_avg?.toFixed(2) ?? '—'}</td>
            </tr>
            <tr>
              <th>Taux de réussite</th>
              <td><strong>{stats?.pass_rate}%</strong></td>
              <th>Distinction (≥16)</th>
              <td>{rows.filter(r => r.avg >= 16).length}</td>
              <th>Insuffisant (&lt;8)</th>
              <td>{rows.filter(r => r.avg !== null && r.avg < 8).length}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MastersheetPage() {
  const { get } = useApi();

  const [years,    setYears]    = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [yearId,   setYearId]   = useState('');
  const [classId,  setClassId]  = useState('');
  const [viewMode, setViewMode] = useState('term1');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const downloadPdf = async () => {
    const el = document.getElementById('ms-printable');
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'mm', format: 'a3' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      const cn = (data?.class?.name || 'Form').replace(/\s+/g, '_');
      const yr = (data?.academic_year?.label || '').replace('/', '-');
      const vw = (data?.view_label || '').replace(/\s+/g, '_');
      pdf.save(`Mastersheet_${cn}_${yr}_${vw}.pdf`);
    } catch(e) { console.error(e); }
    setPdfLoading(false);
  };

  useEffect(() => {
    get('/classes').then(r => {
      if (!r.success) return;
      const allClasses = r.classes || [];
      setClasses(allClasses);
      const seen = new Set();
      const uniqueYears = [];
      allClasses.forEach(c => {
        const id = c.academic_year_id || c.year_id;
        if (id && !seen.has(id)) {
          seen.add(id);
          uniqueYears.push({ id, label: c.academic_year });
        }
      });
      setYears(uniqueYears);
    });
  }, []);

  const filteredClasses = yearId
    ? classes.filter(c => String(c.academic_year_id || c.year_id) === String(yearId))
    : [];

  const handleYearChange = (e) => {
    setYearId(e.target.value);
    setClassId('');
    setData(null);
    setError('');
  };

  const generate = async () => {
    if (!classId || !yearId) { setError('Select year and class first'); return; }
    setLoading(true); setError(''); setData(null);
    const res = await get(
      `/mastersheet?class_id=${classId}&academic_year_id=${yearId}&view_mode=${viewMode}`
    );
    setLoading(false);
    if (res.success) setData(res.mastersheet);
    else setError(res.message);
  };

  const isT3 = viewMode === 'term3';

  return (
    <div className="tab-content">
      <div className="section-header no-print">
        <h2>📊 Mastersheet — Relevé de Notes</h2>
        {data && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => window.print()}>🖨️ Print</button>
            <button className="btn-primary" onClick={downloadPdf} disabled={pdfLoading}>
              {pdfLoading ? 'Generating PDF…' : '⬇️ Download PDF'}
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
            onChange={e => { setClassId(e.target.value); setData(null); }}
            className="select-input" disabled={!yearId}>
            <option value="">— Select class —</option>
            {filteredClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.stream || ''}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>View</label>
          <select value={viewMode}
            onChange={e => { setViewMode(e.target.value); setData(null); }}
            className="select-input">
            {VIEW_MODES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>
        <button className="btn-primary"
          onClick={generate}
          disabled={loading || !classId || !yearId}>
          {loading ? 'Generating…' : '📊 Generate'}
        </button>
      </div>

      {error   && <div className="error-banner no-print">{error}</div>}
      {loading && <p className="loading-text no-print">Calculating…</p>}

      {data && (
        <div className="mastersheet-wrapper" id="ms-printable">

          {/* ── Header ── */}
          <div className="ms-header">
            <div className="ms-school-info">
              <h2>{data.school?.name}</h2>
              {data.school?.name_fr    && <h2>{data.school.name_fr}</h2>}
              {data.school?.address    && <p>{data.school.address}</p>}
              {data.school?.phone      && <p>Tel: {data.school.phone}</p>}
              {data.school?.region     && <p>{data.school.region}</p>}
              {data.school?.delegation && <p>{data.school.delegation}</p>}
            </div>
            <div className="ms-title-block">
              <h1>MASTERSHEET</h1>
              <h2>RELEVÉ DE NOTES</h2>
              <p style={{ marginTop: 6, fontSize: 12, fontWeight: 'bold', color: '#1E88C7' }}>
                {data.view_label}
              </p>
            </div>
            <div className="ms-meta-info">
              <p><strong>Class / Classe:</strong> {data.class?.name} {data.class?.stream || ''}</p>
              <p><strong>Academic Year / Année:</strong> {data.academic_year?.label}</p>
              <p><strong>Period / Période:</strong> {data.view_label}</p>
              <p><strong>Effectif:</strong> {data.stats?.total_students}</p>
            </div>
          </div>

          {/* ── Term table ── */}
          <MastersheetTable
            data={data}
            rows={data.rows}
            stats={data.stats}
            title={isT3 ? '── Third Term Results / Résultats du 3ème Trimestre ──' : null}
          />

          {/* ── Annual table (only for Term 3 view) ── */}
          {isT3 && data.annual_rows && (
            <>
              <div className="ms-page-break" />
              <div className="ms-header" style={{ marginTop: 16 }}>
                <div className="ms-school-info">
                  <h2>{data.school?.name}</h2>
                  {data.school?.name_fr && <h2>{data.school.name_fr}</h2>}
                </div>
                <div className="ms-title-block">
                  <h1>ANNUAL MASTERSHEET</h1>
                  <h2>RELEVÉ DE NOTES ANNUEL</h2>
                </div>
                <div className="ms-meta-info">
                  <p><strong>Class:</strong> {data.class?.name}</p>
                  <p><strong>Year:</strong> {data.academic_year?.label}</p>
                </div>
              </div>
              <MastersheetTable
                data={data}
                rows={data.annual_rows}
                stats={data.annual_stats}
                title="── Annual Results / Résultats Annuels (All Terms) ──"
              />
            </>
          )}

          {/* ── Signature block ── */}
          <div className="ms-signature-block">
            <div className="sig-box">
              <p><strong>Chef d'Etablissement / Principal</strong></p>
              <div className="sig-line"></div>
              <p>Name &amp; Stamp</p>
            </div>
            <div className="sig-box">
              <p><strong>Responsable des Notes / Results Officer</strong></p>
              <div className="sig-line"></div>
              <p>Name &amp; Signature</p>
            </div>
            <div className="sig-box">
              <p><strong>Date d'émission / Date Issued</strong></p>
              <div className="sig-line"></div>
              <p>{new Date().toLocaleDateString('fr-CM')}</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
