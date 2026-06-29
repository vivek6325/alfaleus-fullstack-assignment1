import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import boardRoutes from './routes/boardRoutes.js';
import socketHandler from './socket/socketHandler.js';
import Board from './models/Board.js';
import { runAIAnalysis } from './services/aiProjectManager.js';

dotenv.config();

// ADDED THIS LINE
console.log("MONGODB URI FROM ENV:", process.env.MONGODB_URI);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
];

// CORS FIX
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('chrome-extension://')
      ) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Routes
app.use('/', boardRoutes);
app.use('/api', boardRoutes);

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    db:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
  });
});

// Serve frontend build
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// React SPA fallback
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/boards') ||
    req.path.startsWith('/cards') ||
    req.path.startsWith('/health')
  ) {
    return next();
  }

  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Socket
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
socketHandler(io);

const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

async function startServer() {
  let uri = MONGODB_URI;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Successfully connected to MongoDB Atlas.');
  } catch (err) {
    console.error('ACTUAL MONGODB ERROR:');
    console.error(err);
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`Kanban Backend Server running on port ${PORT}`);

    setTimeout(async () => {
      console.log(
        'Running startup automated AI Project Manager analysis for all boards...'
      );

      try {
        const boards = await Board.find();
        for (const board of boards) {
          await runAIAnalysis(board._id, io);
        }
      } catch (err) {
        console.error('Error running startup automated AI analysis:', err);
      }
    }, 5000);

    setInterval(async () => {
      console.log(
        'Running automated 6-hourly AI Project Manager analysis for all boards...'
      );

      try {
        const boards = await Board.find();
        for (const board of boards) {
          await runAIAnalysis(board._id, io);
        }
      } catch (err) {
        console.error('Error running automated AI analysis:', err);
      }
    }, 6 * 60 * 60 * 1000);
  });
}

startServer();