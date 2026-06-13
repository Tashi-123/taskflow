const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

// Add a comment to a task
router.post('/', authenticateToken, (req, res) => {
  const { taskId, text } = req.body;

  if (!taskId || !text) {
    return res.status(400).json({ message: 'taskId and text are required' });
  }

  const task = store.tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const project = store.projects.find(p => p.id === task.projectId);
  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const newComment = {
    id: store.getNextCommentId(),
    taskId,
    userId: req.user.id,
    text,
    createdAt: new Date().toISOString()
  };
  store.comments.push(newComment);

  const broadcast = req.app.get('broadcast');
  broadcast({ type: 'COMMENT_ADDED', comment: newComment });

  res.status(201).json({ message: 'Comment added successfully', comment: newComment });
});

// List comments for a task
router.get('/task/:taskId', authenticateToken, (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const task = store.tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const project = store.projects.find(p => p.id === task.projectId);
  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const taskComments = store.comments
    .filter(c => c.taskId === taskId)
    .map(c => {
      const user = store.users.find(u => u.id === c.userId);
      return { ...c, userName: user ? user.name : 'Unknown' };
    });

  res.json(taskComments);
});

module.exports = router;