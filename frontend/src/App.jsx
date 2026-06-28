import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Board from './pages/Board.jsx';
import { Kanban, Plus, RefreshCw, FolderPlus, HelpCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin);

export default function App() {
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Board creation fields
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');

  const fetchBoards = async (selectFirst = false) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/boards`);
      setBoards(res.data);
      if (res.data.length > 0 && (selectFirst || !selectedBoardId)) {
        // Automatically select the first board
        setSelectedBoardId(res.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching boards list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards(true);
  }, []);

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    try {
      const res = await axios.post(`${BACKEND_URL}/api/boards`, {
        name: newBoardName.trim(),
        description: newBoardDesc.trim()
      });
      
      // Update list and select the newly created board
      setBoards([...boards, res.data]);
      setSelectedBoardId(res.data._id);
      
      // Reset Modal
      setNewBoardName('');
      setNewBoardDesc('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating board:', err);
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Premium Glassmorphic Top Navbar */}
      <nav className="navbar navbar-expand-lg border-bottom border-secondary border-opacity-25 py-3 sticky-top" style={{ background: 'rgba(10, 11, 16, 0.8)', backdropFilter: 'blur(12px)', webkitBackdropFilter: 'blur(12px)', zIndex: 1030 }}>
        <div className="container-fluid px-md-5">
          <a className="navbar-brand d-flex align-items-center gap-2 text-white" href="/">
            <Kanban className="text-info" size={24} style={{ filter: 'drop-shadow(0 0 6px rgba(0, 242, 254, 0.4))' }} />
            <span className="brand-text fs-4">SYNCPAD</span>
          </a>

          <div className="d-flex gap-3 align-items-center ms-auto">
            {loading ? (
              <span className="text-secondary small">Syncing workspaces...</span>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <span className="text-secondary small d-none d-sm-inline">Workspace:</span>
                <select 
                  className="form-select form-select-sm border-secondary border-opacity-50 text-white bg-dark bg-opacity-70"
                  value={selectedBoardId} 
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  style={{ minWidth: '180px' }}
                >
                  {boards.map(b => (
                    <option key={b._id} value={b._id} className="bg-dark">{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              className="btn btn-outline-info btn-sm text-white d-flex align-items-center gap-1.5"
              onClick={() => setShowCreateModal(true)}
            >
              <FolderPlus size={14} />
              <span className="d-none d-md-inline">New Board</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Page Content */}
      <main className="flex-grow-1">
        {loading ? (
          <div className="container py-5 text-center">
            <div className="spinner-border text-info mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-secondary">Syncing active workspaces...</p>
          </div>
        ) : selectedBoardId ? (
          <Board boardId={selectedBoardId} />
        ) : (
          <div className="container py-5 text-center">
            <div className="glass-panel p-5 d-inline-block">
              <h4 className="text-white mb-3">No Active Boards Found</h4>
              <p className="text-secondary mb-4">Create your first collaborative Kanban Board to get started.</p>
              <button className="btn btn-info text-dark" onClick={() => setShowCreateModal(true)}>
                <FolderPlus size={16} className="me-2" /> Create Board
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-3 mt-auto text-center border-top border-secondary border-opacity-10" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
        <p className="text-secondary small mb-0">Syncpad Collaborative Kanban Platform &bull; AI Powered</p>
      </footer>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-white">Create Collaborative Board</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateBoard}>
                <div className="modal-body d-flex flex-column gap-3">
                  <div>
                    <label className="form-label text-secondary small">Board Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Sprint Planning, Project Hercules"
                      value={newBoardName} 
                      onChange={(e) => setNewBoardName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label text-secondary small">Description</label>
                    <textarea 
                      className="form-control" 
                      placeholder="Short summary of this workspace purpose..."
                      rows="3"
                      value={newBoardDesc} 
                      onChange={(e) => setNewBoardDesc(e.target.value)}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm px-3" style={{ background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-purple) 100%)', border: 'none' }}>Create Board</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
