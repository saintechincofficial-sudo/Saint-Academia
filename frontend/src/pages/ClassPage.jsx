import { useState } from 'react';
import ClassList from '../components/ClassList/ClassList';
import ClassForm from '../components/ClassForm/ClassForm';

function ClassPage() {
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classRefreshTrigger, setClassRefreshTrigger] = useState(0);

  const handleAddClass = () => {
    setEditingClass(null);
    setShowClassForm(true);
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setShowClassForm(true);
  };

  const handleClassFormSubmit = () => {
    setShowClassForm(false);
    setEditingClass(null);
    setClassRefreshTrigger(prev => prev + 1);
  };

  const handleClassFormCancel = () => {
    setShowClassForm(false);
    setEditingClass(null);
  };

  return (
    <div className="tab-content">
      {showClassForm && (
        <ClassForm
          classItem={editingClass}
          onSubmit={handleClassFormSubmit}
          onCancel={handleClassFormCancel}
        />
      )}

      <div className="section-header">
        <h2>Class Management</h2>
        <button className="btn-primary" onClick={handleAddClass}>
          + Add Class
        </button>
      </div>

      <ClassList
        onEdit={handleEditClass}
        refreshTrigger={classRefreshTrigger}
      />
    </div>
  );
}

export default ClassPage;
