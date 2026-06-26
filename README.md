# Real-Time Collaborative Kanban Board Monorepo

This project is a real-time collaborative Kanban Board featuring a fullstack monorepo setup.

## Features
*   **Real-time synchronization**: Real-time collaborative drag-and-drop, card editing, and column updates via Socket.IO.
*   **AI Insights**: Automatic bottleneck detection, workload highlights, and predictive task warning tags.
*   **Chrome Extension (Manifest V3)**: Quick clipping utility to push links and summaries from the browser directly to the board.
*   **Modern CSS Styling**: Designed with premium glassmorphism, dark-mode gradients, and smooth transition animations using custom CSS layered over Bootstrap.

## Folder Structure
```text
root/
├── package.json        # Unified runner scripts
├── backend/            # Node.js + Express API and Socket.IO Server
├── frontend/           # React + Vite client using Bootstrap & Custom styling
└── extension/          # Manifest V3 Chrome Extension popup and background scripts
```

## Setup Instructions

### 1. Prerequisites
*   Node.js (v18 or higher recommended)
*   MongoDB Instance (local or Atlas)

### 2. Environment Variables
Create a `.env` file in the `backend/` directory with:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/collaborative-kanban
FRONTEND_URL=http://localhost:5173
```

### 3. Installation
To install dependencies for all modules, run:
```bash
npm run install:all
```

### 4. Running Locally
To launch both backend and frontend concurrently in development mode, run:
```bash
npm run dev
```
*   **Backend server** will run on [http://localhost:5000](http://localhost:5000)
*   **Frontend client** will run on [http://localhost:5173](http://localhost:5173)

### 5. Chrome Extension Setup
1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** in the top right.
3. Click **Load unpacked** and select the `/extension` directory from this project workspace.
