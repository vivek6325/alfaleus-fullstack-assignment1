import express from 'express';
import Board from '../models/Board.js';

const router = express.Router();

// Helper to run mock AI Insights check on a board
function analyzeBoardAI(board) {
  // 1. Analyze column bottlenecks (more than 4 cards in "In Progress" or "Review" = Bottleneck)
  const columnCounts = {};
  board.cards.forEach(card => {
    columnCounts[card.columnId] = (columnCounts[card.columnId] || 0) + 1;
  });

  // 2. Assess individual card risks
  board.cards.forEach(card => {
    let riskStatus = 'normal';
    let riskMessage = '';

    const lowercaseTitle = card.title.toLowerCase();
    const lowercaseDesc = card.description.toLowerCase();

    // Check overdue
    if (card.dueDate && new Date(card.dueDate) < new Date() && card.columnId !== 'done') {
      riskStatus = 'critical';
      riskMessage = 'Task is overdue! Action required.';
    } 
    // Check keywords
    else if (lowercaseTitle.includes('block') || lowercaseDesc.includes('block') || lowercaseTitle.includes('urgent')) {
      riskStatus = 'warning';
      riskMessage = 'Potential dependency blocker or urgent tag identified.';
    }
    // Check column bottleneck impact
    else if (columnCounts[card.columnId] > 3 && card.columnId !== 'done' && card.columnId !== 'todo') {
      riskStatus = 'warning';
      riskMessage = `High density in column "${card.columnId}". Resource bottleneck risk.`;
    }

    card.aiRiskAnalysis = {
      status: riskStatus,
      message: riskMessage
    };
  });
}

// Seed helper
async function seedDefaultBoard() {
  const count = await Board.countDocuments();
  if (count === 0) {
    const defaultBoard = new Board({
      name: 'Default Workspace Board',
      description: 'Your real-time collaborative product board with built-in AI Insights.',
      columns: [
        { id: 'todo', title: 'To Do', order: 0 },
        { id: 'in-progress', title: 'In Progress', order: 1 },
        { id: 'review', title: 'Review', order: 2 },
        { id: 'done', title: 'Done', order: 3 }
      ],
      cards: [
        {
          title: 'Design API Architecture',
          description: 'Establish Socket.IO communication boundaries and schema designs.',
          columnId: 'todo',
          order: 0,
          tags: ['architecture', 'backend'],
          assignedTo: 'Alice',
          dueDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
          aiRiskAnalysis: { status: 'normal', message: '' }
        },
        {
          title: 'Implement Glassmorphic UI theme',
          description: 'Apply premium dark mode and futuristic custom styles over Bootstrap components.',
          columnId: 'in-progress',
          order: 0,
          tags: ['frontend', 'design'],
          assignedTo: 'Bob',
          dueDate: new Date(Date.now() - 86400000), // Overdue
          aiRiskAnalysis: { status: 'critical', message: 'Task is overdue! Action required.' }
        },
        {
          title: 'Verify WebSocket reconnection logic',
          description: 'Ensure client connects properly even in flaky network scenarios.',
          columnId: 'review',
          order: 0,
          tags: ['network', 'testing'],
          assignedTo: 'Charlie',
          dueDate: new Date(Date.now() + 86400000 * 5),
          aiRiskAnalysis: { status: 'normal', message: '' }
        }
      ]
    });

    analyzeBoardAI(defaultBoard);
    await defaultBoard.save();
  }
}

// GET all boards (will seed one if none exist)
router.get('/', async (req, res) => {
  try {
    await seedDefaultBoard();
    const boards = await Board.find();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving boards', error: error.message });
  }
});

// GET a specific board
router.get('/:id', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving board', error: error.message });
  }
});

// POST a new board
router.post('/', async (req, res) => {
  try {
    const { name, description, columns } = req.body;
    const defaultCols = columns || [
      { id: 'todo', title: 'To Do', order: 0 },
      { id: 'in-progress', title: 'In Progress', order: 1 },
      { id: 'review', title: 'Review', order: 2 },
      { id: 'done', title: 'Done', order: 3 }
    ];
    
    const board = new Board({
      name,
      description,
      columns: defaultCols,
      cards: []
    });

    await board.save();
    res.status(201).json(board);
  } catch (error) {
    res.status(400).json({ message: 'Error creating board', error: error.message });
  }
});

// POST create a card in a board
router.post('/:id/cards', async (req, res) => {
  try {
    const { title, description, columnId, tags, assignedTo, dueDate } = req.body;
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    // Get order number (place at the end of the column)
    const columnCards = board.cards.filter(c => c.columnId === columnId);
    const order = columnCards.length;

    const newCard = {
      title,
      description,
      columnId,
      order,
      tags: tags || [],
      assignedTo: assignedTo || '',
      dueDate
    };

    board.cards.push(newCard);
    analyzeBoardAI(board);
    await board.save();

    res.status(201).json(board);
  } catch (error) {
    res.status(400).json({ message: 'Error adding card', error: error.message });
  }
});

// PUT update card details, column, or ordering
router.put('/:id/cards/:cardId', async (req, res) => {
  try {
    const { title, description, columnId, order, tags, assignedTo, dueDate } = req.body;
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const card = board.cards.id(req.params.cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (columnId !== undefined) card.columnId = columnId;
    if (order !== undefined) card.order = order;
    if (tags !== undefined) card.tags = tags;
    if (assignedTo !== undefined) card.assignedTo = assignedTo;
    if (dueDate !== undefined) card.dueDate = dueDate;

    analyzeBoardAI(board);
    await board.save();

    res.json(board);
  } catch (error) {
    res.status(400).json({ message: 'Error updating card', error: error.message });
  }
});

// DELETE a card from board
router.delete('/:id/cards/:cardId', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    board.cards.pull({ _id: req.params.cardId });
    analyzeBoardAI(board);
    await board.save();

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting card', error: error.message });
  }
});

export default router;
