import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { User, Tag, Trash2, Edit, Award, Hash, Clock } from 'lucide-react';

export default function Card({ card, boardId, onCardUpdate, onCardDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card._id,
  });

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.4 : undefined,
    touchAction: 'none'
  };

  const getRiskClass = () => {
    if (card.complexityScore > 7) return 'risk-critical';
    if (card.complexityScore > 4) return 'risk-warning';
    return 'risk-normal';
  };
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [assignee, setAssignee] = useState(card.assignee || '');
  const [status, setStatus] = useState(card.status || 'Todo');
  const [complexityScore, setComplexityScore] = useState(card.complexityScore || 0);
  const [labels, setLabels] = useState(card.labels ? card.labels.join(', ') : '');
  const [milestone, setMilestone] = useState(card.milestone || '');

  // Form submit handler for editing card details
  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedCard = {
      ...card,
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim(),
      status,
      complexityScore: Number(complexityScore) || 0,
      labels: labels.split(',').map(lbl => lbl.trim()).filter(lbl => lbl !== ''),
      milestone: milestone.trim()
    };
    onCardUpdate(updatedCard);
    setIsEditing(false);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    const date = new Date(timeStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div 
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`glass-card p-3 mb-3 d-flex flex-column gap-2 ${getRiskClass()} ${isDragging ? 'dragging' : ''}`}
      >
        <div className="d-flex justify-content-between align-items-start">
          <h6 className="fw-semibold mb-0 text-white text-wrap text-break pe-2">{card.title}</h6>
          <div className="d-flex gap-1">
            <button 
              className="btn btn-link p-0 text-secondary hover-text-white" 
              onClick={() => {
                // Refresh local edit state
                setTitle(card.title);
                setDescription(card.description);
                setAssignee(card.assignee || '');
                setStatus(card.status || 'Todo');
                setComplexityScore(card.complexityScore || 0);
                setLabels(card.labels ? card.labels.join(', ') : '');
                setMilestone(card.milestone || '');
                setIsEditing(true);
              }}
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

        {/* Display Milestone & Labels */}
        {(card.milestone || (card.labels && card.labels.length > 0)) && (
          <div className="d-flex flex-wrap mt-1 gap-1 align-items-center">
            {card.milestone && (
              <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-10 rounded-pill font-monospace" style={{ fontSize: '0.65rem', padding: '3px 8px', marginRight: '4px' }}>
                Milestone: {card.milestone}
              </span>
            )}
            {card.labels && card.labels.map((lbl, i) => (
              <span key={i} className="badge-tag m-0">{lbl}</span>
            ))}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary border-opacity-25 text-secondary small">
          <div className="d-flex align-items-center gap-1">
            <User size={12} />
            <span>{card.assignee || 'Unassigned'}</span>
          </div>
          {card.complexityScore !== undefined && (
            <div className="d-flex align-items-center gap-1" title={`Complexity: ${card.complexityScore}`}>
              <Award size={12} className="text-info" />
              <span>SP: {card.complexityScore}</span>
            </div>
          )}
        </div>

        {/* Show active card version */}
        {card.version > 1 && (
          <div className="d-flex justify-content-end text-muted small mt-1" style={{ fontSize: '0.65rem' }}>
            <span>v{card.version}</span>
          </div>
        )}
      </div>

      {/* Edit Detail Modal */}
      {isEditing && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">Edit Task Details</h5>
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
                        value={assignee} 
                        onChange={(e) => setAssignee(e.target.value)} 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-secondary small">Status (Column)</label>
                      <select 
                        className="form-select" 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="Todo">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label className="form-label text-secondary small">Complexity Score (Story Points)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={complexityScore} 
                        onChange={(e) => setComplexityScore(e.target.value)} 
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-secondary small">Labels (Comma-separated)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. backend, database"
                        value={labels} 
                        onChange={(e) => setLabels(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label text-secondary small">Milestone</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Sprint 1 Release"
                      value={milestone} 
                      onChange={(e) => setMilestone(e.target.value)} 
                    />
                  </div>

                  {/* Document metadata display */}
                  <div className="mt-2 pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-between text-secondary" style={{ fontSize: '0.75rem' }}>
                    <div className="d-flex align-items-center gap-1">
                      <Hash size={12} />
                      <span>Document Version: {card.version || 1}</span>
                    </div>
                    {card.updatedAt && (
                      <div className="d-flex align-items-center gap-1">
                        <Clock size={12} />
                        <span>Last Updated: {formatTime(card.updatedAt)}</span>
                      </div>
                    )}
                  </div>
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
