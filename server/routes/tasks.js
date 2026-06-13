const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

// Create a task within a project
router.post('/', authenticateToken, (req, res) => {
  const { projectId, title, description, assignedTo } = req.body;

  if (!projectId || !title) {
    return res.status(400).json({ message: 'projectId and title are required' });
  }

  const project = store.projects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const newTask = {
    id: store.getNextTaskId(),
    projectId,
    title,
    description: description || '',
    status: 'todo',
    assignedTo: assignedTo || null,
    createdBy: req.user.id
  };
  store.tasks.push(newTask);

  const broadcast = req.app.get('broadcast');
  broadcast({ type: 'TASK_CREATED', task: newTask });

  res.status(201).json({ message: 'Task created successfully', task: newTask });
});

// List tasks for a project
router.get('/project/:projectId', authenticateToken, (req, res) => {
  const projectId = parseInt(req.params.projectId);
  const project = store.projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const projectTasks = store.tasks.filter(t => t.projectId === projectId);
  res.json(projectTasks);
});

// Update a task (status, assignment, etc.)
router.put('/:id', authenticateToken, (req, res) => {
  const task = store.tasks.find(t => t.id === parseInt(req.params.id));

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const project = store.projects.find(p => p.id === task.projectId);
  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { title, description, status, assignedTo } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (assignedTo !== undefined) task.assignedTo = assignedTo;

  const broadcast = req.app.get('broadcast');
  broadcast({ type: 'TASK_UPDATED', task });

  res.json({ message: 'Task updated successfully', task });
});

// Delete a task
router.delete('/:id', authenticateToken, (req, res) => {
  const taskIndex = store.tasks.findIndex(t => t.id === parseInt(req.params.id));

  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const task = store.tasks[taskIndex];
  const project = store.projects.find(p => p.id === task.projectId);
  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  store.tasks.splice(taskIndex, 1);
  res.json({ message: 'Task deleted successfully' });
});

module.exports = router;
