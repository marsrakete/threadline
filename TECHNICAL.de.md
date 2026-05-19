# Threadline Technische Hinweise

**Deutsch** | [English](TECHNICAL.md)

Diese Datei bündelt die technischeren Hintergrundinformationen, die nicht im schnellen Einstieg des Haupt-README stehen sollen.

## Account-Archiv Für Techies

- Der Export läuft vollständig in der bestehenden PWA ohne eigenes Backend
- Posts werden über `com.atproto.repo.listRecords` für `app.bsky.feed.post` seitenweise geladen
- Phase 1 des Filters arbeitet direkt auf den eigenen Repo-Records:
- `Voll-Archiv` übernimmt alle eigenen Posts
- `Nur eigene Postings` verwirft eigene Replies in fremden Threads
- Phase 2 erweitert bei `Eigene Threads komplett` zusätzlich die eigenen Thread-Wurzeln über `app.bsky.feed.getPostThread`
- Dabei werden auch Antworten fremder Accounts in eigenen Threads ins Archiv übernommen
- Metriken werden in Batches über `app.bsky.feed.getPosts` nachhydratisiert
- Bilder werden über `com.atproto.sync.getBlob` geladen und mit stabilen Pfaden ins Archiv übernommen
- Große Exporte laufen in Wellen; im Browser werden dafür nur kleine Resume-Metadaten gehalten
- Das ZIP enthält `manifest.json`, `posts.json` und alle geladenen Bilddateien
- Das HTML-Archiv ist eine einzelne Datei mit eingebetteten Bildern, Suchfeld, Datumsfiltern sowie Optionen für `nur Posts mit Bildern` und `nur Threads`
- PDF-Bände werden aus dem geladenen Archivmodell erzeugt, nicht direkt aus Live-Responses
- Die Bandgröße für PDFs ist bewusst bis `1000` Posts konfigurierbar

## Netzwerk-Datenbasis

Threadline arbeitet im Netzwerk-Workspace ausschließlich mit der offiziellen Bluesky-API; eine API ist die definierte technische Schnittstelle, über die Apps Daten vom Dienst abrufen und senden.

- `Likes auf diese aktuellen Posts` meint bewusst Likes, die andere auf die aktuellen Posts des fokussierten Accounts vergeben haben
- Diese Kennzahl ist für fremde Accounts über die API zuverlässig und zügig ableitbar
- Nicht gemeint ist dabei: alle Likes, die dieser Account selbst irgendwo vergeben hat
- Ebenfalls noch nicht enthalten ist eine Vollsuche, ob jeder sichtbare Account deine eigenen Posts gelikt hat
- Das wäre zwar ein interessantes zusätzliches Signal für Nähe oder Relevanz, würde aber pro Account sehr viele weitere API-Abfragen erfordern
- Für große Netzwerke würde das die Ansicht deutlich verlangsamen, unnötig viele Requests erzeugen und schneller an praktische API-Grenzen oder Timeouts stoßen
- Darum setzt Threadline hier aktuell bewusst auf schnelle, nachvollziehbare Best-Effort-Signale statt auf eine teure Vollanalyse jedes einzelnen Accounts

## Warum Es Keine Link-Cards Gibt

### Kurz Erklärt

Threadline läuft komplett als statische App im Browser und hat kein eigenes Backend. Darum kann die App fremde Webseiten nicht zuverlässig auslesen, um daraus Vorschaukarten mit Titel, Beschreibung und Bild zu bauen. Links im Text funktionieren trotzdem und bleiben in Bluesky anklickbar, aber eine automatisch erzeugte Link-Card wird von Threadline derzeit nicht erstellt.

### Für Techies

Das Problem ist Cross-Origin-Zugriff im Browser. Um Open-Graph-Daten einer fremden Seite zu lesen, müsste die Zielseite den Abruf per CORS ausdrücklich erlauben. Viele Websites tun das nicht. Ohne eigenen Server oder Worker kann eine PWA auf GitHub Pages diese HTML-Antworten und Vorschaubilder daher nicht verlässlich auslesen und als `app.bsky.embed.external` mit Thumbnail aufbereiten. Deshalb beschränkt sich Threadline aktuell bewusst auf klickbare Links per Rich-Text-Facets.

## Lokal Starten

Threadline ist eine statische App. Ein einfacher lokaler Webserver reicht aus.

```powershell
python -m http.server 4173
```

Danach im Browser öffnen:

```text
http://localhost:4173
```

## Hinweise Zu Zugangsdaten Und Speicherung

- Bluesky-App-Passwörter werden lokal gespeichert, damit Sessions erneuert und mehrere Logins reload-sicher gehalten werden können
- Backups enthalten diese Login-Einträge, aber keine App-Passwörter
- Session-Daten, Entwurf und App-Zustand liegen lokal in IndexedDB
- Für diese App ist kein eigenes Backend nötig

## Projektstruktur

```text
.
├── app.js
├── index.html
├── manifest.webmanifest
├── styles.css
├── sw.js
├── translations.js
├── version.js
├── version.json
└── icons/
    ├── icon.svg
    └── maskable-icon.svg
```

## Update-Erkennung

Threadline verwendet eine Versionsprüfung mit sichtbarer App-Version.

- `version.js` enthält die öffentlich sichtbaren Versionsinformationen für App und Service Worker
- der Service Worker lädt `version.js` mit Netz-Priorität
- die App prüft beim Start auf Updates
- in den Einstellungen kann man manuell auf Updates prüfen und ein wartendes Update per `Neu laden` übernehmen

Bei Änderungen sollten diese Dateien konsistent gehalten werden:

- `version.js`
- `version.json` nur dann, wenn die Datei bewusst als Spiegel weitergeführt wird
- die cache-relevanten Shell-Dateien in `sw.js`, wenn sich gecachte Assets oder das Verhalten des Service Workers ändern

## Empfohlene Tests

- Verwende ein eigenes Bluesky-Testkonto, oder
- erstelle ein separates App-Passwort zum Testen

Damit kannst du sinnvoll prüfen:

- Login-Ablauf
- automatische Session-Erneuerung
- Entwurfs-Speicherung
- Split-Verhalten
- manuelle Segment-Bearbeitung
- Thread-Datei speichern und laden
- Backup exportieren und importieren
- Bilder und ALT-Texte
- Thread-Veröffentlichung
- Update-Erkennung
