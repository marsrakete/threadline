# Threadline Technische Hinweise

**Deutsch** | [English](TECHNICAL.md)

Diese Datei bündelt die technischeren Hintergrundinformationen, die nicht im schnellen Einstieg des Haupt-README stehen sollen.

## Grenzen Des Anwendungsstarts

`app-storage.js` verwaltet den verpflichtenden Hauptzustand, vier optionale Startspeicher und serialisierte Einstellungs-Schreibzugriffe. Fehler optionaler Ladevorgaenge bleiben nichtfatal; Fehler des Hauptzustands gehen an die Wiederherstellung. Einstellungssnapshots werden vor dem Eintritt in die Schreibwarteschlange erfasst.

`app-state.js` normalisiert Einstellungen und koordiniert die Wiederherstellung der Bereiche in der bisherigen Reihenfolge. Lokale Theme-/Dichte-Werte haben Vorrang. Die Reply-Uebergabe per URL hat Vorrang vor dem Browserspeicher; die Layoutmigration wird vor Aktivierung des Arbeitsbereichs gespeichert. Fehler geben die Arbeitsbereichswiederherstellung trotzdem frei, ohne eine erfolgreiche Backup-Erinnerung zu planen.

`app-bootstrap.js` registriert den Worker und startet nach dessen Bereitschaft Wiederherstellung, Sitzungspruefung, laufende Sitzungschecks und Update-Pruefung. Der Controllerwechsel beruecksichtigt Seitenwechsel, ignoriert Datenschutz-Navigation und verhindert doppelte Reloads. `app.js` stellt Adapter zusammen und uebernimmt explizite Zustandspatches, ohne eine zweite Start-Orchestrierung zu behalten.

Vertragstests pruefen Fehler, Fallbacks und Reihenfolge. Der Browsertest durchlaeuft die echte Startverdrahtung auf beiden Seiten mit kontrolliertem Worker-Transport; echte IndexedDB- und Offline-Wiederherstellung sind damit nicht getestet.

## Gemeinsame Darstellung Und Navigation

`app-shell.js` verwaltet Anzeige-Cache, Wiederherstellung, Synchronisierung, URL-Uebergabe, Body-Klassen und uebersetzte Einstellungsschalter. Beide Cache-Werte werden vor dem Rendern einer Aenderung uebernommen, damit keine veralteten Werte zurueckgeschrieben werden. Fehlende oder ungueltige Cache-Eintraege ueberschreiben beim Abgleich keine laufenden Einstellungen. Speicher- und URL-Zugriffe sind explizite Adapter.

`app-navigation.js` verwaltet vorgemerkte Ziele bei Worker-Reloads: speichern, lesen, verbrauchen und nach Erreichen des Zielpfads entfernen. Der Einstieg behaelt Zustand und Adapter.

`app-layout-state.js` verwaltet Breiten-Normalisierung/Migration, CSS-Geometrie, responsive Sidebar-Beschriftung/Klassen, Zuruecksetzen und Pointer-Drag-Lebenszyklus. Zustand, native Events und Speicherung sind explizite Adapter. Erneutes Ziehen ersetzt alte Listener; Abbruch, Zuruecksetzen und der Wechsel zur mobilen Ansicht entfernen aktive Drag-Listener. Der Einstieg behaelt nur Zustandsadapter und schlanke Render-Aufrufe. Es entstehen keine neuen Cache-Dateien oder Speicherschemata.

Layout-Vertragstests pruefen Grenzen, ungueltige Werte, Abbruch, eingeklappte Abstaende und Media-Wechsel. Der Browsertest prueft echte Pointer-Drags, Zuruecksetzen, gleiche eingeklappte Geometrie beider Dichten und mobile Stapelung auf beiden Seiten. Er erfasst Laufzeitfehler und verwendet einen kontrollierten Worker-Transport, keine echten Geraete oder Offline-Speicherung.

Vertragstests pruefen ungueltige Werte und gesperrten Speicher. Der Edge-Test prueft beide Seiten, echte Einstellungsklicks, Hin-/Rueckwechsel, Reload und URL-Uebergabe gegen widersprechenden Worker-Zustand. Dieser kontrollierte Transport prueft keine echten Service-Worker-Update-Rennen oder Offline-Wiederherstellung.

## Controller Des Anwendungslebenszyklus

Update-Anzeige, Versionspruefung, Drosselung automatischer Checks und Worker-gestuetzter Reload liegen in `createApplicationUpdateController` in `app-bootstrap.js`. Parallelpruefungs- und Reload-Sperren sind privat; Browser-Navigation, Timer und Registrierung sind explizite Adapter.

`app-session.js` verwaltet Sitzungspruefung, Konto-/Identitaetsaktualisierung, Avatar-Wiederherstellung, Offline-Verhalten, Passwort-Reparatur und das Fuenf-Minuten-Pruefintervall. Hinzu kommen Endpoint-Normalisierung, Login-Fehlertexte, Login-Dialog/Formular sowie Kontowechsel, An-/Abmeldung und bestaetigtes Entfernen. `shared-accounts.js` rendert die Sidebar mit `account-switcher-item-template` und expliziten Zustands-, Avatar-, Uebersetzungs- und Aktionsadaptern. Im Entry-Point-Renderer verbleiben keine eingebetteten Kontoaktionen. Worker-Protokoll und gespeichertes Kontoschema bleiben unveraendert; Workspace-Aktualisierung und native APIs sind injizierte Abhaengigkeiten.

Vertragstests sichern Endpoint-/Fehler-Fallbacks, Passwortbereinigung, Request-/Busy-Ablauf, Offline-/Reparaturverhalten, abgebrochenes Entfernen und Aktionsfehler. Browser-Integration bedient Login, Logout, Kontowechsel, Pruefung und Entfernen auf beiden Seiten mit kontrollierten Worker-Antworten und Laufzeitfehler-Erfassung. Renderer-Tests pruefen untrusted Labels und erneutes Binden ohne doppelte Aktionen. Echte Anmeldung und IndexedDB-Persistenz werden damit nicht getestet.

`createApplicationInstallController` in `app-shell.js` verwaltet den Installationsprompt und die Button-Verfuegbarkeit einschliesslich iOS-Anleitung und Standalone-Modus. `createApplicationLifecycleHandlers` in `app-initialization.js` koordiniert Sichtbarkeit/Fokus, Darstellungsabgleich, Viewport-Groessenaenderungen und Installationsereignisse. `app.js` stellt nur Controller und native Adapter zusammen.

Vertragstests pruefen Normal-, Grenz-, Parallel- und Fehlerfaelle. Der Browsertest laedt beide angemeldeten Seiten mit kontrolliertem Worker, oeffnet den Passwort-Reparaturdialog, verarbeitet einen synthetischen Installationsprompt, zeigt Update-Metadaten und fuehrt einen echten URL-Reload durch. Live-Authentifizierung, echte Betriebssystem-Installation und Worker-Aktivierung/Offline-Rennen sind damit nicht getestet.

## Hilfe-Modulgrenzen

`app-help-topics.js` enthaelt den Themenkatalog aus Uebersetzungsschluesseln statt des grossen Switch-Blocks im Einstieg. `app-help.js` verwaltet Dialog, sprachabhaengige README-Auswahl/Laden/Cache, Fehleranzeige und delegierte Themenklicks. Themenabsatz und Liste verwenden `help-topic-template` mit reinem Text. Anfrage-Generationen verhindern, dass spaete README-Antworten ein neueres Thema oder einen geschlossenen Dialog ueberschreiben.

`app-help-markdown.js` verwaltet die bewusste Markdown-zu-HTML-Grenze. URL-Kontext und Text-Escaping sind explizite Abhaengigkeiten. Rohes HTML wird maskiert; unterstuetzte zentrierte README-Bloecke verwenden erzeugte Marker statt beliebiges Quell-HTML als vertrauenswuerdig zu behandeln. Link-/Bild-Protokolle werden geprueft und erzeugte Attribute maskiert. Der allgemeine HTML-Escaper bleibt eine einzelne injizierte Implementierung.

Vertragstests pruefen Katalog, Sprach-Fallback, Markup, unsichere URLs/HTML, Cache, Fehler und Abbruch. Browsertests laden beide Seiten, pruefen alle Themen auf Deutsch/Englisch/Franzoesisch, lokalisierte README-Pfade, sichere Template-Texte und verspaetete Anfragen. Die neuen Module sind im Service-Worker-Shell-Cache enthalten; es gibt keine Speichermigration.

## Composer-Dokumentgrenzen

Die fachliche Composer-Auslagerung ist nach der Modulgrenze des Projekts abgeschlossen: Anwendungszustand, native API-Adapter und die Zusammenstellung der Abhaengigkeiten bleiben in `app.js`, jedoch keine zweite Composer-Implementierung. Start-Hydration und gemeinsame Navigation/Einstellungen sind Anwendungsaufgaben und nicht Teil dieser Abschlussaussage.

| Bereich | Zustaendige Module |
| --- | --- |
| Dokument, Entwurf und Dateien | `composer-document.js`, `composer-page.js` |
| Textgrenzen, Aufteilung und Abschnittsrendering | `composer-main.js`, `composer-splitter.js`, `composer-segments.js`, `composer-segment-rendering.js`, `composer-validation.js` |
| Bilder, Canvas und Bildeditor | `composer-images.js`, `composer-image-processing.js`, `composer-image-geometry.js`, `composer-image-renderer.js`, `composer-image-editor.js` |
| Link-Cards, Provider-Pruefung und Requests | `composer-link-cards.js`, `composer-link-card-providers.js`, `shared-link-cards.js` |
| Mentions, Reply-Dialoge und Posting-Einstellungen | `composer-mentions.js`, `composer-dialogs.js`, `composer-post-settings.js` |
| Publish-Pruefung/Bestaetigung, Fortschritt, Server-Limits und Historie | `composer-publishing.js`, `composer-history.js` |

Strukturelle Regressionstests verhindern, dass ausgewaehlte Fachoperationen, Such-Timer und die Publish-Klick-Orchestrierung wieder in den Einstieg wandern. Das ist eine Architekturabsicherung, kein Nachweis authentifizierter Netzwerkablaeufe. Live-Publishing, echte Geraete und Offline-/IndexedDB-Wiederherstellung brauchen weiterhin eigene Abnahmepruefungen.

Link-Card-Vorschauen und ihr Entfernen liegen in `composer-link-cards.js` und verwenden auf beiden Seiten `composer-link-card-preview-template`. Mention-Korrekturen im Ausgangstext mit Resolver-Invalidierung und Dokumentaktualisierung liegen in `composer-mentions.js`. Die geordnete Zusammenstellung von Text und Medien zum Posten liegt in `composer-publishing.js`. `app.js` stellt hier nur Dokumentzustand, Speicher- und UI-Adapter bereit.

Vertragstests sichern Medienidentitaet, leere Textabschnitte, sichere Vorschautexte und die Aktualisierungsreihenfolge ab. Gezielte Edge-Tests rendern das echte Vorschau-Template auf beiden Seiten und erfassen Initialisierungsfehler; authentifiziertes Posten und echte IndexedDB-Schreibvorgaenge werden dabei nicht getestet.

## OpenGraph-Asset-Pipeline

Die maßgebliche Quelle für das OpenGraph-Bild ist `icons/threadline-og-workspaces.svg`. Die abgeleiteten Rasterdateien werden mit `npm run build:og-image` anhand der Einstellungen in `config/og-image.config.json` erzeugt.

Aktuelle Ausgaben:

- `icons/threadline-og-workspaces.png`
- `og-image.jpg`

## Schnittstellen-Überblick

Threadline ist eine statische PWA ohne eigenes Backend. Fast alle Datenflüsse laufen direkt vom Browser zum jeweils zuständigen Bluesky- oder AT-Protocol-Endpunkt. Der Service Worker in [sw.js](sw.js) bündelt dabei Login, API-Zugriffe, Caching und Archiv-Logik.

```mermaid
flowchart TD
    A["Benutzer im Browser"] --> B["app.js"]
    B --> C["Service Worker sw.js"]

    C --> D["Login<br/>com.atproto.server.createSession"]
    D --> E["Session mit DID, Handle,<br/>accessJwt, refreshJwt"]
    E --> F["PDS-Basis ableiten<br/>auth.pdsUrl oder auth.service"]
    F --> G["Refresh<br/>com.atproto.server.refreshSession"]

    C --> H["Composer"]
    H --> H1["Handle auflösen<br/>com.atproto.identity.resolveHandle"]
    H --> H2["Bilder hochladen<br/>com.atproto.repo.uploadBlob"]
    H --> H3["Post anlegen<br/>com.atproto.repo.createRecord"]
    H3 --> H4["optional Threadgate / Postgate"]

    C --> I["Archiv-Funktion"]
    I --> I1["Eigene Posts lesen<br/>com.atproto.repo.listRecords"]
    I --> I2["Threads erweitern<br/>app.bsky.feed.getPostThread"]
    I --> I3["Metriken nachladen<br/>app.bsky.feed.getPosts"]
    I --> I4["Bilder laden<br/>com.atproto.sync.getBlob"]

    C --> S["Suche"]
    S --> S1["Globale Suche<br/>app.bsky.feed.searchPosts"]
    S --> S2["Account-Posts / Reposts<br/>app.bsky.feed.getAuthorFeed"]
    S --> S3["URL-Auflösung / Favoriten<br/>lokale Thread-Explorer-Integration"]

    C --> J["Analyse"]
    J --> J1["Profile<br/>app.bsky.actor.getProfile"]
    J --> J2["Account-Feed<br/>app.bsky.feed.getAuthorFeed"]

    C --> L["Netzwerk"]
    L --> L1["Profil<br/>app.bsky.actor.getProfile"]
    L --> L2["Follower / Following<br/>app.bsky.graph.getFollowers / getFollows"]
    L --> L3["Aktuelle Posts<br/>app.bsky.feed.getAuthorFeed"]
    L --> L4["Likes auf aktuelle Posts<br/>app.bsky.notification.listNotifications"]

    C --> K["DM-Archiv"]
    K --> K1["Konversationen<br/>chat.bsky.convo.listConvos"]
    K --> K2["Nachrichten<br/>chat.bsky.convo.getMessages"]
    K --> K3["Anhänge / Bilder"]
```

## Thread-Explorer Cache- Und Snapshot-Pipeline

Der Thread Explorer ist zwischen der sichtbaren Browser-App in [app.js](app.js) und dem Service Worker in [sw.js](sw.js) aufgeteilt. Die App verwaltet Auswahlzustand, Baumdarstellung, Lazy-Hydration von Kacheln, Zoom/Pan-Zustand und den PNG-Exportdialog. Der Service Worker verwaltet authentifizierte Bluesky-Requests, Thread-Laden, Avatar-Hydration, Medien-Hydration und Cache-Zugriffe.

### Live-Thread Laden

Wenn ein Post ausgewählt wird, sendet `app.js` `LOAD_THREAD_EXPLORER_THREAD` an den Service Worker. Der Service Worker lädt den ausgewählten Post über `app.bsky.feed.getPostThread`, normalisiert den Thread-Baum und gibt Root-Knoten plus Post-Zähler zurück. Wenn der ausgewählte Post eine Antwort innerhalb eines anderen Threads ist, versucht Threadline vom erkannten Root aus neu zu laden und den ausgewählten Pfad wieder in den vollständigen Baum einzufügen.

Nach dem Rendern des Baums startet die App einen nicht blockierenden Medien-Prewarm. Dieser Prewarm ruft im Hintergrund `HYDRATE_THREAD_EXPLORER_MEDIA` auf. Er darf die normale Thread-Auswahl nicht verzögern: veraltete Prewarm-Läufe werden abgebrochen oder ignoriert, wenn der Nutzer einen anderen Post auswählt.

### Medien- Und Avatar-Caches

Threadline verwendet mehrere Caches mit unterschiedlichen Aufgaben:

- `account-avatar-cache` ist ein IndexedDB-gestützter App-Cache für Account-Avatare. Er speichert Bytes, MIME-Type, DID, Quell-URL und Zeitstempel.
- `threadline-remote-media-v1` ist der Cache-API-Speicher für Remote-Medien, die der Service Worker nutzt.
- `threadExplorerRenderedMediaCache` in `app.js` ist eine kurzlebige In-Memory-Map für den aktuell angezeigten Thread. Sie ordnet Medien-URLs canvas-sicheren Data-URIs zu.
- `threadExplorerSnapshotMediaDataUris` in `app.js` ist die Snapshot-spezifische Data-URI-Map, die während des PNG-Exports gefüllt wird.

Der Remote-Media-Cache kann zwei Arten von Einträgen enthalten:

- lesbare Responses, die Threadlines eigener Hydration-Pfad geschrieben hat
- opaque Browser-Bild-Responses, die durch normales Cross-Origin-Bildladen entstanden sind

Opaque Responses kann der Browser wiederverwenden, aber JavaScript kann ihre Bytes nicht auslesen. Für den PNG-Export lassen sich nur lesbare Responses in Data-URIs umwandeln und sicher in Canvas zeichnen.

### PNG-Snapshot-Stufen

Der PNG-Export blockiert bewusst die Eingaben im Thread Explorer. Der Export verändert den gerenderten DOM-Zustand, zwingt alle Kacheln zur Hydration, ersetzt Bilder durch Data-URIs, misst den gesamten Baum und zeichnet danach die Ausgabe. Würde der Nutzer währenddessen den Thread wechseln, Knoten einklappen oder zoomen, wäre die Snapshot-Geometrie ungültig.

Die wichtigsten Stufen sind:

1. `app.js` öffnet den Fortschrittsdialog und erzeugt einen Abort-Controller.
2. `HYDRATE_THREAD_EXPLORER_AVATARS` sammelt alle Autoren im Baum und stellt sicher, dass ihre Avatare im `account-avatar-cache` liegen.
3. `HYDRATE_THREAD_EXPLORER_MEDIA` sammelt Post-Bilder, Bilder zitierter Posts, Link-Card-Thumbnails und Publication-Card-Thumbnails.
4. Für jede Medien-URL prüft der Service Worker `threadline-remote-media-v1`.
5. Bei Cache-Hit werden lesbare Bytes direkt in eine Data-URI gewandelt.
6. Bei Cache-Miss lädt der Service Worker das Asset möglichst per Blob-Auflösung, normalisiert SVGs zu einem PNG-Platzhalter, schreibt die lesbare Response zurück in `threadline-remote-media-v1` und gibt eine Data-URI zurück.
7. `app.js` speichert die zurückgegebenen Data-URIs in den kurzlebigen Medien-Maps.
8. Die App zwingt alle Lazy-Kacheln des Thread Explorers einmal zum Rendern.
9. Gerenderte Bilder werden auf Data-URIs umgestellt und vom Browser-Bilddecoder geprüft.
10. Der vollständige Baum wird gemessen und wenn möglich über den Browser-`foreignObject`-Pfad exportiert.
11. Wenn `foreignObject` für diesen Baum nicht funktioniert, nutzt Threadline den direkten Canvas-Fallback-Renderer.

### Cache-Hit- Und Cache-Miss-Fortschritt

Während der Medien-Hydration meldet der Service Worker:

- `current` / `total`
- `remaining`
- `hydrated`
- `skipped`
- `cacheHits`
- `downloaded`

Damit kann die UI zwischen einem langsamen Netzlauf und einem weitgehend gecachten Export unterscheiden. Ein wiederholter Export desselben Threads sollte viele Cache-Hits und weniger neu geladene Assets zeigen. Wenn `downloaded` nach einem vorherigen vollständigen Export weiterhin hoch bleibt, sind typische Ursachen abgelaufener Browser-Speicher, Cache-Eviction, nur opaque vorhandene Bild-Einträge, geänderte CDN-URLs oder Medien-URLs, die nicht normalisiert werden konnten.

### Ablauf

```mermaid
flowchart TD
    A["Nutzer waehlt einen Post"] --> B["app.js<br/>selectThreadExplorerPost"]
    B --> C["Service Worker<br/>LOAD_THREAD_EXPLORER_THREAD"]
    C --> D["Bluesky API<br/>app.bsky.feed.getPostThread"]
    D --> E["Normalisierter Thread-Baum"]
    E --> F["app.js rendert sichtbaren Baum"]
    F --> G["Hintergrund-Prewarm<br/>HYDRATE_THREAD_EXPLORER_MEDIA"]

    G --> H["Medien-URLs sammeln<br/>Bilder, Quote-Bilder,<br/>Link-Cards, Publication-Cards"]
    H --> I{"Cache API<br/>threadline-remote-media-v1"}
    I -->|lesbarer Hit| J["Cache-Bytes<br/>in Data-URI wandeln"]
    I -->|Miss oder opaque| K["Per Blob/PDS<br/>oder Remote-URL laden"]
    K --> L["Bild normalisieren<br/>SVG-Platzhalter wenn noetig"]
    L --> M["Lesbare Response<br/>in Remote-Media-Cache schreiben"]
    M --> J
    J --> N["Data-URIs an app.js"]
    N --> O["Kurzlebige Maps<br/>threadExplorerRenderedMediaCache<br/>threadExplorerSnapshotMediaDataUris"]
    O --> P["Sichtbare Kacheln nutzen<br/>Cache-Quelle wenn vorhanden"]

    Q["Nutzer klickt PNG Snapshot"] --> R["app.js blockiert Thread-Explorer-Eingaben<br/>und oeffnet Fortschrittsdialog"]
    R --> S["HYDRATE_THREAD_EXPLORER_AVATARS<br/>account-avatar-cache"]
    S --> T["HYDRATE_THREAD_EXPLORER_MEDIA<br/>Cache-Hit/Miss-Pipeline"]
    T --> U["Alle Lazy-Kacheln rendern"]
    U --> V["Gerenderte Bilder<br/>auf Data-URIs umstellen"]
    V --> W["Browser dekodiert Bildobjekte"]
    W --> X["Vollstaendigen Baum messen"]
    X --> Y{"foreignObject funktioniert?"}
    Y -->|ja| Z["Browser-Snapshot nach Canvas"]
    Y -->|nein| AA["Direkter Canvas-Fallback"]
    Z --> AB["PNG kodieren und herunterladen"]
    AA --> AB
```

## PowerShell-Archiver

Für große Account-Archive hat Threadline jetzt eine klare Zwei-Teil-Richtung:

- die Browser-PWA bleibt die interaktive Oberfläche
- ein eigenständiger PowerShell-Archiver übernimmt lange Bulk-Abrufe

Die zentrale technische Bedingung ist die Kompatibilität:

**Der PowerShell-Archiver muss denselben Archiv-JSON-Vertrag erzeugen, den die Browser-App heute bereits exportiert.**

Das bedeutet:

- dieselbe Struktur für `manifest.json` und `posts.json`
- dieselben Asset-Ordnerkonventionen
- ZIP-Ausgaben, die sich weiterhin direkt wieder in Threadline importieren lassen
- Kompatibilität mit `scripts/convert-threadline-archive-to-html.ps1`

Script und Dokumentation für dieses Tool liegen hier:

- `scripts/archive-threadline.ps1`
- `scripts/README.threadline-archiver.de.md`

## Suche-Workspace Interna

Der Suche-Workspace kombiniert bewusst zwei Strategien:

- direkte serverseitige Suche über `app.bsky.feed.searchPosts`
- lokale Feed-Durchläufe über `app.bsky.feed.getAuthorFeed`

Diese Aufteilung ist nötig, weil die eingebaute Bluesky-Suche gut für globale Funde ist, aber nicht alle Suchmodi und Filter von Threadline allein abbilden kann.

### Suchmodi

- `Netzwerk-Suche`
  - nutzt `app.bsky.feed.searchPosts`
  - geeignet für globale Themensuche, account-begrenzte globale Suche, Hashtag-Suche und URL-/Domain-Filter
- `Posts eines Accounts`
  - läuft über `app.bsky.feed.getAuthorFeed`
  - erlaubt Threadline, einen Account-Feed lokal zu prüfen, auch wenn der globale Suchindex unvollständig ist
- `Reposts eines Accounts`
  - läuft ebenfalls über `app.bsky.feed.getAuthorFeed`
  - behält nur Feed-Einträge mit `reasonRepost`
- `Hashtag-Suche`
  - startet mit `app.bsky.feed.searchPosts`
  - kann zwischen dokumentierter UND-Verknüpfung und Threadlines eigenem Modus `Mindestens ein Hashtag` umschalten

### Warum lokale Filter nötig sind

Die Bluesky-API bietet nicht jeden UI-Filter als direkten serverseitigen Parameter an. Threadline führt deshalb in `sw.js` nach dem Laden noch einen zweiten Filterdurchlauf aus.

Typische lokale Zusatzfilter sind:

- Ausschlussbegriffe
- Post-Typ wie Original-Posts, Replies, Quotes, Reposts oder alles außer Reposts
- Posts ohne Medien
- Erwähnungs-Prüfung
- Mehrsprachen-Zusammenführung
- reine Feed-Durchläufe für einzelne Accounts
- `Mindestens ein Hashtag` über mehrere API-Varianten

### Mehrsprachen- und Hashtag-Varianten

Wenn mehr als eine Sprache gewählt ist, führt Threadline mehrere `searchPosts`-Anfragen aus und führt die Ergebnisse lokal zusammen. Dasselbe passiert beim Modus `Mindestens ein Hashtag`:

- Bluesky dokumentiert mehrere `tag`-Parameter als UND-Verknüpfung
- Threadline bildet ODER-Verhalten nach, indem pro Hashtag eine eigene Suchvariante geladen und anschließend nach Post-URI dedupliziert wird

Darum verwaltet der Suche-Workspace zusätzlich zum normalen API-Cursor noch einen eigenen Cursor-Zustand für Varianten.

## Login Und Auth

### Was beim Login passiert

1. Die App prüft den angegebenen Service und beschreibt ihn über `com.atproto.server.describeServer`.
2. Danach wird über `com.atproto.server.createSession` eine Session mit DID, Handle, `accessJwt` und `refreshJwt` erzeugt.
3. Threadline speichert diese Session lokal, damit Reloads und längere Archivläufe funktionieren.
4. Für weitere Requests wird möglichst die PDS-Basis des eingeloggten Accounts verwendet, also `auth.pdsUrl` oder `auth.service`, nicht blind `bsky.social`.

Zur Einordnung sind vor allem diese Originalquellen hilfreich:

- [Protocol Overview](https://atproto.com/guides/overview)
- [AT Protocol Specification](https://atproto.com/specs/atp)

### Wozu `refreshSession` dient

- `com.atproto.server.refreshSession` wird genutzt, wenn ein Access-Token während eines längeren Vorgangs abläuft.
- Das ist vor allem für Archiv-Funktion, Netzwerk und DM-Archiv wichtig, weil dort viele Requests hintereinander laufen können.

### Sicherheitsrelevante Hinweise

- Threadline blockiert bewusst unsichere `http://`-PDS-Server.
- App-Passwörter und Sessions liegen lokal im Browser, weil die App ohne eigenes Backend arbeitet.
- Das ist praktisch für eine PWA, aber sicherheitlich sensibel und im [TODO.md](TODO.md) bewusst als offener Punkt notiert.

## Repo-Befehle

Diese Befehle arbeiten direkt auf Records im AT-Protocol-Repo eines Accounts.

`Repo` meint hier nicht ein Git-Repository, sondern das persönliche Daten-Repository eines Accounts im AT-Protokoll. Darin liegen zum Beispiel Posts, Follows, Likes oder weitere accountbezogene Records.

Mehr Hintergrund dazu:

- [Reads and Writes](https://atproto.com/guides/reads-and-writes)
- [Reading Data](https://atproto.com/guides/reading-data)

### `com.atproto.repo.listRecords`

Wird vor allem in der Archiv-Funktion verwendet.

- Liest seitenweise eigene Repo-Einträge.
- Threadline nutzt das für `app.bsky.feed.post`, also die eigenen Posts.
- Darauf bauen Datumsfilter, Hashtag-Filter und die verschiedenen Archiv-Typen auf.

### `com.atproto.repo.getRecord`

Wird punktuell verwendet, wenn ein einzelner Record mit URI gezielt nachgeladen werden muss.

- Im Netzwerk unter anderem für Beziehungsdaten wie Follow-Zeitpunkte.
- Hilfreich, wenn eine Beziehung nicht nur als Status, sondern auch mit Datum angezeigt werden soll.

### `com.atproto.repo.createRecord`

Wird beim Veröffentlichen aus dem Composer genutzt.

- legt eigentliche Posts vom Typ `app.bsky.feed.post` an
- legt bei Bedarf `app.bsky.feed.threadgate` an
- legt bei Bedarf `app.bsky.feed.postgate` an

Damit steuert Threadline nicht nur den Post-Inhalt selbst, sondern auch Antworten und Zitierbarkeit.

### `com.atproto.repo.uploadBlob`

Wird für Composer-Bilder verwendet.

- Bilddateien werden erst als Blob auf die zuständige PDS hochgeladen.
- Der spätere Post referenziert diese Blob-Handles.
- ALT-Texte werden dabei zusammen mit den Bild-Referenzen in das Embed geschrieben.

## Get-Befehle

### `app.bsky.actor.getProfile`

Lädt Profilbasisdaten eines Accounts.

Wird genutzt für:

- Avatare
- Anzeigenamen
- Handles
- Follower-/Following-Zahlen
- Fokus-Ansicht im Netzwerk
- Profilbasis im Analyse-Workspace für die beiden Vergleichsaccounts

### `app.bsky.graph.getFollowers`

Lädt die Accounts, die einem Zielaccount folgen.

Wird genutzt für:

- Netzwerk-Wellen
- Mutual-Berechnung
- gemeinsame Mutuals

### `app.bsky.graph.getFollows`

Lädt die Accounts, denen ein Zielaccount folgt.

Wird genutzt für:

- Netzwerk-Wellen
- Mutual-Berechnung
- Netzwerk eines fokussierten Accounts

### `app.bsky.feed.getAuthorFeed`

Lädt aktuelle Posts eines Accounts.

Wird genutzt für:

- Aktivitätsauswertung im Fokus
- Posts in den letzten 14 / 60 Tagen
- Likes auf aktuelle Posts
- Medienexport für einen anderen Actor
- Laden der Post-Basis für den Analyse-Workspace

## Analyse-Workspace Technisch

Der Analyse-Workspace lädt für zwei Accounts jeweils einen Ausschnitt des Author-Feeds und berechnet darauf zwei Gruppen von Signalen:

- sprachliche Signale
- zeitliche Signale
- Netzwerk- und Interaktionssignale

Die Analyse ist bewusst heuristisch. Sie liefert keine Identitätsaussage, sondern nur zusätzliche Indikatoren.

### Sprachliche Signale

Aktuell fließen unter anderem diese Verfahren ein:

- Kennzahlen-Profil aus Durchschnittswerten wie Wortlänge, Satzlänge, Emoji-Quote und Großbuchstabenquote
- Cosine Similarity über Wortverteilungen
- Jaccard-Ähnlichkeit über Wortmengen
- Funktionswort-Profil
- Character n-grams
- Burrows's Delta

### Zeitliche Signale

Zusätzlich berechnet Threadline ein Zeitprofil aus:

- Stundenverteilung
- Wochentagsverteilung
- Pausen-/Burst-Profil zwischen zwei Posts desselben Accounts
- zeitlicher Nähe beider Accounts in kleinen Fenstern

Daraus entstehen Wochen-Heatmaps, 30-Tage-Punktansichten und zwei zusätzliche Vergleichswerte:

- `Zeitprofil-Score`
- `Zeitliche Nähe`

### Netzwerk- und Interaktionssignale

Threadline vergleicht inzwischen zusätzlich:

- gemeinsame Follower
- gemeinsames Following
- gemeinsame Mutuals
- die direkte Beziehung zwischen Account A und B
- Mention-Ziele
- verlinkte Domains
- Hashtags
- Reply-Ziele
- Quote-Ziele
- Sprach-Tags
- Tendenzen beim Medienanteil

Mutes und Blocks sind nur dann vergleichbar, wenn die betreffenden Vergleichsaccounts auch als gespeicherte Threadline-Konten vorliegen, weil Bluesky diese Moderationslisten nur für den aktuell authentifizierten Account bereitstellt.

### Verwendete Verfahren Und Quellen

#### Cosine Similarity

Threadline vergleicht Häufigkeitsvektoren mit dem Kosinus der beiden Vektoren.

Grundidee:

`cos(theta) = (A · B) / (||A|| ||B||)`

Nützliche Quelle:

- Salton, G.; McGill, M. J. *Introduction to Modern Information Retrieval*. McGraw-Hill, 1983.

#### Jaccard-Ähnlichkeit

Für Wortmengen wird die Schnittmenge relativ zur Vereinigungsmenge betrachtet.

Grundidee:

`J(A, B) = |A ∩ B| / |A ∪ B|`

Historische Quelle:

- Jaccard, P. "Étude comparative de la distribution florale dans une portion des Alpes et des Jura." *Bulletin de la Société Vaudoise des Sciences Naturelles* 37, 1901, S. 547–579.

#### Burrows's Delta

Burrows's Delta ist ein klassisches stilometrisches Distanzmaß über z-normalisierte Häufigkeiten häufiger Wörter. Threadline nutzt daraus eine vorsichtige Ähnlichkeitsableitung für den Gesamtscore.

Grundlegende Quelle:

- Burrows, J. F. "'Delta': a Measure of Stylistic Difference and a Guide to Likely Authorship." *Literary and Linguistic Computing* 17(3), 2002, S. 267–287.

#### Character n-grams

Character n-grams erfassen wiederkehrende Zeichenfolgen und damit Schreibgewohnheiten, Endungen und orthografische Muster.

Ein oft zitierter Überblick:

- Stamatatos, E. "A Survey of Modern Authorship Attribution Methods." *Journal of the American Society for Information Science and Technology* 60(3), 2009, S. 538–556.

#### Funktionswörter

Funktionswörter sind in der Stilometrie nützlich, weil sie oft weniger themenabhängig sind als Inhaltswörter.

Einführende Quelle:

- Mosteller, F.; Wallace, D. L. *Inference and Disputed Authorship: The Federalist*. Addison-Wesley, 1964.

#### Zeitprofil Und Zeitliche Nähe

Die zeitlichen Merkmale in Threadline sind derzeit keine aus der Literatur exakt übernommene Einzelmethode, sondern eine pragmatische Eigenkombination aus Histogramm-Ähnlichkeiten und kleinen Zeitfenstern für Aktivitätsnähe.

Zur Einordnung ähnlicher forensischer und verhaltensbezogener Ansätze:

- Grant, T. *Analyzing Language in Context: A Reader in Forensic Linguistics*. Routledge, 2010.
- Stamatatos, E. "Author Identification: Using Text Sampling to Handle the Class Imbalance Problem." *Information Processing and Management* 44(2), 2008, S. 790–799.

### Robustheitsmix

Der aktuelle Gesamtscore ist absichtlich ein Mischwert und kein einzelnes „Wahrheitsmaß“.

Zurzeit werden ungefähr diese Gewichte verwendet:

- Burrows's Delta: 22 %
- Character n-grams: 22 %
- Funktionswort-Profil: 17 %
- Cosine Similarity: 14 %
- Jaccard-Ähnlichkeit: 7 %
- Kennzahlen-Profil: 8 %
- Zeitprofil: 6 %
- Zeitliche Nähe: 4 %

Die Gewichte sind Produktentscheidungen und nicht aus einer einzelnen wissenschaftlichen Quelle übernommen.

### `app.bsky.feed.getPosts`

Lädt Posts gezielt per URI-Batch.

Wird genutzt für:

- Metriken im Archiv nachladen
- Single-Thread-Import
- gezielte Post-Auflösung, wenn ein Archiv oder Import URIs gesammelt hat

Wichtig:

- Der Analyse-Workspace nutzt diesen Call derzeit **nicht**. Für die Analyse wird aktuell direkt aus `app.bsky.feed.getAuthorFeed` gelesen.

### `app.bsky.feed.getPostThread`

Lädt den Thread-Kontext zu einem Einstiegspost.

Wird genutzt für:

- Archiv-Typen, die Threads erweitern
- Hashtag-Prüfung am Startpost oder im Thread
- Single-Thread-Export
- Auflösen von Antwortzielen und Thread-Fortsetzungen aus einer Posting-URL

Wichtig:

- Der Analyse-Workspace nutzt diesen Call derzeit **nicht**.
- Dieser Call kann teuer sein und ist deshalb mit Timeout/Retry abgesichert.
- Gelöschte oder fehlende Posts werden möglichst übersprungen statt den Lauf komplett zu stoppen.

## Antworten Und Thread Fortsetzen Technisch

Beide Funktionen beginnen mit einer Posting-URL, laufen intern aber auf unterschiedliche Ziel-Referenzen hinaus.

### Antwort auf Posting-URL

- Die URL wird geparst und zunächst per `app.bsky.feed.getPosts` aufgelöst
- Danach lädt `app.bsky.feed.getPostThread` den Thread-Kontext
- Für das erste neue Segment setzt Threadline `reply.root` auf den Wurzel-Post des Threads
- `reply.parent` zeigt auf genau das Posting, das in der URL angegeben wurde
- Threadgate-Regeln werden vorab best effort geprüft; bei klar blockierten Antworten bricht Threadline schon vor dem Posten ab

### Thread fortsetzen

- Auch hier wird die URL zuerst in einen konkreten Post und dann in den ganzen Thread aufgelöst
- Anschließend sucht Threadline innerhalb dieses Threads nach dem letzten eigenen Posting des aktuell aktiven Accounts
- `reply.root` bleibt der Wurzel-Post des Threads
- `reply.parent` wird aber bewusst auf den letzten eigenen Post gesetzt, nicht auf den in der URL verlinkten Post
- Dadurch wird der eigene Thread sauber weitergeführt, statt versehentlich mitten auf einen älteren Abschnitt zu antworten

### Speicher- Und Publish-Verhalten

- Das aufgelöste Ziel wird im Composer-Draft in `IndexedDB` gespeichert und ist dadurch reload-fest
- In `app.js` bleibt die ausführliche Zielkarte für die UI erhalten
- An `sw.js` werden beim eigentlichen Posten nur die normalisierten `replyRoot`- und `replyParent`-Referenzen übergeben
- Diese Referenzen gelten für das erste neue Segment; weitere Segmente werden anschließend wie gewohnt als Thread-Kette daran angehängt

### `app.bsky.notification.listNotifications`

Wird im Netzwerk nicht als allgemeine Notification-Ansicht verwendet, sondern für einen speziellen Best-Effort-Fall:

- Likes auf aktuelle Posts eines fokussierten Accounts
- dafür werden Like-Notifications auf die jüngeren Posts dieses Accounts ausgewertet

### `chat.bsky.convo.listConvos`

Lädt DM-Konversationen.

Wird genutzt für:

- Partnerliste im DM-Archiv
- Vorprüfung, ob der Chat-Zugriff funktioniert

### `chat.bsky.convo.getMessages`

Lädt Nachrichten einer Konversation.

Wird genutzt für:

- DM-Archiv-Export
- HTML- und PDF-Darstellung von DMs

## Zusätzliche Identity- Und Blob-Befehle

### `com.atproto.identity.resolveHandle`

Löst einen Handle in eine DID auf.

Wird genutzt für:

- Mentions im Composer
- einzelne Import- und Hilfspfade
- Netzwerk-Eingaben, wenn statt einer DID ein Handle vorliegt

Wichtig:

- Dieser Pfad ist noch eine Stelle, die genauer auf vollständige Host-Unabhängigkeit geprüft werden sollte.
- Für die üblichen Fälle funktioniert er, ist aber eine der Stellen, die bei fremden PDS besonders aufmerksam beobachtet werden sollten.

Grundlagen dazu:

- [Understanding Atproto](https://atproto.com/guides/understanding-atproto)
- [AT Protocol Specification](https://atproto.com/specs/atp)

### `com.atproto.sync.getBlob`

Lädt Binärdaten wie Bilder per DID und CID.

Wird genutzt für:

- Archiv-Bilder
- Composer-Bilder beim späteren Wiederherstellen
- DM-Anhänge, soweit als Blob verfügbar

## Avatare Und Bilder

### Avatare

Avatare werden in Threadline auf mehreren Wegen gebraucht:

- im Login- und Account-Bereich
- im Netzwerk-Fokus
- im Archiv
- im DM-Archiv

Typischer Ablauf:

1. Profil per `app.bsky.actor.getProfile` laden
2. Avatar-URL oder Blob-Referenz ableiten
3. falls für Archiv oder Export nötig, Asset lokal sichern

Im Archiv werden Avatare dedupliziert, damit identische Bilder nicht mehrfach heruntergeladen oder ins ZIP geschrieben werden.

### Composer-Bilder

- werden im Composer zunächst lokal verarbeitet
- dann per `com.atproto.repo.uploadBlob` hochgeladen
- im Post als `app.bsky.embed.images` referenziert

### Archiv-Bilder

- werden nach dem Einsammeln der Posts separat geladen
- dabei werden stabile Dateipfade oder eingebettete Daten für HTML erzeugt
- im kompakten HTML können Bilder bei Bedarf später inline nachgeladen werden

## Link-Cards

### Kurz erklärt

Threadline erzeugt beim normalen Schreiben keine automatischen Link-Cards.

### Warum das so ist

Die App läuft komplett statisch im Browser. Um eine echte Link-Card vom Typ `app.bsky.embed.external` sauber zu erzeugen, müsste Threadline:

- HTML der Zielseite laden
- Open-Graph-Daten auslesen
- ein Vorschaubild laden
- daraus ein externes Embed bauen

Zur API-Systematik dahinter:

- [AT Protocol XRPC API Reference](https://docs.bsky.app/docs/api/at-protocol-xrpc-api)
- [Lexicon Specification](https://atproto.com/specs/lexicon)

Das scheitert in der Praxis oft an CORS und daran, dass es keinen eigenen Backend-Proxy gibt.

### Was trotzdem geht

- klickbare Links über Rich-Text-Facets
- bereits vorhandene externe Vorschaukarten in importierten oder archivierten Daten weiter anzeigen, wenn die Daten schon im Ausgangsmaterial stecken

## Workspace-Sicht Nach Schnittstellen

### Composer

Nutzen vor allem:

- `com.atproto.server.createSession`
- `com.atproto.identity.resolveHandle`
- `com.atproto.repo.uploadBlob`
- `com.atproto.repo.createRecord`
- `app.bsky.feed.getPosts`
- `app.bsky.feed.getPostThread`

### Archiv-Funktion

Nutzen vor allem:

- `com.atproto.repo.listRecords`
- `app.bsky.feed.getPostThread`
- `app.bsky.feed.getPosts`
- `com.atproto.sync.getBlob`

### Analyse

Nutzen vor allem:

- `app.bsky.actor.getProfile`
- `app.bsky.feed.getAuthorFeed`

### Netzwerk

Nutzen vor allem:

- `app.bsky.actor.getProfile`
- `app.bsky.graph.getFollowers`
- `app.bsky.graph.getFollows`
- `app.bsky.feed.getAuthorFeed`
- `app.bsky.notification.listNotifications`
- punktuell `com.atproto.repo.getRecord`

### DM-Archiv

Nutzen vor allem:

- `chat.bsky.convo.listConvos`
- `chat.bsky.convo.getMessages`
- zusätzliche Asset-Pfade für Bilder und Anhänge

## PDS-Und Host-Auswahl

Threadline versucht bei authentifizierten Requests bewusst, die PDS des aktuell angemeldeten Accounts zu nutzen.

Das ist wichtig für:

- fremde oder eigene PDS außerhalb von `bsky.social`
- Spezialfälle wie eurosky
- Archiv- und Netzwerk-Calls, die sonst auf dem falschen Host landen würden

Die App ist damit deutlich PDS-tauglicher als ein reines `bsky.social`-Frontend. Trotzdem lohnt sich bei ungewöhnlichen Hosts immer ein gezielter Test aller fünf Workspaces.

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
├── config/
│   └── og-image.config.json
├── index.html
├── js/
│   ├── atproto/
│   │   ├── atproto-client.js
│   │   ├── atproto-posting.js
│   │   ├── atproto-search.js
│   │   ├── atproto-session.js
│   │   └── atproto-worker.js
│   ├── core/
│   │   ├── app-bootstrap.js
│   │   ├── app-dialogs.js
│   │   ├── app-i18n.js
│   │   ├── app-navigation.js
│   │   ├── app-shell.js
│   │   ├── app-state.js
│   │   ├── app-storage.js
│   │   ├── app-translations.js
│   │   └── app-utils.js
│   ├── composer/
│   │   ├── composer-history.js
│   │   ├── composer-images.js
│   │   ├── composer-link-cards.js
│   │   ├── composer-main.js
│   │   ├── composer-mentions.js
│   │   ├── composer-page.js
│   │   ├── composer-post-settings.js
│   │   └── composer-splitter.js
│   ├── shared/
│       ├── shared-accounts.js
│       ├── shared-images.js
│       ├── shared-templates.js
│       ├── shared-languages.js
│       ├── shared-link-cards.js
│       └── shared-post-rendering.js
│   └── tools/
│       ├── account-picker.js
│       ├── analysis.js
│       ├── archive.js
│       ├── dm-archive.js
│       ├── network.js
│       ├── search.js
│       ├── thread-explorer.js
│       ├── tools-layout.js
│       └── tools-page.js
├── manifest.webmanifest
├── styles.css
├── sw.js
├── version.js
├── version.json
└── icons/
    ├── icon.svg
    └── maskable-icon.svg
```

## Update-Erkennung

Threadline verwendet eine sichtbare Versionsprüfung.

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
- Archiv-Funktion mit Datums- und Hashtag-Filtern
- Netzwerk-Wellen und Fokus-Ansicht
- DM-Archiv
- Update-Erkennung

## Was Eine PWA Ist

`PWA` steht für `Progressive Web App`.

Gemeint ist damit eine Webanwendung, die im Browser läuft, sich aber in vielen Punkten wie eine installierbare App verhalten kann.

Für Threadline heißt das konkret:

- die App besteht aus HTML, CSS und JavaScript
- sie kann über den Browser installiert werden
- sie hat ein Web-App-Manifest für Name, Icon und Startverhalten
- sie nutzt einen Service Worker für Caching, Hintergrundlogik und Update-Steuerung

### Warum Threadline als PWA gebaut ist

Das passt gut zum Projekt, weil Threadline:

- ohne eigenes Backend funktionieren soll
- lokal auf dem Gerät arbeiten soll
- auf Desktop und Mobilgerät möglichst gleich nutzbar sein soll
- installierbar sein soll, ohne über einen App-Store zu gehen

Die PWA-Bauweise hilft also dabei, Threadline als leicht verteilbare, lokale Arbeitsumgebung für Bluesky zu betreiben.

### Wie das technisch funktioniert

Die drei wichtigsten Bausteine sind:

1. `index.html`
   Der Einstiegspunkt der App.

2. `manifest.webmanifest`
   Beschreibt App-Name, Icons, Farben und Startmodus, damit der Browser Threadline als installierbare App behandeln kann.

3. `sw.js`
   Der Service Worker. Er läuft neben der eigentlichen Seite und übernimmt Aufgaben wie:
   - App-Shell cachen
   - Updates erkennen
   - Nachrichten zwischen UI und Hintergrundlogik abwickeln
   - längere Archiv- und Netzwerkvorgänge koordinieren

### Warum das für Threadline nützlich ist

Durch die PWA-Struktur kann Threadline:

- nach dem Laden schneller starten
- statische Dateien lokal cachen
- ein `Neu laden`-Update-Verfahren anbieten
- sich auf Mobilgeräten app-artiger verhalten
- Teile der Logik stabil im Service Worker bündeln

### Grenzen dieser Bauweise

Die PWA-Struktur bringt auch klare Grenzen mit:

- kein eigener Server für CORS-Umgehung
- keine serverseitige Geheimnisverwaltung
- API-Zugriffe laufen aus dem Browser-Kontext
- lokale Speicherung ist praktisch, aber sicherheitlich sensibel

Gerade deshalb sind Themen wie lokale Session-Speicherung, Link-Cards und PDS-Kompatibilität in Threadline immer auch Architekturfragen der PWA-Bauweise.

## Mention-Komponenten Im Composer

`js/composer/composer-mentions.js` verwaltet Mention-Parsing, DID-Aufloesung und Cache, ausstehende Quelltextkorrekturen, Template-Rendering, verzoegerte Aktualisierung und Suchtreffer-Karten. Der Einstieg uebergibt Uebersetzungen, Worker-Aufrufe, Render-Version, Timer und UI-Aktionen explizit.

Die Anzeige-Templates stehen in `index.html` und `tools.html`. Browsertests pruefen Review-, Reparatur- und Quelltextaktionen, die Verzoegerung je Abschnitt, veraltete Aufloesungsergebnisse und Initialisierungsfehler auf beiden Seiten.

Das Modul bereitet auch den Review-/Reparaturdialog vor, sammelt bekannte Account-Handles und steuert die Account-Suche mit Anfrage-Token. Antworten und Fehler einer alten Suche koennen den aktuellen Suchstatus und die aktuellen Ergebnisse nicht ersetzen.

`createComposerMentionSearchActions()` steuert Auswahl, Zuruecksetzen und Schliessen. Die Auswahl merkt die Quelltextkorrektur vor, ersetzt den Abschnitt, verwirft Cache-Eintraege, schliesst den Dialog und aktualisiert und speichert den Composer ueber explizite Callbacks.

Mit `THREADLINE_TEST_PORT` kann ein eigener Testport gesetzt werden. Der Testrunner startet seinen eigenen statischen Server, damit er nicht versehentlich den Server eines anderen Projekts verwendet.

## Composer-Eingabe Und Laengenanzeige

`createComposerInputController()` in `composer-page.js` verwaltet Textaenderungen und das Einfuegen in die Auswahl: Kuerzung an Graphemgrenzen, Zeilenumbruch-Normalisierung, Cursorposition, Zuruecksetzen des Zustands, geplantes Rendering und Entwurfsspeicherung. UI-Effekte werden als Callbacks uebergeben.

`createComposerLengthPresentationController()` in `composer-segment-rendering.js` verwaltet Abschnittszaehler und Laengenwarnungen fuer Abschnitte und Threads. Diagnostik, Limits, Uebersetzungen und DOM-Knoten sind explizite Abhaengigkeiten. Der Einstieg delegiert nur noch; die bisherigen Implementierungen sind entfernt.

Browsertests pruefen echte Textarea-Auswahlen mit mehrteiligen Emoji und Warnungswechsel auf beiden Seiten und sammeln Initialisierungsfehler.

`createComposerInputEventHandlers()` leitet Input-, Paste- und Drop-Events an den Eingabecontroller weiter und beruecksichtigt unterdrueckte Events und ausstehende Warnungen. `createComposerInputWarningController()` verwaltet lokalisierte Eingabewarnungen und den gedrosselten Timer des Kuerzungsdialogs. `createComposerRenderScheduler()` verwaltet Render-Debounce, Animation-Frames und Textarea-Groessenanpassung. Timer-/Frame-Zustaende liegen in den Controllern statt im Einstieg. Vertragstests pruefen ignorierte/ungueltige Clipboard-Events, die Drosselungsgrenze und das Ersetzen ausstehender Arbeit; Browsertests pruefen die echte Event-Verkabelung beider Seiten.

## Composer-Antwortziele

Canvas-Zeichnen, Pointer-Drag-Controller und entprellte Exportmetriken liegen in
`composer-image-renderer.js`. Drag-Koordinaten sowie Timer/Anfrageversionen sind privat;
Schliessen invalidiert geplante und laufende Metrikabfragen. Tests sichern Transformationen,
begrenzte Pointer-Deltas und veraltete Ergebnisse/Fehler; Browsertests pruefen echte
Canvas-Pixel und die Metrikanzeige auf beiden Seiten.

ALT-Text-Dialogzustand, optionale Vorschau, Zaehler, Speichern und Bereinigung liegen
im `createComposerAltTextDialogController` in `composer-dialogs.js`.
`updateComposerImageAltDisplay` aktualisiert gezielt Tooltip, ALT-Zustand und Warnbutton.
Speicherung erfolgt vor UI-/Entwurfsaktualisierung; die UTF-16-Laengenbegrenzung und
das Verhalten bei fehlenden Bildern bleiben erhalten und sind durch Tests abgesichert.

Der Bildbestands-Controller in `composer-images.js` uebernimmt Auswahl, Umsortieren,
positionsbezogenes Verschieben und Loeschen. Zustand, Bilddekodierung, Validierung,
Speicherung und Entwurfsanzeige sind explizite Abhaengigkeiten. Die Auswahl wartet
vor der Anzeige auf Speicherung; synchrone Aenderungen speichern weiterhin ohne
Warten. Datei-Erkennung, Drop-Geometrie und Marker-Bereinigung sind Modulhelfer.

`composer-images.js` rendert Abschnittsbilder aus dem auf beiden Seiten vorhandenen
`composer-segment-image-template`. Vorschau/Canvas, Texte, Bildaktionen und Drag-Zustand
sind explizite Abhaengigkeiten. Container-Drops und Karten-/Tastaturaktionen haben
getrennte Binder. Tests sichern Datei-/Bild-Drops, Einfuegepositionen, Vorschau-Geometrie,
Groessen-/ALT-Warnungen und die Werkzeugaktionen.

`composer-history.js` rendert die Liste letzter Postings, buendelt Explorer-/
Fortsetzen-/Loeschaktionen und erstellt bzw. speichert Historieneintraege.
Beide Seiten verwenden gleiche Vorlagen fuer Eintraege und den Leerzustand;
Texte werden per `textContent` eingesetzt. Tests sichern Ersatzwerte, Bildzahlen,
Aufrufreihenfolgen, sichere Vorschauen und alle drei Aktionsbindungen.

Ergebnismodell und -anzeige, Explorer-Navigation aus dem Ergebnisdialog sowie die
geordnete Erfolgs-/Fehlerverarbeitung liegen in `composer-publishing.js`.
Beide Seiten verwenden den vorhandenen HTML-Button ohne dynamisches Duplikat.
Vor dem Zuruecksetzen des Antwortziels wird die Historie gespeichert.
Browsertests sichern Textausgabe, leere Links und Fehler beim Explorer-Oeffnen.

Die Publish-Vorpruefung liegt in `composer-validation.js`; die Reihenfolge fuer
Text- und Abschnittslaenge, Alternativtexte, Bildgroesse und Verbindung bleibt erhalten.
`composer-publishing.js` uebernimmt Hashtag-/Antwort-/Kontobestaetigungen und den
Worker-Payload ohne Vorschau-Metadaten. Tests sichern alle Abbruchstellen,
exakte Grenzen und Fehlerprioritaeten. Ein Browsertest prueft den echten
Publish-Button und den Abbruch, ohne ein Posting zu senden.

Die seitenuebergreifende Antwortziel-Uebergabe liegt in `composer-page.js`:
URL-Kodierung und -Verbrauch, Sitzungsspeicherung und das lokale oder seitenwechselnde
Oeffnen verwenden explizite Storage-, Location-, History- und UI-Abhaengigkeiten.
`composer-dialogs.js` baut normalisierte Antwortziele aus Live-Posts mit getrennten
Root- und Parent-Referenzen. Tests pruefen defekte Nutzdaten, gesperrten Speicher und
Aufrufreihenfolgen; ein Browsertest uebergibt ein Ziel von Werkzeuge an Composer
ueber echten Sitzungsspeicher und URL-Zustand.

`composer-dialogs.js` verwaltet die normalisierte Antwortziel-Vorschau, den URL-Dialog samt Submit und den Ablauf fuer Aufloesen/Zuruecksetzen. Der Anfragezaehler liegt privat im Controller; neuere Anfragen und Zuruecksetzen entwerten verspaetete Antworten und Bestaetigungen. Worker-Requests, Account-Zustand, Bestaetigung, Speicherung und Vorschau-/Publish-Aktualisierung werden explizit uebergeben. Unit-Tests pruefen Fortsetzungswahl, Abbruch, veraltete Ergebnisse und Busy-/Fehlerabschluss. Browsertests pruefen vorhandene Vorschau/Dialogstruktur auf beiden Seiten mit `pageerror`-Sammlung.

## Composer-Link-Card-Verwaltung

Remote-Vorschaubilder und die Request-Weiterleitung liegen im Provider-Modul; einfache Karten ohne Metadaten entstehen in `shared-link-cards.js`. Fetch, Blob-Konvertierung und Uebersetzungen sind explizite Abhaengigkeiten. Bilddiagnosen liegen zentral auf Deutsch, Englisch und Franzoesisch. Unit-Tests pruefen abgewiesene URLs/MIME-Typen und genau einen Provider-Pfad; Browsertests pruefen echte Blob-/FileReader-Konvertierung und den netzwerkfreien Basiskarten-Pfad auf beiden Seiten.

Die echten Proxy-/Microlink-Aufrufer delegieren jetzt an die vorhandenen Request-Adapter; doppelte Transportlogik in `app.js` ist entfernt. HMAC-Signatur, Proxy-Bilddaten und Provider-Fehlermeldungen liegen neben den Adaptern. Zeit/Nonce/Signatur und Requests sind explizite Abhaengigkeiten. Tests vergleichen Signaturen mit Node-HMAC und pruefen Header, Antwort-Fallbacks, Verbrauchszaehlung und optionale Bildfehler. Browsertests nutzen natives Web Crypto mit simulierten Requests, keine Live-Provider.

Auch Proxy-Zugangsdaten-/Pfadvalidierung, Einstellungsfelder mit Statusanzeige und effektive Provider-Verfuegbarkeit liegen in `composer-link-card-providers.js`. Leere/unvollstaendige Einstellungen behalten ihre bisherigen Validierungsregeln; Browser-Feldvaliditaet und Statussichtbarkeit bleiben getrennt. Die Verfuegbarkeit behaelt Proxy-Fallback und Karten ohne externe Metadaten bei. Unit- und Browsertests sichern diese Vertraege auf beiden Seiten.

`composer-link-card-providers.js` verwaltet Tagesbudget, Provider-Hinweismodelle und Auswahl-/Hinweisanzeige. Speicherung und UTC-Tageszugriff werden explizit uebergeben; Tagesgrenze und Aktualisierung vor der Speicherung bleiben unveraendert. Die UI behaelt Proxy-Fallback, Radio-Auswahl und ausgeblendete Hinweise bei Verschieben/Verwalten. Tests pruefen erschoepftes Budget, Tageswechsel, Speicherfehler, optionale Elemente und echte Controls auf beiden Seiten.

Das Modul verwaltet auch das aktionsabhaengige Dialogmodell, Oeffnen/Zuruecksetzen der Dialoganzeige und den Submit-Controller fuer Erzeugen/Aktualisieren/Verschieben. Ausstehender Zustand und Datenzugriff werden ueber Getter uebergeben, auch nach asynchronen Requests. Validierung, Provider-Abgleich, Busy-/Fehleranzeige, Speicherung und Abschluss behalten ihre explizite Reihenfolge. Tests pruefen Aktionen/Bildkonflikte, ungueltige URLs, Request-/Speicherfehler und echte Dialog-Fokus-/Sichtbarkeitswechsel auf beiden Seiten.

`composer-link-cards.js` ermittelt Verschieben-/Tauschen-Ziele, rendert die Verwaltungsliste mit Ziel- und Leerzustands-Templates und steuert den Speicherablauf der Aktionen. Der Einstieg uebergibt Karten, Normalisierung, Uebersetzungen und UI-Callbacks. Beide Seiten enthalten dieselben Templates. Unit-Tests pruefen Zielauswahl, beide Verschieberichtungen, Tauschen und Speicherfehler; Browsertests pruefen Klartext-Rendering und Button-Callbacks auf beiden Seiten.

## Composer Image Editor Controller

Die verbleibende Bild-Pipeline besteht aus drei getrennten Einheiten: `createComposerImageGeometry` berechnet Editor-/Exportrahmen, Vorschaugroessen und Cover-/Contain-Versatz. `composer-image-processing.js` uebernimmt Datei-/Data-URL-Laden, Bitmaps, DPR-Vorschauen, unveraenderte Originalbytes, JPEG-Export, Validierung und begrenzte automatische Upload-Verkleinerung. `createComposerImageValidationController` steuert die Validierung aller Abschnitte und verhindert veraltetes Neurendern. Browser-APIs und Anwendungszustand werden explizit uebergeben; die alten Implementierungen und der Validierungszaehler wurden aus `app.js` entfernt.

`tests/composer-image-processing.test.cjs` prueft Ladefehler, Originalbytes, Versatzskalierung, exakte Exportgrenzen, fehlende Blobs, unveraenderte Quelldaten, begrenzte Wiederholungen und parallele Validierung. Browser-Tests pruefen echte Canvas-/Blob-Exporte auf beiden Seiten, jedoch keine Veroeffentlichung oder Live-Uploads.

`composer-image-editor.js` steuert den gesamten Bildeditor: privaten Ziel-/Bitmap-/Entwurfszustand, Zoom, Spiegelung, Rotation, Reset, Speichern/Abbrechen und beide Export-Verkleinerungen. Datenzugriff, Geometrie, Validierung, Speicherung und Rendering werden explizit uebergeben. Canvas, Ziehen und Export-Messung bleiben getrennte Adapter in `composer-image-renderer.js`.

Schliessen oder Wechseln verwirft ausstehende Bildladevorgaenge, beendet Ziehen und gibt Bitmaps frei. Rotation und Reset synchronisieren die Canvas-Ausrichtung vor dem Zeichnen. Tests decken Bearbeitung, Exportgrenzen, Speicherreihenfolge und asynchrones Aufraeumen ab. Browser-Integration prueft den echten Upload-/Bearbeiten-/Speichern-/Abbrechen-Ablauf mit kontrolliertem Worker-Speicheradapter und laedt beide Seiten inklusive Fehlererfassung. Dieser Integrationstest prueft weder echte Worker-Aktivierung noch IndexedDB-Schreibvorgaenge.

## Composer-Dokumentkette

`createComposerTextService` in `composer-splitter.js` uebernimmt die gesamte Aufteilung und Dekoration: Graphem-/UTF-8-Grenzen, manuelle Abschnittswechsel, durchgehende Zaehler, Thread-Marker und Hashtag-Platzierung. `createComposerSegmentRenderer` verwaltet den kompletten Abschnittskarten-Renderlauf, private Mention-Generation, manuelle Aenderungen, Medienabgleich, Interaktionen und Scroll-Erhalt. Das Hilfe-Markup stammt auf beiden Seiten aus einem gemeinsamen Template.

`composer-document.js` verwaltet JSON-/gzip-Thread-Dateien, Importbestaetigung und Normalisierung, Export, vollstaendiges Zuruecksetzen und den privaten Entwurfs-Timer. Dateischema und Speichernachrichten bleiben erhalten. `app.js` uebergibt initialisierte DOM-/Zustands-/Transportadapter statt paralleler Implementierungen; der Archivimport nutzt denselben gzip-Decoder.

Vertragstests pruefen normale, abgebrochene, alte und ungueltige Importe, Export-Roundtrips, Speicherfehler, Textgrenzen und leeres Rendering. Die Browser-Integration importiert eine Datei, bearbeitet einen echten Abschnitt, prueft den heruntergeladenen Export und mobile Kartenbreiten, leert das Dokument und laedt die Werkzeuge-Seite mit Laufzeitfehler-Erfassung. Der Worker-Speicher ist kontrolliert; echte IndexedDB-Schreibvorgaenge, Worker-Aktivierung und Live-Veroeffentlichung werden damit nicht geprueft.

## Composer-Einstellungen und UI-Zustand

`createComposerPostSettingsController` verwaltet die vollstaendige Post-Einstellungskette: Sprach-Fallback und Zusammenfassungen, Antwort-/Zitatregeln, Dekorationsaenderungen, Dialogkontext/Oeffnen/Schliessen/Fokus, Filter und Auswahlgrenzen. Der Sprachdialog haelt seinen Composer-/Suchkontext privat, nutzt auf beiden Seiten Options-/Leerzustands-Templates und bewahrt getrennte Sprachauswahlen. Speicherung, Suchzusammenfassungen und Dokument-Rendering sind explizite Adapter.

`createComposerUiStateController` verwaltet die Sperre bei manuellen Aenderungen, Loesch-Freigabe, Bereits-gepostet-Anzeige und Entsperren/Ausblenden. Such-/Archiv-Hashtags bleiben trotz Composer-Sperre bedienbar. `composer-validation.js` berechnet und rendert die Publish-Freigabe waehrend der Bearbeitung samt ALT-/Bildwarnungen; Login-/Online-Pruefungen bleiben in der Publish-Vorpruefung.

Vertragstests sichern Standardwerte, ungueltige Regeln, exakte Grenzen, Kontexttrennung, Sperren, Reset-Reihenfolge und Speicherfehler. Die Browser-Integration bedient echte Post-Controls, die Drei-Sprachen-Grenze, Antwort-/Zitatregeln, manuelle Sperre und den Such-Sprachfilter auf beiden Seiten mit Laufzeitfehler-Erfassung. Worker-Antworten sind kontrolliert; echte Speicherung oder Veroeffentlichung wird nicht getestet.

## Gemeinsame Hashtag-Verwaltung

`shared-hashtags.js` verwaltet die vollstaendige Hashtag-Kette: Normalisierung alter Eingabeformen, Deduplizierung ohne Beachtung der Grossschreibung, sichtbare Schreibweise, Auswahlfilter, Platzierung und Umbenennen/Zusammenfuehren in Composer, Suche und Archiv. Der Controller uebernimmt das Chip-Rendering aus dem vorhandenen Template, Hinzufuegen/Loeschen/Auswaehlen, privaten Bearbeitungsdialog-Zustand, Suchzusammenfassungen, Pane-Verschiebung und Formular-/Dialogaktionen. Die bisherigen Algorithmen und Inline-Handler sind aus `app.js` entfernt.

Aktueller Zustand/Kontext, Uebersetzungen, bestehende Einstellungs-/Archivspeicherung und Workspace-Rendering sind explizite Abhaengigkeiten. Trotz Composer-Sperre bleiben Such-/Archiv-Tags bedienbar; Archiv-Auswahl schaltet weiterhin von normalen Posts auf Thread-Roots. Aktionsreihenfolge und Datenformate bleiben erhalten. Es entstehen keine neuen Provider- oder Posting-Anfragen. Der neue Baustein steht in der statischen Asset-Liste des Service Workers.

Vertragstests pruefen ungueltige/alte Daten, Grossschreibung und Zusammenfuehren, alle drei Auswahllisten, Sperrgrenzen, Speicherfehler und kontextspezifische Nebenwirkungen. Browsertests bedienen echtes Hinzufuegen/Bearbeiten/Zusammenfuehren/Loeschen und die manuelle Sperre, Such-Pane-Verschiebung und Zusammenfassung sowie Archiv-Pane/Controls mit explizitem Testzustand. Speicherantworten sind kontrolliert, keine echten IndexedDB-/Kontoschreibvorgaenge.

## Einstellungs-Backup-Kette

`app-backup.js` verwaltet drei vollstaendige Einheiten: JSON-/gzip- und Binaer-Cache-Verarbeitung, Einstellungs-Backup-Export/Import sowie Erinnerungs-/Statusablauf. Der Import fuehrt Hashtag-/History-Daten zusammen, stellt Post-Einstellungen und bestehende Konto-/Avatar-/DM-Metadatenvertraege wieder her, wendet Darstellung/Layout/Provider-Einstellungen an und aktualisiert die Ansichten. Backup-Schema und Export-Whitelist bleiben unveraendert; Konto-Sitzungstokens und Composer-Bildsammlungen werden nicht in den Export aufgenommen. Proxy-Einstellungen behalten ihr bisheriges Backup-Verhalten.

Die Anwendung uebergibt einen gemeinsamen Einstellungssnapshot sowie explizite Zustandsschreiber, Normalisierer, Worker-/Speicher- und UI-Adapter. Die Erinnerung besitzt ihren Status-Timer, defensive Zeitstempelspeicherung, exakte Faelligkeits-/Snooze-Grenzen und Fehlerbehandlung beim Speichern/Schliessen. Fehlende gzip-Unterstuetzung ist in allen drei Sprachen uebersetzt. Alte Codec-/Import-/Export-/Erinnerungsimplementierungen und der globale Timer wurden entfernt; der neue Baustein wird vorgecacht.

Vertragstests pruefen native gzip-/JSON-Roundtrips, Binaer-Assets, Export-Ausschluesse, alte/ungueltige Importe, Zusammenfuehren, Cache-Request-Reihenfolge, optionale Cache-Fehler, fehlgeschlagene Dateiuebergabe und Erinnerungs-/Speicherfehler. Browser-Integration importiert und exportiert echte gzip-Backups auf Composer und Werkzeuge, prueft Einstellungen und den nativen Erinnerungsdialog mit Laufzeitfehler-Erfassung. Worker-Antworten sind kontrolliert; echte IndexedDB- und Konto-Wiederherstellung wird nicht geprueft.

## Offizielle Original-Dokumentation

Für tieferes Nachlesen sind diese Originalquellen besonders hilfreich:

- [AT Protocol Docs](https://atproto.com/docs)
- [Protocol Overview](https://atproto.com/guides/overview)
- [Understanding Atproto](https://atproto.com/guides/understanding-atproto)
- [Reads and Writes](https://atproto.com/guides/reads-and-writes)
- [Reading Data](https://atproto.com/guides/reading-data)
- [AT Protocol Specification](https://atproto.com/specs/atp)
- [Lexicon Specification](https://atproto.com/specs/lexicon)
- [AT Protocol XRPC API Reference](https://docs.bsky.app/docs/api/at-protocol-xrpc-api)
