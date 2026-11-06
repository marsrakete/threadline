# Threadline TODO

Diese Liste ist nach Arbeitsstand sortiert. Erledigte Punkte bleiben sichtbar, offene Punkte stehen nach Themen gebuendelt darunter.

Stand nach Login-/Session-/Identitaetsdiensten: 2026-11-01. Basisversion `0.4.356` und Cache `v375` bleiben auf Nutzerwunsch bis zum Abschluss der Modularisierung unveraendert. Fachliche Auslagerungen sind weit fortgeschritten, die Gesamtmodularisierung ist noch nicht abgeschlossen. `js/` enthaelt 133 JavaScript-Module; `app.js` umfasst noch 13.335 Zeilen (vor der Altcode-Bereinigung 21.526), `sw.js` 5.964 Zeilen. Zeilenzahlen enthalten auch Verdrahtung und Delegationen und sind kein Fertigstellungsgrad.

## Erledigt

### Modularisierung Und Automatische Pruefungen

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
- [x] Standardlauf `npm run check` fuer Encoding, Einstieg-/Worker-Syntax sowie Unit- und Browsertests einrichten. Aktuell ist der Gesamtlauf wegen des unten erfassten Screenshot-Timeouts und des haengenden Testabschlusses nicht gruen.

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

### Modularisierung - Reihenfolge Der Naechsten Schritte

- [ ] `sw.js` weiter nach Domaenen aufteilen: Suche, DM, Archivlaufsteuerung/-modelle/-Threadservice sowie Quellen-/Wiederherstellungs-/Ergebnisaufbau, Seitenkollektion, Metrikbatches, Avatar-/Linkkarten-/Bildassets und Wellenabschluss sowie Threadimport und die komplette Worker-Analyse sind ausgelagert. Gemeinsamer XRPC-Transport, Authdatenmodelle und IndexedDB-Zugriff sind gekapselt. Login/Session-Erneuerung und DID-/PDS-Aufloesung sind an explizite Dienste gebunden. Als Naechstes Kontowechsel/-import/-entfernen, Logout und Sessionpruefung in einen Kontodienst ueberfuehren; danach verbleibende Netzwerkablaeufe und Composer-Bildspeicher. Aehnliche Normalisierungen auf gemeinsame Vertraege pruefen.
- [ ] Nach jeder Auslagerung Altimplementierung entfernen, Abhaengigkeiten explizit uebergeben und JSDoc mit Zweck, Parametern und Rueckgabe vervollstaendigen; keine neuen Ternaries einfuehren.
- [ ] Jeden neuen Modulvertrag mit Normal-, Grenz- und ungueltigen Faellen absichern. Betroffene Seiten im Browser mit `pageerror`-Erfassung pruefen; bei Darstellung zusaetzlich Geometrie oder Screenshots sowie Service-Worker-Assets und Versionskonsistenz kontrollieren.
- [ ] `TECHNICAL.md` und `TECHNICAL.de.md` um ueberholte Zwischenstaende bereinigen und die jeweils erreichten Modulgrenzen konsistent beschreiben.
- [ ] App-/Cache-Version und Versionslabel erst beim Abschluss der gesamten Modularisierung anheben; bis dahin `0.4.356`/`v375` beibehalten (Nutzerentscheidung).

### Aktueller Pruefstand Und Offene Abnahme

Nach Login-/Session-/Identitaetsdiensten geprueft: 716 Unit-/Vertragstests und 53 Alt-/Neu-Vergleiche bestanden. 17 neue Vertraege pruefen Login/Mu-PDS, JWT-Grenzen, Refresh/Fallback, Avatarcache, mutable Referenzen, Handlecaches, PLC/Web, Timerfreigabe, PDS-Fallback und Konnektivitaetscodes. Vergleiche pruefen 44 komplette Login-/Erneuerungsablaeufe samt Ergebnissen, Zustand, Requests, Warnungen und Timern sowie neun JWT-/PDS-Modellfaelle. 66 gezielte Browserfaelle im gemeinsamen Abschlusslauf bestanden (60s Falllimit). Zwei neue Faelle laden beide Einstiege mit pageerror-Erfassung und pruefen echte lokale Speicherung, klassischen Login, HTTP-Refresh, erneuten Login nach Refreshfehler, Mu.social-Handle-/PDS-Aufloesung, PDS-Cache und Konnektivitaet an kontrollierten Fetchantworten. Syntax, keine neuen Ternaries, Encoding, Modul-/Cache-/Versionsvertraege und Whitespace geprueft. Gesamte Browserregression, echte Provider-/Login-/Token-Erneuerungsabnahme, Bestandsdaten-/Quota-/Offline-/Cacheaktivierung und Vollbaum-Snapshot bleiben offen. Version/Cache bleiben unveraendert.

Nach XRPC-/Authdaten-/IndexedDB-Adaptern geprueft: 699 Unit-/Vertragstests, 64 gezielte Browserfaelle im gemeinsamen Lauf und 91 Alt-/Neu-Vergleiche bestanden. Zwoelf neue Vertraege pruefen Transport-/Header-/Query-/Retry-After-Regeln, Authmodelle, oeffentliche Metadaten, Datenbankupgrade, falsy Werte, Request-Abschluss und Fehler. Zwei neue Browserfaelle laden beide Einstiege mit pageerror-Erfassung und pruefen echte IndexedDB-Werte/Auth-Loeschung/Stores, gueltige gespeicherte Session und Auth-Referenzaktualisierung sowie klassische XRPC-Aufrufer mit kontrolliertem Fetch. Syntax, keine neuen Ternaries, Encoding, Modul-/Cache-/Versionsvertraege und Whitespace bestanden. Gesamte Browserregression, Live-Login/Token-Erneuerung, Bestandsdaten-/Quota-/Offline-/Cacheaktivierung und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach dem gesamten Worker-Analyseblock geprueft: 687 Unit-/Vertragstests bestanden. 15 neue Vertraege pruefen Modelle, gespeicherte Zustaende, Feedakkumulation, Auswahl-/Datumsgrenzen, Sessionwahl, Profilcache/Batches, Graph-/Listencaps, Toplisten und Konto-Lade-/Pruefregeln. 133 direkte Alt-/Neu-Vergleiche bestanden, darunter 80 komplette Analyselaeufe mit Reply-/Quoteflags, gespeicherter/fremder Quelle und zehn Erfolgs-/Fehler-/Datumsfaellen sowie 53 Modell-/Snapshot-/Kontoauswahlvergleiche. 62 Browserfaelle im gemeinsamen Worker-/Such-/Explorerlauf sowie zwei bestehende Analyse-Oberflaechenfaelle im isolierten Wiederholungslauf bestanden (zusammen 64 gezielte Faelle). Neue Workerfaelle pruefen beide Einstiege mit pageerror-Erfassung, echtem check/load-Aufrufer, Korpus/Netzwerklisten, partiellem Graphfehler, Profilcache/Toplisten und Snapshot; Oberflaechenfaelle pruefen Darstellung, Laden, Vergleich, Reload und PDF-Download mit kontrollierten Daten. Im ersten Zusatzlauf gab es einen Navigationstimeout und einen durch das Testzeitlimit abgebrochenen PDF-Download; beide Faelle bestanden danach ohne Codeaenderung. Syntax, keine neuen Ternaries, Encoding, Modul-/Cache-/Versionsvertraege und Whitespace geprueft. Gesamte Browserregression, Live-Konten-/Providerabnahme, Offline-/IndexedDB-/Cacheaktivierung und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Threadimport-Extraktion geprueft: 672 Unit-/Vertragstests bestanden. Elf neue Vertraege pruefen Quell-/Moduswahl, Transportauth, fehlende Posts, fruehen/spaeten Abbruch, Metadaten-/Rohdatenidentitaet, stufenabhaengige Ergebnisse sowie sequenzielle Importassets. 80 vollstaendige Alt-/Neu-Vergleiche fuer alle vier Moduseingaben, Root/Reply und zehn Erfolgs-/Fehler-/Abbruchsituationen bestanden; Ergebnisse, Requests, Fortschritt und verbleibender Laufzustand verglichen. 60 gezielte Browserfaelle im gemeinsamen Abschlusslauf bestanden (60s Falllimit). Zwei neue Faelle laden beide Einstiege, sammeln pageerror und pruefen den echten Importaufrufer mit allen drei Modi, Karten-/Bildassets, fehlenden Posts, fruehem Abbruch, Authpayload und Lauf-Freigabe an kontrollierten Netz-/Blobadaptern. Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace geprueft. Gesamte Browserregression, Live-Import/-Sammlung, Offline-/IndexedDB-/Cacheaktivierung und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Linkkarten-/Bildasset-/Abschlussextraktion geprueft: 661 Unit-/Vertragstests bestanden. Zehn neue Vertraege pruefen normalisierte Kartenbytes, Wiederholungen, Deadlines/Caches, Pfadduplikate, Bilddeskriptoren, Teilzaehler, Abbruch, Fehler und Abschlussreihenfolge. 48 direkte Alt-/Neu-Ablaufvergleiche bestanden, mit gezielter Referenzkorrektur in der alten Linkkarten-Erfolgsbasis. 58 gezielte Browserfaelle im gemeinsamen Abschlusslauf bestanden (60s Falllimit). Zwei neue Faelle laden beide Einstiege, sammeln pageerror und pruefen den echten Wellenaufrufer mit Karten-/Bildassets, cancelled/paused-Teilstaenden und freigegebener Laufsteuerung an kontrollierten Auth-/Netzwerk-/Blobadaptern. Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Im ersten Lauf wurde eine falsche neue Erwartung an spaete Steuerbefehle korrigiert; ein unveraenderter Pan-Fall scheiterte an einer Timing-Erwartung und bestand im anschliessenden Gesamtlauf. Gesamte Browserregression, Live-Sammlung, Offline-/IndexedDB-/Cacheaktivierung und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Archivseiten-/Metrik-/Avatarextraktion geprueft: 651 Unit-/Vertragstests und 56 gezielte Browserfaelle im gemeinsamen Abschlusslauf bestanden (60s Falllimit). Zwoelf neue Vertraege pruefen eigene/fremde Seiten, Transport, Auswahl, Teilfortschritt bei Fehlern, 25er-Metrikbatches, Abbruch, Fallbacks, Avatar-Caches/-Gruppierung/-Pfadduplikate und Fehler. Zwei neue Browserfaelle pruefen den echten Wellenaufrufer mit Repo-Seite/Metriken sowie kontrollierte Fremdfeed-/Avatarservices auf beiden Einstiegen; pageerror wird gesammelt. 52 direkte Alt-/Neu-Vergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Gesamte Browserregression, Live-Sammlung, Offline-/IndexedDB-/Cacheaktivierung und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Archiv-Hashtagzugriffen/Threadanfragen/Kontexterweiterung geprueft: 629 Unit-/Vertragstests und 52 gezielte Browserfaelle bestanden (60s Falllimit). Zwoelf neue Vertraege pruefen Adapter, Antwortformen, Caches, Auth-Erneuerung, Timerbereinigung, Timeouts, Observerfehler und Kontext-Upserts. Zwei neue Browserfaelle laden das echte `sw.js` ueber beide Einstiege und pruefen alle sieben Bindungen, Cacheeintrag, native Abort-Timer, Root-/Threadcaches, Abbruch und Missing-Post-Ueberspringen mit kontrolliertem Auth-/Netzwerktransport. 59 Alt-/Neu-Ablaufvergleiche fuer Werte, Cache-/Upserteffekte, Transport, Timer, Fehler und Fortschritt bestanden; Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Gesamte Browserregression, Live-Archivwellen/Threadimports, Offline-/IndexedDB-/Cacheaktivierung und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Archivfiltern/Threadauswahl/Postmodellen geprueft: 617 Unit-/Vertragstests und 50 gezielte Browserfaelle bestanden (60s Falllimit). 14 neue Vertraege laden die echte Worker-Importkette mit realen geteilten Tag-/URI-/Site-/Edit-Adaptern. Zwei neue Browserfaelle ueber beide Einstiege pruefen alle 17 Aufruferbindungen, Cacheeintrag, Unicode-Tags, UTC-Grenzen, Root-/Parentauswahl, Baum-/Pfad-/Autorsammlung, Embedlimits/-metadaten, Literaltext sowie Rohdaten-/Mergeidentitaet. 841 Alt-/Neu-Vergleiche fuer Werte, Mutationen und Fehlerkategorien, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Keine Live-Konten-/Archivsammlungs-, Offline-/IndexedDB-/Cacheaktivierungs-, gesamte Browserregressions- oder Vollbaum-Snapshot-Abnahme. Version/Cache bleiben unveraendert.

Nach Archiv-Laufzustand/Retry/Feed-Pausen geprueft: 603 Unit-/Vertragstests und 48 gezielte Browserfaelle bestanden (60s Falllimit). Zwei neue Faelle laden das echte `sw.js` in klassischen Workern ueber beide Einstiege; sie pruefen echte Timer fuer Pause/Fortsetzen/Abbruch, reale Aufruferbindungen und einen kontrolliert fehlschlagenden Request. Virtuelle Scheduler pruefen Retry-After, Fortschrittsmeldungen, Feed-Pausen und Expertenmodus ohne lange Wartezeiten. 100 Alt-/Neu-Ablaufvergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Grosse Archivwellen/Threadimports mit Live-Konten, echte Offline-/IndexedDB-/Cacheaktivierung, gesamte Browserregression und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Worker-DM-Partnerlisten/Profilen/Avataren/Archivsammlung geprueft: 591 Unit-/Vertragstests und 46 gezielte Browserfaelle bestanden (60s Falllimit). Zwei neue Browserfaelle laden das echte `sw.js` in klassischen Workern ueber beide Seiteneinstiege und pruefen Serviceverdrahtung, Cacheliste, paginierte Partner-/Nachrichtenablaeufe, Profile, Assetbytes, UTC-Filter und Literaltext mit kontrollierten Auth-/Netzwerk-/Downloadadaptern. 80 Alt-/Neu-Ablaufvergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Echte DM-Konten, Live-Chatberechtigungen, Offline-/IndexedDB-/Cacheaktivierung, gesamte Browserregression und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Saved-Search-Speichern/Hinzufuegen/Entfernen/Anwenden geprueft: 580 Unit-/Vertragstests und 44 gezielte Browserfaelle bestanden (60s Falllimit). Vier neue Browserfaelle pruefen URL-Hinzufuegen samt Fehler/Duplikat, Archiv-/Explorer-Anwendung, Entfernen aktiver Verweise mit Reload und Invalidierung verspaeteter Suchantworten. 60 Alt-/Neu-Ablaufvergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Worker-/Settings-Speicherung bleiben kontrollierte Fixtures; gesamte Browserregression, Vollbaum-Snapshot-, Live- und Offline-/IndexedDB-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Ansichtspraeferenzen/Saved-Search-Modellen/Dialog geprueft: 571 Unit-/Vertragstests und 40 gezielte Browserfaelle bestanden (60s Falllimit). Vier neue Browserfaelle pruefen echte Ansichtsspeicherung/Reload/Wiederherstellung beim Explorer-Open, Saved-Search-Speichern/Laden/Reload/Entfernen, Literaltext, Template-SVGs, Kontextfelder und mobile Buttongrenzen. 74 Alt-/Neu-Vergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Worker/Settings-Speicherung bleiben kontrollierte Fixtures; gesamte Browserregression, Vollbaum-Snapshot-, Live- und Offline-/IndexedDB-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Auswahlpersistenz/Favoritenmodellen/Replies geprueft: 560 Unit-/Vertragstests und 36 gezielte Browserfaelle bestanden (60s Falllimit). Vier neue Browserfaelle pruefen echte LocalStorage-Persistenz/Reload/Kontoabgrenzung und Replies-Templates, Literaltext, Rolle/Tabindex, Maus-/Enter-/Space-Auswahl, erneutes Rendering, leere Ausgabe und mobile Grenzen. 96 Alt-/Neu-Vergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Echte LocalStorage-Tests ersetzen keine IndexedDB-/Offline- oder Live-Konten-Abnahme; gesamte Browserregression und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Nach Feed-Modellen/Auswahl/Favoriten geprueft: 550 Unit-/Vertragstests und 32 gezielte Browserfaelle bestanden (60s Falllimit). Vier neue Browserfaelle pruefen Template-Reihenfolge/Auswahl, Literaltext, einzelne Aktionen nach erneutem Rendering sowie echtes Speichern/Reload/Entfernen inklusive Speicherstern und mobile Dialoggrenzen. 187 direkte Alt-/Neu-Vergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Antworten und Speicherung sind Browserfixtures; Live-Konten, echte IndexedDB-/Offline-Persistenz, gesamte Browserregression und Vollbaum-Snapshot-Abnahme bleiben offen. Version/Cache bleiben unveraendert.

Der gemeinsame Browserabschluss dieses Blocks verwendet 60s Falllimit. Im vorherigen 30s-Lauf scheiterte ein Galeriefall bereits beim Seitenaufruf; das Projekt-Standardlimit wurde nicht geaendert.

Nach Feed-Quellen/Galerie-Vollbild/Fokus geprueft: 540 Unit-/Vertragstests und 28 gezielte Browserfaelle bestanden. Vier neue Browserfaelle pruefen alte Kontoantworten, echte Select-Templates und Fokusgeometrie bei 390/1100 Pixeln; bestehende Galeriefaelle pruefen zusaetzlich abgelehntes natives Vollbild und Escape-Fallback. 96 Alt-/Neu-Panvergleiche, Syntax, Encoding, Modul-/Cachevertraege, unveraenderte Versionsdateien und Diff-Whitespace bestanden. Kontrollierte Worker-/Fullscreen-Adapter ersetzen keine Live-Konten oder native Betriebssystemabnahme. Gesamte Browserregression, Vollbaum-Snapshot-Timeout und Offline-/Cache-Aktivierung bleiben offen.

Nach Toolbar/Galerie/Renderplanung geprueft: 530 Unit-/Vertragstests und 24 gezielte Browserfaelle bestanden. Vier neue Browserfaelle ueber beide Einstiege bedienen echte Suchbild-/Galerie-Controls und pruefen reale Toolbar-Controls, Thumbnail-/Tastaturauswahl, Bilddekodierung und Frame-/Timerplanung. 256 direkte Alt-/Neu-Toolbarvergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Transportantworten bleiben kontrolliert; gesamte Browserregression, Vollbaum-Snapshot-Timeout, Live-Konten und Offline-/Cache-Aktivierung bleiben offen.

Nach Lazy-/Snapshot-Hydration geprueft: 521 Unit-/Vertragstests und 20 gezielte Browserfaelle bestanden. Vier neue Browserfaelle ueber beide Einstiege pruefen echte IntersectionObserver-Ereignisse, selektierte/erzwungene Karten, Bilddekodierung, verschachtelte Avatar-Zuweisung und Abbruch vor/waehrend einer Anfrage. Snapshot-Workerantworten sind kontrolliert. 36 direkte Alt-/Neu-Vergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Vollstaendige Browserregression, Vollbaum-Snapshot-Timeout, Live-Konten und Offline-/Cache-Aktivierung bleiben offen.

Nach Punkt-/Reset-Zoom und Karten-Nachbarschaften geprueft: 511 Unit-/Vertragstests und 16 gezielte Browserfaelle bestanden. Die beiden neuen Browserfaelle bedienen echte Zoom-Buttons und pruefen gerenderte Template-Nachbarschaften in Baum-/Clustermodus bei 390/1100 Pixeln. Anker bleibt fest, Reset stellt Zoom/Pan wieder her und ersetzt den verzoegerten Fit; Enkelkarten bleiben ausgeschlossen. 138 direkte Alt-/Neu-Vergleiche fuer Zoom/Nachbarschaften, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Vollstaendige Browserregression, Vollbaum-Snapshot-Timeout, Live-Konten und Offline-/Cache-Aktivierung bleiben offen.

Nach Pan-/Kartensteuerung und Worker-DM-Modellen geprueft: 501 Unit-/Vertragstests und 14 gezielte Browserfaelle bestanden. Neue Pan-/Fokusfaelle verwenden gerenderte Template-Fixtures; beide Einstiege erfassen Seitenfehler. Klassische Browser-Worker laden das echte `sw.js` samt DM-Modellen und pruefen Aufrufer/IDs/Datumsgrenzen; Transport und Auth bleiben kontrolliert. 100 direkte DM-Alt-/Neu-Vergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Vollstaendige Browserregression, Vollbaum-Snapshot-Timeout, Live-Konten und Offline-/Cache-Aktivierung bleiben offen.

Nach Worker-Filtern/-Suchlaeufen und Viewport-Geometrie geprueft: 485 Unit-/Vertragstests und zehn gezielte Browserfaelle bestanden. Beide Einstiege erfassen Seitenfehler. Der echte `sw.js`-Import, Query-/Facet-/Postadapter und Serviceverdrahtung sind mit kontrolliertem Transport/Auth geprueft; Suchoberflaeche und Snapshot-Ablauf bleiben gruen. Gerenderte Kartenfixtures pruefen Viewportgrenzen und Rueckrechnung bei 390/1100 Pixeln. 107 Filter- und 64 Geometrie-Alt-/Neu-Vergleiche, Syntax, Encoding, Modul-/Cache-/Versionsvertraege und Diff-Whitespace bestanden. Kein Nachweis fuer Live-Konten, Offline-Aktivierung, vollstaendige Thread-Explorer-Layouts oder den offenen Vollbaum-Snapshot-Test.

Nach den drei Einheiten geprueft: 463 Unit-/Vertragstests und sieben gezielte Browserfaelle bestanden. Beide Einstiege pruefen Suchlaeufe/Fortsetzung/Wiederherstellung/Abbruchrennen und den Snapshot-Fortschritts-/Download-/Abbruchablauf. Ein klassischer Browser-Worker laedt das echte `sw.js` und verwendet die ausgelagerten Suchoperationen ueber echte Aufrufer. PNG-Ausgabe und mobiler Fortschrittsdialog geprueft; Renderer sowie Suchkonto-/Speicherantworten sind kontrolliert. 33 Alt-/Neu-Workervergleiche, Syntax, Encoding, Cache-/Versionsvertraege und Diff-Whitespace bestanden. Vollstaendige Browserregression, Vollbaum-Snapshot-Timeout, Live- und Offline-/Cache-Aktivierung bleiben offen.

Nach der Snapshot-Steuerung geprueft: 456 Unit-/Vertragstests und zwei gezielte Lifecycle-Browserfaelle bestanden. Die vier Suchfaelle bestanden zuvor separat. Der Renderer ist kontrolliert; der bekannte Vollbaum-Screenshot-Timeout, weitere Thread-Explorer-Geometrie und Live-/Offline-Abnahme bleiben offen.

Nach der Such-Auslagerung geprueft: 451 Unit-/Vertragstests und vier gezielte Browserfaelle bestanden. Beide Seiten laden mit Seitenfehler-Erfassung; Worker- und Speicherantworten sind kontrolliert. Syntax/Encoding/Versions-/Cachevertraege und Diff-Whitespace geprueft. Echte Suchkonten, Offline-Aktivierung und gesamte Browserregression bleiben offen.

Nach der DM-Export-Auslagerung geprueft: 438 Unit-/Vertragstests und neun gezielte Archiv-/DM-/Medien-Browserfaelle bestanden; die drei betroffenen DM-Faelle nach den letzten Korrekturen erneut gruen. Beide Einstiege laden ohne Seitenfehler. HTML-Template-/Such-/Avatar-/Literaltext-Randfaelle, mobile Dokumentbreite und echte PDF-Downloads sind geprueft. Repraesentative HTML-Screenshots und eine gerenderte DM-PDF-Seite visuell kontrolliert. Syntax, Encoding, Modul-/Cache-/Versionsvertraege und `git diff --check` bestanden. Kontrollierte Daten ersetzen keine Live-Konten, Offline-Aktivierung oder vollstaendige Browserregression; der bekannte Thread-Explorer-Screenshot-Blocker bleibt offen.

Nach der Quellen-/Layout-Auslagerung geprueft: 431 Unit-/Vertragstests und 14 gezielte Archiv-/DM-/Medien-/Workspace-Browsertests bestanden. Manuelle Eingabe, verworfene alte Antworten und echte Auswahl im gemeinsamen Account-Picker funktionieren ueber beide Einstiege. Reiner Layouttest prueft alle benoetigten Elemente, fuenffache Anordnung, Formwerte/Listener und eindeutige IDs. Mobiler Exportkarten-Screenshot visuell geprueft; eine darin sichtbare Raster-Mindestbreite ist separat unter UI-Abnahme erfasst. Syntax, Encoding, Cache-/Versionsvertraege und `git diff --check` bestanden. Live-/Offline-Abnahme und vollstaendiger Browserlauf bleiben offen.

Nach der Workspace-/Lauf-Auslagerung geprueft: 420 Unit-/Vertragstests und elf gezielte Browsertests bestanden (acht bestehende Archiv-/DM-/Medienfaelle und drei neue Workspacefaelle). Beide Einstiege laufen mit Seitenfehler-Erfassung; der kontrollierte Worker erlaubt aktive Pause/Fortsetzung, gespeicherte Wiederaufnahme und Thread-Import. Ergebniskarten passen bei 390/1100 Pixeln in ihre Container; Screenshot visuell kontrolliert. Syntax, Encoding, Modul-/Cache-/Versionsvertraege und `git diff --check` bestanden. Live-/Offline-Abnahme und der bekannte Thread-Explorer-Screenshot-Gesamtlauf bleiben offen.

Nach der Avatar-/Asset-Auslagerung geprueft: 407 Unit-/Vertragstests und zehn gezielte Browsertests bestanden (acht Archiv-/DM-/Medienfaelle sowie Backup- und gemeinsame Avatar-Integration). Beide Einstiege laden ohne Seitenfehler. DM-HTML enthaelt dekodierbare Avatare fuer beide Absender, DM-PDF wird tatsaechlich heruntergeladen; der DM-HTML-Screenshot wurde visuell geprueft. Worker-Daten und Avatar-HTTP-Antwort sind kontrolliert; echte DM-Konten, Offline-/Cache-Aktivierung und die vollstaendige Browserregression bleiben offen. Syntax, Encoding und Cache-/Versionsvertraege bestanden.

Nach der Katalog-/Medien-Auslagerung geprueft: 395 Unit-/Vertragstests und sechs gezielte Archiv-Browsertests bestanden. ZIP-Wiederimport, echte JSON-/Gzip-Importe, HTML/PDF-Downloads und Medien-Streaming ueber beide Einstiege sind mit kontrollierten Worker-Antworten abgesichert. Die Medien-Dateiauswahl und der Schreibspeicher sind Testadapter; native Dialoge, reale Dateisystem-Berechtigungen, echte Worker-Persistenz und Live-Downloads bleiben separat abzunehmen. 44 direkte Alt-/Neu-Vergleiche bestaetigen Datenmodelle, Katalognormalisierung, ZIP-Bytes, Fortschritt und Sitzungspunkte in Erfolgs-/Fehler-/Pause-/Abbruchfaellen.

Nach der Archiv-PDF-Auslagerung geprueft: 379 Unit-/Vertragstests und drei gezielte Browsertests bestanden, zusaetzlich ein einmaliger Browser-Alt-/Neu-Vergleich. Encoding, Syntax, Cache-/Versionsvertraege und `git diff --check` bestanden. Eine Canvas-PDF-Seite visuell geprueft; JPEG-Bytegleichheit ersetzt keine umfassende Layoutabnahme. Der bekannte Thread-Explorer-Screenshot-Test, Live-/Offline-Abnahme und echte DM-Exporte bleiben offen.

Pruefung vom 2026-10-16: Encoding und die im Standardlauf enthaltenen Syntaxpruefungen bestanden; 343 Unit-/Vertragstests bestanden. Von 45 Browserfaellen bestanden 44. Der Gesamtlauf war nicht erfolgreich; nach den Testfaellen hing der Abschluss und wurde abgebrochen. Kontrollierte Browser-/Worker-Tests ersetzen keine Live-, Offline- oder Geraeteabnahme.

Nach der Altcode-Bereinigung erneut geprueft: 343 Unit-/Vertragstests bestanden, Encoding-/Syntaxpruefungen und `git diff --check` bestanden. Die zwei neuen HTML-Export-Browsertests bestanden ausserhalb der Sandbox mit regulaerem Prozessabschluss. Innerhalb der Sandbox hing der Abschluss erneut. Der vollstaendige Browserlauf einschliesslich des zuvor fehlgeschlagenen Screenshot-Tests wurde in diesem Bereinigungsschritt nicht wiederholt.

Nach der ZIP-Auslagerung geprueft: 351 Unit-/Vertragstests und die zwei erweiterten HTML-/ZIP-Browsertests bestanden. Der gezielte Browserlauf ausserhalb der Sandbox endete regulaer. Der bekannte Screenshot-Test und die vollstaendige Browserabnahme bleiben offen; natives Medien-Streaming wurde ueber einen kontrollierten Byte-Sink getestet, nicht ueber einen echten Dateidialog.

Nach der PDF-/Canvas-Auslagerung geprueft: 360 Unit-/Vertragstests und drei gezielte Browsertests mit realen Archiv-/Analyse-PDF-Downloads bestanden. Zwoelf PDF-Seiten wurden mit Poppler gerendert und auf Abweichungen verglichen; repraesentative Endseiten wurden visuell kontrolliert. Echte DM-PDF-Exporte und die vollstaendige Browserabnahme einschliesslich des bekannten Screenshot-Tests bleiben offen.

Nach der HTML-Archiv-Auslagerung geprueft: 369 Unit-/Vertragstests und vier gezielte Browsertests bestanden. Normale und kompakte HTML-Dateien, ZIP-Wiederimport und Archiv-/Analyse-PDFs funktionieren mit kontrollierten Daten. Template-Randfaelle, Maskierung und Geometrie bei 390/1100 Pixeln sind abgesichert; ein mobiler Screenshot wurde visuell geprueft. Live-/Offline-Abnahme und der bekannte Thread-Explorer-Screenshot-Test bleiben offen.

- [ ] Thread-Explorer-Screenshot-Test `Thread Explorer keeps identity in the header and interactions above counts` in `tests/browser-smoke.test.cjs` untersuchen und stabilisieren. Die Geometriepruefungen bestanden; `toHaveScreenshot()` endete beim Warten auf eine stabile Aufnahme im Timeout.
- [ ] Mobile Archiv-Rasterbreite gezielt pruefen: der Exportkarten-Screenshot im 390-Pixel-Viewport zeigt eine 433 Pixel breite Karte. Die bisherige Container-Geometriepruefung ist keine Abnahme der gesamten Viewport-Breite.
- [ ] Vollstaendigen Browserlauf in der freigegebenen Testumgebung mit regulaerem Testserver-/Browser-Abbau pruefen; der gezielte HTML-Export-Lauf endet ausserhalb der Sandbox bereits regulaer. Sandbox-Abbruch nicht mit einer erfolgreich abgeschlossenen Gesamtabnahme gleichsetzen.
- [ ] Nach Behebung der Testprobleme `npm run check` vollstaendig erfolgreich durchlaufen lassen; zusaetzlich `git diff --check` pruefen.
- [ ] Echte IndexedDB-/Offline-Wiederherstellung, Service-Worker-Cache-Aktivierung und authentifizierte Netzwerkablaeufe separat abnehmen.
- [ ] Bestehende Archiv-PDF-Layoutkanten separat korrigieren: Thread-Hintergrund kann Band-/Hinweistext im Kopf ueberdecken; bei fehlgeschlagenem Vorschaubild beruecksichtigt die Kartenhoehe den Thumbnail-Platzhalter nicht vollstaendig. Im Alt-/Neu-Vergleich unveraendert, durch den neuen visuellen Test sichtbar.
- [ ] Visuelle PDF-Abnahme fuer weitere echte Accounts, lange Namen, viele Bilder und die unterstuetzten Sprachen ergaenzen; bisherige Beispielberichte sind keine vollstaendige Layoutabdeckung.

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
