let API_URL = '';
let API_KEY = '';

const statusMsg = document.getElementById('status-message');
const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-description');
const editingIdInput = document.getElementById('editing-id');
const submitBtn = document.getElementById('task-submit');
const taskList = document.getElementById('task-list');

function showMessage(msg, isError = true) {
  statusMsg.textContent = msg;
  statusMsg.style.color = isError ? '#d9534f' : '#5cb85c';
}

async function init() {
  try {
    const res = await fetch('config.json');
    const config = await res.json();
    API_URL = `${config.supabaseUrl}/rest/v1/${config.tableName}`;
    API_KEY = config.supabasePublishableKey;
    await fetchTasks();
  } catch (err) {
    showMessage(`Initialization failed: ${err.message}`);
  }
}

async function apiFetch(endpoint = '', options = {}) {
  options.headers = {
    'apikey': API_KEY,
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...(options.headers || {})
  };
  const res = await fetch(`${API_URL}${endpoint}`, options);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP ${res.status}`);
  }
  return res.status !== 204 ? res.json() : null;
}

async function fetchTasks() {
  try {
    const tasks = await apiFetch('?select=*&order=id.asc');
    renderTasks(tasks);
    showMessage('');
  } catch (err) {
    showMessage(`Failed to load tasks: ${err.message}`);
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.setAttribute('data-id', task.id);

    item.innerHTML = `
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      <p class="task-description">${escapeHtml(task.description || '')}</p>
      <p class="task-status">Status: ${task.completed ? 'Completed' : 'Incomplete'}</p>
      <button class="toggle-task">${task.completed ? 'Mark Incomplete' : 'Mark Completed'}</button>
      <button class="edit-task">Edit</button>
      <button class="delete-task">Delete</button>
    `;

    item.querySelector('.toggle-task').addEventListener('click', () => toggleTask(task));
    item.querySelector('.edit-task').addEventListener('click', () => startEdit(task));
    item.querySelector('.delete-task').addEventListener('click', () => deleteTask(task.id));

    taskList.appendChild(item);
  });
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const editId = editingIdInput.value;

  if (!title) return;

  try {
    if (editId) {
      await apiFetch(`?id=eq.${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, description })
      });
    } else {
      await apiFetch('', {
        method: 'POST',
        body: JSON.stringify({ title, description, completed: false })
      });
    }
    resetForm();
    await fetchTasks();
  } catch (err) {
    showMessage(`Save failed: ${err.message}`);
  }
});

async function toggleTask(task) {
  try {
    await apiFetch(`?id=eq.${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !task.completed })
    });
    await fetchTasks();
  } catch (err) {
    showMessage(`Toggle failed: ${err.message}`);
  }
}

async function deleteTask(id) {
  try {
    await apiFetch(`?id=eq.${id}`, { method: 'DELETE' });
    await fetchTasks();
  } catch (err) {
    showMessage(`Delete failed: ${err.message}`);
  }
}

function startEdit(task) {
  editingIdInput.value = task.id;
  titleInput.value = task.title;
  descInput.value = task.description || '';
  submitBtn.textContent = 'Update Task';
}

function resetForm() {
  editingIdInput.value = '';
  titleInput.value = '';
  descInput.value = '';
  submitBtn.textContent = 'Add Task';
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

init();
