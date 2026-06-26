import React, { useState } from 'react';
import Card from './Card.jsx';
import { Plus, X, ListTodo, Play, Eye, CheckCircle } from 'lucide-react';

export default function KanbanBoard({ board, onCardMove, onCardCreate, onCardUpdate, onCardDelete }) {
  const [quickAddColId, setQuickAddColId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Handle Drag Over column
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('column-drop-active');
  };

  // Handle Drag Leave column
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('column-drop-active');
  };

  // Handle Drop on column
  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('column-drop-active');

    const cardId = e.dataTransfer.getData('text/plain');
    const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
    const sourceOrder = parseInt(e.dataTransfer.getData('sourceOrder'), 10);

    if (!cardId) return;

    // Default target index is the end of the column
    const columnCards = board.cards.filter(c => c.columnId === targetColumnId);
    const targetOrder = columnCards.length;

    onCardMove({
      cardId,
      sourceColumnId,
      sourceOrder,
      targetColumnId,
      targetOrder
    });
  };

  // Quick task submit handler
  const handleQuickAddSubmit = (e, columnId) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onCardCreate({
      title: newTitle.trim(),
      description: newDesc.trim(),
      columnId,
      tags: [],
      assignedTo: '',
      dueDate: null
    });

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setQuickAddColId(null);
  };

  // Select header icons based on column ID
  const getColumnIcon = (colId) => {
    switch (colId) {
      case 'todo': return <ListTodo size={16} className="text-info" />;
      case 'in-progress': return <Play size={16} className="text-warning animate-pulse" />;
      case 'review': return <Eye size={16} className="text-purple" style={{ color: '#9b51e0' }} />;
      case 'done': return <CheckCircle size={16} className="text-success" />;
      default: return <ListTodo size={16} />;
    }
  };

  return (
    <div className="row g-4 flex-nowrap overflow-x-auto pb-3" style={{ minHeight: '650px' }}>
      {board.columns.map((col) => {
        // Filter and sort cards belonging to this column
        const columnCards = board.cards
          .filter((card) => card.columnId === col.id)
          .sort((a, b) => a.order - b.order);

        return (
          <div 
            key={col.id} 
            className="col-12 col-md-4 col-lg-3"
            style={{ minWidth: '280px', maxWidth: '350px' }}
          >
            <div className="glass-panel p-3 h-100 d-flex flex-column">
              {/* Column Title Header */}
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                <div className="d-flex align-items-center gap-2">
                  {getColumnIcon(col.id)}
                  <h6 className="mb-0 text-white fw-bold">{col.title}</h6>
                  <span className="badge bg-secondary bg-opacity-25 text-white small rounded-pill">
                    {columnCards.length}
                  </span>
                </div>
                <button 
                  className="btn btn-link p-0 text-secondary hover-text-white"
                  onClick={() => setQuickAddColId(col.id)}
                  title="Add Task"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Column Drop Zone Container */}
              <div 
                className="column-drop-zone d-flex flex-column flex-grow-1"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Quick Add Form In-Line */}
                {quickAddColId === col.id && (
                  <form 
                    onSubmit={(e) => handleQuickAddSubmit(e, col.id)}
                    className="p-3 mb-3 bg-dark bg-opacity-50 rounded border border-secondary border-opacity-25"
                  >
                    <div className="mb-2">
                      <input 
                        type="text" 
                        className="form-control form-control-sm"
                        placeholder="Task title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <textarea 
                        className="form-control form-control-sm"
                        placeholder="Task description..."
                        rows="2"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-xs p-1 px-2 small text-x-small" 
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setQuickAddColId(null)}
                      >
                        <X size={12} /> Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary btn-xs p-1 px-2 small text-x-small" 
                        style={{ fontSize: '0.75rem', background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', border: 'none' }}
                      >
                        Add Task
                      </button>
                    </div>
                  </form>
                )}

                {/* Cards List */}
                <div className="cards-list d-flex flex-column flex-grow-1">
                  {columnCards.map((card) => (
                    <Card 
                      key={card._id}
                      card={card}
                      boardId={board._id}
                      onCardUpdate={onCardUpdate}
                      onCardDelete={onCardDelete}
                    />
                  ))}
                  {columnCards.length === 0 && !quickAddColId && (
                    <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center py-5 border border-dashed border-secondary border-opacity-10 rounded">
                      <span className="text-secondary small">Drag tasks here</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
