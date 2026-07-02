import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import './DashboardSummary.css';

function DashboardSummary() {
  const { apiCall } = useApi();
  const [counts, setCounts] = useState({ students: 0, staff: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCounts = async () => {
      setLoading(true);
      setError(null);

      const [studentsRes, staffRes] = await Promise.all([
        apiCall('/students?limit=1'),
        apiCall('/staff?limit=1')
      ]);

      if (!studentsRes.success || !staffRes.success) {
        setError('Unable to load dashboard counts');
        setLoading(false);
        return;
      }

      setCounts({
        students: studentsRes.data?.pagination?.total_items ?? 0,
        staff: staffRes.data?.pagination?.total_items ?? 0
      });
      setLoading(false);
    };

    loadCounts();
  }, [apiCall]);

  if (loading) {
    return <div className="dashboard-summary-loading">Loading dashboard summary...</div>;
  }

  return (
    <div className="dashboard-summary">
      {error && <div className="summary-error">{error}</div>}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-card-title">Students</div>
          <div className="summary-card-value">{counts.students}</div>
          <div className="summary-card-meta">Total registered students</div>
        </div>

        <div className="summary-card">
          <div className="summary-card-title">Staff</div>
          <div className="summary-card-value">{counts.staff}</div>
          <div className="summary-card-meta">Total active staff members</div>
        </div>

        <div className="summary-card summary-card-highlight">
          <div className="summary-card-title">Manage</div>
          <div className="summary-card-value">Quick access</div>
          <div className="summary-card-meta">Use the tabs below to add or edit records</div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;
