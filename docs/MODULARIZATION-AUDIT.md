# Verantwortungs- und Zustandspruefung

Stand: 2026-11-08. Die vorige Gesamt-Fertigmeldung ist zurueckgenommen. Diese Pruefung unterscheidet nachgewiesene Auslagerungen von noch offenen Architekturgrenzen.

## Methode und vollstaendiges Inventar

[modularization-inventory.json](modularization-inventory.json) erfasst jede benannte Top-Level-Funktion von `app.js` und `sw.js`, ihre fachliche Zuordnung sowie Zugriffe auf und Schreibstellen an gemeinsamen Bindungen, einschliesslich verschachtelter Callbacks. Keine Auswahl nach Funktionslaenge. Die Quelldateien sind mit SHA-256 gebunden; der Strukturtest kontrolliert die Vollstaendigkeit und Aktualitaet des Inventars.

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

## Zustandsverantwortung und verbleibende Grenzen

| Bereich | Bereits klarer Eigentuemer | Noch zu klaerende Grenze und Abnahmekriterium |
| --- | --- | --- |
| Explorer | Gemeinsamer Ansichts-/Viewport-/Clusterzustand; eigene Controller fuer Laden, Fokus, Galerie, Zoom und Request-Deduplizierung | Account-/Actor-Fokuswechsel (`applyThreadExplorerAccountInput`, `openThreadExplorerActorFocus`, `closeThreadExplorerActorFocus`) koordinieren weiterhin mehrere globale Feed-/Auswahlfelder. Diese Transaktionen brauchen einen gemeinsamen Domain-Vertrag mit Kontowechsel und veralteten Antworten. |
| Explorer-Darstellung/Snapshot | Geometrie, Renderer, Hydrierung, Exportcontroller und Dateiformate | `getThreadExplorerStageRect`, `createThreadExplorerEdgePath`, native Bild-/Canvas-Helfer und einzelne Karten-Refreshablaeufe enthalten noch Verarbeitung im Einstieg. Vor einem Gesamtabschluss muss jede dieser Grenzen entweder an den vorhandenen Eigentuemer gehen oder als notwendiger nativer Adapter begruendet sein. |
| App-Shell | Authidentitaet, aktueller Arbeitsbereich, DOM-Verknuepfung und explizite Refreshreihenfolge im Einstieg | `updateAuthButtons`, `restorePreferredWorkspaceIfPossible`, `updateStatusForAuth` verbinden viele Domains. Ihre Zustaendigkeit ist Seitenkomposition; fachliche Zugriffs-/Laderegeln muessen getrennt von reiner Sichtbarkeitsverdrahtung geprueft werden. |
| Composer/Shared | Dokument, Publikation, Editor, Medien, Provider, Sprachen, History und Hashtags haben vorhandene Module | Verbliebene Tips-/Share-/Clipboardablaeufe und providerabhaengige Link-/Labelhelfer sind noch auf fachliche statt historische Seitengrenzen zu pruefen. |
| Suche/Archiv/DM | Form-/Run-/Exportcontroller mit expliziten Zustandsadaptern | Lokale Renderkomposition und DM-Partnercache-/Picker-Updates verwenden weiterhin globale Bindungen. Persistierter Cache, laufender Request und DOM-Snapshot brauchen jeweils einen eindeutigen Besitzer. |
| Worker | Messagehandler und lazy Serviceverdrahtung; Fachablaeufe in Diensten | URI-/Sprach-/Hashtagnormalisierung, gemeinsame Asset-/Avatarcache-Helfer und generische Sammlungshilfen liegen noch in `sw.js`. Ihre Wiederverwendungsgrenzen und Unterschiede zu Frontend-Modellen sind noch zu entscheiden. |

Diese Restgrenzen sind Architekturarbeit, keine Live-QA-Ausrede. Sie werden erst geschlossen, wenn der Zielbesitzer, seine Abhaengigkeiten, die entfernte Altimplementierung und passende Vertraege nachgewiesen sind. Die vollstaendige Funktionsliste ersetzt diese Entscheidungen nicht.

## Definition fuer den Gesamtabschluss

Es gilt `AGENTS.md`: alte Implementierung entfernt, keine doppelte Logik, explizite Abhaengigkeiten, dokumentierter Modulvertrag, betroffene Seiten ohne `pageerror`, gruene Unit-/Browser-/Syntax-/Dokumentationspruefungen. Zusaetzlich muss jede offene Grenze oben entschieden sein; Funktions- und Zeilenzahlen sind kein Fertigstellungsgrad.

Der Ausgangsstand bestand 857 Unit-/Vertragstests und 150 Browsertests einschliesslich echtem Offline-Start. Die Ergebnisse dieser Nacharbeit stehen im PR. Live-Provider-/Kontenabnahme, Bestandsdaten-/Quota-Pruefung und bekannte PDF-Layoutfehler bleiben davon getrennte Produktaufgaben.
