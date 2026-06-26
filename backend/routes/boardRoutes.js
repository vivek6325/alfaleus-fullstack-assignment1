import express from 'express';
import Board from '../models/Board.js';
import Card from '../models/Card.js';

const router = express.Router();

// Auto-seed helper
async function seedDefaultBoard() {
  const count = await Board.countDocuments();
  if (count === 0) {
    const defaultBoard = new Board({
      name: 'Default Collaborative Board',
      sprintEndDate: new Date(Date.now() + 86400000 * 14) // 14 days from now
    });
    await defaultBoard.save();

    const defaultCards = [
      {
        title: 'Design API Contracts',
        description: 'Detail MongoDB model schemas and specify REST API endpoints.',
        status: 'Done',
        assignee: 'Alice',
        labels: ['backend', 'database'],
        complexityScore: 3,
        boardId: defaultBoard._id
      },
      {
        title: 'Style glassmorphic dashboard UI',
        description: 'Build futuristic space-dark overlays using custom CSS and Bootstrap selectors.',
        status: 'In Progress',
        assignee: 'Bob',
        labels: ['frontend', 'design'],
        complexityScore: 5,
        boardId: defaultBoard._id
      },
      {
        title: 'Build Chrome Extension link clipper',
        description: 'Verify tab titles and clipping POST integrations from Manifest V3 popups.',
        status: 'Todo',
        assignee: 'Charlie',
        labels: ['extension', 'chrome'],
        complexityScore: 8,
        boardId: defaultBoard._id
      }
    ];

    await Card.insertMany(defaultCards);
  }
}

// GET /boards
router.get('/boards', async (req, res) => {
  try {
    await seedDefaultBoard();
    const boards = await Board.find();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving boards', error: error.message });
  }
});

// POST /boards
router.post('/boards', async (req, res) => {
  try {
    const { name, sprintEndDate } = req.body;
    const board = new Board({
      name,
      sprintEndDate: sprintEndDate || new Date(Date.now() + 86400000 * 14)
    });
    await board.save();
    res.status(201).json(board);
  } catch (error) {
    res.status(400).json({ message: 'Error creating board', error: error.message });
  }
});

// GET /cards (Supports board filtering with ?boardId=...)
router.get('/cards', async (req, res) => {
  try {
    const filter = {};
    if (req.query.boardId) {
      filter.boardId = req.query.boardId;
    }
    const cards = await Card.find(filter);
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving cards', error: error.message });
  }
});

// POST /cards
router.post('/cards', async (req, res) => {
  try {
    const { title, description, status, assignee, labels, complexityScore, boardId } = req.body;
    
    if (!boardId) {
      return res.status(400).json({ message: 'boardId is required' });
    }

    const card = new Card({
      title,
      description,
      status: status || 'Todo',
      assignee: assignee || '',
      labels: labels || [],
      complexityScore: complexityScore || 0,
      boardId
    });

    await card.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(400).json({ message: 'Error creating card', error: error.message });
  }
});

// PUT /cards/:id
router.put('/cards/:id', async (req, res) => {
  try {
    const { title, description, status, assignee, labels, complexityScore, boardId } = req.body;
    
    const card = await Card.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (status !== undefined) card.status = status;
    if (assignee !== undefined) card.assignee = assignee;
    if (labels !== undefined) card.labels = labels;
    if (complexityScore !== undefined) card.complexityScore = complexityScore;
    if (boardId !== undefined) card.boardId = boardId;

    await card.save();
    res.json(card);
  } catch (error) {
    res.status(400).json({ message: 'Error updating card', error: error.message });
  }
});

// DELETE /cards/:id
router.delete('/cards/:id', async (req, res) => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }
    res.json({ message: 'Card deleted successfully', cardId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting card', error: error.message });
  }
});

export default router;
