import Card from '../models/Card.js';

export default function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join a room specific to a board
    socket.on('join-board', (boardId) => {
      socket.join(boardId);
      console.log(`Socket ${socket.id} joined board room: ${boardId}`);
    });

    // Handle real-time card drag and drop move
    socket.on('move-card', async ({ boardId, cardId, targetColumnId }) => {
      try {
        const card = await Card.findById(cardId);
        if (!card) return;

        // Map column ID to card status ('Todo', 'In Progress', 'Done')
        card.status = targetColumnId;
        
        await card.save();

        // Broadcast card_updated event to all clients in the room
        io.to(boardId).emit('card_updated', card);

        // Broadcast refresh event to all clients in the room to re-fetch the latest cards list
        io.to(boardId).emit('refresh-board');
      } catch (error) {
        console.error('Error handling move-card event:', error);
      }
    });

    // Handle client-emitted card actions (to broadcast to others in the room)
    socket.on('card_created', (card) => {
      if (card && card.boardId) {
        socket.broadcast.to(card.boardId.toString()).emit('card_created', card);
      }
    });

    socket.on('card_updated', (card) => {
      if (card && card.boardId) {
        socket.broadcast.to(card.boardId.toString()).emit('card_updated', card);
      }
    });

    socket.on('card_deleted', (data) => {
      if (data && data.boardId) {
        socket.broadcast.to(data.boardId.toString()).emit('card_deleted', data);
      }
    });

    // Notify other clients that they need to refresh the board contents
    socket.on('notify-board-change', (boardId) => {
      io.to(boardId).emit('refresh-board');
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
}
