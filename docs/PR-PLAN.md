# Geplante Pull Requests

Die bei Erstellung am 8. November 2026 offenen 79 Punkte aus [TODO.md](../TODO.md) sind hier 45 fachlich abgegrenzten PR-Beschreibungen und gemeinsamen Abnahmekriterien zugeordnet. Die Vorlagen sind Planungen, keine bereits implementierten Änderungen oder bereits angelegten GitHub-Umsetzungs-PRs. Optional formulierte Produktideen behalten ihren Entscheidungsbedarf.

Der Zähler-Persistenzfehler ist inzwischen mit [PR #3](https://github.com/marsrakete/threadline/pull/3) behoben; die fachliche Modularisierung und ihre Nachprüfung sind mit [PR #4](https://github.com/marsrakete/threadline/pull/4) umgesetzt. Diese historischen Vorlagen öffnen erledigte Aufgaben nicht erneut. Aufgabenhintergrund: [TODO.md](../TODO.md); maßgeblicher Umsetzungsstatus: die zugehörigen GitHub-PRs. Aktuelle App-/Cacheversion: [version.json](../version.json). Änderungen aus PR #1 bis #4 werden im Branch `integration/pr-1-4` für die lokale Abnahme zusammengeführt. Neue Umsetzungsbranches vom passenden integrierten Stand starten; keine leeren Code-PRs erzeugen.

## Empfohlene Reihenfolge

1. Bekannte Daten-/Persistenzfehler: PR-001 und PR-041; danach PR-042.
2. Veröffentlichung absichern: PR-002, PR-003 und anschließend die explizite Rücknahme in PR-004.
3. Sicherheit: PR-013/014, PR-015 und PR-016 priorisieren; PR-017 für den Viewer-Betriebsmodus.
4. Test-/Architekturabschluss: PR-005 bis PR-012 und PR-038. PR-045 bleibt bis zur vollständigen Abnahme blockiert.
5. Weitere Funktions-/UX-PRs nach Produktpriorität und ihren jeweiligen Abhängigkeiten auswählen. P3-Ideen nicht automatisch als zugesagte Umsetzung verstehen.

Prioritäten dieses Plans sind Vorschläge für die Umsetzung. Die in TODO bereits gesetzten Sicherheitsprioritäten werden beibehalten.

## Gemeinsame Abnahmekriterien

Diese Kriterien decken die TODO-Punkte T002, T003, T055, T056 und T079 ab und gelten für jeden betroffenen Umsetzungs-PR:

- Alte Implementierung nach einer Extraktion entfernen, Abhängigkeiten explizit machen und keine doppelte Fachlogik hinterlassen.
- Öffentliche Funktionen mit Zweck, Parametern und Rückgabe dokumentieren; angefasste Ternaries lesbar durch if/else ersetzen.
- Neue Modulverträge mit Normal-, Grenz- und Fehlerfällen prüfen; betroffene Seiten im Browser mit pageerror-Erfassung laden. Bei Darstellung Geometrie oder Screenshots prüfen.
- Syntax, Encoding, Import-/Export-/Cacheverträge und git diff --check passend zum Umfang prüfen. Vollständige Abnahme und gezielte Tests klar unterscheiden.
- Sichtbare Texte zentralisieren, Übersetzungen und Dokumentation der tatsächlichen Änderung abgleichen. Vor Push experimentelle Funktionen und sensible Datenbereiche prüfen; keine Geheimnisse/Testkontodaten veröffentlichen.
- Bei Backup-Inhaltsänderungen README und Kompatibilität prüfen. Versions-/Cacheänderungen mit dem freigegebenen Abschluss abstimmen; maßgeblich ist `version.json`. `0.4.356`/`v375` war der Basisstand bei Erstellung dieses Plans.
- Für Publishing-/Löschtests kontrollierte Adapter verwenden. Liveaktionen benötigen einen ausdrücklich vorgesehenen Testablauf; geplante Rücknahme wird nicht ungefragt ausgeführt.

## Einzelne PR-Vorlagen

| Plan | Priorität | Titel | TODO | Abhängigkeiten |
| --- | --- | --- | --- | --- |
| [PR-001](pr-plans/001-counter-persistence.md) | P1 | fix: „Zähler anhängen“ über Neustarts speichern | T041 | – |
| [PR-002](pr-plans/002-publish-created-references.md) | P1 | fix: erstellte Posts vor Gatefehlern erfassen | T043 | – |
| [PR-003](pr-plans/003-publish-timeout-reconciliation.md) | P1 | fix: unklare Create-Ergebnisse vor Wiederholung abgleichen | T045 | PR-002 |
| [PR-004](pr-plans/004-publish-rollback.md) | P2 | feat: unvollständige Threads auf Wunsch zurücknehmen | T042, T044, T046 | PR-002, PR-003 |
| [PR-005](pr-plans/005-worker-boundary-audit.md) | P1 | refactor: verbleibende Workergrenzen erfassen und bereinigen | T001 | – |
| [PR-006](pr-plans/006-technical-consolidation.md) | P2 | docs: technische Modulgrenzen konsolidieren | T004 | PR-005 |
| [PR-007](pr-plans/007-explorer-screenshot-stability.md) | P1 | test: Thread-Explorer-Screenshot stabilisieren | T006 | – |
| [PR-008](pr-plans/008-archive-mobile-width.md) | P1 | fix: Archivkarten im mobilen Viewport begrenzen | T007 | – |
| [PR-009](pr-plans/009-browser-suite-lifecycle.md) | P1 | test: Browser-Gesamtlauf und Prozessabbau absichern | T008, T060 | – |
| [PR-010](pr-plans/010-offline-cache-auth-acceptance.md) | P1 | test: Speicher-, Offline- und Auth-Abnahme ergänzen | T010 | PR-009 |
| [PR-011](pr-plans/011-archive-pdf-layout.md) | P2 | fix: Archiv-PDF-Kopf und Thumbnailplatzhalter korrigieren | T011 | – |
| [PR-012](pr-plans/012-pdf-layout-coverage.md) | P2 | test: PDF-Layouts mit langen und mehrsprachigen Inhalten abnehmen | T012 | PR-011 |
| [PR-013](pr-plans/013-credential-storage-decision.md) | P1 | docs: Kontospeicherung und Sicherheitsmodus festlegen | T075, T076, T077, T078 | – |
| [PR-014](pr-plans/014-credential-storage-hardening.md) | P1 | fix: lokale Kontospeicherung gemäß Sicherheitskonzept härten | T013 | PR-013 |
| [PR-015](pr-plans/015-viewer-asset-isolation.md) | P1 | fix: aktive Archivassets im Viewer isolieren | T014 | – |
| [PR-016](pr-plans/016-proxy-dns-rebinding.md) | P2 | fix: WordPress-Proxy gegen DNS-Rebinding härten | T015 | – |
| [PR-017](pr-plans/017-viewer-local-access.md) | P3 | fix: lokale Viewer-Nutzung und Zugriffsschutz absichern | T016 | – |
| [PR-018](pr-plans/018-backup-roundtrip.md) | P2 | test: Backup und Restore aller lokalen Metadaten absichern | T017, T018, T020 | – |
| [PR-019](pr-plans/019-backup-reminder.md) | P2 | test: Backup-Erinnerung und „Später“ absichern | T019 | – |
| [PR-020](pr-plans/020-mutuals-focus-list.md) | P2 | feat: Mutuals im Fokus übersichtlich darstellen | T021, T025 | – |
| [PR-021](pr-plans/021-mutuals-export.md) | P3 | feat: gemeinsame Mutuals exportieren | T022 | PR-020 |
| [PR-022](pr-plans/022-network-neighbor-filter.md) | P3 | feat: Netzwerk auf Mutuals und direkte Nachbarn filtern | T023 | PR-020 |
| [PR-023](pr-plans/023-network-performance.md) | P2 | perf: große Netzwerke messen und Engpässe reduzieren | T024 | – |
| [PR-024](pr-plans/024-network-relevance.md) | P3 | feat: Relevanzbewertung erklären und Einstellungen prüfen | T026 | – |
| [PR-025](pr-plans/025-network-analysis-design.md) | P3 | docs: eigenen Analysebereich im Netzwerk bewerten | T027 | PR-020 |
| [PR-026](pr-plans/026-archive-progress.md) | P2 | feat: Archivphasen und Wartezustände verständlich zeigen | T028, T029, T030, T033 | – |
| [PR-027](pr-plans/027-archive-summary.md) | P3 | feat: Archivabschluss mit Statistik und Zeitraum ergänzen | T031, T035, T036 | PR-026 |
| [PR-028](pr-plans/028-archive-resume.md) | P2 | fix: lange Archivläufe zuverlässig fortsetzen | T032 | PR-026 |
| [PR-029](pr-plans/029-archive-asset-options.md) | P3 | feat: Archivasset-Optionen verständlich anbieten | T034 | PR-026 |
| [PR-030](pr-plans/030-dm-privacy.md) | P2 | docs: DM-Datenschutz und Exporthinweise konkretisieren | T037, T038, T039, T040, T072 | – |
| [PR-031](pr-plans/031-composer-help.md) | P3 | docs: Composer-Hilfen verständlich vereinheitlichen | T047, T074 | – |
| [PR-032](pr-plans/032-composer-drag-drop.md) | P2 | feat: Bildauswahl und Verschieben im Composer verbessern | T048, T049, T050 | – |
| [PR-033](pr-plans/033-composer-watermark.md) | P3 | feat: optionales Wasserzeichen für Uploadbilder anbieten | T051 | – |
| [PR-034](pr-plans/034-composer-text-formatter.md) | P3 | feat: Unicode-Schriftformatierung im Composer ergänzen | T052 | – |
| [PR-035](pr-plans/035-template-renderers.md) | P2 | refactor: verbleibende Markup-Renderer mit Templates aufbauen | T053 | – |
| [PR-036](pr-plans/036-translations-and-encoding.md) | P2 | refactor: sichtbare Texte zentralisieren und Titel-Encoding prüfen | T054, T061 | – |
| [PR-037](pr-plans/037-explorer-css-cleanup.md) | P2 | refactor: Explorer-CSS nach Komponenten ordnen | T057 | PR-007, PR-038 |
| [PR-038](pr-plans/038-explorer-smoke-fixtures.md) | P1 | test: vollständigen Thread-Explorer-Bedienablauf absichern | T058, T059 | PR-007 |
| [PR-039](pr-plans/039-archive-csv.md) | P3 | feat: Archivmetadaten als Tabelle exportieren | T062 | – |
| [PR-040](pr-plans/040-archive-html-navigation.md) | P3 | feat: HTML-Archiv mit Medienindex und Zeitnavigation ergänzen | T063, T064, T065 | – |
| [PR-041](pr-plans/041-image-storage-contract.md) | P1 | fix: Bildbearbeitungsmetadaten konsistent speichern | T066 | – |
| [PR-042](pr-plans/042-composer-media-reformat.md) | P1 | fix: Medien beim Neuformatieren leerer Segmente erhalten | T067, T068 | PR-041 |
| [PR-043](pr-plans/043-readme-structure.md) | P3 | docs: Einstieg knapp halten und Technik auslagern | T069, T070 | PR-006 |
| [PR-044](pr-plans/044-public-roadmap.md) | P3 | docs: optionale öffentliche Roadmap aus PR-Plan ableiten | T073 | – |
| [PR-045](pr-plans/045-modularization-release.md) | P1 | chore: Modularisierung nach Gesamtabnahme versionieren | T005, T009, T071 | PR-005, PR-006, PR-007, PR-008, PR-009, PR-010, PR-011, PR-012, PR-038 |

## Vollständige Zuordnung der offenen TODOs

Die T-IDs halten die Reihenfolge der 79 offenen Aufgaben beim Erstellen dieses Plans fest. Änderungen an der TODO-Reihenfolge dürfen diese IDs nicht stillschweigend neu vergeben. Die Originaltexte bleiben in den jeweiligen Vorlagen als Zuordnungsnachweis erhalten.

| TODO | Bereich | Geplanter PR / Regel |
| --- | --- | --- |
| T001 | Modularisierung - Reihenfolge Der Naechsten Schritte | [PR-005](pr-plans/005-worker-boundary-audit.md) |
| T002 | Modularisierung - Reihenfolge Der Naechsten Schritte | Gemeinsame Abnahmekriterien |
| T003 | Modularisierung - Reihenfolge Der Naechsten Schritte | Gemeinsame Abnahmekriterien |
| T004 | Modularisierung - Reihenfolge Der Naechsten Schritte | [PR-006](pr-plans/006-technical-consolidation.md) |
| T005 | Modularisierung - Reihenfolge Der Naechsten Schritte | [PR-045](pr-plans/045-modularization-release.md) |
| T006 | Aktueller Pruefstand Und Offene Abnahme | [PR-007](pr-plans/007-explorer-screenshot-stability.md) |
| T007 | Aktueller Pruefstand Und Offene Abnahme | [PR-008](pr-plans/008-archive-mobile-width.md) |
| T008 | Aktueller Pruefstand Und Offene Abnahme | [PR-009](pr-plans/009-browser-suite-lifecycle.md) |
| T009 | Aktueller Pruefstand Und Offene Abnahme | [PR-045](pr-plans/045-modularization-release.md) |
| T010 | Aktueller Pruefstand Und Offene Abnahme | [PR-010](pr-plans/010-offline-cache-auth-acceptance.md) |
| T011 | Aktueller Pruefstand Und Offene Abnahme | [PR-011](pr-plans/011-archive-pdf-layout.md) |
| T012 | Aktueller Pruefstand Und Offene Abnahme | [PR-012](pr-plans/012-pdf-layout-coverage.md) |
| T013 | Sicherheit / OWASP | [PR-014](pr-plans/014-credential-storage-hardening.md) |
| T014 | Sicherheit / OWASP | [PR-015](pr-plans/015-viewer-asset-isolation.md) |
| T015 | Sicherheit / OWASP | [PR-016](pr-plans/016-proxy-dns-rebinding.md) |
| T016 | Sicherheit / OWASP | [PR-017](pr-plans/017-viewer-local-access.md) |
| T017 | Backup Und Lokale Daten | [PR-018](pr-plans/018-backup-roundtrip.md) |
| T018 | Backup Und Lokale Daten | [PR-018](pr-plans/018-backup-roundtrip.md) |
| T019 | Backup Und Lokale Daten | [PR-019](pr-plans/019-backup-reminder.md) |
| T020 | Backup Und Lokale Daten | [PR-018](pr-plans/018-backup-roundtrip.md) |
| T021 | Netzwerk Und Analyse | [PR-020](pr-plans/020-mutuals-focus-list.md) |
| T022 | Netzwerk Und Analyse | [PR-021](pr-plans/021-mutuals-export.md) |
| T023 | Netzwerk Und Analyse | [PR-022](pr-plans/022-network-neighbor-filter.md) |
| T024 | Netzwerk Und Analyse | [PR-023](pr-plans/023-network-performance.md) |
| T025 | Netzwerk Und Analyse | [PR-020](pr-plans/020-mutuals-focus-list.md) |
| T026 | Netzwerk Und Analyse | [PR-024](pr-plans/024-network-relevance.md) |
| T027 | Netzwerk Und Analyse | [PR-025](pr-plans/025-network-analysis-design.md) |
| T028 | Archiv-Funktion | [PR-026](pr-plans/026-archive-progress.md) |
| T029 | Archiv-Funktion | [PR-026](pr-plans/026-archive-progress.md) |
| T030 | Archiv-Funktion | [PR-026](pr-plans/026-archive-progress.md) |
| T031 | Archiv-Funktion | [PR-027](pr-plans/027-archive-summary.md) |
| T032 | Archiv-Funktion | [PR-028](pr-plans/028-archive-resume.md) |
| T033 | Archiv-Funktion | [PR-026](pr-plans/026-archive-progress.md) |
| T034 | Archiv-Funktion | [PR-029](pr-plans/029-archive-asset-options.md) |
| T035 | Archiv-Funktion | [PR-027](pr-plans/027-archive-summary.md) |
| T036 | Archiv-Funktion | [PR-027](pr-plans/027-archive-summary.md) |
| T037 | DM-Archiv | [PR-030](pr-plans/030-dm-privacy.md) |
| T038 | DM-Archiv | [PR-030](pr-plans/030-dm-privacy.md) |
| T039 | DM-Archiv | [PR-030](pr-plans/030-dm-privacy.md) |
| T040 | DM-Archiv | [PR-030](pr-plans/030-dm-privacy.md) |
| T041 | Composer | [PR-001](pr-plans/001-counter-persistence.md) |
| T042 | Composer | [PR-004](pr-plans/004-publish-rollback.md) |
| T043 | Composer | [PR-002](pr-plans/002-publish-created-references.md) |
| T044 | Composer | [PR-004](pr-plans/004-publish-rollback.md) |
| T045 | Composer | [PR-003](pr-plans/003-publish-timeout-reconciliation.md) |
| T046 | Composer | [PR-004](pr-plans/004-publish-rollback.md) |
| T047 | Composer | [PR-031](pr-plans/031-composer-help.md) |
| T048 | Composer | [PR-032](pr-plans/032-composer-drag-drop.md) |
| T049 | Composer | [PR-032](pr-plans/032-composer-drag-drop.md) |
| T050 | Composer | [PR-032](pr-plans/032-composer-drag-drop.md) |
| T051 | Composer | [PR-033](pr-plans/033-composer-watermark.md) |
| T052 | Composer | [PR-034](pr-plans/034-composer-text-formatter.md) |
| T053 | Guidelines Durchsetzen | [PR-035](pr-plans/035-template-renderers.md) |
| T054 | Guidelines Durchsetzen | [PR-036](pr-plans/036-translations-and-encoding.md) |
| T055 | Guidelines Durchsetzen | Gemeinsame Abnahmekriterien |
| T056 | Guidelines Durchsetzen | Gemeinsame Abnahmekriterien |
| T057 | Guidelines Durchsetzen | [PR-037](pr-plans/037-explorer-css-cleanup.md) |
| T058 | Tests Und Pruefungen | [PR-038](pr-plans/038-explorer-smoke-fixtures.md) |
| T059 | Tests Und Pruefungen | [PR-038](pr-plans/038-explorer-smoke-fixtures.md) |
| T060 | Tests Und Pruefungen | [PR-009](pr-plans/009-browser-suite-lifecycle.md) |
| T061 | Tests Und Pruefungen | [PR-036](pr-plans/036-translations-and-encoding.md) |
| T062 | Archiv-Exports | [PR-039](pr-plans/039-archive-csv.md) |
| T063 | Archiv-Exports | [PR-040](pr-plans/040-archive-html-navigation.md) |
| T064 | Archiv-Exports | [PR-040](pr-plans/040-archive-html-navigation.md) |
| T065 | Archiv-Exports | [PR-040](pr-plans/040-archive-html-navigation.md) |
| T066 | Composer-Medien Und Abschnittsformatierung | [PR-041](pr-plans/041-image-storage-contract.md) |
| T067 | Composer-Medien Und Abschnittsformatierung | [PR-042](pr-plans/042-composer-media-reformat.md) |
| T068 | Composer-Medien Und Abschnittsformatierung | [PR-042](pr-plans/042-composer-media-reformat.md) |
| T069 | Dokumentation | [PR-043](pr-plans/043-readme-structure.md) |
| T070 | Dokumentation | [PR-043](pr-plans/043-readme-structure.md) |
| T071 | Dokumentation | [PR-045](pr-plans/045-modularization-release.md) |
| T072 | Dokumentation | [PR-030](pr-plans/030-dm-privacy.md) |
| T073 | Dokumentation | [PR-044](pr-plans/044-public-roadmap.md) |
| T074 | Allgemein | [PR-031](pr-plans/031-composer-help.md) |
| T075 | Allgemein | [PR-013](pr-plans/013-credential-storage-decision.md) |
| T076 | Allgemein | [PR-013](pr-plans/013-credential-storage-decision.md) |
| T077 | Allgemein | [PR-013](pr-plans/013-credential-storage-decision.md) |
| T078 | Allgemein | [PR-013](pr-plans/013-credential-storage-decision.md) |
| T079 | Allgemein | Gemeinsame Abnahmekriterien |
