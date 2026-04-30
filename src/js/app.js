import { GitHubClient } from './github-client.js';
import {
  buildCurrentPresence,
  createPresenceEvent,
  encodeEvent,
  extractEventsFromComments,
  todayIssueTitle
} from './presence-store.js';

const config = window.PRESENCE_CONFIG;
const storageKeys = {
  token: 'presence-board.github-token',
  user: 'presence-board.user',
  room: 'presence-board.room'
};

const elements = {
  tokenInput: document.querySelector('#token-input'),
  saveTokenButton: document.querySelector('#save-token-button'),
  clearTokenButton: document.querySelector('#clear-token-button'),
  connectionState: document.querySelector('#connection-state'),
  refreshButton: document.querySelector('#refresh-button'),
  form: document.querySelector('#presence-form'),
  userInput: document.querySelector('#user-input'),
  roomInput: document.querySelector('#room-input'),
  statusInput: document.querySelector('#status-input'),
  noteInput: document.querySelector('#note-input'),
  tableBody: document.querySelector('#presence-table-body'),
  errorBox: document.querySelector('#error-box'),
  lastUpdated: document.querySelector('#last-updated')
};

let nextAutoRefreshAt = null;
let countdownIntervalId = null;

init();

function init() {
  elements.tokenInput.value = localStorage.getItem(storageKeys.token) ?? '';
  elements.userInput.value = localStorage.getItem(storageKeys.user) ?? '';
  elements.roomInput.value = localStorage.getItem(storageKeys.room) ?? '';

  elements.saveTokenButton.addEventListener('click', saveToken);
  elements.clearTokenButton.addEventListener('click', clearToken);
  elements.refreshButton.addEventListener('click', refreshPresence);
  elements.form.addEventListener('submit', submitPresence);

  if (getToken()) {
    refreshPresence();
  }

  window.setInterval(() => {
    if (getToken()) {
      refreshPresence({ silent: true });
    }
  }, config.pollIntervalSeconds * 1000);

  startCountdownTicker();
  resetAutoRefreshCountdown();
}


async function submitPresence(event) {
  event.preventDefault();
  hideError();

  try {
    const client = createClient();
    const issue = await client.ensureIssue(todayIssueTitle(config));
    const presenceEvent = createPresenceEvent({
      user: elements.userInput.value,
      room: elements.roomInput.value,
      status: elements.statusInput.value,
      note: elements.noteInput.value
    });

    localStorage.setItem(storageKeys.user, presenceEvent.user);
    localStorage.setItem(storageKeys.room, presenceEvent.room);

    await client.createComment(issue.number, encodeEvent(presenceEvent));
    await refreshPresence();
  } catch (error) {
    showError(error.message);
  }
}

async function refreshPresence(options = {}) {
    hideError();

    try {
        const client = createClient();
        const issue = await client.getIssue(todayIssueTitle(config));

        if (!issue) {
            renderPresence([]);
            setConnectionState('Verbunden', 'ok');
            resetAutoRefreshCountdown();
            return;
        }

        const comments = await client.listComments(issue.number);
        const events = extractEventsFromComments(comments);
        const currentPresence = buildCurrentPresence(events, config.statusTtlMinutes);

        renderPresence(currentPresence);
        setConnectionState('Verbunden', 'ok');
        resetAutoRefreshCountdown();
    } catch (error) {
        setConnectionState('Fehler', 'error');
        if (!options.silent) {
            showError(error.message);
        }
    }
}

function renderPresence(items) {
  elements.tableBody.innerHTML = '';

  if (items.length === 0) {
    elements.tableBody.innerHTML = '<tr><td colspan="5" class="empty">Aktuell ist niemand eingetragen.</td></tr>';
    return;
  }

  for (const item of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.user)}</td>
      <td>${escapeHtml(item.room)}</td>
      <td><span class="status status-${escapeHtml(item.status)}">${statusLabel(item.status)}</span></td>
      <td>${escapeHtml(item.note || '')}</td>
      <td>${new Date(item.createdAt).toLocaleString('de-DE')}</td>
    `;
    elements.tableBody.append(tr);
  }
}

function createClient() {
  const token = getToken();
  if (!token) {
    throw new Error('Bitte zuerst einen GitHub Token eintragen.');
  }

  return new GitHubClient({
    apiBaseUrl: config.githubApiBaseUrl,
    owner: config.owner,
    repo: config.repo,
    token
  });
}

function getToken() {
  return localStorage.getItem(storageKeys.token);
}

function saveToken() {
  const token = elements.tokenInput.value.trim();
  if (!token) {
    showError('Bitte einen Token eintragen.');
    return;
  }

  localStorage.setItem(storageKeys.token, token);
  setConnectionState('Token gespeichert', 'ok');
  refreshPresence();
}

function clearToken() {
  localStorage.removeItem(storageKeys.token);
  elements.tokenInput.value = '';
  setConnectionState('Nicht verbunden', 'neutral');
}

function statusLabel(status) {
  return {
    available: 'Ansprechbar',
    busy: 'Nicht stören',
    break: 'Pause',
    meeting: 'Meeting',
    focus: 'Fokusarbeit',
    left: 'Nicht mehr vor Ort'
  }[status] ?? status;
}

function setConnectionState(text, state) {
  elements.connectionState.textContent = text;
  elements.connectionState.className = `state ${state}`;
}

function showError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.classList.remove('hidden');
}

function hideError() {
  elements.errorBox.classList.add('hidden');
  elements.errorBox.textContent = '';
}


function startCountdownTicker() {
  if (countdownIntervalId) {
    return;
  }

  countdownIntervalId = window.setInterval(updateCountdownText, 1000);
}

function resetAutoRefreshCountdown() {
  nextAutoRefreshAt = Date.now() + config.pollIntervalSeconds * 1000;
  updateCountdownText();
}

function updateCountdownText() {
  if (!nextAutoRefreshAt) {
    elements.lastUpdated.textContent = '';
    return;
  }

  const remainingSeconds = Math.max(0, Math.ceil((nextAutoRefreshAt - Date.now()) / 1000));
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');
  elements.lastUpdated.textContent = `Nächste Aktualisierung in ${minutes}:${seconds}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}
