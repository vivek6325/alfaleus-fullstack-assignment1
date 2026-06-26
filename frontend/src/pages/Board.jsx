import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import KanbanBoard from '../components/KanbanBoard.jsx';
import AIInsights from '../components/AIInsights.jsx';
import { Share2, RefreshCw, Cpu, Activity, AlertCircle } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function Board({ boardId }) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(true);
  
  const socketRef = useRef(null);

  // 1. Fetch Board Details
  const fetchBoard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/boards/${boardId}`);
      setBoard(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching board:', err);
      setError('Could not connect to board server. Please make sure the backend is running.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Establish Real-Time Socket Connections
  useEffect(() => {
    fetchBoard();

    // Connect to WebSocket Server
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected to backend');
      setSocketConnected(true);
      socket.emit('join-board', boardId);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected from backend');
      setSocketConnected(false);
    });

    // Real-time synchronization event listeners
    socket.on('board-updated', (updatedBoard) => {
      setBoard(updatedBoard);
    });

    socket.on('refresh-board', () => {
      fetchBoard(true); // silent update in background
    });

    // Cleanup on unmount or boardId change
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('board-updated');
      socket.off('refresh-board');
      socket.disconnect();
    };
  }, [boardId]);

  // 3. Move Card Handler (Optimistic state update + Socket emit)
  const handleCardMove = ({ cardId, sourceColumnId, sourceOrder, targetColumnId, targetOrder }) => {
    if (!board) return;

    // Optimistic local UI transition
    const updatedCards = [...board.cards];
    const movingCard = updatedCards.find(c => c._id === cardId);
    if (!movingCard) return;

    // Temporarily reassign columns local-side
    movingCard.columnId = targetColumnId;

    // Filter and update local orders for immediate client-side visual satisfaction
    const targetCards = updatedCards.filter(c => c.columnId === targetColumnId && c._id !== cardId);
    targetCards.sort((a, b) => a.order - b.order);
    targetCards.splice(targetOrder, 0, movingCard);
    targetCards.forEach((c, idx) => { c.order = idx; });

    if (sourceColumnId !== targetColumnId) {
      const sourceCards = updatedCards.filter(c => c.columnId === sourceColumnId && c._id !== cardId);
      sourceCards.sort((a, b) => a.order - b.order);
      sourceCards.forEach((c, idx) => { c.order = idx; });
    }

    setBoard({ ...board, cards: updatedCards });

    // Emit real-time drag-and-drop to socket
    if (socketRef.current) {
      socketRef.current.emit('move-card', {
        boardId,
        cardId,
        sourceColumnId,
        sourceOrder,
        targetColumnId,
        targetOrder
      });
    }
  };

  // 4. Create Card Handler
  const handleCardCreate = async (newCardData) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/boards/${boardId}/cards`, newCardData);
      setBoard(res.data);
      if (socketRef.current) {
        socketRef.current.emit('notify-board-change', boardId);
      }
    } catch (err) {
      console.error('Error creating card:', err);
    }
  };

  // 5. Update Card Handler
  const handleCardUpdate = async (updatedCard) => {
    try {
      const res = await axios.put(`${BACKEND_URL}/api/boards/${boardId}/cards/${updatedCard._id}`, updatedCard);
      setBoard(res.data);
      if (socketRef.current) {
        socketRef.current.emit('notify-board-change', boardId);
      }
    } catch (err) {
      console.error('Error updating card:', err);
    }
  };

  // 6. Delete Card Handler
  const handleCardDelete = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/boards/${boardId}/cards/${cardId}`);
      setBoard(res.data);
      if (socketRef.current) {
        socketRef.current.emit('notify-board-change', boardId);
      }
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-info mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-secondary">Retrieving collaborative canvas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="glass-panel p-5 text-center border-danger border-opacity-50">
          <AlertCircle className="text-danger mb-3" size={48} />
          <h4 className="text-white mb-2">Connection Issues</h4>
          <p className="text-secondary mb-4">{error}</p>
          <button className="btn btn-outline-info btn-sm" onClick={() => fetchBoard()}>
            <RefreshCw size={14} className="me-2" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-md-5 py-4">
      {/* Board Header details */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h2 text-white fw-bold mb-1">{board.name}</h1>
          <p className="text-secondary small mb-0">{board.description}</p>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          {/* Socket Connection Badge */}
          <div className={`badge d-flex align-items-center gap-1.5 px-3 py-2 fs-7 border rounded-pill ${
            socketConnected ? 'bg-success bg-opacity-10 text-success border-success border-opacity-25' : 
            'bg-warning bg-opacity-10 text-warning border-warning border-opacity-25'
          }`}>
            <Activity size={12} className={socketConnected ? 'animate-pulse' : ''} />
            <span>{socketConnected ? 'Real-Time Connected' : 'Offline (Syncing...)'}</span>
          </div>

          <button 
            className={`btn btn-sm d-flex align-items-center gap-2 border border-secondary border-opacity-25 ${showAIInsights ? 'btn-info text-dark' : 'btn-outline-secondary text-white'}`}
            onClick={() => setShowAIInsights(!showAIInsights)}
          >
            <Cpu size={14} />
            <span>AI Assistant</span>
          </button>

          <button className="btn btn-outline-secondary btn-sm text-white d-flex align-items-center gap-2" onClick={() => fetchBoard(true)}>
            <RefreshCw size={14} />
            <span>Force Sync</span>
          </button>
        </div>
      </div>

      {/* AI Insights Segment */}
      {showAIInsights && <AIInsights board={board} />}

      {/* Main Board columns */}
      <KanbanBoard 
        board={board}
        onCardMove={handleCardMove}
        onCardCreate={handleCardCreate}
        onCardUpdate={handleCardUpdate}
        onCardDelete={handleCardDelete}
      />
    </div>
  );
}
