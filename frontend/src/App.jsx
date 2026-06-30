import { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState(null);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [staffMessage, setStaffMessage] = useState('');
  const [classMessage, setClassMessage] = useState('');
  const [form, setForm] = useState({
    student_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [staffForm, setStaffForm] = useState({
    staff_number: '',
    first_name: '',
    last_name: '',
    role: 'Teacher',
    email: '',
    phone: '',
  });
  const [classForm, setClassForm] = useState({
    name: '',
    stream: '',
    room: '',
  });
  const [attendanceForm, setAttendanceForm] = useState({
    student_id: '',
    class_id: '',
    status: 'present',
    session_date: new Date().toISOString().slice(0, 10),
  });
  const [feeForm, setFeeForm] = useState({
    student_id: '',
    amount_due: '',
    invoice_number: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    payment_amount: '',
  });
  const [subjects, setSubjects] = useState([]);
  const [results, setResults] = useState([]);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
  });
  const [resultForm, setResultForm] = useState({
    student_id: '',
    subject_id: '',
    class_id: '',
    term_id: '',
    exam_type: 'Test',
    score: '',
    max_score: '100',
    remarks: '',
  });

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (error) {
      setMessage('Unable to load students right now.');
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/staff');
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff || []);
      }
    } catch (error) {
      setStaffMessage('Unable to load staff right now.');
    }
  };

  const loadClasses = async () => {
    try {
      const response = await fetch('/api/classes');
      const data = await response.json();
      if (data.success) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      setClassMessage('Unable to load classes right now.');
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      setClassMessage('Unable to load subjects right now.');
    }
  };

  const loadResults = async () => {
    try {
      const response = await fetch('/api/results');
      const data = await response.json();
      if (data.success) {
        setResults(data.results || []);
      }
    } catch (error) {
      setClassMessage('Unable to load exam results right now.');
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await fetch('/api/attendance');
      const data = await response.json();
      if (data.success) {
        setAttendance(data.attendance || []);
      }
    } catch (error) {
      setClassMessage('Unable to load attendance right now.');
    }
  };

  const loadFees = async () => {
    try {
      const response = await fetch('/api/fees');
      const data = await response.json();
      if (data.success) {
        setFees(data.fees || []);
      }
    } catch (error) {
      setClassMessage('Unable to load fees right now.');
    }
  };

  const loadReport = async () => {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      if (data.success) {
        setReport(data.report || null);
      }
    } catch (error) {
      setClassMessage('Unable to load reports right now.');
    }
  };

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'error', message: 'API unavailable' }));

    loadStudents();
    loadStaff();
    loadClasses();
    loadSubjects();
    loadAttendance();
    loadFees();
    loadResults();
    loadReport();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(form).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setMessage(data.message);
      setForm({ student_number: '', first_name: '', last_name: '', email: '', phone: '' });
      loadStudents();
    } else {
      setMessage(data.message || 'Unable to create student');
    }
  };

  const handleStaffSubmit = async (event) => {
    event.preventDefault();
    setStaffMessage('');

    const response = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(staffForm).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setStaffMessage(data.message);
      setStaffForm({ staff_number: '', first_name: '', last_name: '', role: 'Teacher', email: '', phone: '' });
      loadStaff();
    } else {
      setStaffMessage(data.message || 'Unable to create staff');
    }
  };

  const handleClassSubmit = async (event) => {
    event.preventDefault();
    setClassMessage('');

    const response = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(classForm).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setClassMessage(data.message);
      setClassForm({ name: '', stream: '', room: '' });
      loadClasses();
    } else {
      setClassMessage(data.message || 'Unable to create class');
    }
  };

  const handleSubjectSubmit = async (event) => {
    event.preventDefault();
    setClassMessage('');

    const response = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(subjectForm).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setClassMessage(data.message);
      setSubjectForm({ name: '', code: '' });
      loadSubjects();
    } else {
      setClassMessage(data.message || 'Unable to create subject');
    }
  };

  const handleResultSubmit = async (event) => {
    event.preventDefault();
    setClassMessage('');

    const response = await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(resultForm).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setClassMessage(data.message);
      setResultForm({ student_id: '', subject_id: '', class_id: '', term_id: '', exam_type: 'Test', score: '', max_score: '100', remarks: '' });
      loadResults();
      loadReport();
    } else {
      setClassMessage(data.message || 'Unable to record exam result');
    }
  };

  const handleAttendanceSubmit = async (event) => {
    event.preventDefault();
    setClassMessage('');

    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(attendanceForm).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setClassMessage(data.message);
      setAttendanceForm({ student_id: '', class_id: '', status: 'present', session_date: new Date().toISOString().slice(0, 10) });
      loadAttendance();
    } else {
      setClassMessage(data.message || 'Unable to record attendance');
    }
  };

  const handleFeeSubmit = async (event) => {
    event.preventDefault();
    setClassMessage('');

    const response = await fetch('/api/fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(feeForm).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setClassMessage(data.message);
      setFeeForm({ student_id: '', amount_due: '', invoice_number: '' });
      loadFees();
      loadReport();
    } else {
      setClassMessage(data.message || 'Unable to create invoice');
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setClassMessage('');

    const response = await fetch('/api/fees/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams(paymentForm).toString(),
    });

    const data = await response.json();
    if (data.success) {
      setClassMessage(data.message);
      setPaymentForm({ invoice_id: '', payment_amount: '' });
      loadFees();
      loadReport();
    } else {
      setClassMessage(data.message || 'Unable to apply payment');
    }
  };

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">SaintAcademia</p>
        <h1>Cameroonian Secondary School Management System</h1>
        <p>
          The project now includes a working student management flow from the backend
          database to the frontend dashboard.
        </p>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>API Status</h2>
          <pre>{JSON.stringify(health, null, 2)}</pre>
        </article>

        <article className="info-card">
          <h2>Add Student</h2>
          <form className="student-form" onSubmit={handleSubmit}>
            <input
              placeholder="Student number"
              value={form.student_number}
              onChange={(event) => setForm({ ...form, student_number: event.target.value })}
              required
            />
            <input
              placeholder="First name"
              value={form.first_name}
              onChange={(event) => setForm({ ...form, first_name: event.target.value })}
              required
            />
            <input
              placeholder="Last name"
              value={form.last_name}
              onChange={(event) => setForm({ ...form, last_name: event.target.value })}
              required
            />
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <button type="submit">Save Student</button>
          </form>
          {message ? <p className="message">{message}</p> : null}
        </article>
      </section>

      <section className="info-card table-card">
        <h2>Recent Students</h2>
        {loading ? (
          <p>Loading students...</p>
        ) : students.length === 0 ? (
          <p>No students yet. Add the first one above.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student No.</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.student_number}</td>
                  <td>{`${student.first_name} ${student.last_name}`}</td>
                  <td>{student.email || '—'}</td>
                  <td>{student.phone || '—'}</td>
                  <td>{student.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Add Staff</h2>
          <form className="student-form" onSubmit={handleStaffSubmit}>
            <input
              placeholder="Staff number"
              value={staffForm.staff_number}
              onChange={(event) => setStaffForm({ ...staffForm, staff_number: event.target.value })}
              required
            />
            <input
              placeholder="First name"
              value={staffForm.first_name}
              onChange={(event) => setStaffForm({ ...staffForm, first_name: event.target.value })}
              required
            />
            <input
              placeholder="Last name"
              value={staffForm.last_name}
              onChange={(event) => setStaffForm({ ...staffForm, last_name: event.target.value })}
              required
            />
            <input
              placeholder="Role"
              value={staffForm.role}
              onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value })}
            />
            <input
              placeholder="Email"
              type="email"
              value={staffForm.email}
              onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })}
            />
            <input
              placeholder="Phone"
              value={staffForm.phone}
              onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })}
            />
            <button type="submit">Save Staff</button>
          </form>
          {staffMessage ? <p className="message">{staffMessage}</p> : null}
        </article>

        <article className="info-card">
          <h2>Recent Staff</h2>
          {staff.length === 0 ? (
            <p>No staff yet. Add the first member above.</p>
          ) : (
            <ul className="list-stack">
              {staff.map((member) => (
                <li key={member.id}>
                  <strong>{`${member.first_name} ${member.last_name}`}</strong> — {member.role}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Add Class</h2>
          <form className="student-form" onSubmit={handleClassSubmit}>
            <input
              placeholder="Class name"
              value={classForm.name}
              onChange={(event) => setClassForm({ ...classForm, name: event.target.value })}
              required
            />
            <input
              placeholder="Stream"
              value={classForm.stream}
              onChange={(event) => setClassForm({ ...classForm, stream: event.target.value })}
            />
            <input
              placeholder="Room"
              value={classForm.room}
              onChange={(event) => setClassForm({ ...classForm, room: event.target.value })}
            />
            <button type="submit">Save Class</button>
          </form>
          {classMessage ? <p className="message">{classMessage}</p> : null}
        </article>

        <article className="info-card">
          <h2>Class List</h2>
          {classes.length === 0 ? (
            <p>No classes yet. Add the first class above.</p>
          ) : (
            <ul className="list-stack">
              {classes.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> {item.stream ? `- ${item.stream}` : ''} {item.room ? `(${item.room})` : ''}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Add Subject</h2>
          <form className="student-form" onSubmit={handleSubjectSubmit}>
            <input
              placeholder="Subject name"
              value={subjectForm.name}
              onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })}
              required
            />
            <input
              placeholder="Subject code"
              value={subjectForm.code}
              onChange={(event) => setSubjectForm({ ...subjectForm, code: event.target.value })}
            />
            <button type="submit">Save Subject</button>
          </form>
        </article>

        <article className="info-card">
          <h2>Subjects</h2>
          {subjects.length === 0 ? (
            <p>No subjects yet. Add one above.</p>
          ) : (
            <ul className="list-stack">
              {subjects.map((subject) => (
                <li key={subject.id}>
                  <strong>{subject.name}</strong> {subject.code ? `(${subject.code})` : ''}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Record Exam Result</h2>
          <form className="student-form" onSubmit={handleResultSubmit}>
            <input
              placeholder="Student ID"
              value={resultForm.student_id}
              onChange={(event) => setResultForm({ ...resultForm, student_id: event.target.value })}
              required
            />
            <input
              placeholder="Subject ID"
              value={resultForm.subject_id}
              onChange={(event) => setResultForm({ ...resultForm, subject_id: event.target.value })}
              required
            />
            <input
              placeholder="Class ID"
              value={resultForm.class_id}
              onChange={(event) => setResultForm({ ...resultForm, class_id: event.target.value })}
              required
            />
            <input
              placeholder="Term ID"
              value={resultForm.term_id}
              onChange={(event) => setResultForm({ ...resultForm, term_id: event.target.value })}
              required
            />
            <input
              placeholder="Exam type"
              value={resultForm.exam_type}
              onChange={(event) => setResultForm({ ...resultForm, exam_type: event.target.value })}
            />
            <input
              placeholder="Score"
              value={resultForm.score}
              onChange={(event) => setResultForm({ ...resultForm, score: event.target.value })}
              required
            />
            <input
              placeholder="Max score"
              value={resultForm.max_score}
              onChange={(event) => setResultForm({ ...resultForm, max_score: event.target.value })}
            />
            <input
              placeholder="Remarks"
              value={resultForm.remarks}
              onChange={(event) => setResultForm({ ...resultForm, remarks: event.target.value })}
            />
            <button type="submit">Save Result</button>
          </form>
        </article>

        <article className="info-card">
          <h2>Recent Exam Results</h2>
          {results.length === 0 ? (
            <p>No exam results yet.</p>
          ) : (
            <ul className="list-stack">
              {results.map((result) => (
                <li key={result.id}>
                  <strong>{result.student_first_name} {result.student_last_name}</strong> — {result.subject_name} | {result.exam_type} | {result.score}/{result.max_score} {result.grade} {result.remarks ? `| ${result.remarks}` : ''}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Mark Attendance</h2>
          <form className="student-form" onSubmit={handleAttendanceSubmit}>
            <input
              placeholder="Student ID"
              value={attendanceForm.student_id}
              onChange={(event) => setAttendanceForm({ ...attendanceForm, student_id: event.target.value })}
              required
            />
            <input
              placeholder="Class ID"
              value={attendanceForm.class_id}
              onChange={(event) => setAttendanceForm({ ...attendanceForm, class_id: event.target.value })}
              required
            />
            <input
              placeholder="Date"
              type="date"
              value={attendanceForm.session_date}
              onChange={(event) => setAttendanceForm({ ...attendanceForm, session_date: event.target.value })}
            />
            <select
              value={attendanceForm.status}
              onChange={(event) => setAttendanceForm({ ...attendanceForm, status: event.target.value })}
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
            <button type="submit">Record Attendance</button>
          </form>
          {classMessage ? <p className="message">{classMessage}</p> : null}
        </article>

        <article className="info-card">
          <h2>Recent Attendance</h2>
          {attendance.length === 0 ? (
            <p>No attendance recorded yet.</p>
          ) : (
            <ul className="list-stack">
              {attendance.map((item) => (
                <li key={item.id}>
                  <strong>{item.first_name} {item.last_name}</strong> — {item.status} ({item.class_name})
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>Create Fee Invoice</h2>
          <form className="student-form" onSubmit={handleFeeSubmit}>
            <input
              placeholder="Student ID"
              value={feeForm.student_id}
              onChange={(event) => setFeeForm({ ...feeForm, student_id: event.target.value })}
              required
            />
            <input
              placeholder="Amount due"
              value={feeForm.amount_due}
              onChange={(event) => setFeeForm({ ...feeForm, amount_due: event.target.value })}
              required
            />
            <input
              placeholder="Invoice number"
              value={feeForm.invoice_number}
              onChange={(event) => setFeeForm({ ...feeForm, invoice_number: event.target.value })}
            />
            <button type="submit">Create Invoice</button>
          </form>

          <h2 style={{ marginTop: '1.5rem' }}>Pay Invoice</h2>
          <form className="student-form" onSubmit={handlePaymentSubmit}>
            <input
              placeholder="Invoice ID"
              value={paymentForm.invoice_id}
              onChange={(event) => setPaymentForm({ ...paymentForm, invoice_id: event.target.value })}
              required
            />
            <input
              placeholder="Payment amount"
              value={paymentForm.payment_amount}
              onChange={(event) => setPaymentForm({ ...paymentForm, payment_amount: event.target.value })}
              required
            />
            <button type="submit">Apply Payment</button>
          </form>

          {classMessage ? <p className="message">{classMessage}</p> : null}
        </article>

        <article className="info-card">
          <h2>Recent Fees</h2>
          {fees.length === 0 ? (
            <p>No fee invoices yet.</p>
          ) : (
            <ul className="list-stack">
              {fees.map((item) => (
                <li key={item.id}>
                  <strong>{item.invoice_number}</strong> — {item.first_name} {item.last_name} | Due {item.amount_due} | Balance {item.balance} | {item.status}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>System Report</h2>
          {report === null ? (
            <p>Loading report...</p>
          ) : (
            <div className="report-grid">
              <div><strong>Students</strong><p>{report.students}</p></div>
              <div><strong>Staff</strong><p>{report.staff}</p></div>
              <div><strong>Classes</strong><p>{report.classes}</p></div>
              <div><strong>Attendance Sessions</strong><p>{report.attendance_sessions}</p></div>
              <div><strong>Attendance Records</strong><p>{report.attendance_records}</p></div>
              <div><strong>Invoices</strong><p>{report.fee_invoices}</p></div>
              <div><strong>Exam Results</strong><p>{report.exam_results}</p></div>
              <div><strong>Average Score</strong><p>{report.average_exam_score.toFixed(2)}</p></div>
              <div><strong>Overdue Invoices</strong><p>{report.overdue_invoices}</p></div>
              <div><strong>Total Due</strong><p>{report.total_fees_due.toFixed(2)}</p></div>
              <div><strong>Total Paid</strong><p>{report.total_fees_paid.toFixed(2)}</p></div>
              <div><strong>Balance</strong><p>{report.total_balance.toFixed(2)}</p></div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default App;
