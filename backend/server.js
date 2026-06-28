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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure CORS to accept requests from our client and chrome extension
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  // Chrome Extension IDs vary. Allow all chrome-extension protocols or let CORS reflect origin dynamically
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or standard server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow extensions (chrome-extension://...) and configured frontend
    if (origin.startsWith('chrome-extension://') || allowedOrigins.indexOf(origin) !== -1 || origin === 'null') {
      return callback(null, true);
    }
    
    // In dev mode, allow other origins for ease of access
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/', boardRoutes);
app.use('/api', boardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Serve static assets if in production or if dist folder exists
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback all non-API routes to index.html for React SPA
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

// Setup Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all for websocket testing, secure origins handled at handshake if needed
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

socketHandler(io);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collaborative-kanban';
const PORT = process.env.PORT || 5000;

async function startServer() {
  let uri = MONGODB_URI;
  try {
    // Try connecting to the configured MONGODB_URI with a timeout of 2 seconds
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log('Successfully connected to MongoDB.');
  } catch (err) {
    console.warn(`Could not connect to MongoDB at ${uri}. Falling back to in-memory MongoDB...`);
    try {
      process.env.MONGOMS_VERSION = '4.4.29';
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      await mongoose.connect(uri);
      console.log('Successfully connected to In-Memory MongoDB.');
    } catch (innerErr) {
      console.error('Failed to start in-memory MongoDB fallback:', innerErr);
      process.exit(1);
    }
  }

  httpServer.listen(PORT, () => {
    console.log(`Kanban Backend Server running on port ${PORT}`);

    // Setup automated AI analysis check every 6 hours + run once at startup after 5 seconds
    setTimeout(async () => {
      console.log('Running startup automated AI Project Manager analysis for all boards...');
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
      console.log('Running automated 6-hourly AI Project Manager analysis for all boards...');
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
