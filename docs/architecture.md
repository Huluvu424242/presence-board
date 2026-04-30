# Architektur

## Ziel

Eine kleine Browser-App soll innerhalb eines Teams anzeigen, wer aktuell vor Ort und ansprechbar ist. Es gibt keinen eigenen Server und keine Datenbank.

## Grundprinzip

GitHub wird als gemeinsam erreichbarer Synchronisationspunkt verwendet.

```text
Browser App
   |
   | GitHub REST API
   v
GitHub Issue des Tages
   |
   | Kommentare als JSON-Events
   v
aktueller Status je Nutzer
```

## Warum Issue Comments?

Issue Comments sind für diesen Zweck robuster als eine gemeinsam bearbeitete JSON-Datei.

Bei einer Datei entstehen schnell Schreibkonflikte:

```text
Nutzer A liest status.json
Nutzer B liest status.json
Nutzer A schreibt neue Version
Nutzer B schreibt auf alter Basis neue Version
Konflikt oder verlorenes Update
```

Bei Issue Comments wird nur angehängt:

```text
Kommentar 1: Nutzer A ist in Raum A-203
Kommentar 2: Nutzer B ist in Raum B-110
Kommentar 3: Nutzer A ist in Pause
```

Die App nimmt später einfach den jeweils neuesten Eintrag je Nutzer.

## Datenmodell

Ein Event sieht so aus:

```json
{
  "kind": "presence-board-event",
  "version": 1,
  "user": "tschubert",
  "room": "A-203",
  "status": "available",
  "note": "Daily Business",
  "createdAt": "2026-04-30T09:15:00.000Z"
}
```

## Status-Ablauf

Die App zeigt nur Events an, die jünger sind als `statusTtlMinutes`.

Damit verschwinden vergessene Einträge automatisch aus der Anzeige.

## GitHub Enterprise Server

Für GHES muss nur die API-Basis-URL geändert werden:

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

## Sicherheitsmodell

Der einfache Prototyp nutzt einen lokal gespeicherten Nutzer-Token.

Vorteile:

- kein Backend nötig
- schnell testbar
- funktioniert auf GitHub Pages

Nachteile:

- der Browser braucht Schreibrechte auf Issues
- Nutzer mit Leserecht können prinzipiell Rohdaten lesen
- Token-Verwaltung muss sauber geregelt werden

## Sauberere Ausbaustufe

Wenn Rohdaten nicht direkt für Nutzer lesbar sein sollen, sollte später eine Zwischenstufe eingebaut werden:

```text
Browser App
   |
   | workflow_dispatch / repository_dispatch
   v
GitHub Action
   |
   | schreibt Rohdaten in geschütztes Ziel
   | erzeugt bereinigte public-status.json
   v
GitHub Pages liest nur public-status.json
```

Das ist datenschutztechnisch besser, aber aufwendiger.

## Betriebsqualität und Governance

Zur laufenden Absicherung der Qualität werden CI-Workflows verwendet:

- `license-compliance.yml` (nightly + manuell): Lizenz- und Dependency-Policy.
- `security-baseline.yml` (nightly + manuell): Secret Scanning (Gitleaks) und CodeQL Analyse.

Damit werden grundlegende Sicherheits- und Compliance-Prüfungen regelmäßig automatisiert ausgeführt.
