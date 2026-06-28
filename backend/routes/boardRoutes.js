import express from 'express';
import Board from '../models/Board.js';
import Card from '../models/Card.js';
import { runAIAnalysis } from '../services/aiProjectManager.js';

const router = express.Router();

// Parse GitHub repository owner and name from input string/URL
function parseRepoUrl(urlOrName) {
  const clean = urlOrName.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const parts = clean.split('/');
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  }
  return null;
}

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
    const io = req.app.get('io');
    if (io) {
      io.to(boardId.toString()).emit('card_created', card);
    }
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
    const io = req.app.get('io');
    if (io) {
      io.to(card.boardId.toString()).emit('card_updated', card);
    }
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
    const io = req.app.get('io');
    if (io) {
      io.to(card.boardId.toString()).emit('card_deleted', { cardId: req.params.id, boardId: card.boardId });
    }
    res.json({ message: 'Card deleted successfully', cardId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting card', error: error.message });
  }
});

// POST /boards/:id/ai-analyse
router.post('/boards/:id/ai-analyse', async (req, res) => {
  try {
    const io = req.app.get('io');
    const insights = await runAIAnalysis(req.params.id, io);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Error running AI analysis', error: error.message });
  }
});

// GET /boards/:id/github/fetch-issues
router.get('/boards/:id/github/fetch-issues', async (req, res) => {
  try {
    const { repoUrl, page = 1 } = req.query;
    if (!repoUrl) {
      return res.status(400).json({ message: 'Repository URL is required' });
    }

    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      return res.status(400).json({ message: 'Invalid GitHub repository format. Use owner/repo or full GitHub URL.' });
    }

    const { owner, repo } = repoInfo;
    const perPage = 10;
    const githubUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&page=${page}&per_page=${perPage}`;

    const response = await fetch(githubUrl, {
      headers: {
        'User-Agent': 'Collaborative-Kanban-App'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr;
      try {
        parsedErr = JSON.parse(errText);
      } catch (e) {}
      const msg = parsedErr?.message || errText || response.statusText;
      return res.status(response.status).json({ message: `GitHub API error: ${msg}` });
    }

    const issues = await response.json();
    
    // Filter out PRs (PRs are returned as issues by GitHub's endpoint)
    const filteredIssues = issues.filter(issue => !issue.pull_request).map(issue => ({
      githubIssueId: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      labels: issue.labels.map(l => typeof l === 'object' ? l.name : l),
      assignees: issue.assignees.map(a => a.login),
      milestone: issue.milestone ? issue.milestone.title : ''
    }));

    // Check which ones are already imported
    const boardId = req.params.id;
    const githubIds = filteredIssues.map(i => i.githubIssueId);
    const existingCards = await Card.find({ boardId, githubIssueId: { $in: githubIds } });
    const existingIds = new Set(existingCards.map(c => c.githubIssueId));

    const issuesWithStatus = filteredIssues.map(issue => ({
      ...issue,
      alreadyImported: existingIds.has(issue.githubIssueId)
    }));

    res.json({
      issues: issuesWithStatus,
      owner,
      repo,
      page: parseInt(page),
      hasMore: issues.length === perPage
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch issues from GitHub', error: error.message });
  }
});

// POST /boards/:id/github/import-issues
router.post('/boards/:id/github/import-issues', async (req, res) => {
  try {
    const boardId = req.params.id;
    const { issues } = req.body;

    if (!issues || !Array.isArray(issues)) {
      return res.status(400).json({ message: 'Issues array is required' });
    }

    const importedCards = [];

    for (const issue of issues) {
      // Avoid duplicate imports
      const exists = await Card.findOne({ boardId, githubIssueId: issue.githubIssueId });
      if (exists) {
        continue;
      }

      const newCard = new Card({
        title: issue.title,
        description: issue.body || '',
        status: 'Todo',
        assignee: issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : '',
        labels: issue.labels || [],
        milestone: issue.milestone || '',
        githubIssueId: issue.githubIssueId,
        boardId
      });

      await newCard.save();
      importedCards.push(newCard);
    }

    // Broadcast refresh to all clients on the board
    const io = req.app.get('io');
    if (io && importedCards.length > 0) {
      io.to(boardId.toString()).emit('refresh-board');
    }

    res.json({
      message: `Successfully imported ${importedCards.length} issues`,
      cards: importedCards
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to import issues', error: error.message });
  }
});

export default router;
