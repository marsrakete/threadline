# Verantwortungs- und Zustandspruefung

Stand: 2026-11-08. Die vorige pauschale Fertigmeldung war voreilig. Diese Nachpruefung inventarisiert Verantwortlichkeiten und Zustand; ihre Befunde sind jetzt durch Auslagerungen und ausdrueckliche Entscheidungen zu den verbleibenden Einstiegsadaptern bearbeitet. Die fachliche Modularisierung ist nach den unten festgehaltenen Grenzen und der Definition in `AGENTS.md` abgenommen.

## Methode und vollstaendiges Inventar

[modularization-inventory.json](modularization-inventory.json) erfasst jede benannte Top-Level-Funktion von `app.js` und `sw.js`, ihre fachliche Zuordnung sowie Zugriffe auf und Schreibstellen an gemeinsamen Bindungen, einschliesslich verschachtelter Callbacks. Keine Auswahl nach Funktionslaenge. Die Quelldateien sind mit SHA-256 gebunden; der Strukturtest kontrolliert die Vollstaendigkeit und Aktualitaet des Inventars. Generator und Test verwenden denselben Helfer `scripts/audit-source.cjs`: CRLF wird vor dem Hashen zu LF normalisiert. Code, sonstiger Whitespace und abschliessende Zeilenumbrueche bleiben hashrelevant. Dadurch bleibt ein Windows-Checkout mit Git-Zeilenendenkonvertierung mit dem eingecheckten Inventar vergleichbar.

Reproduktion nach einer Aenderung: `node scripts/audit-module-responsibilities.cjs` mit den installierten Projekt-Testabhaengigkeiten. Der Entwicklungshelfer verwendet den Babel-Parser aus der gepinnten Playwright-Version. Die Kategorien sind strukturelle Hinweise, keine automatische Freigabe: Ein einzelner Aufruf kann fachliche Parameter aufbauen, eine Zuweisung kann DOM-Verdrahtung sein. Objektmethoden koennen Zustand auch ohne direkte Zuweisung veraendern. Diese Faelle benoetigen die unten beschriebene fachliche Entscheidung.

## Behobene Befunde

| Verantwortung | Vorher | Jetzt und Nachweis |
| --- | --- | --- |
| Uebersetzte statische Oberflaeche | Renderer mit ueber 100 Bindungen an fast alle Arbeitsbereiche | HTML traegt Text-/Platzhalter-/Options-/Alt-/ARIA-Schluessel. Renderer kennt nur Dokument, Uebersetzung und aktuelle Sprache. Domain-Refresh bleibt ausdrueckliche Seitenkomposition. DOM-Vertraege pruefen Sprachwechsel und spaeter eingefuegte Elemente auf beiden Seiten. |
| Explorer-Ansichtszustand | Sieben Globals parallel zu `threadExplorerController.state` | Quelle, Ausrichtung, Ansichtsmodus, Zoom, Pan X/Y und aufgeklappte Cluster-Knoten verwenden denselben Controller-Zustand. Persistenz, Zoom, Toolbar, Cluster und beide Einstiege bleiben in der Browserregression. |
| Like-/Unlike-Anfragen | Requestablauf und laufende URIs im Seiteneinstieg | `createLivePostInteractionController` besitzt optimistische Aenderung, Fehler-Ruecknahme und private Request-Deduplizierung; Unit-Vertraege pruefen gleichzeitige Anfragen und Fehler in beiden Richtungen. Seitenkomposition verbindet bekannte Post-Caches und Renderziele. |
| Post-Edit-Pruefung | Textvergleich, DOM-Aufbau und Leseablauf im Einstieg | Vergleich im Shared-Postmodell; Dialog/Reset/Lesen in `createPostEditCheckController`. Echte DOM-Vertraege pruefen geaendert/unveraendert, leere URL, Requestfehler, Reset und wechselnde Quelle. |
| Optionale DM-Freischaltung | URL-/Hash-/Session-/Kryptoregeln und UI vermischt | `createDmAccessGate` mit expliziten nativen Adaptern und schmalem UI-Anschluss. Vertraege pruefen deaktiviert, gueltig/ungueltig, Sessionwiederverwendung und Kryptofehler. Sie bleibt ein Feature-Gate, keine Serverautorisierung. |
| Reine Daten- und Darstellungshelfer | URLbereinigung, Engagement, Profilnamen, Dateinamen und Editvergleich im Einstieg | Direkte Importe aus vorhandenen Shared-/Domaenenmodulen; alte Koerper entfernt. Normal-, Grenz- und ungueltige Faelle sind abgesichert. |
| Ueberfluessige Fassaden | Nicht mehr verwendete Funktionsnamen und reine importierte Weiterleitungen | 43 unerreichbare/unbenutzte Funktionen sowie 18 identische importierte Weiterleitungen entfernt; 37 unbenutzte Importbindungen bereinigt. Defaultargumente, Zustand oder asynchrones Verhalten veraendernde Adapter wurden nicht pauschal ersetzt. |

## Entscheidungen Zu Den Verbleibenden Grenzen

| Bereich | Entscheidung und Eigentuemer | Nachweis |
| --- | --- | --- |
| Explorer-Account/Fokus | `createThreadExplorerAccountContext` besitzt Accountuebernahme, Fremd-/Eigenkontext, Fokuswechsel und Wiederherstellung. Persistierte Felder werden als ein Live-State-Port angebunden; authentifizierte Identitaet ist dabei nur lesbar. | Vertragsfaelle pruefen mehrere fremde Akteure, Rueckkehr zum urspruenglichen Kontext, Accountmodus und Mein-Account-Aktion. |
| Explorer-Anfragen | Ein Kontextschluessel aus Generation und Authidentitaet verbindet Feed-, Actor- und Threadladen. Account-/Quellen-/Fokuswechsel entwerten alte Antworten und Fehler. | Kontrollierte spaete Erfolgs-/Fehlerantworten fuer alle drei Loader und beide Feedarten; die neue Ladeanzeige bleibt erhalten. Echte Seitenereignisse pruefen Alice → Bob mit spaeter Alice-Antwort. Bereits laufende Transportanfragen werden dabei nicht abgebrochen. |
| Geometrie und Snapshot | Rechteckumrechnung und Kantenpfade gehoeren `thread-explorer-layout.js`; beide Rechteckvarianten teilen dieselbe Umrechnung. Bildladen/-kodierung, CSS-Sammlung und Canvaslimits gehoeren dem Snapshotmodul. | Unit-Grenzen fuer Zoom, Nullgroessen und Limits; Browser prueft echte Blob-/PNG-Bilder, Canvas-Roundtrip und ungueltige Bilder auf beiden Seiten. |
| Karteninteraktionen | Karten-Refresh und Action-Button-Aufbau gehoeren dem Renderingmodul. Native-Control-/Textauswahlregeln und Cluster-/Favoriten-/Suchidentitaet gehoeren ihren vorhandenen Domaenenmodulen. | DOM-Vertraege pruefen passende Karten, Klickbindung und Drag-Prioritaet; Unit-Vertraege pruefen Baumexpansion, Favoriten und URI-Suche. |
| App-Shell | `renderApplicationNavigation` besitzt Auth-/DM-Gating, aktive Buttons und Beschriftungen. Start, globale Authidentitaet, Arbeitsbereichswechsel und die Reihenfolge domainuebergreifender Aktualisierungen bleiben bewusste Seitenkomposition. | Gast-Suche bleibt erreichbar, Auth-/DM-Zustaende sind getrennt getestet; Seitenregression prueft Login, Navigation, Hydration und native Ereignisse. |
| Composer und gemeinsame Darstellung | Tipplogik, Share-/Clipboard-/Dateihandoff, Publishlabels, Profil-/Provider-/Quote-URL-/Versions-/Groessen-/Zeitformatierung liegen in ihren bestehenden Modulen. | Normal-/Grenz-/Fehlervertraege; native Dateiexporte, Clipboardverdrahtung, Sprachen und beide Seiteneinstiege werden im Browser geprueft. |
| Suche/Archiv/DM | Formular-/Run-/Exportcontroller bleiben Besitzer ihrer Ablaeufe. `createDmPartnerCacheController` besitzt Cacheprojektion, Speicherung, Wiederherstellung und Pickerauswahl. Ein alter Account-Restore darf den neuen Cache nicht leeren. | Kontoisolation, Selektion, Persistenz und spaeter Restore sind kontrolliert getestet; bestehende Such-/Archiv-/DM-Integration bleibt in der Gesamtregression. |
| Worker-Records | `record-models.js` besitzt URI-, Sprach-, Hashtag-, Profil-, Interaktions-, Standard.site- und Assetmetadaten. Unterschiede zu Frontend-Modellen werden erhalten. | Klassischer Import, gefrorene API und Normal-/Grenz-/Fehlerfaelle; beide Worker-Einstiege werden ueber Browserharness und echten Offline-Start geprueft. |
| Worker-Konten/Avatarcache | Authstatus liegt im Kontodienst; Normalisierung, TTL und Wiederverwendung/Ersetzung von Kontoavataren liegen in `account-avatar-cache.js` mit expliziter Download-, Typ- und Uhranbindung. | Oeffentliche Metadaten ohne Geheimnisse, fehlende Session, TTL-Grenze, Wiederverwendung, Ersetzung und Downloadfehler getestet. |
| Worker-Sammlungen | Batching und begrenzte Parallelitaet liegen beim gemeinsamen Transportmodul. Nicht positive/ganzzahlige Batchgroessen werden abgewiesen, damit kein nicht fortschreitender Lauf entsteht. | Reihenfolge, Parallelitaetsgrenze, leere Listen, Requestfehler und ungueltige Batchgroessen getestet. |

### Bewusst Im Einstieg Beibehalten

`AGENTS.md` erlaubt globalen Zustand und DOM-Verdrahtung im Einstieg. Die verbliebenen Adapter haben deshalb konkrete, begrenzte Rollen:

- DOM-Knoten/Templateinhalte suchen und zusammen mit aktuellen Zustandsports an Module uebergeben; seitenuebergreifende Aktualisierungen in festgelegter Reihenfolge aufrufen.
- Kanonische persistierte UI-Felder, Authidentitaet und Workspaceauswahl halten. Modulcontroller lesen/schreiben diese ueber explizite Ports; sie fuehren keine gespiegelte zweite Fassung derselben Felder.
- Native APIs anbinden: DOM-Rechtecke messen, SVG-Knoten erzeugen, Scrollposition sichern, Observer/Timer/Canvas-/Downloadadapter bereitstellen. Berechnung, Auswahllogik und Datenformate werden an Module delegiert.
- Im Worker Nachrichten dispatchen, Speicherkeys anbinden und native Fetch-/Blob-/FileReader-/Base64-/URL-Adapter an Dienste uebergeben. Sie enthalten keine Konto-, Archiv-, Such- oder Postingregeln.

Diese Entscheidung ist keine Behauptung, dass die Einstiegsdateien klein seien. Viele Kompatibilitaetsfassaden bleiben wegen ihrer Defaultargumente oder ihres Zustandsanschlusses erhalten. Das Inventar dokumentiert sie, statt aus ihrer Anzahl einen Fertigstellungsgrad abzuleiten.

### Aufrufer- Und Bindungspruefung

Die ES-Modul-Einstiegsdatei darf nur lokal/importiert aufgeloeste Bezeichner oder die ausdruecklich erfassten nativen Browserglobals verwenden. Der Auditgenerator bricht bei einer unaufgeloesten Bindung ab. Quellhash und Funktionsliste sichern die Aktualitaet des Berichts.

Dabei wurde auch eine alte Linkkartenverdrahtung korrigiert: Klick und Enter verwiesen auf den nicht mehr vorhandenen Helfer `createLinkCardForPendingSegment`. Beide erreichen nun direkt `composerLinkCardSubmission.submit()`. Ein Browservertrag loest die echten Ereignisse auf beiden Seiten aus und prueft den Validierungspfad ohne Seitenfehler.

## Definition fuer den Gesamtabschluss

Es gilt `AGENTS.md`: alte Implementierung entfernt, keine doppelte Logik, explizite Abhaengigkeiten, dokumentierter Modulvertrag, betroffene Seiten ohne `pageerror`, gruene Unit-/Browser-/Syntax-/Dokumentationspruefungen. Die oben erfassten Grenzen sind durch Auslagerung oder begruendete native/seitenspezifische Komposition entschieden; Funktions- und Zeilenzahlen sind kein Fertigstellungsgrad.

Abschlusspruefung: `npm run check` erfolgreich, 881 Unit-/Vertragstests und alle 158 Chromium-Browsertests mit regulaerem Prozessabschluss. Beide Einstiege, echte Service-Worker-Installation/Cacheaktivierung und Offline-Start sind enthalten. `git diff --check`, Syntax-/Import-/Versions-/Encoding- und Inventarpruefung bestanden. App `0.4.357`, Cache `v376`. Live-Provider-/Kontenabnahme, Bestandsdaten-/Quota-Pruefung und bekannte PDF-Layoutfehler bleiben davon getrennte Produktaufgaben.
