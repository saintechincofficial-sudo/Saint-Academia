import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { Users, UserCheck, BookOpen, GraduationCap, TrendingUp, School } from 'lucide-react';

const STATS = [
  { key:'students', label:'Students',  sub:'Registered',     icon:Users,        color:'#1E88C7', light:'#EBF5FB' },
  { key:'staff',    label:'Staff',     sub:'Active members', icon:UserCheck,    color:'#2E9E4E', light:'#EAFAF1' },
  { key:'classes',  label:'Classes',   sub:'This year',      icon:School,       color:'#B8730A', light:'#FDF5E6' },
  { key:'subjects', label:'Subjects',  sub:'Configured',     icon:BookOpen,     color:'#8E44AD', light:'#F5EEF8' },
];

export default function DashboardSummary() {
  const { get } = useApi();
  const [counts,  setCounts]  = useState({ students:0, staff:0, classes:0, subjects:0 });
  const [school,  setSchool]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [sr, sfr, cr, subr, scr] = await Promise.all([
        get('/students?limit=1'),
        get('/staff?limit=1'),
        get('/classes'),
        get('/subjects'),
        get('/schools/me'),
      ]);
      setCounts({
        students: sr.pagination?.total_items  ?? 0,
        staff:    sfr.pagination?.total_items ?? 0,
        classes:  (cr.classes   || []).length,
        subjects: (subr.subjects || []).length,
      });
      if (scr.success) setSchool(scr.school);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            height:110, borderRadius:12,
            background:'linear-gradient(90deg,#f0f2f5 25%,#e4e7ec 50%,#f0f2f5 75%)',
            backgroundSize:'200% 100%',
            animation:'shimmer 1.4s infinite'
          }} />
        ))}
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ marginBottom:24 }}>
      {/* School banner */}
      {school && (
        <div style={{
          background:'linear-gradient(135deg,#1B2A4A 0%,#253d6b 100%)',
          borderRadius:12, padding:'16px 24px', marginBottom:20,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          boxShadow:'0 4px 20px rgba(27,42,74,0.25)'
        }}>
          <div>
            <div style={{ color:'#fff', fontSize:17, fontWeight:700, marginBottom:3 }}>
              {school.name}
            </div>
            {school.region && (
              <div style={{ color:'#8fa8c8', fontSize:13 }}>{school.region}</div>
            )}
          </div>
          {school.motto && (
            <div style={{
              color:'#7ec8f0', fontSize:13, fontStyle:'italic',
              maxWidth:320, textAlign:'right', opacity:0.85
            }}>
              "{school.motto}"
            </div>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        {STATS.map(({ key, label, sub, icon:Icon, color, light }) => (
          <div key={key} style={{
            background:'#fff', borderRadius:12, padding:'20px 22px',
            borderTop:`4px solid ${color}`,
            boxShadow:'0 1px 8px rgba(0,0,0,0.07)',
            transition:'transform 0.15s, box-shadow 0.15s',
            cursor:'default'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 8px rgba(0,0,0,0.07)'; }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{
                background:light, borderRadius:8, padding:8,
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <Icon size={20} color={color} strokeWidth={2} />
              </div>
              <div style={{
                background:light, color:color,
                fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20,
                textTransform:'uppercase', letterSpacing:'0.5px'
              }}>
                {sub}
              </div>
            </div>
            <div style={{ fontSize:34, fontWeight:800, color:color, lineHeight:1, marginBottom:4 }}>
              {counts[key]}
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:'#1B2A4A' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
