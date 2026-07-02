import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import './MastersheetPage.css';

export default function MastersheetPage() {
  const { get } = useApi();
  const [classes, setClasses] = useState([]);
  const [terms, setTerms]     = useState([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId]   = useState('');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    get('/classes').then(r => { if (r.success) setClasses(r.classes || []); });
    get('/terms').then(r   => { if (r.success) setTerms(r.terms   || []); });
  }, []);

  const generate = async () => {
    if (!classId || !termId) { setError('Select a class and term first'); return; }
    setLoading(true); setError(''); setData(null);
    const res = await get(`/mastersheet?class_id=${classId}&term_id=${termId}`);
    setLoading(false);
    if (res.success) setData(res.mastersheet);
    else setError(res.message);
  };

  const term = terms.find(t => String(t.id) === String(termId));
  const termLabel = term
    ? (term.label || `Term ${term.term_number}`)
    : '';

  return (
    <div className="tab-content">
      <div className="section-header no-print">
        <h2>📊 Mastersheet — Relevé de Notes</h2>
        {data && (
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ Print / Export PDF
          </button>
        )}
      </div>

      <div className="filter-bar no-print">
        <div className="form-group">
          <label>Class</label>
          <select value={classId}
            onChange={e => { setClassId(e.target.value); setData(null); }}
            className="select-input">
            <option value="">— Select class —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Term</label>
          <select value={termId}
            onChange={e => { setTermId(e.target.value); setData(null); }}
            className="select-input">
            <option value="">— Select term —</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>
                {t.label || `Term ${t.term_number}`}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : '📊 Generate'}
        </button>
      </div>

      {error   && <div className="error-banner no-print">{error}</div>}
      {loading && <p className="loading-text no-print">Calculating mastersheet…</p>}

      {data && (
        <div className="mastersheet-wrapper">

          {/* ── Header ── */}
          <div className="ms-header">
            <div className="ms-school-info">
              <h2>{data.school?.name}</h2>
              {data.school?.name_fr && <h2>{data.school.name_fr}</h2>}
              {data.school?.address && <p>{data.school.address}</p>}
              {data.school?.phone   && <p>Tel: {data.school.phone}</p>}
            </div>
            <div className="ms-title-block">
              <h1>MASTERSHEET</h1>
              <h2>RELEVÉ DE NOTES</h2>
            </div>
            <div className="ms-meta-info">
              <p><strong>Class / Classe:</strong> {data.class?.name} {data.class?.stream || ''}</p>
              <p><strong>Term / Trimestre:</strong> {termLabel}</p>
              <p><strong>Academic Year:</strong> {data.term?.year_label}</p>
              <p><strong>Total Students:</strong> {data.stats?.total_students}</p>
            </div>
          </div>

          {/* ── Stats bar ── */}
          <div className="ms-stats">
            <div className="stat-box">
              <span className="stat-num">{data.stats?.total_students}</span>
              <span>Effectif</span>
            </div>
            <div className="stat-box pass">
              <span className="stat-num">{data.stats?.pass_count}</span>
              <span>Admis</span>
            </div>
            <div className="stat-box fail">
              <span className="stat-num">{data.stats?.fail_count}</span>
              <span>Refusés</span>
            </div>
            <div className="stat-box avg">
              <span className="stat-num">{data.stats?.class_average ?? '—'}</span>
              <span>Moy. Classe</span>
            </div>
            <div className="stat-box rate">
              <span className="stat-num">{data.stats?.pass_rate}%</span>
              <span>Taux Réussite</span>
            </div>
          </div>

          {/* ── Main table ── */}
          <div className="ms-table-wrapper">
            <table className="ms-table">
              <thead>
                {/* Row 1 — subject names (vertical) */}
                <tr>
                  <th className="ms-num">#</th>
                  <th className="ms-name-col">
                    Registration Number and Name
                  </th>
                  {data.subjects?.map(s => (
                    <th key={s.id} className="ms-subject-header">
                      {s.name}{s.name_fr ? ` / ${s.name_fr}` : ''}
                    </th>
                  ))}
                  <th className="ms-tm">TM</th>
                  <th className="ms-avg">AVG/20</th>
                  <th className="ms-rank">P</th>
                  <th className="ms-abs">Absences</th>
                </tr>
                {/* Row 2 — coefficients */}
                <tr className="ms-coef-row">
                  <th></th>
                  <th>Coeffs</th>
                  {data.subjects?.map(s => (
                    <th key={s.id}>{s.coefficient}</th>
                  ))}
                  <th>{data.total_coefficients}</th>
                  <th>/20</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {data.rows?.map((row, idx) => (
                  <tr key={row.student_id}
                    className={idx % 2 === 0 ? 'ms-row-even' : 'ms-row-odd'}>
                    <td className="ms-num">{idx + 1}</td>
                    <td className="ms-name-cell">
                      <span className="ms-student-name">
                        {row.last_name} {row.first_name}
                      </span>
                      <span className="ms-student-num">
                        {row.student_number}
                      </span>
                    </td>

                    {row.cells?.map((cell, ci) => (
                      <td key={ci}
                        className={
                          cell.points === null
                            ? 'cell-null'
                            : cell.avg_score >= 10
                            ? 'cell-pass'
                            : 'cell-fail'
                        }>
                        {cell.points !== null
                          ? cell.points.toFixed(2)
                          : '-'}
                      </td>
                    ))}

                    <td className="ms-tm">{row.tm?.toFixed(2) ?? '—'}</td>
                    <td className={`ms-avg ${row.avg >= 10 ? 'avg-pass' : 'avg-fail'}`}>
                      {row.avg?.toFixed(2) ?? '—'}
                    </td>
                    <td className="ms-rank">{row.rank}</td>
                    <td className="ms-abs">{row.absences ?? '-'}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="ms-footer-row">
                  <td colSpan="2">Moyenne de classe / Class Average</td>
                  {data.subjects?.map((s, i) => <td key={i}>—</td>)}
                  <td>—</td>
                  <td>{data.stats?.class_average?.toFixed(2) ?? '—'}</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tfoot>
            </table>
          </div>

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
