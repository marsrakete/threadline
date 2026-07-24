# Threadline

**Deutsch** | [English](README.md)

<p align="center">
  <img src="icons/icon.svg" alt="Threadline Icon" width="140">
</p>

<p align="center">
  Eine Progressive Web App zum Schreiben, Suchen, Speichern und Veröffentlichen von Bluesky-Posts und Threads.
</p>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/U7U01OC260)

## Live-App

- URL: [https://marsrakete.github.io/threadline/](https://marsrakete.github.io/threadline/)
- Repository: [https://github.com/marsrakete/threadline](https://github.com/marsrakete/threadline)

## Überblick

Threadline ist eine statische Bluesky-Arbeitsumgebung, die direkt im Browser läuft. Die App hilft beim Schreiben und Veröffentlichen von Threads, beim Lesen aktueller Gespräche, bei flexibleren Suchanfragen, beim lokalen Archivieren von Accounts, beim Vergleichen von Accounts und beim Laden von DMs für spätere Exporte.

Wenn du Threadline neu kennenlernst, denke weniger an einen einzelnen Composer und mehr an eine App mit sieben klar getrennten Arbeitsbereichen.

## Die 7 Arbeitsbereiche

- `Composer`: einen Post oder längeren Thread schreiben, in Abschnitte aufteilen, Bilder und Hashtags ergänzen und direkt veröffentlichen.
- `Suche`: Bluesky global durchsuchen, nur in einem Account suchen, Reposts durchsuchen oder gespeicherte Suchmasken wiederverwenden.
- `Archiv`: einen Account lokal laden und daraus ZIP-, HTML- oder PDF-Ausgaben erzeugen.
- `Thread Explorer`: aktuelle Posts öffnen und den vollständigen Live-Thread als Baum oder Mindmap lesen.
- `Netzwerk`: Follower, Following und Mutuals in einer interaktiven Beziehungsansicht erkunden.
- `Analyse`: zwei Accounts stilistisch und zeitlich vorsichtig miteinander vergleichen.
- `DM-Archiv`: Direct Messages lokal laden und für spätere Exporte vorbereiten.

## Schnellstart

1. Ein Bluesky-App-Passwort erzeugen.
2. Das eigene Konto in Threadline hinzufügen und verbinden.
3. Den passenden Arbeitsbereich öffnen und dort loslegen.

Threadline verwendet ein App-Passwort und nicht das normale Bluesky-Passwort.

## Arbeitsbereiche Im Überblick

## Composer

Sinn und Zweck:
Aus Rohtext einen Post oder Thread machen, den du vor dem Veröffentlichen noch in Ruhe bearbeiten kannst.

Was dich hier erwartet:
Der Composer nimmt deinen Ausgangstext, teilt ihn in editierbare Abschnitte auf und hält Bilder, ALT-Texte, Hashtags, Antwortziele und Post-Einstellungen direkt am Thread zusammen.

Beispiele:
- Einen längeren Erklär-Thread schreiben und automatisch in postfähige Abschnitte zerlegen lassen.
- Auf ein bestimmtes Bluesky-Posting antworten oder einen eigenen Thread fortsetzen.

## Suche

Sinn und Zweck:
Bluesky flexibler durchsuchen als mit der Standardsuche im offiziellen Client.

Was dich hier erwartet:
Die Suche kann global suchen, die Posts eines einzelnen Accounts lokal durchgehen, Reposts eines Accounts prüfen, Suchmasken speichern und Treffer direkt im Thread Explorer öffnen.

Beispiele:
- Herausfinden, was ein bestimmter Account zu einem Thema repostet hat.
- Nach Posts mit einem oder mehreren Hashtags suchen und diese Suchmaske für später speichern.

## Archiv

Sinn und Zweck:
Ein lesbares oder technisches lokales Archiv eines Bluesky-Accounts erzeugen.

Was dich hier erwartet:
Du wählst Account, Zeitraum und Archivumfang. Threadline lädt die passenden Posts und Medien in eine lokale Archiv-Sitzung, aus der sich ZIP-, HTML- oder PDF-Ausgaben erzeugen lassen.

Beispiele:
- Die eigenen letzten Posts als lokales ZIP sichern.
- Für einen ausgewählten Zeitraum ein lesbares HTML- oder PDF-Archiv erzeugen.

## Thread Explorer

Sinn und Zweck:
Aktuelle Bluesky-Gespräche übersichtlicher lesen.

Was dich hier erwartet:
Der Thread Explorer lädt aktuelle Posts und öffnet den vollständigen Live-Thread als Baum. Replies, Bilder, Quote-Posts, Link-Cards und Counts bleiben dabei direkt zusammen sichtbar.

Beispiele:
- Eine laufende Diskussion öffnen und den Antwortbaum visuell verfolgen.
- Einen interessanten Live-Thread als Favorit sichern und später wieder öffnen.

## Netzwerk

Sinn und Zweck:
Sichtbar machen, wie ein Account mit anderen Accounts verbunden ist.

Was dich hier erwartet:
Die Netzwerkansicht lädt Follower, Following und Mutuals in Wellen und zeigt sie in einer interaktiven Bühne mit Filtern und Fokus-Karten an.

Beispiele:
- Erkunden, welche Accounts gegenseitig verbunden sind und welche nur einseitig folgen.
- Einen Account in der Fokusansicht öffnen und Beziehungsdetails plus Aktivitätshinweise prüfen.

## Analyse

Sinn und Zweck:
Zwei Accounts als vorsichtigen Zusatzhinweis vergleichen, nicht als Beweis.

Was dich hier erwartet:
Threadline vergleicht Schreibmuster, Zeitmuster und einige netzwerknahe Signale und zeigt diese als gruppiertes Ergebnis mit mehreren Teilwerten.

Beispiele:
- Zwei Accounts vergleichen, die sprachlich ähnlich wirken.
- Prüfen, ob sich bei zwei Accounts ungewöhnliche Ähnlichkeiten bei Zeitmustern oder Sprachgewohnheiten zeigen.

## DM-Archiv

Sinn und Zweck:
Direct Messages lokal laden und für spätere Exporte vorbereiten.

Was dich hier erwartet:
Du kannst DM-Konversationen lokal in den Browser laden, dort sichten und sie als Grundlage für spätere JSON-, HTML- oder PDF-Exporte nutzen.

Beispiele:
- Den Verlauf mit einem Gesprächspartner lokal sichern.
- Ein DM-Archiv vorbereiten, bevor daraus eine lesbare Ausgabe gebaut wird.

## Was Unsere Suche Mehr Kann Als Die Originale Bsky-Suche

Threadlines Suche erweitert die Standardsuche von Bluesky an ein paar besonders praktischen Stellen:

- sie kann die Posts eines einzelnen Accounts direkt durchgehen
- sie kann die Reposts eines einzelnen Accounts direkt durchgehen
- sie unterstützt lokal gespeicherte Suchmasken
- sie ergänzt lokale Filter für Post-Typ und Medien
- sie kann Hashtags als `alle` oder `mindestens ein Hashtag` verknüpfen
- sie kann gefundene Posts direkt im Thread Explorer öffnen

## Als App Installieren

Threadline ist eine PWA und kann auf Handy und Desktop installiert werden.

Auf iPhone oder iPad:
- die App in Safari öffnen
- `Teilen` verwenden
- `Zum Home-Bildschirm` wählen

Auf Android, Chrome, Edge oder am Desktop mit Chromium-Browsern:
- die App öffnen
- den Install-Button in Threadline oder die Installationsfunktion des Browsers verwenden

## Technische Dokumentation

Technische Details stehen bewusst nicht mehr im README.

- Allgemeine technische Dokumentation: [TECHNICAL.de.md](TECHNICAL.de.md)
- AT-Protocol- und Bluesky-Endpunkte: [ATPROTO.de.md](ATPROTO.de.md)

## Lizenz

- Lizenz: [Apache License 2.0](https://marsrakete.github.io/threadline/LICENSE)

## Kontakt

- E-Mail: [millux@marsrakete.de](mailto:millux@marsrakete.de)
- Bluesky: [https://bsky.app/profile/marsrakete.de](https://bsky.app/profile/marsrakete.de)
