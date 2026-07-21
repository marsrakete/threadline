# Threadline Link-Card-Proxy

Dieses optionale WordPress-Plugin ermöglicht Threadline, aus URLs in einzelnen Thread-Abschnitten Bluesky-Link-Cards zu erzeugen. Es läuft auf deiner eigenen WordPress-Installation und ruft dort die Metadaten der Zielseite für die statische Threadline-PWA ab.

## Anforderungen

- Admin-Zugriff auf eine eigene WordPress-Installation
- WordPress 6.0 oder neuer
- PHP 7.4 oder neuer
- HTTPS für die WordPress-Website ist dringend empfohlen
- Die WordPress-REST-API muss aus dem Browser erreichbar sein
- Der WordPress-Server muss ausgehende HTTP(S)-Anfragen zu den URLs senden dürfen, für die Link-Cards erzeugt werden sollen

Das Plugin ist für eine WordPress-Installation gedacht, die du selbst kontrollierst. Ein normales Autor- oder Redakteurskonto reicht nicht aus, weil Installation und Konfiguration WordPress-Adminrechte brauchen.

## Woher Bekomme Ich Das Plugin?

Verwende das ZIP-Paket aus diesem Repository:

`wordpress-plugin/threadline-link-card-proxy.zip`

Wenn du aus einem GitHub-Release installierst, lade dort das gleichnamige ZIP-Asset herunter, sofern es im Release angehängt ist.

## Installation

1. Öffne den WordPress-Adminbereich.
2. Gehe zu `Plugins` -> `Installieren` -> `Plugin hochladen`.
3. Wähle `threadline-link-card-proxy.zip`.
4. Installiere und aktiviere das Plugin.
5. Öffne den neuen Admin-Menüpunkt `Threadline`.

Die Plugin-Seite zeigt den REST-Endpunkt und das gemeinsame Secret, das Threadline benötigt.

## Threadline Verbinden

1. Öffne im WordPress-Adminbereich den Menüpunkt `Threadline`.
2. Kopiere den Proxy-Endpunkt, zum Beispiel `https://example.com/wp-json/threadline/v1/link-card`.
3. Kopiere das erzeugte Secret.
4. Öffne Threadline.
5. Gehe zu `Einstellungen` -> `Link-Cards`.
6. Füge Proxy-Endpunkt und Secret ein.
7. Speichere die Einstellungen.

Wenn du im Plugin erlaubte Origins einschränkst, trage den Origin deiner Threadline-App ein, zum Beispiel `https://marsrakete.github.io` oder beim lokalen Testen `http://localhost:5012`.

## Nutzung In Threadline

Wenn ein Thread-Abschnitt eine URL enthält und der Proxy eingerichtet ist, aktiviert Threadline die Link-Card-Aktion für diesen Abschnitt. Das Popup fragt, ob eine Link-Card erzeugt werden soll.

Bluesky-Posts können Bild-Embeds und externe Link-Cards nicht im selben Post kombinieren. Wenn der Abschnitt bereits Bilder enthält, warnt Threadline vor dem Erzeugen der Link-Card und entfernt diese Bilder nur nach Bestätigung aus dem Abschnitt.

Erzeugte Link-Cards werden zusammen mit den Thread-Daten gespeichert und bleiben bei Reloads sowie in Thread-Backups erhalten.

Wenn die Zielseite Standard.site-Metadaten ausliefert, gibt der Proxy zusätzlich Publication-Card-Daten aus `site.standard.document`, `site.standard.publication` und dem optionalen Verifikationsendpunkt `/.well-known/site.standard.publication` zurück. Threadline markiert diese Karte damit im Composer, Thread Explorer und HTML-Archiv als Publikation.

## Sicherheit Und Betrieb

- Anfragen werden mit einem HMAC-Secret signiert, das Threadline und Plugin gemeinsam verwenden.
- Optionale erlaubte Origins können einschränken, welche Browser-Origins den Proxy aufrufen dürfen.
- Der SSRF-Schutz blockiert lokale, private, Loopback- und andere unsichere Ziele.
- Rate-Limits sind in den Plugin-Einstellungen konfigurierbar.
- Das Anfrageprotokoll behält die letzten 30 Tage und kann als CSV heruntergeladen werden.
- Alte Protokolleinträge werden automatisch über WP-Cron gelöscht.
- Beim Deinstallieren entfernt das Plugin seine Einstellungen, den geplanten Cleanup und die eigene Datenbanktabelle.
