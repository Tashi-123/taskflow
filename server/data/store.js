// In-memory data store

const users = [];        // { id, name, email, password (hashed) }
const projects = [];     // { id, name, description, ownerId, members: [userId] }
const tasks = [];        // { id, projectId, title, description, status, assignedTo, createdBy }
const comments = [];     // { id, taskId, userId, text, createdAt }

let nextUserId = 1;
let nextProjectId = 1;
let nextTaskId = 1;
let nextCommentId = 1;

module.exports = {
  users,
  projects,
  tasks,
  comments,
  getNextUserId: () => nextUserId++,
  getNextProjectId: () => nextProjectId++,
  getNextTaskId: () => nextTaskId++,
  getNextCommentId: () => nextCommentId++
};