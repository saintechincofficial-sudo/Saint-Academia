import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import './DashboardSummary.css';

const STAT_DEFS = [
  { key: 'students', label: 'Students',    sub: 'Registered',        color: '#1E88C7', bg: '#EBF5FB' },
  { key: 'staff',    label: 'Staff',       sub: 'Active members',    color: '#2E9E4E', bg: '#EAFAF1' },
  { key: 'classes',  label: 'Classes',     sub: 'This year',         color: '#B8730A', bg: '#FDF5E6' },
  { key: 'subjects', label: 'Subjects',    sub: 'Configured',        color: '#8E44AD', bg: '#F5EEF8' },
];

export default function DashboardSummary() {
  const { get } = useApi();
  const [counts,  setCounts]  = useState({ students:0, staff:0, classes:0, subjects:0 });
  const [school,  setSchool]  = useState(null);
  const [year,    setYear]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [sr, sfr, cr, subr, scr, tr] = await Promise.all([
        get('/students?limit=1'),
        get('/staff?limit=1'),
        get('/classes'),
        get('/subjects'),
        get('/schools/me'),
        get('/terms'),
      ]);
      setCounts({
        students: sr.pagination?.total_items  ?? 0,
        staff:    sfr.pagination?.total_items ?? 0,
        classes:  (cr.classes  || []).length,
        subjects: (subr.subjects || []).length,
      });
      if (scr.success) setSchool(scr.school);
      if (tr.success)  setYear(tr.terms?.[0] ? `${tr.terms[0].label?.split(' ')[1] || ''}` : null);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="ds-skeleton-grid">
        {[1,2,3,4].map(i => <div key={i} className="ds-skeleton-card" />)}
      </div>
    );
  }

  return (
    <div className="ds-wrapper">
      {school && (
        <div className="ds-school-bar">
          <div className="ds-school-name">{school.name}</div>
          <div className="ds-school-meta">
            {school.region && <span>{school.region}</span>}
            {school.motto  && <span className="ds-motto">"{school.motto}"</span>}
          </div>
        </div>
      )}
      <div className="ds-stat-grid">
        {STAT_DEFS.map(s => (
          <div key={s.key} className="ds-stat-card" style={{ borderTopColor: s.color }}>
            <div className="ds-stat-num" style={{ color: s.color }}>{counts[s.key]}</div>
            <div className="ds-stat-label">{s.label}</div>
            <div className="ds-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
