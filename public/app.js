'use strict';

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};

const STATUSES = ['not_started', 'on_track', 'at_risk', 'off_track', 'on_hold', 'done'];
const STATUS_LABEL = {
  not_started: 'Not started', on_track: 'On track', at_risk: 'At risk',
  off_track: 'Off track', on_hold: 'On hold', done: 'Done',
};

let TOAST_TIMER = null;
function toast(msg, isErr = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  clearTimeout(TOAST_TIMER);
  TOAST_TIMER = setTimeout(() => t.classList.add('hidden'), 2600);
}

async function api(method, path, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body && isForm) {
    opts.body = body; // FormData
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) {
    showLogin();
    throw new Error('Not authenticated');
  }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------
const state = {
  user: null,
  drivers: [],
  goals: [],
  keyResults: [],
  projects: [],
  filterDriver: '',
  openGoals: new Set(),
  openKrs: new Set(),
};

const driverName = (id) => {
  const d = state.drivers.find((x) => x.id === id);
  return d ? d.name : 'Unassigned';
};

// ---------------------------------------------------------------------------
// Reusable editable controls (auto-save via PATCH)
// ---------------------------------------------------------------------------
async function save(resource, id, field, value) {
  try {
    await api('PATCH', `/${resource}/${id}`, { [field]: value });
    toast('Saved');
  } catch (err) {
    toast(err.message, true);
  }
}

function editableText(resource, id, field, value, opts = {}) {
  const span = el('span', { class: 'editable ' + (opts.class || ''), contenteditable: 'true', text: value || '' });
  let prev = value || '';
  span.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
  });
  span.addEventListener('blur', async () => {
    const next = span.textContent.trim();
    if (next === prev) return;
    prev = next;
    await save(resource, id, field, next);
  });
  return span;
}

function statusSelect(resource, id, value) {
  const sel = el('select', { class: 'status ' + value });
  for (const s of STATUSES) sel.appendChild(el('option', { value: s, text: STATUS_LABEL[s] }));
  sel.value = value;
  sel.addEventListener('change', async () => {
    sel.className = 'status ' + sel.value;
    await save(resource, id, 'status', sel.value);
  });
  return sel;
}

function driverSelect(resource, id, value) {
  const sel = el('select', { class: 'inline-select' });
  sel.appendChild(el('option', { value: '', text: 'Unassigned' }));
  for (const d of state.drivers) sel.appendChild(el('option', { value: String(d.id), text: d.name }));
  sel.value = value ? String(value) : '';
  sel.addEventListener('change', () => save(resource, id, 'driver_id', sel.value));
  return sel;
}

function progressControl(resource, id, value) {
  const fill = el('i');
  fill.style.width = (value || 0) + '%';
  const input = el('input', { class: 'progress-input', type: 'number', min: '0', max: '100', value: String(value || 0) });
  input.addEventListener('change', async () => {
    let v = Math.max(0, Math.min(100, parseInt(input.value, 10) || 0));
    input.value = String(v);
    fill.style.width = v + '%';
    await save(resource, id, 'progress', v);
  });
  return el('div', { class: 'progress-wrap' }, [el('div', { class: 'bar' }, [fill]), input]);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderSummary() {
  const goals = visibleGoals();
  const krs = state.keyResults.filter((k) => goals.some((g) => g.id === k.goal_id));
  const projects = state.projects;
  const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + (x.progress || 0), 0) / arr.length) : 0);
  const atRisk = [...goals, ...krs].filter((x) => x.status === 'at_risk' || x.status === 'off_track').length;

  const cards = [
    { num: avg(goals) + '%', lbl: 'Avg goal progress' },
    { num: goals.length, lbl: 'Goals' },
    { num: krs.length, lbl: 'Key results' },
    { num: projects.length, lbl: 'Projects' },
    { num: atRisk, lbl: 'At risk / off track' },
  ];
  const wrap = $('#summary');
  wrap.innerHTML = '';
  for (const c of cards) {
    wrap.appendChild(el('div', { class: 'summary-card' }, [
      el('div', { class: 'num', text: String(c.num) }),
      el('div', { class: 'lbl', text: c.lbl }),
    ]));
  }
}

function visibleGoals() {
  if (!state.filterDriver) return state.goals;
  const id = Number(state.filterDriver);
  return state.goals.filter((g) => g.driver_id === id);
}

function renderProject(p) {
  const row = el('div', { class: 'project' });
  const docsWrap = el('div', { class: 'project-docs' });

  row.appendChild(el('div', { class: 'project-main' }, [
    el('div', { class: 'project-title' }, [editableText('projects', p.id, 'title', p.title)]),
    el('div', { class: 'project-sub' }, [
      driverSelect('projects', p.id, p.driver_id),
      p.due_date ? el('span', { text: 'Due ' + String(p.due_date).slice(0, 10) }) : null,
      docsWrap,
    ]),
  ]));
  row.appendChild(statusSelect('projects', p.id, p.status));
  row.appendChild(progressControl('projects', p.id, p.progress));
  row.appendChild(el('button', { class: 'danger small', title: 'Delete project',
    onclick: () => removeEntity('projects', p.id) }, '🗑'));

  loadDocs(p.id, docsWrap);
  return row;
}

function renderKr(kr) {
  const projects = state.projects.filter((p) => p.key_result_id === kr.id);
  const card = el('div', { class: 'kr' + (state.openKrs.has(kr.id) ? ' open' : '') });

  const head = el('div', { class: 'kr-head' }, [
    el('span', { class: 'caret', text: '▶' }),
    el('span', { class: 'kr-title' }, [editableText('key-results', kr.id, 'title', kr.title)]),
    el('span', { class: 'kr-metric', text: `${num(kr.current_value)} / ${num(kr.target_value)} ${kr.unit || ''}`.trim() }),
    statusSelect('key-results', kr.id, kr.status),
    progressControl('key-results', kr.id, kr.progress),
  ]);
  head.addEventListener('click', (e) => {
    if (e.target.closest('select, input, .editable, button')) return;
    toggle(state.openKrs, kr.id, card);
  });

  const body = el('div', { class: 'kr-body' });
  // metric editors
  body.appendChild(el('div', { class: 'project-sub', style: 'padding:8px 0' }, [
    metricEditor('Current', 'key-results', kr.id, 'current_value', kr.current_value),
    metricEditor('Target', 'key-results', kr.id, 'target_value', kr.target_value),
    driverSelect('key-results', kr.id, kr.driver_id),
  ]));
  for (const p of projects) body.appendChild(renderProject(p));
  body.appendChild(el('button', { class: 'ghost small', style: 'margin-top:10px',
    onclick: () => addProject(kr.id) }, '+ Project'));

  card.appendChild(head);
  card.appendChild(body);
  return card;
}

function metricEditor(label, resource, id, field, value) {
  const input = el('input', { class: 'progress-input', style: 'width:70px', type: 'number', value: String(value ?? 0) });
  input.addEventListener('change', () => save(resource, id, field, input.value));
  return el('span', { class: 'owner' }, [label + ': ', input]);
}

function renderGoal(g) {
  const krs = state.keyResults.filter((k) => k.goal_id === g.id);
  const card = el('div', { class: 'goal-card' + (state.openGoals.has(g.id) ? ' open' : '') });

  const head = el('div', { class: 'goal-head' }, [
    el('span', { class: 'caret', text: '▶' }),
    el('span', { class: 'goal-title' }, [editableText('goals', g.id, 'title', g.title)]),
    el('span', { class: 'owner' }, [driverSelect('goals', g.id, g.driver_id)]),
    statusSelect('goals', g.id, g.status),
    progressControl('goals', g.id, g.progress),
  ]);
  head.addEventListener('click', (e) => {
    if (e.target.closest('select, input, .editable, button')) return;
    toggle(state.openGoals, g.id, card);
  });

  const body = el('div', { class: 'goal-body' }, [
    el('div', { class: 'goal-desc' }, [editableText('goals', g.id, 'description', g.description)]),
  ]);
  for (const kr of krs) body.appendChild(renderKr(kr));
  body.appendChild(el('div', { style: 'display:flex; gap:8px; margin-top:6px' }, [
    el('button', { class: 'ghost small', onclick: () => addKr(g.id) }, '+ Key result'),
    el('button', { class: 'danger small', onclick: () => removeEntity('goals', g.id) }, 'Delete goal'),
  ]));

  card.appendChild(head);
  card.appendChild(body);
  return card;
}

function render() {
  renderSummary();
  const wrap = $('#goals');
  wrap.innerHTML = '';
  const goals = visibleGoals();
  if (goals.length === 0) {
    wrap.appendChild(el('p', { class: 'muted', text: 'No goals yet. Click “+ Goal” to add one.' }));
  }
  for (const g of goals) wrap.appendChild(renderGoal(g));
}

function toggle(set, id, card) {
  if (set.has(id)) { set.delete(id); card.classList.remove('open'); }
  else { set.add(id); card.classList.add('open'); }
}

const num = (v) => {
  const n = Number(v);
  return Number.isInteger(n) ? n.toLocaleString() : n;
};

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
async function loadDocs(projectId, container) {
  container.innerHTML = '';
  let docs = [];
  try { docs = await api('GET', `/projects/${projectId}/documents`); } catch (_) { return; }
  for (const d of docs) {
    container.appendChild(el('div', { class: 'doc-row' }, [
      el('a', { class: 'linklike', href: `/api/documents/${d.id}`, text: `📎 ${d.filename}` }),
      el('button', { class: 'danger small', title: 'Delete file',
        onclick: async () => { await api('DELETE', `/documents/${d.id}`); loadDocs(projectId, container); } }, '✕'),
    ]));
  }
  const fileInput = el('input', { type: 'file', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files.length) return;
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    try {
      await api('POST', `/projects/${projectId}/documents`, fd, true);
      toast('Uploaded');
      loadDocs(projectId, container);
    } catch (err) { toast(err.message, true); }
  });
  container.appendChild(el('span', { class: 'linklike', text: '⬆ Upload', onclick: () => fileInput.click() }));
  container.appendChild(fileInput);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
async function addProject(krId) {
  try {
    const p = await api('POST', '/projects', { key_result_id: krId, title: 'New project', status: 'not_started', progress: 0 });
    state.projects.push(p);
    render();
  } catch (err) { toast(err.message, true); }
}

async function addKr(goalId) {
  try {
    const kr = await api('POST', '/key-results', { goal_id: goalId, title: 'New key result', status: 'not_started', progress: 0 });
    state.keyResults.push(kr);
    state.openGoals.add(goalId);
    render();
  } catch (err) { toast(err.message, true); }
}

async function addGoal() {
  try {
    const g = await api('POST', '/goals', { title: 'New goal', status: 'not_started', progress: 0 });
    state.goals.push(g);
    state.openGoals.add(g.id);
    render();
  } catch (err) { toast(err.message, true); }
}

async function removeEntity(resource, id) {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  try {
    await api('DELETE', `/${resource}/${id}`);
    await loadData();
    render();
    toast('Deleted');
  } catch (err) { toast(err.message, true); }
}

// ---------------------------------------------------------------------------
// Users (admin)
// ---------------------------------------------------------------------------
async function openUsers() {
  $('#users-error').textContent = '';
  try {
    const users = await api('GET', '/users');
    const tb = $('#users-tbody');
    tb.innerHTML = '';
    for (const u of users) {
      const roleSel = el('select', { class: 'inline-select' }, [
        el('option', { value: 'member', text: 'Member' }),
        el('option', { value: 'admin', text: 'Admin' }),
      ]);
      roleSel.value = u.role;
      roleSel.addEventListener('change', () => api('PATCH', `/users/${u.id}`, { role: roleSel.value }).catch((e) => toast(e.message, true)));
      tb.appendChild(el('tr', {}, [
        el('td', { text: u.email }),
        el('td', { text: u.name || '' }),
        el('td', {}, [roleSel]),
        el('td', {}, [u.id === state.user.id ? el('span', { class: 'muted', text: 'you' })
          : el('button', { class: 'danger small', onclick: async () => { await api('DELETE', `/users/${u.id}`); openUsers(); } }, 'Remove')]),
      ]));
    }
    $('#users-modal').classList.remove('hidden');
  } catch (err) { toast(err.message, true); }
}

// ---------------------------------------------------------------------------
// Data loading / boot
// ---------------------------------------------------------------------------
async function loadData() {
  const [drivers, goals, keyResults, projects] = await Promise.all([
    api('GET', '/drivers'),
    api('GET', '/goals'),
    api('GET', '/key-results'),
    api('GET', '/projects'),
  ]);
  state.drivers = drivers;
  state.goals = goals;
  state.keyResults = keyResults;
  state.projects = projects;

  const sel = $('#filter-driver');
  sel.innerHTML = '<option value="">All</option>';
  for (const d of drivers) sel.appendChild(el('option', { value: String(d.id), text: d.name }));
  sel.value = state.filterDriver;
}

function showLogin() {
  $('#app-view').classList.add('hidden');
  $('#login-view').classList.remove('hidden');
}

async function showApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#current-user').textContent = `${state.user.name || state.user.email} · ${state.user.role}`;
  $('#manage-users-btn').classList.toggle('hidden', state.user.role !== 'admin');
  await loadData();
  render();
}

async function boot() {
  try {
    const { user } = await api('GET', '/auth/me');
    state.user = user;
    await showApp();
  } catch (_) {
    showLogin();
  }
}

// ---------------------------------------------------------------------------
// Wire up events
// ---------------------------------------------------------------------------
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  $('#login-submit').disabled = true;
  try {
    const { user } = await api('POST', '/auth/login', {
      email: $('#login-email').value.trim(),
      password: $('#login-password').value,
    });
    state.user = user;
    await showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  } finally {
    $('#login-submit').disabled = false;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await api('POST', '/auth/logout');
  state.user = null;
  showLogin();
});

$('#add-goal-btn').addEventListener('click', addGoal);
$('#manage-users-btn').addEventListener('click', openUsers);
$('#filter-driver').addEventListener('change', (e) => { state.filterDriver = e.target.value; render(); });

document.querySelectorAll('[data-close-modal]').forEach((b) =>
  b.addEventListener('click', () => $('#users-modal').classList.add('hidden')));
$('#users-modal').addEventListener('click', (e) => { if (e.target.id === 'users-modal') e.currentTarget.classList.add('hidden'); });

$('#add-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#users-error').textContent = '';
  try {
    await api('POST', '/users', {
      email: $('#nu-email').value.trim(),
      name: $('#nu-name').value.trim(),
      password: $('#nu-password').value,
      role: $('#nu-role').value,
    });
    $('#add-user-form').reset();
    openUsers();
    toast('User added');
  } catch (err) {
    $('#users-error').textContent = err.message;
  }
});

boot();
