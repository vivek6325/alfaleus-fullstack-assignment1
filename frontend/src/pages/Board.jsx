import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import KanbanBoard from '../components/KanbanBoard.jsx';
import AIInsights from '../components/AIInsights.jsx';
import AIInsightsSidebar from '../components/AIInsightsSidebar.jsx';
import GitHubImporterModal from '../components/GitHubImporterModal.jsx';
import { Share2, RefreshCw, Cpu, Activity, AlertCircle, Github } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function Board({ boardId }) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [aiProgress, setAiProgress] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  
  const socketRef = useRef(null);

  // 1. Fetch Board Metadata and Associated Cards
  const fetchBoard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Get board metadata from all boards list
      const boardsRes = await axios.get(`${BACKEND_URL}/boards`);
      const activeBoard = boardsRes.data.find(b => b._id === boardId);

      if (!activeBoard) {
        setError('Board not found.');
        return;
      }

      // Fetch separate Card documents associated with this board
      const cardsRes = await axios.get(`${BACKEND_URL}/cards?boardId=${boardId}`);

      // Synthesize board state for columns
      setBoard({
        _id: activeBoard._id,
        name: activeBoard.name,
        sprintEndDate: activeBoard.sprintEndDate,
        columns: [
          { id: 'Todo', title: 'To Do' },
          { id: 'In Progress', title: 'In Progress' },
          { id: 'Done', title: 'Done' }
        ],
        cards: cardsRes.data
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching board data:', err);
      setError('Could not connect to board server. Please ensure the backend is running.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Manage WebSocket Sync Connection
  useEffect(() => {
    fetchBoard();

    // Bind WebSocket
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join-board', boardId);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('refresh-board', () => {
      fetchBoard(true); // silent fetch in background
    });

    socket.on('card_created', (newCard) => {
      const cardBoardId = typeof newCard.boardId === 'object' ? newCard.boardId._id : newCard.boardId;
      const currentBoardId = typeof boardId === 'object' ? boardId._id : boardId;
      if (cardBoardId === currentBoardId) {
        setBoard((prevBoard) => {
          if (!prevBoard) return prevBoard;
          if (prevBoard.cards.some((c) => c._id === newCard._id)) {
            return prevBoard;
          }
          return {
            ...prevBoard,
            cards: [...prevBoard.cards, newCard]
          };
        });
      }
    });

    socket.on('card_updated', (updatedCard) => {
      const cardBoardId = typeof updatedCard.boardId === 'object' ? updatedCard.boardId._id : updatedCard.boardId;
      const currentBoardId = typeof boardId === 'object' ? boardId._id : boardId;
      if (cardBoardId === currentBoardId) {
        setBoard((prevBoard) => {
          if (!prevBoard) return prevBoard;
          return {
            ...prevBoard,
            cards: prevBoard.cards.map((c) => c._id === updatedCard._id ? updatedCard : c)
          };
        });
      }
    });

    socket.on('card_deleted', (data) => {
      const targetCardId = typeof data === 'string' ? data : (data.cardId || data._id);
      const cardBoardId = (data && data.boardId) ? (typeof data.boardId === 'object' ? data.boardId._id : data.boardId) : null;
      const currentBoardId = typeof boardId === 'object' ? boardId._id : boardId;
      
      if (!cardBoardId || cardBoardId === currentBoardId) {
        setBoard((prevBoard) => {
          if (!prevBoard) return prevBoard;
          return {
            ...prevBoard,
            cards: prevBoard.cards.filter((c) => c._id !== targetCardId)
          };
        });
      }
    });

    socket.on('ai-progress', (data) => {
      setAiProgress(data);
    });

    socket.on('ai-insights', (data) => {
      setAiInsights(data);
      setAiProgress(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('refresh-board');
      socket.off('card_created');
      socket.off('card_updated');
      socket.off('card_deleted');
      socket.off('ai-progress');
      socket.off('ai-insights');
      socket.disconnect();
    };
  }, [boardId]);

  // 3. Move Card handler (Optimistic local drag transition + Socket emit)
  const handleCardMove = ({ cardId, targetColumnId }) => {
    if (!board) return;

    // Optimistic UI update
    const updatedCards = board.cards.map(c => {
      if (c._id === cardId) {
        return { ...c, status: targetColumnId };
      }
      return c;
    });
    setBoard({ ...board, cards: updatedCards });

    // Emit drag move to WebSocket
    if (socketRef.current) {
      socketRef.current.emit('move-card', {
        boardId,
        cardId,
        targetColumnId
      });
    }
  };

  // 4. Create Card handler
  const handleCardCreate = async (newCardData) => {
    try {
      const payload = {
        ...newCardData,
        boardId
      };
      await axios.post(`${BACKEND_URL}/cards`, payload);
      // Fetch latest list and emit websocket refresh
      await fetchBoard(true);
      if (socketRef.current) {
        socketRef.current.emit('notify-board-change', boardId);
      }
    } catch (err) {
      console.error('Error creating card:', err);
    }
  };

  // 5. Update Card details handler
  const handleCardUpdate = async (updatedCard) => {
    try {
      await axios.put(`${BACKEND_URL}/cards/${updatedCard._id}`, updatedCard);
      await fetchBoard(true);
      if (socketRef.current) {
        socketRef.current.emit('notify-board-change', boardId);
      }
    } catch (err) {
      console.error('Error updating card:', err);
    }
  };

  // 6. Delete Card handler
  const handleCardDelete = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/cards/${cardId}`);
      await fetchBoard(true);
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
        <p className="text-secondary">Retrieving board canvas...</p>
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
      {/* Board Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h2 text-white fw-bold mb-1">{board.name}</h1>
          {board.sprintEndDate && (
            <p className="text-secondary small mb-0">
              Sprint End Date: {new Date(board.sprintEndDate).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center">
          <div className={`badge d-flex align-items-center gap-1.5 px-3 py-2 fs-7 border rounded-pill ${
            socketConnected ? 'bg-success bg-opacity-10 text-success border-success border-opacity-25' : 
            'bg-warning bg-opacity-10 text-warning border-warning border-opacity-25'
          }`}>
            <Activity size={12} className={socketConnected ? 'animate-pulse' : ''} />
            <span>{socketConnected ? 'Real-Time Sync active' : 'Connecting Sync...'}</span>
          </div>

          <button 
            className="btn btn-sm btn-outline-secondary text-white d-flex align-items-center gap-2 border border-secondary border-opacity-25"
            onClick={() => setIsGitHubModalOpen(true)}
          >
            <Github size={14} />
            <span>Import Issues</span>
          </button>

          <button 
            className={`btn btn-sm d-flex align-items-center gap-2 border border-secondary border-opacity-25 ${isSidebarOpen ? 'btn-info text-dark' : 'btn-outline-secondary text-white'}`}
            onClick={() => setIsSidebarOpen(true)}
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

      {/* Main Board Layout */}
      <KanbanBoard 
        board={board}
        onCardMove={handleCardMove}
        onCardCreate={handleCardCreate}
        onCardUpdate={handleCardUpdate}
        onCardDelete={handleCardDelete}
      />

      <AIInsightsSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        boardId={boardId}
        socket={socketRef.current}
        initialInsights={aiInsights}
      />

      <GitHubImporterModal 
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        boardId={boardId}
        onImportSuccess={() => fetchBoard(true)}
      />
    </div>
  );
}
