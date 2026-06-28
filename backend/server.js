import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import boardRoutes from './routes/boardRoutes.js';
import socketHandler from './socket/socketHandler.js';

dotenv.config();

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
  });
}

startServer();
