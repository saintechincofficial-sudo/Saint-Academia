import { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'error', message: 'API unavailable' }));
  }, []);

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">SaintAcademia</p>
        <h1>Cameroonian Secondary School Management System</h1>
        <p>
          The core backend and frontend foundation is now ready for expansion into
          students, staff, attendance, grades, fees, and reports.
        </p>
      </section>

      <section className="info-grid">
        <article className="info-card">
          <h2>API Status</h2>
          <pre>{JSON.stringify(health, null, 2)}</pre>
        </article>
        <article className="info-card">
          <h2>Next Steps</h2>
          <ul>
            <li>Import the SQL schema into MySQL</li>
            <li>Connect the frontend to real endpoints</li>
            <li>Build modules for students and fees</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

export default App;
