import { useState } from 'react';
import StaffList from '../components/StaffList/StaffList';
import StaffForm from '../components/StaffForm/StaffForm';

function StaffPage() {
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffRefreshTrigger, setStaffRefreshTrigger] = useState(0);
  const [staffMessage, setStaffMessage] = useState('');

  const handleAddStaff = () => {
    setEditingStaff(null);
    setShowStaffForm(true);
    setStaffMessage('');
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setShowStaffForm(true);
    setStaffMessage('');
  };

  const handleStaffFormSubmit = (result = {}) => {
    setShowStaffForm(false);
    setEditingStaff(null);
    setStaffRefreshTrigger(prev => prev + 1);
    if (result.login_id) {
      setStaffMessage(`Staff created successfully. Default login ID/password: ${result.login_id}`);
    } else if (result.message) {
      setStaffMessage(result.message);
    } else {
      setStaffMessage('Staff saved successfully.');
    }
  };

  const handleStaffFormCancel = () => {
    setShowStaffForm(false);
    setEditingStaff(null);
  };

  return (
    <div className="tab-content">
      {showStaffForm && (
        <StaffForm
          staff={editingStaff}
          onSubmit={handleStaffFormSubmit}
          onCancel={handleStaffFormCancel}
        />
      )}

      <div className="section-header">
        <h2>Staff Management</h2>
        <button className="btn-primary" onClick={handleAddStaff}>
          + Add Staff
        </button>
      </div>

      {staffMessage && <p className="success-message">{staffMessage}</p>}

      <StaffList
        onEdit={handleEditStaff}
        refreshTrigger={staffRefreshTrigger}
      />
    </div>
  );
}

export default StaffPage;
