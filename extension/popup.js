const BACKEND_URL = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {
  const boardSelect = document.getElementById('board-select');
  const connectionStatus = document.getElementById('connection-status');
  const clipForm = document.getElementById('clip-form');
  const submitBtn = document.getElementById('submit-btn');
  const feedbackMsg = document.getElementById('feedback-message');

  // 1. Fetch details of active browser tab
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const activeTab = tabs[0];
        document.getElementById('task-title').value = activeTab.title || '';
        document.getElementById('task-desc').value = `Clipped from: ${activeTab.title}\nURL: ${activeTab.url}`;
      }
    });
  } else {
    // Fallback for non-extension environment tests
    document.getElementById('task-title').value = 'Sample Task Reference';
    document.getElementById('task-desc').value = 'Clipped from test environment URL: https://example.com';
  }

  // 2. Fetch Board Workspaces from Backend API
  fetch(`${BACKEND_URL}/api/boards`)
    .then(res => {
      if (!res.ok) throw new Error('API server returned error status');
      return res.json();
    })
    .then(boards => {
      // Clear options
      boardSelect.innerHTML = '';
      
      if (boards.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No boards found. Create one on Web!';
        opt.disabled = true;
        boardSelect.appendChild(opt);
        return;
      }

      boards.forEach(board => {
        const opt = document.createElement('option');
        opt.value = board._id;
        opt.textContent = board.name;
        boardSelect.appendChild(opt);
      });

      // Enable UI
      connectionStatus.textContent = 'Online';
      connectionStatus.className = 'status-badge status-online';
      submitBtn.disabled = false;
    })
    .catch(err => {
      console.error('Error contacting board API:', err);
      connectionStatus.textContent = 'Offline';
      connectionStatus.className = 'status-badge status-offline';
      
      boardSelect.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Could not contact server';
      opt.disabled = true;
      boardSelect.appendChild(opt);
    });

  // 3. Handle Clip Submission
  clipForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedBoardId = boardSelect.value;
    const columnId = document.getElementById('column-select').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const assignedTo = document.getElementById('task-assignee').value;

    if (!selectedBoardId) {
      showFeedback('Please select a valid board.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Clipping...';

    // POST request to backend
    fetch(`${BACKEND_URL}/api/boards/${selectedBoardId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        columnId,
        assignedTo,
        tags: ['clipped']
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to create card');
      return res.json();
    })
    .then(data => {
      showFeedback('Task successfully clipped to board!', 'success');
      
      // Reset details fields (but keep assignee/board)
      document.getElementById('task-title').value = '';
      document.getElementById('task-desc').value = '';
      
      // Load Socket.IO client script if available locally, or try connecting to send sync broadcast
      // Since Socket.IO uses standard HTTP polling, a quick WebSocket handshake works
      if (typeof io !== 'undefined') {
        const socket = io(BACKEND_URL);
        socket.emit('notify-board-change', selectedBoardId);
        setTimeout(() => socket.disconnect(), 1000);
      } else {
        // We can make a lightweight fetch to trigger socket broadast or let web clients sync
        // Handled by client reload or concurrent WebSocket updates
      }
    })
    .catch(err => {
      console.error('Error clipping task:', err);
      showFeedback('Error: Failed to clip task. Ensure server is active.', 'error');
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Clip to Kanban';
    });
  });

  function showFeedback(text, type) {
    feedbackMsg.textContent = text;
    feedbackMsg.className = `feedback-msg feedback-${type}`;
    feedbackMsg.classList.remove('hidden');
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        feedbackMsg.classList.add('hidden');
      }, 3000);
    }
  }
});
