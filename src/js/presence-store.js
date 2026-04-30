const EVENT_KIND = 'presence-board-event';
const EVENT_VERSION = 1;

export function todayIssueTitle(config) {
  const date = new Date().toISOString().slice(0, 10);
  return `${config.issueTitlePrefix}${date}`;
}

export function createPresenceEvent({ user, room, status, note }) {
  return {
    kind: EVENT_KIND,
    version: EVENT_VERSION,
    user: user.trim(),
    room: room.trim(),
    status,
    note: note.trim(),
    createdAt: new Date().toISOString()
  };
}

export function encodeEvent(event) {
  return `\`\`\`json\n${JSON.stringify(event, null, 2)}\n\`\`\``;
}

export function extractEventsFromComments(comments) {
  return comments
    .map((comment) => parseCommentBody(comment.body))
    .filter((event) => event?.kind === EVENT_KIND && event.version === EVENT_VERSION);
}

export function buildCurrentPresence(events, ttlMinutes) {
  const latestByUser = new Map();
  const now = Date.now();
  const ttlMillis = ttlMinutes * 60 * 1000;

  for (const event of events) {
    if (!event.user || !event.createdAt) {
      continue;
    }

    const createdAtMillis = Date.parse(event.createdAt);
    if (Number.isNaN(createdAtMillis)) {
      continue;
    }

    if (now - createdAtMillis > ttlMillis) {
      continue;
    }

    const existing = latestByUser.get(event.user);
    if (!existing || Date.parse(existing.createdAt) <= createdAtMillis) {
      latestByUser.set(event.user, event);
    }
  }

  return [...latestByUser.values()]
    .filter((event) => event.status !== 'left')
    .sort((a, b) => a.user.localeCompare(b.user, 'de'));
}

function parseCommentBody(body) {
  const fencedJson = body.match(/```json\s*([\s\S]*?)\s*```/i);
  const jsonText = fencedJson ? fencedJson[1] : body;

  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}
