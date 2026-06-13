const API_BASE = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let currentProjectId = null;
let currentTaskId = null;
let projectsCache = [];
let tasksCache = [];

// ---------- AUTH ----------

function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

async function register() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();

  if (res.ok) {
    alert('Registered! Please login.');
    showLogin();
  } else {
    alert(data.message);
  }
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (res.ok) {
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
  } else {
    alert(data.message);
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  token = null;
  currentUser = null;
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('appSection').style.display = 'none';
}

function showApp() {
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('appSection').style.display = 'block';
  document.getElementById('userName').textContent = currentUser.name;
  loadProjects();
  connectWebSocket();
}

// ---------- API HELPER ----------

async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

// ---------- PROJECTS ----------

async function loadProjects() {
  try {
    projectsCache = await apiCall('/projects');
    renderProjects();
  } catch (err) {
    alert(err.message);
  }
}

function renderProjects() {
  const list = document.getElementById('projectsList');
  list.innerHTML = '';
  projectsCache.forEach(p => {
    const div = document.createElement('div');
    div.className = 'project-card';
    div.innerHTML = `<strong>${p.name}</strong><p>${p.description}</p>`;
    div.onclick = () => openBoard(p.id, p.name);
    list.appendChild(div);
  });
}

async function createProject() {
  const name = document.getElementById('newProjectName').value;
  const description = document.getElementById('newProjectDesc').value;
  if (!name) return alert('Project name required');

  try {
    await apiCall('/projects', 'POST', { name, description });
    document.getElementById('newProjectName').value = '';
    document.getElementById('newProjectDesc').value = '';
    loadProjects();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- BOARD / TASKS ----------

async function openBoard(projectId, projectName) {
  currentProjectId = projectId;
  document.getElementById('projectsView').style.display = 'none';
  document.getElementById('boardView').style.display = 'block';
  document.getElementById('boardProjectName').textContent = projectName;
  await loadTasks();
}

function backToProjects() {
  document.getElementById('boardView').style.display = 'none';
  document.getElementById('projectsView').style.display = 'block';
  currentProjectId = null;
}

async function loadTasks() {
  try {
    tasksCache = await apiCall(`/tasks/project/${currentProjectId}`);
    renderTasks();
  } catch (err) {
    alert(err.message);
  }
}

function renderTasks() {
  const todo = document.getElementById('todoCards');
  const inProgress = document.getElementById('inProgressCards');
  const done = document.getElementById('doneCards');
  todo.innerHTML = '';
  inProgress.innerHTML = '';
  done.innerHTML = '';

  tasksCache.forEach(t => {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.innerHTML = `<div class="task-title">${t.title}</div><div class="task-desc">${t.description}</div>`;
    card.onclick = () => openTaskModal(t.id);

    if (t.status === 'todo') todo.appendChild(card);
    else if (t.status === 'in-progress') inProgress.appendChild(card);
    else done.appendChild(card);
  });
}

async function createTask() {
  const title = document.getElementById('newTaskTitle').value;
  const description = document.getElementById('newTaskDesc').value;
  if (!title) return alert('Task title required');

  try {
    await apiCall('/tasks', 'POST', { projectId: currentProjectId, title, description });
    document.getElementById('newTaskTitle').value = '';
    document.getElementById('newTaskDesc').value = '';
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- TASK MODAL & COMMENTS ----------

async function openTaskModal(taskId) {
  currentTaskId = taskId;
  const task = tasksCache.find(t => t.id === taskId);

  document.getElementById('modalTaskTitle').textContent = task.title;
  document.getElementById('modalTaskDesc').textContent = task.description;
  document.getElementById('modalTaskStatus').value = task.status;
  document.getElementById('taskModal').style.display = 'flex';

  await loadComments();
}

function closeModal() {
  document.getElementById('taskModal').style.display = 'none';
  currentTaskId = null;
}

async function updateTaskStatus() {
  const status = document.getElementById('modalTaskStatus').value;
  try {
    await apiCall(`/tasks/${currentTaskId}`, 'PUT', { status });
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function loadComments() {
  try {
    const comments = await apiCall(`/comments/task/${currentTaskId}`);
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    comments.forEach(c => {
      const div = document.createElement('div');
      div.className = 'comment';
      div.innerHTML = `<div class="comment-author">${c.userName}</div><div>${c.text}</div>`;
      list.appendChild(div);
    });
  } catch (err) {
    alert(err.message);
  }
}

async function addComment() {
  const text = document.getElementById('newCommentText').value;
  if (!text) return;

  try {
    await apiCall('/comments', 'POST', { taskId: currentTaskId, text });
    document.getElementById('newCommentText').value = '';
    await loadComments();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- WEBSOCKET ----------

function connectWebSocket() {
  const ws = new WebSocket('ws://localhost:3000');

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'TASK_CREATED' || data.type === 'TASK_UPDATED') {
      if (currentProjectId && data.task.projectId === currentProjectId) {
        loadTasks();
      }
    }

    if (data.type === 'COMMENT_ADDED') {
      if (currentTaskId && data.comment.taskId === currentTaskId) {
        loadComments();
      }
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected, retrying in 3s...');
    setTimeout(connectWebSocket, 3000);
  };
}

// ---------- INIT ----------

if (token && currentUser) {
  showApp();
}