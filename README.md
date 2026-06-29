````markdown
# Real-Time Collaborative Kanban with AI Project Manager

A full-stack collaborative project management application featuring real-time Kanban boards, AI-powered project insights, GitHub issue importing, and Chrome extension task clipping.

---

## Tech Stack

- **Frontend:** React + Vite + Bootstrap
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Real-Time Communication:** Socket.IO (WebSockets)
- **Deployment:** Railway
- **Browser Extension:** Chrome Extension (Manifest V3)

---

## Features Implemented

- Real-time collaborative Kanban board
- Drag-and-drop task movement
- WebSocket synchronization
- Conflict resolution using Last-Write-Wins
- AI insights panel
- Bottleneck detection
- Sprint risk analysis
- Task complexity inference
- GitHub issue importer
- Chrome extension for task clipping

---

## Architecture

The application follows a client-server architecture:

- Frontend communicates with the Express backend using REST APIs
- Socket.IO handles real-time board synchronization
- MongoDB stores boards and cards persistently
- AI analysis runs as scheduled background jobs every 6 hours

### System Flow

```text
React Frontend
     |
 REST APIs
     |
Node.js + Express Backend
     |
 Socket.IO
     |
MongoDB Atlas Database
````

---

## Conflict Resolution Strategy

Implemented **Last-Write-Wins (LWW)** strategy:

* Latest update overwrites previous conflicting updates
* All connected clients receive synchronized updates via WebSockets
* Ensures consistency during simultaneous edits

---

## GitHub Issue Import

Supported features:

* Import from public repositories
* Import open issues
* Label mapping to Kanban columns
* Duplicate issue prevention

---

## AI Methodology

The AI Project Manager analyzes:

* Card velocity
* Team bottlenecks
* Sprint completion risk
* Task complexity estimation

AI insights help teams identify blockers and improve productivity.

---

## Deployment

### Backend Live URL

https://alfaleus-fullstack-assignment1-production.up.railway.app

---

## Known Limitations

* Final frontend production deployment is pending
* Local MongoDB Atlas connection issue with Node.js v24 DNS SRV resolution

---

## Future Improvements

* Complete frontend deployment
* Improve AI recommendation accuracy
* Add authentication and user roles
* Support multiple Kanban boards per organization
* Add analytics dashboard

---

## Author

**Vivek Aripalli**
B.Tech CSE | VIT-AP University

```
```
