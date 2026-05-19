# Threadline TODO

## Netzwerk

### Block-Analyse prüfen

- `Wer blockt mich?` als mögliche Best-Effort-Funktion untersuchen.
- Wichtig: Dafür gibt es keinen einfachen offiziellen Bluesky-API-Endpoint.
- Blocks sind als öffentliche Records grundsätzlich ableitbar, aber nicht als fertige `blocked-by-me`-Gegenliste verfügbar.
- Für eine ernsthafte Übersicht bräuchte es eher einen eigenen Crawl oder Index über öffentliche Block-Records.
- Deshalb klar trennen zwischen:
- `sauber direkt machbar`
- `nur Best-Effort`
- `praktisch zu teuer oder unvollständig`

### Mute-/Block-Bereich sauber einordnen

- `Wen blocke ich?` und `wen mute ich?` wären deutlich einfacher als `wer blockt/mutet mich?`
- Für `wer mutet mich?` gilt praktisch: nicht zuverlässig machbar, weil Mutes privat sind.
- UI-Idee: eigener Analyse-Hinweis mit klarer Erwartungssteuerung statt stiller halbguter Trefferliste.

### Netzwerk weiter ausbauen

- Gemeinsame Mutuals weiter verfeinern:
- klarere Listenansicht im Fokus
- optional Export der gemeinsamen Mutuals
- optional `nur gemeinsame Mutuals + direkte Nachbarn`
- Performance bei sehr großen Netzwerken weiter beobachten.
- Noch stärker zwischen `mein Netzwerk` und `Netzwerk eines anderen Accounts` unterscheiden.
- Relevanz-Logik weiter erklären und optional anpassbar machen.
- Prüfen, ob ein eigener `Analyse`-Bereich im Netzwerk sinnvoll wäre statt alles im Fokus unterzubringen.

## Archiv-Funktion

### Ausbau-Ideen

- Archivlauf noch transparenter machen:
- mehr sichtbare Phasen
- klarere Erklärung von Filtern
- bessere Hinweise bei sehr großen Accounts
- optional kleine Abschluss-Zusammenfassung nach jedem Lauf

### Mögliche neue Export-Ideen

- CSV- oder Tabellenexport für Archiv-Metadaten prüfen
- eigener Medien-Index im HTML-Archiv
- optional Kapitel-/Jahresnavigation im HTML-Archiv
- besserer Vergleich zwischen `vollem Archiv` und `kompaktem HTML`

### Robustheit und UX

- Noch bessere Resume-Strategien bei langen Läufen prüfen
- Mehr Schutz vor missverständlichen Hängern in Einzelphasen
- Optional sichtbarer Schalter für:
- Avatare mitsichern
- Link-Card-Bilder mitsichern
- Medien nur referenzieren statt einbetten

### Inhaltsideen

- Archiv-Statistik am Ende ausbauen:
- Anzahl Posts
- Threads
- Bilder
- Karten
- Replies
- Zeitraum
- Optional Übersicht nach Jahr oder Monat

## DM-Archiv

- Klären, was davon öffentlich dokumentiert werden soll und was bewusst intern bleibt.
- Warn- und Datenschutztexte weiter schärfen.
- Prüfen, ob sensible Exporte zusätzliche Schutzschritte brauchen.
- Optional sichtbarer Hinweis, dass DM-Daten lokal bleiben und besonders vertraulich behandelt werden sollten.

## Composer

- Composer-Hilfen weiter verfeinern und sprachlich vereinheitlichen.
- Drag-and-Drop für Bilder weiter testen:
- Desktop
- Touch
- leerer Abschnitt
- voller Abschnitt
- Optional bessere Mehrfachauswahl oder Sammel-Drop für Bilder.
- Prüfen, ob Bilder zwischen Segmenten noch sichtbarer verschoben werden können.

## Dokumentation

- Haupt-README bewusst knapp und einsteigerfreundlich halten.
- Technische Tiefe weiter nach `TECHNICAL.md` auslagern.
- Release-Text regelmäßig aus den echten Änderungen ableiten.
- Später eventuell eigene `PRIVACY.md` oder `DM-NOTES.md` ergänzen.

## Allgemein

- Mehr Stellen identifizieren, an denen kleine `?`-Hilfen sinnvoll sind.
- Persistente Speicherung des Bluesky-App-Passworts später erneut prüfen:
- aktuell bewusst aus Komfortgründen beibehalten
- sicherheitlich aber heikel bei XSS, kompromittierten Browser-Erweiterungen oder lokalem Zugriff
- mögliche spätere Alternativen:
- App-Passwort nicht dauerhaft speichern
- nur Session speichern
- optionalen Sicherheitsmodus ohne gespeichertes App-Passwort anbieten
- Vor öffentlichem Push immer prüfen:
- experimentelle Features
- sensible Datenbereiche
- README-Stand
- Übersetzungen
- Optional später öffentliche Roadmap aus dieser TODO ableiten.
