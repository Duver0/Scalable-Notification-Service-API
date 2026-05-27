// ===== Configuration =====
const API_BASE = '';
const WORKER_BASE = 'http://localhost:3001';

// ===== State =====
let token = localStorage.getItem('token') || null;
let userEmail = localStorage.getItem('userEmail') || null;

// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
  // Load saved auth state
  if (token) {
    document.getElementById('userEmail').textContent = userEmail || 'Unknown';
    document.getElementById('userInfo').classList.remove('hidden');
  }
  updateNavStatus();

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Form submissions
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('notifyForm').addEventListener('submit', handleNotify);

  // Initial data
  checkHealth();
  loadHistory();

  // Auto-refresh health every 15s
  setInterval(checkHealth, 15000);
});

// ===== Tab Switching =====
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// ===== Navigation Status =====
function updateNavStatus() {
  const dot = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');
  if (token) {
    dot.className = 'status-dot online';
    text.textContent = userEmail || 'Authenticated';
  } else {
    dot.className = 'status-dot offline';
    text.textContent = 'Not logged in';
  }
}

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ===== API Helpers =====
async function apiCall(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({ error: res.statusText }));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

// ===== Health Check =====
async function checkHealth() {
  const api = await apiCall('/');
  const worker = await fetch(`${WORKER_BASE}/health`).then(r => r.json()).catch(() => null);

  document.getElementById('statApi').querySelector('.stat-value').textContent = api.ok ? '✅ Online' : '❌ Offline';
  document.getElementById('statWorker').querySelector('.stat-value').textContent = worker?.status === 'ok' ? '✅ Online' : '❌ Offline';
  document.getElementById('statAuth').querySelector('.stat-value').textContent = token ? '✅ Logged in' : '🔑 Guest';
  document.getElementById('statJobs').querySelector('.stat-value').textContent = worker?.queue ? Object.values(worker.queue).reduce((a, b) => a + b, 0) : '-';
}

// ===== Auth =====
async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const username = document.getElementById('regUsername').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = '⏳ Registering...';

  const { ok, data } = await apiCall('/auth/register', {
    method: 'POST', body: JSON.stringify({ email, username }),
  });

  if (ok) {
    token = data.access_token;
    userEmail = email;
    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', userEmail);
    document.getElementById('userEmail').textContent = userEmail;
    document.getElementById('userInfo').classList.remove('hidden');
    updateNavStatus();
    showToast('✅ User registered successfully!', 'success');
    e.target.reset();
    checkHealth();
  } else {
    showToast(`❌ ${data.message || data.error || 'Registration failed'}`, 'error');
  }
  btn.disabled = false; btn.textContent = 'Register';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = '⏳ Logging in...';

  const { ok, data } = await apiCall('/auth/login', {
    method: 'POST', body: JSON.stringify({ email }),
  });

  if (ok) {
    token = data.access_token;
    userEmail = email;
    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', userEmail);
    document.getElementById('userEmail').textContent = userEmail;
    document.getElementById('userInfo').classList.remove('hidden');
    updateNavStatus();
    showToast('✅ Logged in successfully!', 'success');
    checkHealth();
  } else {
    showToast(`❌ ${data.message || data.error || 'Login failed'}`, 'error');
  }
  btn.disabled = false; btn.textContent = 'Login';
}

function logout() {
  token = null;
  userEmail = null;
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  document.getElementById('userInfo').classList.add('hidden');
  updateNavStatus();
  showToast('👋 Logged out', 'info');
  checkHealth();
}

// ===== Notifications =====
let varCount = 1;

function addVariable() {
  const container = document.getElementById('varFields');
  const row = document.createElement('div');
  row.className = 'form-row var-row';
  row.innerHTML = `
    <input type="text" class="var-key" placeholder="variable name">
    <input type="text" class="var-value" placeholder="value">
  `;
  container.appendChild(row);
  varCount++;
}

async function handleNotify(e) {
  e.preventDefault();

  if (!token) {
    document.getElementById('authWarning').classList.remove('hidden');
    return;
  }
  document.getElementById('authWarning').classList.add('hidden');

  const to = document.getElementById('notifyTo').value;
  const channel = document.getElementById('notifyChannel').value;
  const templateId = document.getElementById('notifyTemplate').value;
  const correlationId = document.getElementById('notifyCorrelationId').value || undefined;
  const idempotencyKey = document.getElementById('notifyIdempotency').value || undefined;

  // Build variables from var fields
  const variables = {};
  document.querySelectorAll('.var-row').forEach(row => {
    const key = row.querySelector('.var-key').value.trim();
    const val = row.querySelector('.var-value').value.trim();
    if (key) variables[key] = val;
  });

  const headers = {};
  if (correlationId) headers['x-correlation-id'] = correlationId;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = '⏳ Sending...';

  const { ok, data } = await apiCall('/notifications', {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, channel, templateId, variables }),
  });

  const resultDiv = document.getElementById('notifyResult');
  resultDiv.classList.remove('hidden');
  resultDiv.style.background = ok ? '#e8f5e9' : '#ffebee';
  resultDiv.style.border = `1px solid ${ok ? '#a5d6a7' : '#ef9a9a'}`;
  resultDiv.textContent = JSON.stringify(data, null, 2);

  if (ok) {
    showToast('✅ Notification accepted!', 'success');
    setTimeout(() => loadHistory(), 1000);
  } else {
    showToast(`❌ ${data.message || data.error || 'Failed'}`, 'error');
  }
  btn.disabled = false; btn.textContent = '🚀 Send Notification';
}

// ===== History =====
async function loadHistory() {
  document.getElementById('searchCorrelationId').value = '';
  await fetchJobs();
}

async function searchHistory() {
  const correlationId = document.getElementById('searchCorrelationId').value.trim();
  await fetchJobs(correlationId);
}

async function fetchJobs(correlationId) {
  const tbody = document.getElementById('historyBody');

  if (!token) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Login to see notification history</td></tr>';
    return;
  }

  try {
    let endpoint = '/notifications?limit=100';
    if (correlationId) endpoint += `&correlationId=${encodeURIComponent(correlationId)}`;

    const { ok, data } = await apiCall(endpoint);

    if (!ok) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">Error: ${data.message || 'Failed to fetch'}</td></tr>`;
      return;
    }

    const jobs = data.items || [];
    if (jobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No notifications found</td></tr>';
      return;
    }

    tbody.innerHTML = jobs.map(job => {
      const statusClass = {
        queued: 'badge-queued',
        processing: 'badge-processing',
        sent: 'badge-sent',
        failed: 'badge-failed',
        duplicate: 'badge-duplicate',
      }[job.status] || '';

      const created = new Date(job.createdAt).toLocaleString();
      const vars = job.variables ? Object.entries(job.variables).map(([k, v]) => `${k}=${v}`).join(', ') : '-';

      return `<tr>
        <td title="${job.id}">${job.id.substring(0, 8)}...</td>
        <td>${job.channel}</td>
        <td>${job.to}</td>
        <td>${job.templateId}</td>
        <td><span class="badge ${statusClass}">${job.status}</span></td>
        <td>${job.correlationId || '-'}</td>
        <td>${created}</td>
        <td>${job.errorMessage || job.providerMessageId || '-'}</td>
      </tr>`;
    }).join('');
  } catch {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Error fetching data</td></tr>';
  }
}
