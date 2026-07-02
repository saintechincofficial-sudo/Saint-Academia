import { useState } from 'react';
import StaffList from '../components/StaffList/StaffList';
import StaffForm from '../components/StaffForm/StaffForm';

function StaffPage() {
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffRefreshTrigger, setStaffRefreshTrigger] = useState(0);

  const handleAddStaff = () => {
    setEditingStaff(null);
    setShowStaffForm(true);
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setShowStaffForm(true);
  };

  const handleStaffFormSubmit = () => {
    setShowStaffForm(false);
    setEditingStaff(null);
    setStaffRefreshTrigger(prev => prev + 1);
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

      <StaffList
        onEdit={handleEditStaff}
        refreshTrigger={staffRefreshTrigger}
      />
    </div>
  );
}

export default StaffPage;
