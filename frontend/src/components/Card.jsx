import React, { useState } from 'react';
import { Calendar, User, Tag, AlertTriangle, AlertOctagon, Info, Trash2, Edit } from 'lucide-react';

export default function Card({ card, boardId, onCardUpdate, onCardDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [assignedTo, setAssignedTo] = useState(card.assignedTo);
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.substring(0, 10) : '');
  const [tags, setTags] = useState(card.tags ? card.tags.join(', ') : '');

  // Form submit handler for editing card details
  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedCard = {
      ...card,
      title,
      description,
      assignedTo,
      dueDate: dueDate || null,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    };
    onCardUpdate(updatedCard);
    setIsEditing(false);
  };

  // Determine risk styles
  const riskClass = 
    card.aiRiskAnalysis?.status === 'critical' ? 'risk-critical' :
    card.aiRiskAnalysis?.status === 'warning' ? 'risk-warning' :
    'risk-normal';

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // HTML5 Drag Event Handlers
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', card._id);
    e.dataTransfer.setData('sourceColumnId', card.columnId);
    e.dataTransfer.setData('sourceOrder', card.order);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  return (
    <>
      <div 
        className={`glass-card p-3 mb-3 d-flex flex-column gap-2 ${riskClass}`}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ cursor: 'grab' }}
      >
        <div className="d-flex justify-content-between align-items-start">
          <h6 className="fw-semibold mb-0 text-white text-wrap text-break pe-2">{card.title}</h6>
          <div className="d-flex gap-1">
            <button 
              className="btn btn-link p-0 text-secondary hover-text-white" 
              onClick={() => setIsEditing(true)}
              title="Edit Task"
            >
              <Edit size={14} />
            </button>
            <button 
              className="btn btn-link p-0 text-secondary hover-text-danger" 
              onClick={() => onCardDelete(card._id)}
              title="Delete Task"
            >
              <Trash2 size={14} className="text-danger" />
            </button>
          </div>
        </div>

        {card.description && (
          <p className="small text-secondary mb-0 text-truncate" style={{ maxHeight: '40px' }}>
            {card.description}
          </p>
        )}

        {/* Display Tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="d-flex flex-wrap mt-1">
            {card.tags.map((tag, i) => (
              <span key={i} className="badge-tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary border-opacity-25 text-secondary small">
          <div className="d-flex align-items-center gap-1">
            <User size={12} />
            <span>{card.assignedTo || 'Unassigned'}</span>
          </div>
          {card.dueDate && (
            <div className="d-flex align-items-center gap-1">
              <Calendar size={12} />
              <span>{formatDueDate(card.dueDate)}</span>
            </div>
          )}
        </div>

        {/* AI Insight banner inside card */}
        {card.aiRiskAnalysis?.status !== 'normal' && (
          <div className="mt-2 p-2 rounded small bg-dark bg-opacity-50 text-warning border-start border-warning border-3 d-flex gap-1 align-items-center">
            {card.aiRiskAnalysis?.status === 'critical' ? (
              <AlertOctagon size={12} className="text-danger flex-shrink-0" />
            ) : (
              <AlertTriangle size={12} className="text-warning flex-shrink-0" />
            )}
            <span className="x-small" style={{ fontSize: '0.75rem' }}>{card.aiRiskAnalysis.message}</span>
          </div>
        )}
      </div>

      {/* Edit Detail Modal */}
      {isEditing && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">Edit Task</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsEditing(false)} aria-label="Close"></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body d-flex flex-column gap-3">
                  <div>
                    <label className="form-label text-secondary small">Task Title</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label text-secondary small">Description</label>
                    <textarea 
                      className="form-control" 
                      rows="3"
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label text-secondary small">Assignee</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={assignedTo} 
                        onChange={(e) => setAssignedTo(e.target.value)} 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-secondary small">Due Date</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={dueDate} 
                        onChange={(e) => setDueDate(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label text-secondary small">Tags (Comma-separated)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. frontend, high-priority, bug"
                      value={tags} 
                      onChange={(e) => setTags(e.target.value)} 
                    />
                  </div>

                  {card.aiRiskAnalysis?.status !== 'normal' && (
                    <div className={`p-3 rounded small bg-opacity-10 border d-flex gap-2 align-items-start ${card.aiRiskAnalysis?.status === 'critical' ? 'bg-danger border-danger text-danger' : 'bg-warning border-warning text-warning'}`}>
                      <Info size={16} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="fw-semibold">AI Risk Diagnosis: </span>
                        <span>{card.aiRiskAnalysis?.message}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm px-3" style={{ background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', border: 'none' }}>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
