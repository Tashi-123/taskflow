const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

// Create a project
router.post('/', authenticateToken, (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  const newProject = {
    id: store.getNextProjectId(),
    name,
    description: description || '',
    ownerId: req.user.id,
    members: [req.user.id]
  };
  store.projects.push(newProject);

  res.status(201).json({ message: 'Project created successfully', project: newProject });
});

// List projects for the logged-in user
router.get('/', authenticateToken, (req, res) => {
  const userProjects = store.projects.filter(p => p.members.includes(req.user.id));
  res.json(userProjects);
});

// Get a single project by ID
router.get('/:id', authenticateToken, (req, res) => {
  const project = store.projects.find(p => p.id === parseInt(req.params.id));

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(project);
});

// Add a member to a project
router.post('/:id/members', authenticateToken, (req, res) => {
  const { userId } = req.body;
  const project = store.projects.find(p => p.id === parseInt(req.params.id));

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (project.ownerId !== req.user.id) {
    return res.status(403).json({ message: 'Only the project owner can add members' });
  }

  const userExists = store.users.find(u => u.id === userId);
  if (!userExists) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (!project.members.includes(userId)) {
    project.members.push(userId);
  }

  res.json({ message: 'Member added successfully', project });
});

module.exports = router;