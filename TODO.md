# Threadline TODO

Diese Liste ist nach Arbeitsstand sortiert. Erledigte Punkte bleiben sichtbar, offene Punkte stehen nach Themen gebuendelt darunter.

## Erledigt

### Thread Explorer - Stabilitaet

- [x] Tree-Layout auf robuste Mindmap-Darstellung mit SVG-Edges umstellen.
- [x] Klick auf ein Posting laedt den kompletten Root-Thread und fokussiert den angeklickten Post.
- [x] `To Root` springt nach oben und nach links auf den Thread-Anfang.
- [x] Reload-Button laedt den aktuell angezeigten Thread neu aus der Live-API.
- [x] Replies-Popup fuer Reply-Zahlen ist mit Likes/Reposts/Quotes konsistent.
- [x] Link-Cards blenden nackte URLs im Posting-Text aus, wenn dieselbe URL bereits als Card angezeigt wird.
- [x] Quote-Cards stellen zitierte Postings als eigene Card dar.
- [x] Fehlende Avatare und fehlgeschlagene Bilder werden ueber gemeinsame Fallback-Logik abgefangen.

### Thread Explorer - UX

- [x] Mindmap-Kanten zeigen gebogene Parent-Child-Verbindungen.
- [x] Horizontale Ansicht zeigt Parent-Child-Linien von links nach rechts.
- [x] Zoom/Pan erlaubt 1 bis 200 Prozent, Drag mit Maus und Scroll in X- und Y-Richtung.
- [x] Fold/Open-Buttons sitzen in der Kachel.
- [x] Bild-Galerie oeffnet Bilder per Klick und kann Einzelbilder in Fullscreen anzeigen.
- [x] Favoriten-Menue laedt Threads, entfernt Favoriten und zeigt den aktuellen Favoritenstatus.
- [x] Post-Links beruecksichtigen alternative Frontends, weil Eurosky-Posts nicht immer sauber ueber `bsky.app` funktionieren.
- [x] Populaere Posts werden ueber Likes, Reposts und Quotes visuell hervorgehoben.

### Netzwerk - Mutes Und Blocks

- [x] `Wer blockt mich?` als Best-Effort-Funktion eingeordnet.
- [x] Dokumentiert: Es gibt keinen einfachen offiziellen Bluesky-API-Endpoint fuer eine fertige `blocked-by-me`-Gegenliste.
- [x] Eingeordnet: Oeffentliche Block-Records sind grundsaetzlich ableitbar, brauchen fuer ernsthafte Uebersichten aber eher Crawl oder eigenen Index.
- [x] Trennung festgehalten zwischen `sauber direkt machbar`, `nur Best-Effort` und `praktisch zu teuer oder unvollstaendig`.
- [x] `Wen blocke ich?` und `wen mute ich?` sind deutlich einfacher als `wer blockt/mutet mich?`.
- [x] `Wer mutet mich?` ist praktisch nicht zuverlaessig machbar, weil Mutes privat sind.
- [x] UI-Hinweis mit klarer Erwartungssteuerung ergaenzt.

## Naechste Arbeiten

### Sicherheit / OWASP

- [ ] `P1` Zugangsdaten-Haertung: Bluesky-App-Passwort, Access-JWT und Refresh-JWT liegen derzeit unverschluesselt im Browser-Storage beziehungsweise IndexedDB. Bei XSS, boesartigen Browser-Erweiterungen oder lokalem Geraetezugriff waere eine Konto-Uebernahme realistisch.
- [ ] `P1` Archiv-Asset-Haertung: Der Viewer liefert archivierte Dateien direkt unter derselben Origin aus, inklusive `svg`. Ein boesartiges SVG aus einem Archiv oder einer externen Card koennte bei direktem Oeffnen aktiven Inhalt ausfuehren und lokale Archivdaten auslesen.
- [ ] `P2` Proxy-SSRF-Haertung: Das WordPress-Plugin prueft Hosts per DNS vor dem eigentlichen `wp_remote_get`, verbindet danach aber erneut ueber den Hostnamen. Gegen DNS-Rebinding oder andere TOCTOU-Faelle ist das noch nicht hart genug.
- [ ] `P3` Viewer nur lokal absichern: Die aktuellen Startskripte binden absichtlich nur an `localhost` beziehungsweise `127.0.0.1`. Wenn `viewer/index.php` spaeter auf einem normalen Webserver landet, fehlen Schutzschritte gegen unbefugten Zugriff auf Archivdaten komplett.

### Backup Und Lokale Daten

- [ ] Einstellungen-Backup mit lokal gespeicherten Thread-Explorer-Favoriten testen.
- [ ] Restore testen: Favoriten, Account-Avatare, Hashtags, History und Workspace-Status muessen nach Import wieder verfuegbar sein.
- [ ] Backup-Erinnerung testen: kein Backup, Backup juenger als 30 Tage, Backup aelter als 30 Tage, `Spaeter`.
- [ ] README bei Aenderungen am Backup-Inhalt immer mitziehen.

### Netzwerk Und Analyse

- [ ] Gemeinsame Mutuals weiter verfeinern: klarere Listenansicht im Fokus.
- [ ] Gemeinsame Mutuals optional exportierbar machen.
- [ ] Netzwerkfilter pruefen: optional `nur gemeinsame Mutuals + direkte Nachbarn`.
- [ ] Performance bei sehr grossen Netzwerken weiter beobachten.
- [ ] Staerker zwischen `mein Netzwerk` und `Netzwerk eines anderen Accounts` unterscheiden.
- [ ] Relevanz-Logik weiter erklaeren und optional anpassbar machen.
- [ ] Pruefen, ob ein eigener `Analyse`-Bereich im Netzwerk sinnvoller waere als alles im Fokus unterzubringen.

### Archiv-Funktion

- [ ] Archivlauf transparenter machen: mehr sichtbare Phasen anzeigen.
- [ ] Archivlauf transparenter machen: Filter klarer erklaeren.
- [ ] Archivlauf transparenter machen: bessere Hinweise bei sehr grossen Accounts.
- [ ] Archivlauf optional mit kleiner Abschluss-Zusammenfassung nach jedem Lauf beenden.
- [ ] Robustere Resume-Strategien bei langen Archivlaeufen pruefen.
- [ ] Mehr Schutz vor missverstaendlichen Haengern in einzelnen Archivphasen einbauen.
- [ ] Optional sichtbare Archiv-Schalter pruefen: Avatare mitsichern, Link-Card-Bilder mitsichern, Medien nur referenzieren statt einbetten.
- [ ] Archiv-Statistik am Ende ausbauen: Posts, Threads, Bilder, Karten, Replies und Zeitraum.
- [ ] Optional Archiv-Statistik nach Jahr oder Monat gruppieren.

### DM-Archiv

- [ ] Klaeren, was vom DM-Archiv oeffentlich dokumentiert werden soll und was bewusst intern bleibt.
- [ ] Warn- und Datenschutztexte fuer DM-Archiv weiter schaerfen.
- [ ] Pruefen, ob sensible DM-Exporte zusaetzliche Schutzschritte brauchen.
- [ ] Optional sichtbarer Hinweis: DM-Daten bleiben lokal und sollten besonders vertraulich behandelt werden.

### Composer

- [ ] Composer-Hilfen weiter verfeinern und sprachlich vereinheitlichen.
- [ ] Drag-and-Drop fuer Bilder weiter testen: Desktop, Touch, leerer Abschnitt und voller Abschnitt.
- [ ] Optional bessere Mehrfachauswahl oder Sammel-Drop fuer Bilder pruefen.
- [ ] Pruefen, ob Bilder zwischen Segmenten noch sichtbarer verschoben werden koennen.

## Spaeter / Refactor

### Guidelines Durchsetzen

- [ ] Grosse `innerHTML`-Renderer schrittweise durch `<template>` und DOM-APIs ersetzen.
- [ ] Sichtbare Texte aus JavaScript in `translations.js` verschieben.
- [ ] Neue und angefasste Funktionen mit kurzem JSDoc dokumentieren.
- [ ] Ternaries in angefassten Bereichen durch lesbare `if / else`-Bloecke ersetzen.
- [ ] Encoding-Scan fuer `README.md`, `README.de.md`, `index.html`, `translations.js` und `PROJECT_GUIDELINES.md` als Standardcheck etablieren.
- [ ] CSS-Regeln fuer Thread Explorer nach Komponenten sortieren und alte Layout-Experimente entfernen.

### Tests Und Pruefungen

- [ ] Browser-Smoke-Test fuer Thread Explorer: Feed laden, Post anklicken, Root laden, Fold/Open, Zoom, Drag, Orientierung wechseln.
- [ ] Testdaten fuer breite Threads, tiefe Threads, Quotes, Link-Cards, fehlende Avatare und Medienposts sammeln.
- [ ] Standardchecks dokumentieren: `node --check app.js`, `node --check sw.js`, `node --check translations.js`, `git diff --check`.
- [ ] Optional: kleines lokales Testskript fuer Encoding- und i18n-title-Scans anlegen.

### Archiv-Exports

- [ ] CSV- oder Tabellenexport fuer Archiv-Metadaten pruefen.
- [ ] Eigenen Medien-Index im HTML-Archiv pruefen.
- [ ] Optional Kapitel- oder Jahresnavigation im HTML-Archiv ergaenzen.
- [ ] Vergleich zwischen `vollem Archiv` und `kompaktem HTML` verbessern.

### Dokumentation

- [ ] Haupt-README bewusst knapp und einsteigerfreundlich halten.
- [ ] Technische Tiefe weiter nach `TECHNICAL.md` auslagern.
- [ ] Release-Text regelmaessig aus den echten Aenderungen ableiten.
- [ ] Optional eigene `PRIVACY.md` oder `DM-NOTES.md` ergaenzen.
- [ ] Optional spaeter oeffentliche Roadmap aus dieser TODO ableiten.

### Allgemein

- [ ] Mehr Stellen identifizieren, an denen kleine `?`-Hilfen sinnvoll sind.
- [ ] Persistente Speicherung des Bluesky-App-Passworts erneut pruefen: aktuell aus Komfortgruenden beibehalten, sicherheitlich aber heikel bei XSS, kompromittierten Browser-Erweiterungen oder lokalem Zugriff.
- [ ] Moegliche Sicherheitsalternative pruefen: App-Passwort nicht dauerhaft speichern.
- [ ] Moegliche Sicherheitsalternative pruefen: nur Session speichern.
- [ ] Moegliche Sicherheitsalternative pruefen: optionalen Sicherheitsmodus ohne gespeichertes App-Passwort anbieten.
- [ ] Vor oeffentlichem Push immer pruefen: experimentelle Features, sensible Datenbereiche, README-Stand und Uebersetzungen.
