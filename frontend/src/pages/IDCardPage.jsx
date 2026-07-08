import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api','') || 'http://localhost/SaintAcademia';

const QR = ({ data, size = 60 }) => (
  <img
    src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`}
    width={size} height={size} alt="QR"
    style={{ display:'block', imageRendering:'pixelated' }}
  />
);

function StudentCard({ student, school, year, cardType }) {
  const photo = student.photo_path ? API_BASE + student.photo_path : null;
  const initials = ((student.first_name?.[0]||'')+(student.last_name?.[0]||'')).toUpperCase();
  const logo = school?.logo_path ? API_BASE + school.logo_path : null;
  const qrData = student.local_id || student.student_number || '';

  return (
    <div style={{
      width:'85.6mm', height:'54mm',
      background:'#f5f5f0',
      border:'1.2px solid #1B2A4A',
      borderRadius:'2.5mm',
      overflow:'hidden',
      display:'flex', flexDirection:'column',
      fontFamily:'Arial, sans-serif',
      boxSizing:'border-box',
      pageBreakInside:'avoid',
      breakInside:'avoid',
    }}>
      {/* Header */}
      <div style={{
        background:'#1B2A4A', height:'13.5mm',
        display:'flex', alignItems:'center',
        padding:'1mm 2mm', gap:'1.5mm', flexShrink:0,
      }}>
        <div style={{
          width:'11mm', height:'11mm', minWidth:'11mm',
          background:'#fff', borderRadius:'1mm',
          display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
        }}>
          {logo
            ? <img src={logo} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="logo" />
            : <span style={{ fontSize:'6pt', color:'#1B2A4A', fontWeight:900, textAlign:'center', lineHeight:1.1, padding:'1mm' }}>{school?.name?.slice(0,6)||'SCH'}</span>
          }
        </div>
        <div style={{ flex:1, textAlign:'center' }}>
          <div style={{ color:'#fff', fontSize:'5.5pt', fontWeight:900, lineHeight:1.2, letterSpacing:'0.2px' }}>
            {school?.name || 'SCHOOL NAME'}
          </div>
          {school?.name_fr && (
            <div style={{ color:'#8fa8c8', fontSize:'4.5pt', fontWeight:700, lineHeight:1.2 }}>
              {school.name_fr}
            </div>
          )}
          <div style={{
            display:'inline-block', background:'#7ec8f0', color:'#1B2A4A',
            fontSize:'4.5pt', fontWeight:900, borderRadius:'3mm', padding:'0.4mm 2mm', marginTop:'0.5mm',
          }}>
            {cardType === 'staff' ? 'STAFF ID' : 'STUDENT ID'} • {year || '2025/2026'}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', padding:'1mm 1.5mm', gap:'1.5mm', overflow:'hidden', position:'relative' }}>
        {/* Watermark */}
        {logo && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.06, pointerEvents:'none' }}>
            <img src={logo} style={{ width:'26mm', height:'26mm', objectFit:'contain' }} alt="" />
          </div>
        )}

        {/* Left: photo + QR */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1mm', zIndex:1, flexShrink:0, width:'21mm' }}>
          <div style={{
            width:'19mm', height:'23mm',
            background:'#ccc', border:'0.8px solid #999', borderRadius:'1mm',
            overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          }}>
            {photo
              ? <img src={photo} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} alt="" />
              : <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <div style={{ fontSize:'12pt', fontWeight:700, color:'#555' }}>{initials}</div>
                  <div style={{ fontSize:'3.5pt', color:'#888', textAlign:'center', lineHeight:1.3 }}>PHOTO</div>
                </div>
            }
          </div>
          {qrData && (
            <div style={{
              width:'17mm', height:'17mm', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'#fff', border:'0.5px solid #ccc', borderRadius:'0.8mm', overflow:'hidden',
            }}>
              <QR data={qrData} size={60} />
            </div>
          )}
        </div>

        {/* Right: fields */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between', zIndex:1, minWidth:0 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'1mm' }}>
            {[
              ['NAME', `${student.last_name||''} ${student.first_name||''}`.trim()],
              ['SEX',  student.gender || (cardType==='staff' ? student.gender : '')],
              ['DOB',  student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : ''],
              cardType === 'staff'
                ? ['ROLE', (student.role||'').split(' - ')[0]]
                : ['CLASS', student.class_name || ''],
              cardType === 'staff'
                ? ['STAFF NO', student.staff_number || '']
                : ['REG NO',  student.student_number || ''],
              ['ID NO', student.local_id || '—'],
            ].map(([label, val]) => val && (
              <div key={label} style={{ display:'flex', alignItems:'flex-start', lineHeight:1.2, textTransform:'uppercase' }}>
                <span style={{ fontWeight:900, color:'#111', width:'10.5mm', fontSize:'4.8pt', flexShrink:0 }}>{label}</span>
                <span style={{ color:'#111', fontSize:'4.2pt', fontWeight:700, margin:'0 0.7mm', flexShrink:0 }}>:</span>
                <span style={{ color:'#000', fontSize:'5.2pt', fontWeight:700, flex:1, overflowWrap:'break-word', lineHeight:1.2 }}>{val}</span>
              </div>
            ))}
          </div>
          {/* Signature line */}
          <div style={{ textAlign:'center', width:'100%' }}>
            <div style={{ width:'100%', borderBottom:'0.5px solid #1B2A4A', marginBottom:'0.5mm' }} />
            <div style={{ fontSize:'4pt', color:'#1B2A4A', fontWeight:700 }}>PRINCIPAL / PROVISEUR</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:'#1B2A4A', height:'2mm', flexShrink:0 }} />
    </div>
  );
}

function StaffCard({ staff, school, year }) {
  return <StudentCard student={staff} school={school} year={year} cardType="staff" />;
}

export default function IDCardPage() {
  const { get } = useApi();
  const printRef = useRef(null);

  const { user } = useAuth();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const isSuperAdmin = userRoles.includes('super_admin');

  const [schools,   setSchools]  = useState([]);
  const [schoolId,  setSchoolId] = useState('');
  const [tab,       setTab]      = useState('student'); // 'student' | 'staff'
  const [years,    setYears]    = useState([]);
  const [classes,  setClasses]  = useState([]);
  const [yearId,   setYearId]   = useState('');
  const [classId,  setClassId]  = useState('');
  const [students, setStudents] = useState([]);
  const [staffAll, setStaffAll] = useState([]);
  const [school,   setSchool]   = useState(null);
  const [yearLabel,setYearLabel]= useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (isSuperAdmin) {
      get('/schools').then(r => { if (r.success) setSchools(r.schools || []); });
    } else {
      get('/schools/me').then(r => { if (r.success) setSchool(r.school); });
    }
    if (isSuperAdmin && schoolId) {
      // fetch school profile for selected school
      get('/schools/' + schoolId).then(r => { if (r.success) setSchool(r.school); });
    }
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
    get('/staff?limit=200').then(r => { if (r.success) setStaffAll(r.staff || []); });
  }, []);

  const filteredClasses = yearId
    ? classes.filter(c => String(c.academic_year_id || c.year_id) === String(yearId))
    : [];

  const generate = async () => {
    if (!classId || !yearId) { setError('Select year and class'); return; }
    setLoading(true); setError('');
    const cls = classes.find(c => String(c.id) === String(classId));
    const yr  = years.find(y => String(y.id) === String(yearId));
    setYearLabel(yr?.label || '');
    const res = await get(`/students?class_id=${classId}&academic_year_id=${yearId}&limit=100`);
    setLoading(false);
    if (res.success) setStudents((res.students||[]).map(s => ({ ...s, class_name: cls?.name||'' })));
    else setError(res.message);
  };

  const items = tab === 'student' ? students : staffAll;

  return (
    <div className="tab-content">
      <div className="section-header no-print">
        <h2>ID Card Generator</h2>
        {items.length > 0 && (
          <button className="btn-primary" onClick={() => window.print()}>Print Cards</button>
        )}
      </div>

      {/* Tab toggle */}
      <div className="no-print" style={{ display:'flex', gap:0, border:'1px solid #d0d8e4', borderRadius:8, overflow:'hidden', width:'fit-content', marginBottom:16 }}>
        {[['student','Student ID Cards'],['staff','Staff ID Cards']].map(([k,l]) => (
          <button key={k} onClick={() => { setTab(k); setStudents([]); }}
            style={{ padding:'8px 20px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight: tab===k?700:400,
              background: tab===k ? '#1B2A4A' : '#fff', color: tab===k ? '#fff' : '#555' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Filters */}
      {isSuperAdmin && (
        <div className="filter-bar no-print" style={{ marginBottom:0 }}>
          <div className="form-group">
            <label>School</label>
            <select value={schoolId} onChange={e => { setSchoolId(e.target.value); setStudents([]); setYearId(''); setClassId(''); }}
              className="select-input">
              <option value="">— Select school —</option>
              {schools.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      )}
      {tab === 'student' && (
        <div className="filter-bar no-print">
          <div className="form-group">
            <label>Academic Year</label>
            <select value={yearId} onChange={e => { setYearId(e.target.value); setClassId(''); setStudents([]); }} className="select-input">
              <option value="">— Select year —</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Class</label>
            <select value={classId} onChange={e => { setClassId(e.target.value); setStudents([]); }} className="select-input" disabled={!yearId}>
              <option value="">— Select class —</option>
              {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name} {c.stream||''}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={generate} disabled={loading || !classId || !yearId}>
            {loading ? 'Loading...' : 'Generate Cards'}
          </button>
        </div>
      )}

      {error && <div className="error-banner no-print">{error}</div>}

      {/* Info */}
      {tab === 'staff' && staffAll.length > 0 && (
        <p className="no-print" style={{ fontSize:13, color:'#7a8fae', marginBottom:16 }}>
          {staffAll.length} staff members loaded. Click <strong>Print Cards</strong> to print all.
        </p>
      )}

      {/* Cards grid */}
      {items.length > 0 && (
        <div ref={printRef} style={{
          display:'grid',
          gridTemplateColumns:'85.6mm 85.6mm',
          gap:'3mm 4.8mm',
          padding:'10mm 12mm',
          background:'#fff',
        }}>
          {items.map((item, i) => (
            tab === 'student'
              ? <StudentCard key={item.id} student={item} school={school} year={yearLabel} cardType="student" />
              : <StaffCard   key={item.id} staff={item}   school={school} year={years[0]?.label||''} />
          ))}
          {/* Fill last row */}
          {items.length % 2 !== 0 && (
            <div style={{ width:'85.6mm', height:'54mm', border:'1px dashed #ddd', borderRadius:'2.5mm' }} />
          )}
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; margin: 0; }
          @page { size: A4 portrait; margin: 0; }
          div[style*="85.6mm"] { padding: 10mm 12mm !important; }
        }
      `}</style>
    </div>
  );
}
