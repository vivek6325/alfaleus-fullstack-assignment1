import Board from '../models/Board.js';

// Helper to run mock AI Insights check on a board
function analyzeBoardAI(board) {
  const columnCounts = {};
  board.cards.forEach(card => {
    columnCounts[card.columnId] = (columnCounts[card.columnId] || 0) + 1;
  });

  board.cards.forEach(card => {
    let riskStatus = 'normal';
    let riskMessage = '';

    const lowercaseTitle = card.title.toLowerCase();
    const lowercaseDesc = card.description.toLowerCase();

    if (card.dueDate && new Date(card.dueDate) < new Date() && card.columnId !== 'done') {
      riskStatus = 'critical';
      riskMessage = 'Task is overdue! Action required.';
    } else if (lowercaseTitle.includes('block') || lowercaseDesc.includes('block') || lowercaseTitle.includes('urgent')) {
      riskStatus = 'warning';
      riskMessage = 'Potential dependency blocker or urgent tag identified.';
    } else if (columnCounts[card.columnId] > 3 && card.columnId !== 'done' && card.columnId !== 'todo') {
      riskStatus = 'warning';
      riskMessage = `High density in column "${card.columnId}". Resource bottleneck risk.`;
    }

    card.aiRiskAnalysis = {
      status: riskStatus,
      message: riskMessage
    };
  });
}

export default function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join a room specific to a board
    socket.on('join-board', (boardId) => {
      socket.join(boardId);
      console.log(`Socket ${socket.id} joined board room: ${boardId}`);
    });

    // Handle real-time card drag and drop move
    socket.on('move-card', async ({ boardId, cardId, targetColumnId, targetOrder, sourceColumnId, sourceOrder }) => {
      try {
        const board = await Board.findById(boardId);
        if (!board) return;

        const card = board.cards.id(cardId);
        if (!card) return;

        // Update column assignment
        card.columnId = targetColumnId;

        // Reorder cards inside the board based on target and source
        // Pull all cards in target column (excluding moving one)
        const targetCards = board.cards.filter(c => c.columnId === targetColumnId && c._id.toString() !== cardId);
        targetCards.sort((a, b) => a.order - b.order);

        // Insert at targetOrder
        targetCards.splice(targetOrder, 0, card);

        // Re-assign order index for target column
        targetCards.forEach((c, idx) => {
          c.order = idx;
        });

        // Re-assign order for source column if different
        if (sourceColumnId !== targetColumnId) {
          const sourceCards = board.cards.filter(c => c.columnId === sourceColumnId && c._id.toString() !== cardId);
          sourceCards.sort((a, b) => a.order - b.order);
          sourceCards.forEach((c, idx) => {
            c.order = idx;
          });
        }

        analyzeBoardAI(board);
        await board.save();

        // Broadcast updated board to all other clients in the board room
        io.to(boardId).emit('board-updated', board);
      } catch (error) {
        console.error('Error handling move-card event:', error);
      }
    });

    // Direct change notification from active edits
    socket.on('notify-board-change', (boardId) => {
      // Send message to everyone else to refresh
      socket.to(boardId).emit('refresh-board');
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
}
