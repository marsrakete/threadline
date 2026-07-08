# Threadline PowerShell-Archiver

**Deutsch** | [English](README.threadline-archiver.md)

Diese Datei beschreibt den eigenständigen PowerShell-Archiver für große Threadline-Account-Archive.

## Stand

Aktuelle Scripte:

- `scripts/archive-threadline.ps1`
- `scripts/archive-threadline-sqlite.ps1` (neues SQLite-basiertes Grundgerüst)

Beispiel-Konfigurationen:

- `scripts/threadline-archiver.config.sample.json`
- `scripts/threadline-archiver-sqlite.config.sample.json`

## Ziel

Der PowerShell-Archiver ist für lange oder sehr große Archivläufe gedacht, die in einer Browser-Sitzung unhandlich werden.

Er kann:

- sich mit demselben App-Passwort-Modell wie Threadline bei Bluesky / AT Protocol anmelden
- Account-Archive mit robusterem Resume-Verhalten und kontrollierter Backoff-Logik laden
- **dieselbe Archiv-JSON-Struktur** erzeugen, die Threadline im Browser bereits versteht
- optional Mediendateien daneben speichern
- ZIP-Archive erzeugen, die sich später direkt wieder in Threadline laden lassen

Die Browser-App bleibt die interaktive Oberfläche. Das PowerShell-Tool ist der Schwerlastläufer für Batch-Jobs.

## Aktueller Umfang

Die erste Umsetzung konzentriert sich auf einen robusten MVP:

- Login per App-Passwort
- eigenes Account oder anderer Actor als Quelle
- Datumsfilter
- Archiv-JSON-Ausgabe kompatibel zum Threadline-Import
- Download von Avataren, Bildern und Link-Card-Thumbnails
- Checkpoints und Resume-Unterstützung
- optionales ZIP-Paket

Aktuelle Grenzen der ersten Version:

- `threads` und `thread_roots` werden derzeit noch auf die Basis-Post-Auswahl abgebildet
- `includeConversationContext` wird im Manifest gespeichert, aber noch nicht erweitert
- das Script priorisiert zunächst JSON-Vertragskompatibilität vor vollständiger Funktionsgleichheit mit jedem Browser-Archivmodus

## SQLite-Grundgerüst

Es gibt zusätzlich ein bewusst getrenntes neues Script:

- `scripts/archive-threadline-sqlite.ps1`

Es startet die nächste Architektur-Stufe:

- SQLite als interner Arbeitsdatenspeicher
- Asset-Ordner im Dateisystem neben der Datenbank
- finaler Export nach `manifest.json` und optional `posts.json`
- Resume-Zustand in SQLite statt in mehreren NDJSON-Dateien

Der aktuelle Umfang des SQLite-Scripts:

- App-Passwort-Login
- Auflösung des Quell-Accounts
- Datumsfilter
- seitenweiser Abruf nach SQLite mit batched UPSERTs
- Resume gegen eine vorhandene `threadline-archive.sqlite`
- Export aus SQLite in `manifest.json` und bei Bedarf zusätzlich `posts.json` via `-CreatePostsJson`
- inkrementelles Nachladen neuer Posts via `-Update`

Aktueller Stand des SQLite-Scripts:

- Medien-, Avatar- und Link-Card-Downloads sind angeschlossen
- Resume ist für Fetch-, Metrics-, Avatar-, Media-, Export- und ZIP-Phase vorhanden
- `posts.json` ist optional und wird nur mit `-CreatePostsJson` erzeugt
- `-Update` lädt nur neue Posts nach und stößt danach nur die noch offenen Folgephasen für diese neuen Einträge an
- `includeConversationContext` erweitert passende Archiv-Posts jetzt zusätzlich um sichtbaren Eltern- und Reply-Kontext via `app.bsky.feed.getPostThread`

Voraussetzung:

- installierte offizielle SQLite-Kommandozeilentools
- das Script erwartet `sqlite3.exe` entweder im `PATH` oder unter dem konfigurierten `sqliteExePath`

## Update-Modus

Der SQLite-Archiver kann ein bestehendes Archiv gezielt aktualisieren:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline-sqlite.ps1 `
  -ConfigPath .\scripts\threadline-archiver-sqlite.config.sample.json `
  -Update
```

Der vollständige Konversations-Kontext lässt sich auf zwei Arten aktivieren:

- in der JSON-Konfiguration mit `"includeConversationContext": true`
- auf der Kommandozeile mit dem Switch `-IncludeConversationContext`

Beispiel mit CLI-Switch:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline-sqlite.ps1 `
  -ConfigPath .\scripts\threadline-archiver-sqlite.config.sample.json `
  -IncludeConversationContext `
  -Update
```

Verhalten von `-Update`:

- setzt ein vorhandenes Archiv mit `threadline-archive.sqlite` voraus
- scannt den Account wieder vom aktuellen Kopf aus
- stoppt, sobald der erste bereits bekannte archivierte Post erreicht ist
- lädt dadurch nur neue Posts nach
- verarbeitet anschließend nur für diese neuen Posts noch fehlende Metriken, Avatare, Medien und Exportdateien
- wenn `includeConversationContext` aktiv ist, kann `-Update` dabei auch für ältere Primär-Posts den bisher fehlenden Konversations-Kontext nachziehen

Wenn das Archiv noch leer ist, verhält sich `-Update` wie ein normaler Erstlauf.

Praxis-Hinweis:

- `-IncludeConversationContext` und `-Update` sind ausdrücklich dafür gedacht, zusammen verwendet zu werden
- `-Resume` kann mit `-Update` kombiniert werden, ist bei normalen Aktualisierungsläufen aber meist redundant, weil `-Update` den vorhandenen Archivzustand ohnehin weiterverwendet

## Warum Ein Eigenes Tool

Gegenüber der browserbasierten Archiv-Funktion hat ein eigenständiger PowerShell-Prozess bei großen Läufen klare Vorteile:

- keine Browser-Speichergrenze für lange Sitzungen
- einfachere Checkpoints und Resume-Stände auf Platte
- bessere Kontrolle über Backoff, Retry und Nachtläufe
- leichteres Logging und bessere Diagnose
- einfachere Automatisierung über Aufgabenplanung oder Scripte

## Kompatibilitätsvertrag

Die wichtigste Regel lautet:

**Der PowerShell-Archiver muss dieselbe Archiv-Payload-Form erzeugen, die Threadline heute selbst exportiert.**

Das Ergebnis soll also weiterhin über den bestehenden Browser-Import in Threadline ladbar sein.

Mindestens kompatibel bleiben sollen:

- `manifest.json`
- `posts.json`
- ZIP-Importe in Threadline
- das HTML-Konvertierungsscript `convert-threadline-archive-to-html.ps1`

## Erwartete Ausgabestruktur

Das Standalone-Tool soll weiterhin ein Archiv erzeugen, das dem aktuellen Threadline-Archivmodell entspricht:

### `manifest.json`

Verantwortlichkeiten auf oberster Ebene:

- Archiv-Schema-Version
- Export-Zeitpunkt
- App- bzw. Tool-Version
- Account-Identität
- angewendete Filter
- Zähler für Posts und Bilder
- optionale Session- oder Fortschrittsmetadaten

### `posts.json`

Verantwortlichkeiten pro Post:

- Post-URI, CID, rkey
- Autoren-Metadaten
- Zeitstempel
- Text
- Facets / Sprachen, falls vorhanden
- Reply-Metadaten, falls vorhanden
- Counts / Metriken, falls vorhanden
- Bild-Einträge mit Pfaden und ALT-Text
- optionale External-Card-Metadaten

### Asset-Ordner

Erwartete Asset-Gruppen:

- `images/`
- `avatars/`
- `link-cards/`
- optionale Metadaten-Ordner wie `_meta/`

Die genaue Ordnerstruktur sollte den heutigen Threadline-Export-Konventionen folgen, damit Browser-Import und PowerShell-HTML-Konverter ohne zusätzliche Übersetzungsschicht weiter funktionieren.

## Kommandooberfläche

Die aktuelle Kommandooberfläche von `archive-threadline.ps1` orientiert sich an folgenden Parametern:

- `-Identifier`
- `-AppPassword`
- `-Service`
- `-SourceActor`
- `-From`
- `-To`
- `-Scope`
- `-ContentMode`
- `-IncludeConversationContext`
- `-MaxPosts`
- `-OutputDirectory`
- `-Resume`
- `-Update`
- `-WaitProfile`
- `-ConfigPath`

## Schnellstart

Beispiel mit Konfigurationsdatei:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline.ps1 `
  -ConfigPath .\scripts\threadline-archiver.config.sample.json `
  -OutputDirectory C:\Temp\threadline-archive `
  -CreateZip
```

Hinweise zur Konfiguration:

- nutze Windows-Pfade entweder mit doppelten Backslashes wie `"C:\\Temp\\threadline-archive"` oder einfacher mit Slashes wie `"C:/Temp/threadline-archive"`
- nutze `from` / `to` im Format `YYYY-MM-DD`
- `maxPosts` muss eine Zahl sein und darf nicht leer bleiben
- `includeConversationContext` kann in der Konfigurationsdatei gespeichert oder auf der Kommandozeile mit `-IncludeConversationContext` gesetzt werden

Beispiel ohne Konfigurationsdatei:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\archive-threadline.ps1 `
  -Identifier dein-handle.bsky.social `
  -AppPassword xxxx-xxxx-xxxx-xxxx `
  -OutputDirectory C:\Temp\threadline-archive `
  -ContentMode full `
  -Scope all `
  -MaxPosts 2000 `
  -CreateZip
```

## Konfigurationsdatei

Eine Konfigurationsdatei kann die stabilen, wiederkehrenden Werte aufnehmen:

- Identifier / Handle
- App-Passwort
- Service bzw. PDS-Basis bei Bedarf
- Standard-Ausgabeordner
- Wait-Profil
- Retry-Einstellungen
- bevorzugte Archiv-Modi

Das App-Passwort darf dabei niemals ins Repository eingecheckt werden.

## Wait-Profile

Die Browser-App kombiniert derzeit:

- reaktiven Backoff bei `429` / `503` / `504`
- freiwillige Schonpausen zwischen größeren Seitenblöcken

Der PowerShell-Archiver behält dieselbe Grundidee bei, drückt sie aber als benannte Profile aus, zum Beispiel:

- `normal`
- `aggressiv`
- `nachts`

Selbst im aggressiven Modus müssen harte Rate-Limit-Signale wie `Retry-After` immer respektiert werden.

## Arbeitsteilung

Empfohlene Trennung:

- **Browser / PWA**
  - Account-Auswahl
  - interaktive Archiv-Filter
  - Vorschau und Sichtkontrolle
  - ZIP-Import und Durchsicht
  - threadbezogene Werkzeuge wie Unroll und Edit-Prüfung

- **PowerShell-Archiver**
  - lange Bulk-Abrufe
  - Resume über Checkpoints
  - inkrementelle Updates bestehender Archive
  - strukturiertes Logging
  - große Asset-Downloads
  - unbeaufsichtigte Läufe

## Bezug Zum Vorhandenen Script

`convert-threadline-archive-to-html.ps1` bleibt auch mit vorhandenem Archiver sinnvoll.

Dieses Script löst ein anderes Problem:

- Eingabe: ein bereits exportiertes Threadline-ZIP oder ein entpackter Archiv-Ordner
- Ausgabe: ein lokales, ordnerbasiertes HTML-Archiv, dessen erzeugtes HTML die Assets aus `archive-assets/` liest, oder optional ein Inline-HTML per `-InlineAssets`

Der Standalone-Archiver setzt **vorher** an und erzeugt zunächst das Archiv-ZIP beziehungsweise dessen JSON.
