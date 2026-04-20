# Threadline

**Deutsch** | [English](README.md)

<p align="center">
  <img src="icons/icon.svg" alt="Threadline Icon" width="140">
</p>

<p align="center">
  Eine kleine Progressive Web App zum Schreiben von Bluesky-Posts und zum Aufteilen langer Texte in saubere Thread-Abschnitte.
</p>

## Live-App

- URL: [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/)

## Was Die App Macht

Threadline ist eine statische PWA, die sich mit einem Bluesky-App-Passwort verbindet, lokale Entwürfe speichert und längere Texte in post-taugliche Abschnitte für Threads aufteilt.

## Funktionen

- Bluesky-Anmeldung mit App-Passwort
- Session-Verwaltung im Service Worker
- Entwurfs-Speicherung über Neustarts hinweg
- Automatisches Aufteilen bei mehr als 300 Zeichen
- Optionale `1/x`-Zähler in eigener Zeile
- Nachträglich bearbeitbare Thread-Abschnitte
- Mehrsprachige Oberfläche: Deutsch, Englisch, Französisch
- Automatische Browser-Spracherkennung mit manueller Umschaltung
- Eingebaute Update-Prüfung über `version.json`
- Erfolgsdialog nach dem Posten mit direktem Bluesky-Link
- Installierbare PWA mit Manifest und Service Worker

## Projektstruktur

```text
.
├── app.js
├── index.html
├── manifest.webmanifest
├── styles.css
├── sw.js
├── translations.js
├── version.json
└── icons/
    ├── icon.svg
    └── maskable-icon.svg
```

## Lokal Starten

Threadline ist eine statische App. Ein einfacher lokaler Webserver reicht aus.

```powershell
python -m http.server 4173
```

Danach im Browser öffnen:

```text
http://localhost:4173
```

## Als App Installieren

Threadline ist eine PWA und kann auf Handy und Desktop installiert werden.

### Auf Dem Handy

#### iPhone / iPad (Safari)

1. Öffne [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/) in Safari.
2. Tippe auf den Teilen-Button.
3. Wähle `Zum Home-Bildschirm`.
4. Bestätige mit `Hinzufügen`.

#### Android (Chrome oder Edge)

1. Öffne [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/) im Browser.
2. Öffne das Browser-Menü.
3. Tippe auf `App installieren` oder `Zum Startbildschirm hinzufügen`.
4. Bestätige die Installation.

### Auf Dem Desktop

#### Chrome oder Edge

1. Öffne [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/).
2. Suche das Installationssymbol in der Adressleiste oder öffne das Browser-Menü.
3. Klicke auf `Threadline installieren`.
4. Bestätige den Installationsdialog.

#### Das Bringt Die Installation

- ein eigenständiges App-Fenster
- eine Verknüpfung auf Startbildschirm oder Desktop
- schnelleres Wiederöffnen wie bei einer normalen App
- offline-fähige App-Hülle durch den Service Worker

## Wie Das Posten Funktioniert

1. Melde dich mit deinem Bluesky-Handle oder deiner E-Mail und einem App-Passwort an.
2. Gib Text in das Eingabefeld ein.
3. Wenn der Text unter 300 Zeichen bleibt, kann er als einzelner Post veröffentlicht werden.
4. Wenn er länger ist, erzeugt Threadline bearbeitbare Thread-Abschnitte.
5. Prüfe die Abschnitte und poste sie anschließend auf Bluesky.

## Bluesky-App-Passwort Erzeugen

Threadline verwendet ein Bluesky-App-Passwort und nicht dein normales Konto-Passwort.

1. Öffne Bluesky.
2. Gehe zu `Einstellungen`.
3. Öffne `Datenschutz und Sicherheit`.
4. Öffne `App-Passwörter`.
5. Erzeuge ein neues App-Passwort.
6. Kopiere das erzeugte Passwort und verwende es in Threadline.

Ein eigenes App-Passwort ist sinnvoll, weil du es später wieder entziehen kannst, ohne dein normales Login-Passwort ändern zu müssen.

## Sprachverhalten

- Unterstützte Sprachen: Deutsch, Englisch, Französisch
- Standardverhalten: Browser-Sprache verwenden
- Rückfall: Englisch
- Manuelle Umschaltung: im Einstellungsdialog verfügbar

## Update-Erkennung

Threadline verwendet eine einfache Versionsprüfung.

- `version.json` enthält die öffentlich sichtbaren Versionsinformationen
- der Service Worker lädt `version.json` mit Netz-Priorität
- die App prüft beim Start auf Updates
- in den Einstellungen kann man manuell auf Updates prüfen

Bei Änderungen sollten diese Dateien konsistent gehalten werden:

- `version.json`
- `app.js` (`CURRENT_VERSION_INFO`)
- `sw.js` (`APP_VERSION`) wenn sich gecachte Assets oder das Verhalten des Service Workers ändern

## Hinweise Zu Zugangsdaten

- Das Bluesky-App-Passwort wird lokal für die Session-Erneuerung gespeichert
- Session- und Entwurfsdaten liegen in IndexedDB
- Für diese App ist kein eigenes Backend nötig

## Empfohlene Tests

- Verwende ein eigenes Bluesky-Testkonto, oder
- erstelle ein separates App-Passwort zum Testen

Damit kannst du sicher prüfen:

- Login-Ablauf
- automatische Session-Erneuerung
- Entwurfs-Speicherung
- Split-Verhalten
- Thread-Veröffentlichung
- Update-Erkennung

## Lizenz

- Lizenz: [Apache License 2.0](https://marsrakete.github.io/threadline/LICENSE)

## Kontakt

- Kontakt: [millux@marsrakete.de](mailto:millux@marsrakete.de)
