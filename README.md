# Presence Board

Eine kleine statische Browser-App zur freiwilligen Team-Erreichbarkeit im Büro.

Die App nutzt **GitHub Issues Comments als append-only Event-Log**. Dadurch braucht sie keine Datenbank, keinen eigenen Server und kein P2P.

## Idee

- Die App läuft als statische Website, z. B. über GitHub Pages.
- Statusänderungen werden als JSON-Kommentare in ein Tages-Issue geschrieben.
- Beim Lesen werden alle Kommentare des Tages-Issues ausgewertet.
- Pro Nutzer wird nur der neueste Status angezeigt.
- Eine GitHub Action kann täglich ein Tages-Issue erzeugen und alte Issues schließen.

## Datenschutz-Hinweis

Dieses Projekt ist absichtlich minimal und transparent. Es speichert personenbezogene Statusdaten in GitHub Issue Comments. Vor produktiver Nutzung im Unternehmen sollten Datenschutz, Betriebsrat/Personalrat und IT-Sicherheit eingebunden werden.

Empfohlene Regeln:

- freiwillige Nutzung
- automatische Ablaufzeit für Status
- keine Historienauswertung
- keine exakten Sitzplätze, falls Räume ausreichen
- kurze Aufbewahrung, z. B. 24 bis 72 Stunden
- privates Repository oder eingeschränkte Berechtigungen

## Projektstruktur

```text
.
├── .github/workflows/daily-issue.yml
├── docs/architecture.md
├── index.html
├── src
│   ├── css/styles.css
│   └── js
│       ├── app.js
│       ├── config.example.js
│       ├── config.js
│       ├── github-client.js
│       └── presence-store.js
└── README.md
```

## Schnellstart auf GitHub.com

### 1. Repository anlegen

Lege ein neues Repository an, z. B.:

```text
presence-board
```

### 2. Dateien hochladen

Lade den Inhalt dieses Projekts in das Repository.

### 3. GitHub Pages aktivieren

Repository → Settings → Pages:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

Danach ist die App ungefähr hier erreichbar:

```text
https://<user-or-org>.github.io/presence-board/
```

### 4. `config.js` anpassen

Datei:

```text
src/js/config.js
```

Beispiel:

```js
window.PRESENCE_CONFIG = {
  githubApiBaseUrl: 'https://api.github.com',
  owner: 'DEIN_GITHUB_USER_ODER_ORG',
  repo: 'presence-board',
  issueTitlePrefix: 'presence-',
  statusTtlMinutes: 540,
  pollIntervalSeconds: 30
};
```

Für GitHub Enterprise Server später z. B.:

```js
window.PRESENCE_CONFIG = {
  githubApiBaseUrl: 'https://github.example.corp/api/v3',
  owner: 'teamname',
  repo: 'presence-board',
  issueTitlePrefix: 'presence-',
  statusTtlMinutes: 540,
  pollIntervalSeconds: 30
};
```

### 5. Personal Access Token erzeugen

Für den ersten Test reicht ein Fine-grained PAT mit Zugriff auf genau dieses Repository.

Benötigte Rechte:

- Issues: Read and write
- Metadata: Read

Der Token wird lokal im Browser gespeichert und nicht ins Repository geschrieben.

## Funktionsweise

Beim Setzen eines Status schreibt die App einen Issue-Kommentar wie diesen:

```json
{
  "kind": "presence-board-event",
  "version": 1,
  "user": "huluvu424242",
  "room": "A-203",
  "status": "available",
  "note": "Daily Business",
  "createdAt": "2026-04-30T09:15:00.000Z"
}
```

Beim Anzeigen werden alle Kommentare des Tages-Issues gelesen. Je Nutzer gewinnt der neueste Eintrag.

## Wichtige Grenzen

Diese Variante ist bewusst einfach. Sie ist gut für kleine Teams, aber nicht für hohe Last gedacht.

Nicht geeignet für:

- sehr viele Nutzer
- sekundengenaue Live-Präsenz
- geheime oder besonders schutzbedürftige Informationen
- Situationen, in denen Nutzer Rohdaten auf keinen Fall lesen dürfen

Dann wäre eine vorgeschaltete Action/API-Schicht oder ein echter interner Dienst besser.

## Qualität, Sicherheit, Barrierefreiheit und Compliance

- **Clean Code & Dokumentation:** Architektur und Datenmodell sind in `README.md` und `docs/architecture.md` dokumentiert und auf den aktuellen Stand gebracht.
- **Barrierefreiheit:** Die Statustabelle enthält eine unsichtbare Tabellenbeschreibung (`caption`) und der Countdown für die nächste Aktualisierung ist als `aria-live="polite"` markiert.
- **Sicherheit:** Eingaben werden vor dem Rendern HTML-escaped, API-Aufrufe laufen über explizite GitHub Headers und Fehler werden sichtbar ausgewiesen.
- **Lizenzkonformität:** Das Repository ist MIT-lizenziert. Es werden aktuell keine Drittanbieter-Runtime-Abhängigkeiten verwendet (`package.json` enthält keine `dependencies`).

## Automatisierte Nightly Checks (GitHub Actions)

Folgende Workflows laufen **nächtlich** und sind zusätzlich **manuell startbar** (`workflow_dispatch`):

1. `.github/workflows/license-compliance.yml`
   - prüft, ob der MIT-Lizenzheader in `LICENSE` vorhanden ist
   - prüft, ob unerwartete Runtime-Abhängigkeiten in `package.json` deklariert sind
2. `.github/workflows/security-baseline.yml`
   - führt Secret Scanning via Gitleaks aus
   - führt statische JavaScript-Sicherheitsanalyse via CodeQL aus
