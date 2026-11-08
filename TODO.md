# Threadline TODO

Diese Liste ist nach Arbeitsstand sortiert. Erledigte Punkte bleiben sichtbar, offene Punkte stehen nach Themen gebuendelt darunter.

Stand: Modularisierung abgeschlossen am 2026-11-08. App `0.4.357`, Cache `v376`. `app.js` und `sw.js` behalten Einstieg, Zustand und Verdrahtung; Fachlogik liegt in Domaenenmodulen. Abschluss: 857 Unit-/Vertragstests und 150 Browsertests erfolgreich. Fruehere Testzahlen in den erledigten Eintraegen dokumentieren die jeweiligen Auslagerungen.

## Erledigt

### Modularisierung Und Automatische Pruefungen

- [x] Posting in `js/worker/publish-service.js` und Gates/Recordloeschen/Like/Unlike in `js/worker/interaction-service.js` kapseln. Auth-/Transport-/PDS-/Normalisierer-/Facet-/Upload-/Regel-/URI-/Blob-/Uhradapter explizit; alte Koerper entfernt, Workereinstiege delegieren, Texte zentralisiert und Skripte importiert/precached. Upload-/Gate-/Replyreihenfolge, Galeriegrenze, Rate-Limits und bisherige Teilfehlerzaehlung erhalten. Elf neue Vertraege, 16 temporaere Alt-/Neu-Vergleiche, Unit-Suite mit 58 Dateien und 20 gezielte Chromium-Browserfaelle bestanden. Neue Faelle pruefen echte Workereinstiege mit kontrollierten Schreibantworten; keine Live-Records geschrieben. Optionale Ruecknahme separat vorgemerkt.

- [x] Replymodus/-Mentions/-Threadgateberechtigung in `js/worker/reply-models.js` und Replyziel-/Editmetadatenpruefung in `js/worker/post-check-service.js` kapseln. Session-/URL-/Identitaets-/Transport-/Thread-/PDS-/Fehleradapter explizit; Altkoerper entfernt, zwei Workereinstiege delegieren, Texte zentralisiert und beide Skripte importiert/precached. Bestehende Berechtigungssemantik, Listenwarnungen, neuestes eigenes Antwortziel, Retry-/Timeoutoptionen und Editfehlercodes erhalten. Neun neue Vertraege, 27 Modell- und 18 Ablauf-Alt-/Neu-Vergleiche, Unit-Suite mit 57 Dateien und 18 gezielte Chromium-Browserfaelle bestanden. Neue Faelle pruefen echte Reply-/Editaufrufer ueber beide Einstiege mit kontrollierten HTTP-Antworten.

- [x] Gespeicherte Feldmodelle in `js/worker/settings-models.js` und Appzustands-/Entwurfs-/Einstellungsablaeufe in `js/worker/settings-service.js` kapseln. Metadaten-/Uhr-, Speicher-/Bild-/Normalisierer-/Konto-/Frontendadapter explizit; Altkoerper entfernt und bestehende Workernamen gebunden. Legacyentwurf/-locale, Sprachskalare, feldbezogene Patchregeln, Referenzen, Bildmetadaten und Schreib-/Bereinigungsreihenfolge erhalten. Beide Skripte importiert/precached. Neun neue Vertraege, 144 Modell- und 24 Ablauf-Alt-/Neu-Vergleiche, Unit-Suite mit 56 Dateien und 16 gezielte Chromium-Browserfaelle bestanden. Neue Faelle pruefen echte IndexedDB und Seiten-/Worker-Neustart ueber beide Einstiege.

- [x] Richtext-/Mentionparser, UTF-8-/Ueberlappungsregeln und Suchvarianten/-Ranking in `js/worker/richtext-models.js` sowie Facetaufbau, Vorschauaufloesung und Accountsuche in `js/worker/richtext-service.js` kapseln. Encoder/Suffixe und Auth-/Resolver-/Transport-/Profil-/Modelladapter explizit; alte Koerper entfernt und Publish-/Vorschau-/Suchaufrufer umgebunden. Gemeinsamen Hashtagparser erhalten; beide Skripte importiert/precached. Elf neue Vertraege, 77 Modell- und 20 Dienst-Alt-/Neu-Vergleiche, Unit-Suite mit 55 Dateien und 14 gezielte Chromium-Browserfaelle bestanden. Neue Faelle pruefen Unicodefacets, abgemeldete Vorschau, unaufgeloeste Handles und Teilfehler bei realen Workeraufrufen ueber beide Einstiege mit kontrollierten HTTP-Antworten.

- [x] Medienexport-Scan/Download in `js/worker/media-export-service.js` kapseln; reine Jahres-/Range-Abbruchregel im Medienmodell buendeln. Auth-/Transport-/Archiv-/Hashtag-/Modell-/Download-/Timeout-/Uhr-/Heartbeatadapter explizit, Altkoerper und unbenoetigte Fassadenhelfer entfernt. Scan-/Downloadworkereinstiege delegieren, neues Skript importiert/precached und Texte zentralisiert. Seiten-/Filter-/Cursor-/Deduplizierungsregeln, Manifest, CID-Vorrang, Deadlines und Heartbeatbereinigung erhalten. Zehn neue Vertraege, zwoelf temporaere Alt-/Neu-Vergleiche, Unit-Suite mit 54 Dateien und zwoelf gezielte Chromium-Browserfaelle bestanden. Erweiterte Medienfaelle pruefen echten Scan sowie CID-/PDS- und Remote-URL-Downloads mit Bytes/Endungen ueber beide Einstiege bei kontrollierten HTTP-Antworten.

- [x] Einheit 1: Likes-/Reposts-/Quotesladen in `js/worker/explorer-reaction-service.js` kapseln. Session-/Refresh-/Transport-/Basis-/Akteuradapter explizit; Validierungsreihenfolge, Limits, CID, Cursor, Deduplizierung und Fehlerweitergabe erhalten. Alter Koerper entfernt, Workereinstieg delegiert, Skript importiert/precached und Texte zentralisiert. 20 temporaere Alt-/Neu-Vergleiche bestanden.
- [x] Einheit 2: UTC-Zeitstempel, Postordner, Medienpfade und Bild-/Video-/Card-Manifeste in `js/worker/media-export-models.js` kapseln. Gemeinsame Archiv-Embed-/CID-Adapter, bestehende Pfad-/Index-/Typ-/Metadatenregeln erhalten. Alter Koerper entfernt, Scan delegiert Ordner/Eintraege, Skript importiert/precached. 41 temporaere Alt-/Neu-Vergleiche bestanden. Gemeinsamer Abschluss: zehn neue Vertraege, Unit-Suite mit 53 Dateien und zwoelf gezielte Chromium-Browserfaelle bestanden. Neue Faelle pruefen alle Reaktionswege und echten Medienscan mit Typfiltern ueber beide Einstiege; HTTP-Antworten kontrolliert.

- [x] Explorer-Avatar-/Medienhydrierung in `js/worker/explorer-hydration-service.js` kapseln; Autoren-/Mediensammlung im vorhandenen Explorermodell buendeln. Auth-/Cache-/Download-/Speicher-/Bild-/Concurrency-/Timeradapter explizit; TTL, Deadlines, Direkt-/Blobrouting, SVG-Ersatz, Fortschritt, Einzelfehler und asynchrone Cacheschreibgrenze erhalten. Alte Koerper entfernt; Avatar-/Medien-/Timeoutaufrufer delegieren, Skript importiert/precached, Timeouttext zentralisiert. Elf neue Vertraege, zwoelf temporaere Alt-/Neu-Vergleiche, Unit-Suite mit 52 Dateien und zehn gezielte Chromium-Browserfaelle bestanden. Neue Faelle pruefen echte Medien-/Avatarcaches, Wiederverwendung und PNG-/SVG-Ersatzdekodierung bei kontrollierten HTTP-Antworten ueber beide Einstiege.

- [x] Explorer-Feedregeln in `js/worker/explorer-feed-models.js` und Quellen-/Feed-/Actor-/URL-/Threadladen in `js/worker/explorer-load-service.js` kapseln. Session-/Refresh-/Transport-/Handle-/URL-/Graph-/Fehleradapter und Feed-/Postmodelle explizit; alte Koerper entfernt, fuenf Workereinstiege delegieren. Pin-Formate, Cursor-/Seitenlimits, Sortierung, Deduplizierung, Existenzbatches und Einzelfehlertoleranz erhalten. Beide Skripte importiert/precached, Texte zentralisiert. 13 neue Vertraege, 25 temporaere Alt-/Neu-Ladevergleiche, Unit-Suite mit 51 Dateien und acht gezielte Chromium-Browserfaelle bestanden. Erweiterte Explorerfaelle pruefen saemtliche Ladewege ueber beide Einstiege mit kontrollierten HTTP-Antworten.

- [x] Thread-Explorer-Akteur-/Post-/Quote-/Medien-/Editmodelle, geloeschte Anker und Baum-/Eltern-/Auswahlpfad-/Such-/Zaehllogik in `js/worker/explorer-models.js` kapseln. Standard.site-Adapter explizit; sieben Operationen an bestehende Namen gebunden, alte Koerper entfernt und Archiv-Editaufrufer erhalten. Referenzen, Prioritaeten, Geschwisterreihenfolge und Ankerzaehlung erhalten. Import/Precache ergaenzt. Zehn neue Vertraege, 78 temporaere Alt-/Neu-Vergleiche, Unit-Suite mit 50 Dateien und acht gezielte Chromium-Browserfaelle ueber beide Einstiege bestanden. Neue Faelle pruefen echten Threadladeeinstieg mit kontrollierten HTTP-Antworten; Live-/Gesamtbrowser-/Offline-Abnahme offen.

- [x] Worker-Edit-/Bild-/Segment-/Metadatenmodelle in `js/worker/composer-image-models.js` kapseln. ID-Erzeugung und Segmentlimit explizit, alte Koerper entfernt und bisherige Namen an eine gemeinsame Modellinstanz gebunden. Import/Precache ergaenzt. Sieben neue Vertraege, 70 temporaere Alt-/Neu-Vergleiche mit ID-Traces, Unit-Suite mit 49 Dateien und sechs gezielte Chromium-Browserfaelle ueber beide Einstiege bestanden. Frontend-/Workerformatunterschiede als Vertrag dokumentiert; keine Speicherformataenderung. Verbleibende Worker-Fachgrenzen inventarisiert.

- [x] Composer-Bildspeicher in `js/worker/composer-image-store.js` kapseln: Blob-CRUD, Referenzen, Wiederverwendung, Hydrierung und Bereinigung. Datenbank-/Normalisierer-/Konvertierungs-/Leseadapter, Blob-Konstruktor, Uhr und Schluessel explizit. Schema, Request-/Transaktionsabschluss, Inlineprioritaet und Entwurfs-/Einstellungsreferenzen erhalten. Altkoerper entfernt, drei benoetigte Workerdelegationen, Skript importiert/precached und Meldungen zentralisiert. Acht neue Vertraege, Unit-Suite mit 48 Dateien und sechs gezielte Chromium-Browserfaelle bestanden. Neue Faelle pruefen echte IndexedDB/Blobs, Metadaten, Seiten-/Worker-Neustart, PNG-Dekodierung und Bereinigung ueber beide Einstiege. Gesamte Browserregression, Bestandsdaten-/Quota-/Offline-Abnahme offen;

- [x] Netzwerk-Slice, Accountfokus, gemeinsame Mutuals und Profilzusammenfuehrung in `js/worker/network-workspace-service.js` kapseln. Session-/Transport-/Graph-/Datums-/Statistikadapter, Limits und Fortschrittstexte explizit; alte Koerper entfernt, Workereinstiege delegieren. Bisherige Fallbacks, Vorschaugroessen, Schnittmengenreihenfolge und Fehlerweitergabe erhalten. Skript importiert/precached, sichtbare Texte zentralisiert. Neun neue Vertraege, 18 temporaere Alt-/Neu-Vergleiche, Unit-Suite mit 47 Dateien und vier gezielte Chromium-Browserfaelle ueber beide Einstiege bestanden. Transport kontrolliert; gesamte Browser-/Live-/Offline-Abnahme offen.

- [x] Gemeinsame Netzwerk-Poststichproben, Like-/Aktivitaetsstatistik, Graphseiten/-wellen und Follow-Zeitpunkte in `js/worker/network-data-service.js` kapseln. Transport-/Basis-/Profil-/URI-/Uhradapter, Limits und Fenster explizit; alte Koerper entfernt, klassische Analyse-/Explorer-Aufrufer delegieren weiter. Skript importiert/precached, Fortschrittstexte zentralisiert. Neun neue Vertraege, Unit-Suite mit 46 Dateien und vier gezielte Chromium-Browserfaelle ueber beide Einstiege bestanden. Netzwerkantworten kontrolliert; Gesamtabnahme offen,

- [x] Kontowechsel, Metadatenimport, Entfernen, Logout und Sessionpruefung in `js/worker/account-service.js` kapseln. Speicher-/Session-/Modell-/Frontend-/Archivadapter und Uhr explizit; Auswahlregeln, Fehlerprioritaet und aktive Archivbereinigung erhalten. Alte Implementierungen entfernt, Dienst importiert/precached und Meldung zentralisiert. Sieben neue Vertraege, 76 temporaere Alt-/Neu-Vergleiche, Unit-Suite (45 Testdateien) und zwei gezielte Chromium-Browserfaelle mit echter IndexedDB ueber beide Einstiege bestanden. Netzwerkantworten kontrolliert; gesamte Browserregression und Live-/Offline-Abnahme offen.

- [x] Login im neuen `js/worker/session-service.js` kapseln. Transport-/URL-/Frontend-/Identitaets-/Avatar-/Speicher-/Modelladapter und Uhr explizit; Mu.social-E-Mailfehler, Handle-/DID-PDS-Auswahl, urspruenglicher Credentialpayload, Avatarcache und oeffentliches Ergebnis erhalten. Mu-Frontendzweig bleibt ohne unnoetigen Frontendfallback-Aufruf.
- [x] Session-Erneuerung, mutable Authreferenz und JWT-Helfer im selben Service buendeln. Explizite Ziel-DID, gueltiger Token ohne Request, 30s Puffer, bisherige No-exp-/No-payload-Regeln, Refresh-vor-Login, Warnung/Fallback, Avatarpfad und aktive DID erhalten. JWT- und klassische Sessionnamen delegieren weiter; keine zweite Implementierung.
- [x] Handle-/DID-/PDS-, Avatar-/Frontend- und Konnektivitaetsoperationen in `js/worker/identity-service.js` kapseln. Fetch/Request, URL-/Fehler-/Speicheradapter, AbortController und Timer explizit; positive/negative Handlecaches, PLC-/Web-URLs, 8s-/1s-Minimum-Timer, Freigabe, erster PDS-Treffer, gecachte Fallbacks und Konnektivitaetscodes erhalten. Alte Funktionskoerper aus klassischen Dateien entfernt, zwei Skripte importiert/precached, Meldungen zentralisiert. 17 neue Vertraege und 53 Alt-/Neu-Vergleiche bestanden.

- [x] XRPC-Request-/GET-Serialisierung und Rate-Limit-Auswertung in `js/worker/transport-service.js` kapseln. Fetch-/GET-/SearchParams-/Fehler-/Uhradapter explizit; JSON-/Text-/Leerantworten, Headerprioritaet, Queryregeln, Retry-After und Metadaten erhalten. Klassische `bskyFetch`-/`bskyGet`-Namen delegieren an eine lazy verdrahtete Instanz und behalten bestehende Transportinterzeptoren.
- [x] Service-URL-/Sicherheits-/Kontodatenmodelle in `js/worker/auth-models.js` buendeln. Standardservice/-frontend, Inferenz, Fehler und Exportuhr explizit; Legacy-/Kontolistenformat, aktive DID, Sessionreferenzen, Upsertregeln und oeffentliche Ausgabe ohne Zugangsdaten erhalten. Alte acht Modellkoerper entfernt.
- [x] Gemeinsamen IndexedDB-Zugriff in `js/worker/storage-service.js` kapseln. Datenbank-/Storekonfiguration und Authnormalisierer explizit; vorhandenes Upgrade, allgemeine/Auth-Werte, Request-Erfolg als Abschlussgrenze, Auth-Loeschen und Fehlerweitergabe erhalten. Worker-Delegationen fuer bestehende Aufrufer bleiben; Texte in `adapter-messages.js` zentralisiert. Vier klassische Skripte importiert/precached, zwoelf Vertraege und 91 Alt-/Neu-Vergleiche bestanden.

- [x] Verbleibende Worker-Analyse als zusammenhaengenden Block modularisieren. Reine Record-/Facet-/Reply-/Quote-/Medien-/Rankingmodelle, gespeicherte Kontoauswahl und Analyse-Snapshotnormalisierung in `js/worker/analysis-models.js` kapseln. Seitenakkumulator trennt Postauswahl/Zaehler/Frequenzen/Datumsgrenzen vom Netztransport; vorhandenen AT-URI-Parser explizit injizieren.
- [x] Profilanreicherung und Toplisten im neuen `js/worker/analysis-service.js` buendeln. Profilcache privat, 25er-Batches, DID-Filter, fehlertolerante Batches, Referenzen und bisheriges deleted-Fallback fuer unaufgeloeste Marker erhalten. Ganze Graphsammlung sowie Mute-/Blocklisten mit bestehenden 100er-Seiten/5000er-Grenzen samt Seitenueberschreitung in denselben Service verschieben; Netzwerkvergleich nutzt weiterhin den gemeinsamen Graphhelfer.
- [x] Konto-Pruefung und kompletter Analyse-Ladeablauf im Analyseservice kapseln. Session-/Speicher-/Transport-/Basis-/Handle-/Profil-/Graph-/Fehleradapter, Uhr und Grenzwerte explizit; 100..2000 Posts, 200 Feedseiten, Datum-/Reply-/Quote-/Textregeln, partielle Graphwarnungen, gespeichertes Quellkonto fuer private Listen sowie Ergebnisformat erhalten. Bestehende Meldungen in `analysis-messages.js` zentralisieren. Alte 15 Funktionskoerper und globalen Profilcache entfernen, Such-Facet-/Settings-/Dispatcher-Aufrufer umverdrahten, alle drei klassischen Skripte importieren/precachen. 15 neue Vertraege und 133 Alt-/Neu-Vergleiche bestanden.

- [x] Thread-URL-Quelle, Einstiegserkennung und Baum-/Pfad-/Autorsammlung in `js/worker/archive-import-service.js` unter `collect` kapseln. Vorhandenen URLparser und Threadmodelle injizieren; DID-vor-Handle-Aufloesung, Transportauth ohne neue Refresh-/Retryregeln, fehlende Posts sowie fruehen Abbruch erhalten. Einstieg delegiert `importArchiveThreadFromUrl` an `load`; klassischer Import und Shellcacheeintrag ergaenzt.
- [x] Import-Postanreicherung unter `enrich` im selben Service buendeln. Gemeinsames Archiv-Postmodell statt Parallelmodell, Metadaten-/Countfallbacks, Rohdatenreferenzen, letzter Eintrag bei URI-Duplikaten und absteigende Datumssortierung erhalten.
- [x] Sequenzielle Importassets unter `archive-asset-service.attachThreadAssets` und die stufenabhaengigen Ergebnisse unter `archive-import-service.result` kapseln. Gemeinsame Avataroperation, ein Kartenversuch/5s Deadline, zwei Bildversuche/350ms Pause, normalisierte Assetbytes, Fuenfer-Vorschauen und Abbruch je Post erhalten. Fehlender/frueh abgebrochener/fertiger Import behaelt unterschiedliche Manifestfelder, Arrayreferenzen und Sitzungsformat. Elf neue Vertraege und 80 vollstaendige Alt-/Neu-Vergleiche bestanden; alte Importimplementierung entfernt und Texte zentralisiert.

- [x] Linkkarten-Vorschaubilder im vorhandenen `archive-asset-service.js` unter `attachLinkCards` kapseln. Zwei Versuche, 350ms Pause, 5s Downloaddeadline, Caches, Pfadduplikate, Fortschritt und Fehlerflags erhalten. Bisherige ungueltige `normalizedBlob`-Referenz korrigiert: Assets verwenden jetzt die normalisierten Blobdaten; Erfolgspfad mit abweichenden Normalisierungsbytes getestet.
- [x] Bildaufgaben und Verarbeitung unter `attachImages` im selben Service buendeln. Aufgabenreihenfolge, begrenzte Parallelitaet, kooperativer Abbruch, Wiederholung/Ueberspringen, Bildmetadaten, Vorschauen und Pfadduplikate erhalten. Live-Zaehleradapter behaelt Teilfortschritt nach Fehlern. Bisherigen Unterschied zwischen normalisierten Deskriptoren und urspruenglichen Assetbytes ausdruecklich beibehalten und getestet.
- [x] Wellenabschluss und Fehlerklassifikation unter `archive-wave-service.finalize` buendeln. Alle Abschlusswege delegieren; Lauf-Freigabe vor Ergebnisaufbau, partielle Postsortierung nach Fehlern und cancelled/paused-Fallbacks erhalten. Alte Inlineimplementierungen entfernt, neue Assetadapter explizit; Meldungen zentralisiert. Zehn neue Vertraege und 48 Ablaufvergleiche bestanden; die Linkkarten-Vergleichsbasis enthaelt gezielt die Referenzkorrektur.

- [x] Feed-/Repo-Seitenlesen und Auswahl der Archivwelle in `js/worker/archive-wave-service.js` kapseln. Auth-/Transport-/Retry-/Filter-/Hashtagadapter explizit; eigene Repo- und fremde Feed-Metadaten, aeltester Zeitstempel vor Auswahl, Reihenfolge und Caches erhalten. Live-Cursor-/Zaehleradapter behaelt Teilfortschritt bei Fehlern, akzeptierte Records werden erst nach erfolgreicher Seite uebernommen.
- [x] Metrikbatches im selben Service buendeln. 25er-Abfragen, Auth-Erneuerung, bekannte URI-Ziele, Autor-Fallbacks, Vorschau in jedem zweiten Batch sowie bestehende Fortschrittstexte erhalten. Kooperativer Abbruch liefert Status an den Einstieg; Teilupdates und Observer-/Transportfehler bleiben sichtbar.
- [x] Gemeinsame Avatarverarbeitung fuer Archivwelle und Threadimport in `js/worker/archive-asset-service.js` auslagern. Explizite Download-/Normalisierungs-/MIME-/Concurrencyadapter und beide Caches; URL-Gruppierung, Sluglimit, Pfadduplikate und fehlertolerantes Leeren erhalten. Drei alte Implementierungen entfernt, beide Services klassisch importiert und precached; Texte zentralisiert. Zwoelf neue Vertraege und 52 direkte Alt-/Neu-Vergleiche bestanden.

- [x] Archivquellen-Aufloesung in `js/worker/archive-source-service.js` kapseln. Request-/Basisadapter explizit; aktive Konto-Metadaten ohne Profilrequest, DID-vor-Handle-Prioritaet, Profilfallbacks und bisherige Verwendung des uebergebenen Authzustands erhalten. Altimplementierung entfernt, klassischer Import und Shellcacheeintrag ergaenzt.
- [x] Wellenwiederherstellung im vorhandenen `archive-models.js` unter `wave.restore` buendeln. Post-/Count-/Image-Containerkopien, rohe/nested Referenzen, doppelte Recordreihenfolge, letzter Map-Eintrag sowie Cursor-/Seitengroessen-/Seitenzahlregeln erhalten. Lokale Wiederherstellungsimplementierung aus der Welle entfernt.
- [x] Manifest-/Ergebnis-/Sitzungsaufbau unter `wave.result` im selben Modell kapseln. Expliziter aktueller Zustand samt Uhr-/Versionswert; Array-/Filterreferenzen, Status-/Fehlerfelder und bisheriges festes `waveIndex: 1` erhalten. Lokaler Ergebnisbuilder delegiert nur noch. Zehn neue Vertraege und 79 Alt-/Neu-Vergleiche einschliesslich neun vollstaendiger Wellen mit Testadaptern bestanden.

- [x] Root-/Thread-Hashtagzugriffe und Medienauswahl in `js/worker/archive-thread-service.js` buendeln. Gemeinsamer Auth-/Transporthelfer, Aufrufer-Caches, direkte Tagprioritaet, Startpost-/Threadumfang und Missing-Post-Caching erhalten; sonstige Fehler werden weitergereicht.
- [x] Archiv-Threadanfragen mit Auth-Erneuerung, eigenem AbortController und Timer je Versuch im selben Service kapseln. Bisherige 15s-/Ein-Retry-Standardwerte, Antwortparameter, Fortschritt/Checkpoints und letzte Fehler erhalten; Timer auch bei Auth-/Transport-/Observerfehlern freigeben. Bestehende Texte in Archiv-Meldungsdatei zentralisiert.
- [x] Antwortkontexterweiterung im selben Service kapseln. Eindeutigen Root-Snapshot, kooperative Laufpruefung, Missing-/Timeout-Ueberspringen und bestehende Post-/Upsertmodelle behalten. Sieben Altimplementierungen entfernt, explizite Modelle-/Auth-/Transport-/Lauf-/Timeradapter, klassischer Import und Shellcacheeintrag. Zwoelf neue Vertraege und 59 Alt-/Neu-Ablaufvergleiche bestanden.

- [x] Archivfilter-Normalisierung, Hashtag-Sammlung/-Abgleich und Datumspruefung im reinen Worker-Modell `js/worker/archive-models.js` kapseln. Vorhandene gemeinsame Tagparser explizit; Standardwerte, OR-Tags, Unicode-Parsing und inklusive UTC-Datumsgrenzen erhalten.
- [x] Root-/Parent-/Eigentuemer-/Hauptpfadauswahl und Threadsammlung fuer Gesamtbaum, Zielpfad und Autor in der Thread-API desselben Modells buendeln. Gemeinsame Knoten-/Replyaufloesung statt dreifacher Logik; Fallbacks, DFS-Reihenfolge, Duplikate, Arrayidentitaet und Node-vor-Post-Replies-Prioritaet erhalten.
- [x] Archiv-Post-/Embedmodelle in der Post-API desselben Modells buendeln. Bildlimit, Video/Card-Prioritaeten, Site-/Edit-Metadaten, Permalinks, Rohdatenreferenzen und Merge-Prioritaeten erhalten. URI-/Weblink-/Metadatenadapter und Bildlimit explizit; 17 Altimplementierungen entfernt, Modul klassisch importiert und im Shellcache registriert. 14 neue Vertragstests und 841 Alt-/Neu-Modellvergleiche bestanden.

- [x] Archiv-Laufzustand, Pause/Fortsetzen/Abbruch und kooperative Warteabschnitte in `js/worker/archive-run-control.js` kapseln. Zustandsmap privat; Scheduler, Servicefehler und Meldungen explizit. Start-/Finish-Aufrufer in Archivwelle und Threadimport umverdrahtet, bisherige Identitaets-/Reset-/Kontrollpunktregeln erhalten.
- [x] Archiv-Anfragewiederholungen im selben Controller kapseln. Status-/Nachrichtenklassifikation, Retry-After-Vorrang, 30/45/60s-Backoff, vier Wiederholungen, Fortschritt/Checkpoints und bestehende Fehlercodes erhalten. Wartezeiten in Vertragstests virtuell; echte Timer fuer Pause/Fortsetzen/Abbruch im Worker-Browserfall.
- [x] Freiwillige Feed-Pausen im selben Controller buendeln. 25-/100-Seiten-Schwellen, Expertenmodus und Abbruchpruefung behalten; bestehende Texte zentral in `archive-run-messages.js`. Sechs Altimplementierungen und offene Zustandsmap entfernt, beide Module klassisch importiert und im Shellcache registriert. Zwoelf neue Vertragstests und 100 Alt-/Neu-Ablaufvergleiche bestanden.

- [x] Worker-DM-Partnerlisten und Zugriffspruefung in `js/worker/dm-service.js` auslagern. Auth-/Chat-/Profil-/Downloadadapter explizit; Cursor, neueste Kontaktmetadaten, Sortierung und optionales Ueberspringen von Assets erhalten.
- [x] Fehlende DM-Partnerprofile und Avatarhydrierung im selben Service kapseln. 25er-Profilbatches, kopierte Kontakte/Member, Pfadduplikate und fehlertolerante Downloads erhalten; doppelte Avatar-Anhaengelogik durch gemeinsamen Helfer ersetzt.
- [x] Worker-DM-Archivsammlung samt Cache-/Partnerfallback, Nachrichtenseiten, UTC-Datumsgrenzen, Absenderanreicherung und URL-/CID-Cardbildern im selben Service kapseln. Bestehende Meldungen zentral in `dm-messages.js`; Uhr/Zufall/Cacheversion explizit. Fuenf Altimplementierungen entfernt, beide Module klassisch importiert und im Shellcache registriert. Elf neue Vertragstests und 80 Alt-/Neu-Ablaufvergleiche bestanden.

- [x] Speichern aktueller Suchfilter und Hinzufuegen geteilter Such-URLs im vorhandenen `search-controller.js` buendeln. Models, Collectionzugriff, Normalisierung/Gleichheit, Speicherung und Statusadapter explizit; Leerpruefung und unterschiedliche Filter-/URL-Duplikatregeln erhalten.
- [x] Entfernen gespeicherter Suchen samt Ruecksetzen aktiver Explorer-/Archivverweise im selben Controller buendeln. Zustandszuweisungen, Cache-/Auswahlbereinigung und DOM bleiben explizite Seitenadapter; Reihenfolge vor Speicherung erhalten.
- [x] Anwenden gespeicherter Suchen in Suche, Explorer und Archiv im selben Controller buendeln. Nutzungstimestamps, Dialogschluss, Legacy-/Vollfilter, zweite Suchspeicherung und synchrone Invalidierung alter Suchlaeufe erhalten. Alte Implementierungen und zwei aufruferfreie Konstruktor-Delegationen entfernt; neun neue Vertragstests und 60 Alt-/Neu-Ablaufvergleiche bestanden.

- [x] Orientierung-/Ansichtspraeferenzen mit einer gemeinsamen Storage-Factory im vorhandenen Explorer-Controller kapseln. Schluessel, Normalisierer und Fallback explizit; Restore-Zuweisungen bleiben im Einstieg. Drei neue Vertragstests und echte LocalStorage-/Reload-/Explorer-Open-Faelle pruefen horizontal/reply-cluster sowie ungueltigen/gesperrten Speicher.
- [x] Saved-Search-URLparser, Labels/Metadaten, Normalisierung, Lookup und URL-/Preferences-Konstruktion im vorhandenen `search-models.js` buendeln. Uebersetzung, gemeinsame Preference-/URL-Helfer, ISO-/Timestamp-Uhr und Zufall explizit. Sieben neue Vertragstests pruefen URLregeln, Feldformat, Duplikate, Limits, IDs, Uhren und Legacy-/Vollfilter.
- [x] Saved-Search-Dialogliste und Kontextfelder im vorhandenen Renderingmodul buendeln. Vorhandene Templates und Literaltext behalten; SVG-Entfernen-Symbol in beide HTML-Templates verschieben und aufruferfreien String-Iconbuilder entfernen. Ein neuer Kontextvertrag und echte Save-/Load-/Reload-/Remove-Faelle mit Such-/Archiv-/Explorer-Kontext und mobilen Buttongrenzen bestanden. 74 direkte Alt-/Neu-Vergleiche fuer Modelle und Ansichtspraeferenzen bestanden.

- [x] Konto-/quellenbezogene Auswahlpersistenz im vorhandenen Explorer-Controller kapseln. Storagezugriff, Schluessel, Account/Quelle, Normalisierung und ISO-Uhr explizit; Schema, gespeicherte Quellenwiederherstellung und bisherige Kontoabgrenzung unveraendert. Vier neue Vertragstests und echte LocalStorage-/Reload-Faelle ueber beide Einstiege bestanden.
- [x] Favoritenmodell-Erzeugung aus Suche/Root im vorhandenen Explorer-Modul buendeln. Inhalt-/Web-App-/Uhradapter explizit; bestehende Trim-Unterschiede und Reply-Auswahl bleiben erhalten. Drei neue Vertragstests und echte bestehende Favoriten-Speicherfaelle sichern die Aufrufer ab.
- [x] Replies-Dialog mit bestehendem Actor-Template im Renderingmodul und rekursive Knoten-/Elternsuche im Explorer-Modul buendeln. Literaltext, Rolle/Tabindex und Maus-/Enter-/Space-Auswahl behalten; Auswahl/Render/Focus/Close bleiben explizite Seitenadapter. Drei neue Baumvertragstests und zwei neue Dialog-Browserfaelle pruefen Erneutrendern, Einzelaktionen, leere Ausgabe und mobile Grenzen. 96 direkte Alt-/Neu-Vergleiche fuer Persistenz, Modelle und Baumfunktionen bestanden.

- [x] Feed-Zusammenfuehrung, Root-Gruppierung, Zeitstempel und stabile Datumssortierung im vorhandenen `thread-explorer.js` buendeln. Erste Fundstelle/Objektidentitaet und createdAt/indexedAt/Null-Fallback bleiben erhalten; drei neue Vertragstests bestanden.
- [x] Auswahlprioritaet aktuell/gespeichert/erster Feed-Eintrag im selben Fachmodul buendeln. Gespeicherte Auswahl wird erst bei Bedarf gelesen; exakte URI-Mitgliedschaft und Outside-Feed-Regel bleiben erhalten. Drei neue Vertragstests und gerenderte Feed-Template-Faelle bestanden; Persistenzadapter bleiben im Einstieg.
- [x] Favoritennormalisierung, gemeinsame Save-/Remove-Persistenz und Template-Dialog in vorhandenen Explorer-Modulen buendeln. Such-/Thread-Speicherduplikat entfernt; Format, Reihenfolge, Text-/Anzahllimits und Fehlerweitergabe bleiben erhalten. Vier neue Vertragstests sowie echte Such-Save-/Dialog-/Reload-/Remove-Faelle ueber beide Einstiege bestanden. Suchkarten lesen Favoritenstatus jetzt beim Rendering statt einmal beim Factory-Start; Speichersterne aktualisieren sich beim Speichern/Entfernen. 187 direkte Alt-/Neu-Modellvergleiche bestanden.

- [x] Feed-Quellenladen im vorhandenen Explorer-Controller und Select-Darstellung im vorhandenen Renderingmodul buendeln. Kontobezogene Anfragen, doppelte Starts und spaete Antworten nach Wechsel/Logout absichern; bestehendes Optiontemplate und Literaltext weiterverwenden. Drei neue Vertragstests und Browserfaelle ueber beide Einstiege pruefen Kontowechsel, Ladezustand und Labels.
- [x] Galerie-Vollbild, iOS-/API-Fallback und Tastatursteuerung in eigenem Controller im vorhandenen Modul kapseln. Privater Fallbackzustand, explizite native/DOM-Adapter; vorhandene Galeriebuttons angebunden. Drei neue Vertragstests und echte Galerie-Browserfaelle pruefen abgelehnte Fullscreen-API, Escape in zwei Stufen, Pfeile und Close-Prioritaet. Native Betriebssystem-Vollbildinteraktion bleibt separat abzunehmen.
- [x] Fokusziel, URI-Suche, Root-/Cluster-Fallback und Reveal-Steuerung im vorhandenen Controller buendeln; Pan-Messrechnung ins Layoutmodul verschieben. Reveal synchronisiert auch den Viewport-Controller. Vier neue Vertragstests, 96 Alt-/Neu-Panvergleiche und Browser-Geometrie bei 390/1100 Pixeln bestanden.

- [x] Toolbar-Verfuegbarkeit, Kontofelder, Moduslabels und ARIA-Zustaende nach `thread-explorer-rendering.js` auslagern. Kontozustand und DOM-Controls explizit; bestehende Uebersetzungen und aktive Kontoeingabe bleiben erhalten. Drei neue Vertragstests und 256 Alt-/Neu-Zustandsvergleiche bestanden.
- [x] Galerieauswahl mit privaten Bildern/Index im vorhandenen `thread-explorer.js` kapseln; bestehende Templates und Renderer weiterverwenden. Drei neue Vertragstests und echte Suchbild-/Galerie-Browserfaelle pruefen Oeffnen, Wrap-around, Thumbnail, Tastatur, ARIA und Bilddekodierung. Fullscreen-/Fallbackadapter bleiben im Einstieg.
- [x] Kanten-/Fokusplanung im vorhandenen `thread-explorer-controller.js` buendeln. Frames/Timer privat, wiederholte Fokusanforderungen ersetzen alte Durchlaeufe, Interaktionssperren werden beim Kantenframe erneut geprueft. Drei neue Vertragstests und Browserfaelle pruefen Zusammenfassung, Drag-Sperre, zwei Layoutframes und 80ms-Nachlauf.

- [x] Lazy-Karten-Hydration im vorhandenen `thread-explorer-hydration.js` kapseln. Observer privat; Root/Stage/Force/Selektion/Factory/Hydration explizit. Reset entwertet alte Observermeldungen. Vier neue Vertragstests und echte Browser-Observerfaelle pruefen Sichtbarkeit, Selektion, erzwungene Snapshot-Inhalte, Fallback und Reset.
- [x] Snapshot-Avatar-Hydration mit Worker-Payload, 120s-Timeout, Fortschrittsbereich und Fehler-/Abbruchregeln ins vorhandene Hydrationsmodul verschieben. Drei neue Vertragstests und Browserdaten pruefen Payload, Zaehler, verschachtelte Autoren, Ergebnisidentitaet und Abbruch.
- [x] Snapshot-Medien-Hydration samt uebersetztem Fortschritt im vorhandenen `thread-explorer-media-hydration.js` buendeln. Drei neue Vertragstests und Browserfaelle pruefen 420s-Timeout, Medienergebnis, dekodierbare Bilder, leere Daten, Fehler und Abbruch. Aufruferfreie Prewarm-Funktion mit exklusiven Controller-/Generations-Globals entfernt. 36 direkte Alt-/Neu-Vergleiche fuer Snapshot-Hydration bestanden.

- [x] Punkt-/Zentrums-/Absolut-Zoom im vorhandenen `thread-explorer-controller.js` buendeln; Ankerberechnung nach `thread-explorer-layout.js` verschieben. Explizite Mess-/Zustands-/Renderadapter, zentraler Viewport-Abgleich und unveraenderte Zoomgrenzen; ungueltige Messwerte werden verworfen. Vier neue Vertragstests pruefen Anker, Clamp, Eingaben und Controller-Zusammenspiel.
- [x] Reset-Zoom mit privatem Timer und Zoom-Merker im vorhandenen Explorer-Controller kapseln. Ein Klick passt verzoegert ein; Doppelklick ersetzt den Fit durch 100%/Restore am Mittelpunkt. Drei neue Vertragstests pruefen Timer-Ersetzen/-Abbruch, Klickdetail, Rueckkehr und 8%-Minimum.
- [x] Karten-Nachbarschaftsgrenzen und Cluster-Knotensuche im vorhandenen Layoutmodul buendeln. Gewaehlte Karte und direkte Antworten werden erfasst; Enkel bleiben ausgeschlossen. DOM-/Messadapter explizit, alte Implementierungen entfernt. Drei neue Vertragstests, 138 Alt-/Neu-Vergleiche fuer Zoom/Nachbarschaften und zwei neue Browserfaelle bei 390/1100 Pixeln bestanden.

- [x] Pan-Animationsframes und Geschwindigkeit im vorhandenen `thread-explorer.js` kapseln. Startgeschwindigkeit beim Ersetzen eines Laufs erhalten; zuvor wurde sie direkt vor dem Start geloescht. Vier neue Vertragstests und Browserfaelle ueber beide Einstiege pruefen Bewegung, Auslaufen, Abbruch und gerenderte Template-Geometrie.
- [x] Verzoegerte Kartenauswahl, Fokus/Restore und Maus-/Touch-Doppelklicksteuerung im vorhandenen `thread-explorer-controller.js` buendeln. Timer und Tap-Zustand privat; Viewport/Bounds/Selektion/Target-/Timeradapter explizit. Restore synchronisiert auch den Viewport-Controller. Fuenf neue Vertragstests und zwei Browserfaelle pruefen Fokusgrenzen, Rueckkehr und ignorierte Controls.
- [x] DM-Datums-/Filter-/Konversations-/Nachrichtenmodelle, Facets, Embeds und externe Karten nach `js/worker/dm-models.js` auslagern. UUID-Adapter explizit, API eingefroren, alte Implementierungen entfernt und Cache/klassischer Import ergaenzt. Sieben neue Vertragstests, 100 Alt-/Neu-Vergleiche und echte Worker-Aufrufer ueber beide Seiteneinstiege bestanden.

- [x] Lokale Suchfilter und Ergebnis-/Zeitstempelmodelle nach `js/worker/search-filters.js` auslagern; Query-/Facet-/Postadapter explizit, alte Implementierungen entfernt. Acht neue Vertragstests und 107 Alt-/Neu-Vergleiche bestanden.
- [x] Netzwerk-/Author-Feed-Suchlaeufe und private Abbruchsteuerung nach `js/worker/search-service.js` auslagern. Registrieren vor Auth-Warten, Freigabe bei allen Laufabschluessen und Fehlern, spaete/unbekannte Befehle ohne neue Laufeintraege. Acht neue Vertragstests und echte Worker-Import-/Serviceverdrahtung mit kontrolliertem XRPC ueber beide Seiten bestanden.
- [x] Stage-Rechteckumrechnung, Inhaltsgrenzen, Merge und Viewport-Fit im vorhandenen `thread-explorer-layout.js` buendeln. Sechs neue Vertragstests, 64 Alt-/Neu-Vergleiche und zwei DOM-Geometriefaelle bei 390/1100 Pixeln bestanden; Karten-Fixture-Screenshots visuell geprueft. Gemeinsamer Abschlusslauf mit zehn Browserfaellen bestanden.

- [x] Worker-Suchparameter, Modus-/Tag-/Sprachnormalisierung, Sprach-/Tag-Varianten, Cursor-Codec und URI-Ausschluss nach `js/worker/search-queries.js` auslagern. Klassischer Import mit eingefrorenem API-Namespace; alte Implementierungen aus `sw.js` entfernt. Sieben neue Vertragstests, 33 Alt-/Neu-Vergleiche und Browserpruefung des echten `sw.js`-Imports samt Aufrufern bestanden.

- [x] Snapshot-Fortschrittsdialog, Download-/Abbruchablauf und privaten AbortController im vorhandenen `thread-explorer-snapshot.js` buendeln. Doppelstarts verhindern, Fehler-/Abbruchpfade raeumen Buttons/Dialog auf. Fuenf neue Vertragstests und zwei Browserfaelle mit kontrolliertem PNG-Renderer, echtem Download und Abbruch bestanden; mobiler Fortschrittsdialog visuell geprueft.

- [x] Suchsteuerung nach `search-form.js`, `search-models.js` und `search-controller.js` auslagern; vorhandenen Normalisierer statt lokaler Kopie verwenden. Timer privat, Konto-/Worker-/UI-/Speicheradapter explizit. URL-/Eigenkonto-Fortsetzung, Wiederherstellungsstatus, Sortieroptionen und Entwertung spaeter Antworten bei Leeren/gespeicherter Auswahl absichern.
- [x] Dreizehn neue Vertragstests und vier Such-Browserfaelle ueber beide Einstiege bestanden: Folgeseiten/URI-Ausschluss, Reload mit Ergebnissen, URL-Import, Sprach-/Sortierregeln, Abbruch mit Teilergebnissen, Workerfehler und alte Antworten nach Reset/Neustart.

- [x] DM-Partner-/Nachrichten-/Zeitraum-/Vorschaumodelle nach `dm-export-models.js` und PDF-Paginierung/Canvas-Rendering nach `dm-pdf-rendering.js` auslagern. Bestehenden DM-Exportcontroller weiterverwenden; alte Fachimplementierungen entfernen.
- [x] DM-HTML mit `dm-html-rendering.js` und separaten Shell-/Fragment-/CSS-/Clientdateien erzeugen. Templates, Literaltext und einmalige Shell-Ersetzung; heruntergeladene Datei bleibt eigenstaendig. Such-Sonderzeichen, regionale Browsersprachen und mobile Umbrueche langer Namen sowie Textbreite bildloser Linkkarten korrigieren.
- [x] Sieben neue Unit-/Vertragstests und neun gezielte Browserfaelle absichern; drei DM-Faelle nach den letzten Such-/CSS-Korrekturen erneut bestanden. Echte HTML-/PDF-Downloads beider Einstiege, Suche/Reset, leere Daten, Templatefehler, lokale Avatare und Dokumentbreite bei 390/1100 Pixeln geprueft. DM-HTML-Screenshots und eine mit Poppler gerenderte DM-PDF-Seite visuell kontrolliert.

- [x] Quellvalidierung, Entprellung und Picker-Uebernahme nach `archive-source.js` auslagern. Timer/Antwortversion privat; Feld-/Profil-/Worker-/Statusadapter explizit. Alte Antwort schon bei Eingabeaenderung entwerten und ausstehende Entprellung bei sofortiger Pruefung ersetzen.
- [x] Dynamischen Archiv-Kartenaufbau im vorhandenen Workspace-Renderingmodul buendeln. Vier neue Layouttemplates auf beiden Seiten statt JS-Strukturaufbau; Buttons/Formwerte/Listener bleiben durch Verschieben erhalten. Event-/Busy-Adapter verbleiben bewusst als Seitenverdrahtung im Einstieg.
- [x] Quellen-/Layout-Verhalten mit elf neuen Unit-/Vertragstests und 14 gezielten Browserfaellen absichern: alte Antworten, echte Picker-Auswahl, Entprellung, wiederholte Anordnung, eindeutige IDs und erhaltene Kontrollidentitaet geprueft. Mobiler Exportkarten-Screenshot visuell kontrolliert.

- [x] Archiv-Status-/Hinweis-/Steuerungs-/Zusammenfassungsmodelle nach `archive-workspace-models.js` und Arbeitsbereichsdarstellung nach `archive-workspace-rendering.js` auslagern. Quellidentitaet, Vorschau, Ablauf und Ergebniskarte verwenden sechs neue Templates auf beiden Seiten; alte DOM-Aufbaupfade entfernt.
- [x] Laden/Wiederaufnahme, Thread-Import, Sitzung/Katalog-Persistenz, Pause/Fortsetzen/Abbruch, Reset und Invalidierung nach `archive-run-controller.js` auslagern. Gemeinsamer Fortschrittspfad, explizite Zustands-/Worker-/UI-Adapter; Zustand, Formulare und Busy-Eventverdrahtung bleiben im Einstieg.
- [x] Workspace-/Laufvertraege mit 13 neuen Unit-/Vertragstests und elf gezielten Browsertests absichern: gespeicherter Cursor, Quellenidentitaet, Live-Vorschau, Hintergrundhinweis, Pause/Fortsetzen, Thread-Import, Reset, Groessenlimit und Template-/Literaltext-Randfaelle. Geometrie bei 390/1100 Pixeln und Ergebniskarten-Screenshot geprueft.

- [x] Byte-/Base64-/Data-URL-/Download-/Bitmap-Operationen nach `shared-assets.js` auslagern und gespeicherte Account-Avatare ueber `resolveStoredAccountAvatar` in `shared-accounts.js` aufloesen. Backup-, Thread-Explorer-, Account-, Archiv- und DM-Aufrufer angebunden; alter Code entfernt.
- [x] Archiv-/DM-Avatar-Hydration in `archive-assets.js` buendeln: explizite Account-/Partner-/IO-Adapter, bisherige Cache-/Pfad-Prioritaeten und optionale Downloadfehler beibehalten. DM verwendet vorhandene Assets ohne neue Downloads.
- [x] Avatar-/Asset-Vertraege mit zwoelf neuen Unit-/Vertragstests und zehn gezielten Browsertests absichern. Account-Cache, URL-Wiederverwendung, eigene/fremde DM-Avatare, echte HTML-/PDF-Downloads, Backup-Gzip-Roundtrip und Seitenfehler-Erfassung geprueft; DM-HTML-Screenshot visuell kontrolliert.

- [x] Katalognormalisierung, ZIP-/JSON-/Gzip-Import und Archiv-ZIP-Ausgabe nach `archive-catalog.js` auslagern. Vorhandene zyklensichere Tiefenberechnung wiederverwenden; ungueltige ZIP-Postdaten mit lokalisiertem Importfehler ablehnen. Dateiformat und Bildreferenz-Regeln beibehalten.
- [x] Medien-Sitzungs-/Batchmodelle nach `archive-media-models.js` und fortsetzbaren Scan-/Download-/Streaming-/Fortschrittsablauf nach `archive-media-export.js` auslagern. Worker-/Dateidialog-/Statusadapter explizit uebergeben und alte Implementierungen entfernen.
- [x] Katalog-/Medien-Verhalten mit 16 neuen Unit-/Vertragstests, sechs Archiv-Browsertests und 44 Alt-/Neu-Vergleichen absichern. Kontrollierter Medienlauf mit 251 Eintraegen, einem Downloadfehler, Dateidialog-Abbruch vor Teil 2 und Wiederaufnahme ohne erneuten Scan bestanden.

- [x] Archiv-PDF-Layout/Paginierung, Canvas-Rendering und Bandexport nach `archive-pdf-layout.js`, `archive-pdf-rendering.js` und `archive-pdf-export.js` auslagern. Alte Implementierungen entfernt; App-/DOM-/Datei-/Statusadapter bleiben im Einstieg. PDF-Beschriftungen fuer Deutsch, Englisch und Franzoesisch zentralisiert.
- [x] Archiv-PDF-Vertraege mit zehn neuen Tests sowie drei gezielten Browsertests absichern: echte Downloads ueber beide Einstiege, Bilder/Avatar-Freigabe, Links, Edit-/Fehlerzustaende und drei Sprachen. Einmaliger Alt-/Neu-Vergleich: JPEG-Bytes und Annotationen fuer drei Sprachseiten identisch bei gleicher Beschriftung; Layout/Paginierung/Baender ebenfalls verglichen.

- [x] Aktiven HTML-Archivexport in Datenmodelle, DOM-/Template-Rendering und Exportsteuerung auslagern: `archive-html-models.js`, `archive-html-rendering.js`, `archive-html-export.js` und `templates/archive-html-fragments.html`. Alte Implementierungen entfernt, gemeinsame PDF-/DM-Aufrufer angebunden und Cache ergaenzt.
- [x] HTML-Archiv-Randfaelle absichern: neun neue Unit-/Vertragstests, 36 direkte Alt-/Neu-Vergleiche und vier gezielte Browsertests; Literaltext/Script-Grenzen, Edit-/Karten-/Leerzustaende, Dateimodi, Downloads und mobile/Desktop-Geometrie geprueft. Scope-Texte zentralisiert, Parent-Zyklen begrenzt und Ueberlauf bei langen Namen korrigiert.
- [x] Aufruferfreien HTML-Archiv-Builder `buildArchiveHtmlDocument()` und seine nur dort verwendete Toolbar-Textfunktion entfernen: 1.188 Zeilen Altcode geloescht, aktiver Template-Builder und Export-Aufrufer unveraendert.
- [x] HTML-Archivexport ueber echte Buttons mit vollstaendiger und kompakter Ausgabe absichern: zwei Browsertests mit Einstieg ueber beide Anwendungsseiten pruefen Downloads, Thread-Gruppierung, Klartext, Bildmodus, Suche und Seitenfehler.
- [x] Gemeinsamen ZIP-Codec fuer Archivimport/-export und Medien-Streaming nach `js/shared/shared-zip.js` auslagern: explizite Kodierungs-/Uhr-/Fehlertextadapter, alte Implementierungen entfernt, Modulvertrag und Service-Worker-Cache ergaenzt.
- [x] ZIP-Verhalten absichern: acht Vertragstests, 45 direkte Vergleiche mit der alten Implementierung und Browser-Download/-Wiederimport mit anschliessendem HTML-Export ueber beide Seiteneinstiege bestanden.
- [x] Gemeinsame PDF-Dateierzeugung/Metadaten, verlinkten Textumbruch samt Zeichnung/Linkflaechen und Canvas-Formen/Bildeinpassung nach `shared-pdf.js`, `shared-pdf-text.js` und `shared-canvas.js` auslagern; ungenutzten Text-PDF-Builder entfernen. Explizite Adapter, JSDoc, Cache und Modulvertraege ergaenzt.
- [x] PDF-/Canvas-Verhalten absichern: neun neue Vertragstests, 47 direkte Alt-/Neu-Vergleiche, drei gezielte PDF-Browsertests und Vergleich von zwoelf gerenderten Seiten bestanden. Archivseiten sind pixelgleich; Analyseseiten unterscheiden sich nur im Erstellungszeitpunkt der Kopfzeile.
- [x] Composer-Fachlogik fuer Dokument/Entwurf, Aufteilung, Abschnittsrendering, Bilder/Bildeditor, Mentions, Link-Cards, Posting-Einstellungen, Publishing und Historie in Domaenenmodule auslagern. Anwendungszustand und Abhaengigkeiten bleiben im Einstieg.
- [x] App-Grundfunktionen fuer Speicherung, Hydration, Start, Session, Navigation, Layout, Hilfe und Backup modularisieren.
- [x] ATProto-Adapter fuer Client, Session, Accounts, Suche, Medien und Posting anlegen; die gesamte Worker-Fachlogik ist damit noch nicht ausgelagert.
- [x] Netzwerk-Berechnungen, Daten-/Fokus-Controller, Layout, Listen-/Fokus-/SVG-Rendering und Arbeitsbereichssteuerung modularisieren.
- [x] Analyse-Berechnungen, Account-Normalisierung, Vergleich, Tabellenmodelle, Rendering, Controller sowie Berichtsmodelle/-layout auslagern.
- [x] Aktiven Analyse-PDF-Renderer einschliesslich Canvas-Seiten, Avatar-Cache und Exportablauf auslagern. Gemeinsame PDF-/Canvas-Helfer liegen inzwischen unter `js/shared/`.
- [x] Thread-Explorer-Module fuer Controller, Rendering, Layout, Hydration, Medien und Snapshots anlegen; verbleibende Implementierungen im Einstieg sind weiter unten erfasst.
- [x] Archiv-Einstellungen mit Datumsgrenzen, Filtern, Snapshot und Wiederherstellung auslagern.
- [x] Jedem JavaScript-Modul unter `js/` einen Verhaltens- oder Vertragstest zuordnen und diese Zuordnung automatisch pruefen.
- [x] Encoding-Check als `npm run check:encoding` bereitstellen und in `npm run check` integrieren.
- [x] Standardlauf `npm run check` fuer Encoding, Einstieg-/Worker-Syntax sowie Unit- und Browsertests einrichten. Der Gesamtlauf ist seit dem Modularisierungsabschluss erfolgreich.

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

### Modularisierung — Abgeschlossen Am 2026-11-08

- [x] Worker nach Domaenen aufteilen; abschliessend Archivwellen-Steuerung auslagern und den Datumsstopp an das vorhandene Medienmodell binden.
- [x] Worker-Anfragetransport, Uebersetzungsrendering und Richtextdarstellung aus dem App-Einstieg in Core-/Sharedmodule verschieben. Einstiege behalten Verdrahtung und Delegationen.
- [x] Altimplementierungen entfernen, Abhaengigkeiten explizit uebergeben, APIs dokumentieren und neue Modulvertraege absichern.
- [x] Beide Seiten mit pageerror-Erfassung, alle 150 Browserfaelle und 857 Unit-/Vertragstests pruefen; `npm run check` und `git diff --check` bestanden.
- [x] Echten Service Worker mit Cacheaktivierung, IndexedDB-Zustandsanfrage und Offline-Neuladen beider Einstiege pruefen.
- [x] Thread-Explorer-Screenshot mit Linux-Referenz und Geometrie stabilisieren; gesamte Browserregression mit regulaerem Testserver-/Browser-Abbau bestanden.
- [x] Mobile Archiv-Rasterbreite korrigieren und Exportkarten gegen den gesamten 390-Pixel-Viewport pruefen.
- [x] TECHNICAL.md und TECHNICAL.de.md bereinigen und den abgeschlossenen Architekturstand dokumentieren.
- [x] Zum Abschluss App-/Cache-Version und Label auf `0.4.357`/`v376` anheben.

### Separate Produktabnahme Und Bestehende Fehler

- [ ] Echte Provider/Konten, Token-Erneuerung und authentifizierte Netzwerkablaeufe mit Live-Daten abnehmen. Kontrollierte Tests ersetzen diese Produktabnahme nicht.
- [ ] Bestandsdatenmigration und Quota-/Speicherfehler auf echten Geraeten pruefen.
- [ ] Bestehende Archiv-PDF-Layoutkanten korrigieren: Thread-Hintergrund kann Band-/Hinweistext im Kopf ueberdecken; bei fehlgeschlagenem Vorschaubild beruecksichtigt die Kartenhoehe den Thumbnail-Platzhalter nicht vollstaendig.
- [ ] Visuelle PDF-Abnahme fuer weitere echte Accounts, lange Namen, viele Bilder und die unterstuetzten Sprachen ergaenzen.

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

- [x] Bug (Nutzermeldung): Post-Einstellung `Zähler anhängen` persistiert nicht. Reproduktion: Post-Einstellungen oeffnen, `Zähler anhängen` abwaehlen, App schliessen und erneut starten. Beobachtet: Option ist wieder aktiviert. Erwartet: Die deaktivierte Einstellung bleibt nach Neustart erhalten. Behoben: `useCounters` wird im Settings-Snapshot, Worker-Speicher/-Rueckgabewert und Startup-Control erhalten. Fehlender Legacywert bleibt aktiviert; false/true sowie unverwandte Settingswrites sind abgesichert. Browserregression prueft echte IndexedDB und Seiten-/Worker-Neustart auf beiden Einstiegen.

- [ ] Optionale Aktion `Unvollstaendigen Thread zuruecknehmen` nach einem Teilfehler anbieten; keine ungefragte automatische Loeschung. Bereits sichtbare Posts und Antworten bei der Entscheidung beruecksichtigen.
- [ ] Jede erfolgreich erstellte Postreferenz sofort erfassen, auch wenn danach Threadgate-/Postgate-Einstellungen scheitern; Referenzen und verbleibenden Zustand im Teilfehler an die Oberflaeche liefern.
- [ ] Ruecknahme mit expliziter Nutzeraktion in umgekehrter Erstellreihenfolge ausfuehren; zugehoerige Gate-Records mitberuecksichtigen, einzelne Loeschfehler anzeigen und fehlgeschlagene Schritte erneut versuchen koennen. Keine atomare Ruecknahme versprechen.
- [ ] Bei unklarem Create-Ergebnis durch Timeout/Verbindungsabbruch vor Wiederholung oder Ruecknahme feststellen, ob der Record angelegt wurde; dafuer vorab bekannte Recordschluessel und anschliessende Repo-Pruefung untersuchen.
- [ ] Ruecknahme mit kontrollierten Schreib-/Loeschantworten testen: Fehler beim ersten/spaeteren Post, Gatefehler nach erfolgreichem Create, unbekanntes Timeout-Ergebnis, bereits entfernte Records, Loeschfehler und fehlgeschlagene erneute Authentifizierung.

- [ ] Composer-Hilfen weiter verfeinern und sprachlich vereinheitlichen.
- [ ] Drag-and-Drop fuer Bilder weiter testen: Desktop, Touch, leerer Abschnitt und voller Abschnitt.
- [ ] Optional bessere Mehrfachauswahl oder Sammel-Drop fuer Bilder pruefen.
- [ ] Pruefen, ob Bilder zwischen Segmenten noch sichtbarer verschoben werden koennen.
- [ ] Hochgeladene Bilder optional automatisch mit einem Wasserzeichen versehen.
- [ ] Composer: Schrift-Formatierer fuer Bluesky integrieren, zum Beispiel auf Basis des [Bluesky Text Formatters von Nuelink](https://nuelink.com/tools/bluesky-text-formatter).

## Spaeter / Refactor

### Guidelines Durchsetzen

- [ ] Verbleibende grosse Markup-Strings und kontrollierte `innerHTML`-Renderer schrittweise durch `<template>` und DOM-APIs ersetzen; reine Leerungen getrennt von Markup-Erzeugung bewerten.
- [ ] Verbleibende sichtbare Texte zentral in `js/core/app-translations.js` halten und Texte in Fachlogik abbauen.
- [ ] Neue und angefasste Funktionen mit kurzem JSDoc dokumentieren.
- [ ] Ternaries in angefassten Bereichen durch lesbare `if / else`-Bloecke ersetzen.
- [ ] CSS-Regeln fuer Thread Explorer nach Komponenten sortieren und alte Layout-Experimente entfernen.

### Tests Und Pruefungen

- [ ] Browser-Smoke-Test fuer Thread Explorer: Feed laden, Post anklicken, Root laden, Fold/Open, Zoom, Drag, Orientierung wechseln.
- [ ] Testdaten fuer breite Threads, tiefe Threads, Quotes, Link-Cards, fehlende Avatare und Medienposts sammeln.
- [ ] Dokumentierte Standardchecks auf aktuelle Pfade und Befehle abgleichen: `npm run check`, `npm run test:unit`, `npm run test:browser`, `npm run check:encoding` und `git diff --check`.
- [ ] Optional: bestehenden Encoding-Check um einen gezielten i18n-title-Scan ergaenzen.

### Archiv-Exports

- [ ] CSV- oder Tabellenexport fuer Archiv-Metadaten pruefen.
- [ ] Eigenen Medien-Index im HTML-Archiv pruefen.
- [ ] Optional Kapitel- oder Jahresnavigation im HTML-Archiv ergaenzen.
- [ ] Vergleich zwischen `vollem Archiv` und `kompaktem HTML` verbessern.

### Composer-Medien Und Abschnittsformatierung

- [ ] Frontend-/Worker-Bildformat gezielt angleichen: Worker verwirft bisher `edit.fitMode` und Validierungsdimensionen (`width`, `height`, `exceedsDimensions`), waehrend das Frontend sie fuehrt. Vor Aenderung Reload-/Bestandsdatenverhalten und Legacy-Edit-Inferenz mit echten Bildfaellen absichern; bestehender Unterschied ist in `tests/worker-composer-image-models.test.cjs` dokumentiert.

- [ ] Bilder und Link-Cards eines Thread-Abschnitts beim Neuformatieren erhalten, auch wenn der Abschnitt dadurch keinen Text mehr enthaelt.
- [ ] Medienbehaftete, dadurch leere Thread-Abschnitte sichtbar belassen und mit einer klaren Loeschmoeglichkeit versehen.

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
