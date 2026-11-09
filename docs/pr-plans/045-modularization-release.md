# chore: Modularisierung nach Gesamtabnahme versionieren

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-045 · Priorität: P1

## Problem und Ziel

Der Versions-/Cachebump ist ausdrücklich bis zum Abschluss der gesamten Modularisierung zurückgestellt.

## Geplanter Umfang

Nach abgeschlossener Architektur- und Gesamtabnahme npm run check vollständig ausführen. Erst dann App-/Cacheversion und sichtbare Labels konsistent erhöhen und Release-Text aus tatsächlichen Änderungen erstellen.

## Abnahme

- [ ] Vollständiges npm run check, git diff --check, Cacheupgrade und Versionskonsistenz nachweisen. Optionale spätere Features sind keine Voraussetzung; unbekannte offene Modularisierungsblocker verhindern den Bump.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-005](005-worker-boundary-audit.md), [PR-006](006-technical-consolidation.md), [PR-007](007-explorer-screenshot-stability.md), [PR-008](008-archive-mobile-width.md), [PR-009](009-browser-suite-lifecycle.md), [PR-010](010-offline-cache-auth-acceptance.md), [PR-011](011-archive-pdf-layout.md), [PR-012](012-pdf-layout-coverage.md), [PR-038](038-explorer-smoke-fixtures.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T005 · Modularisierung - Reihenfolge Der Naechsten Schritte: App-/Cache-Version und Versionslabel erst beim Abschluss der gesamten Modularisierung anheben; bis dahin `0.4.356`/`v375` beibehalten (Nutzerentscheidung).
- T009 · Aktueller Pruefstand Und Offene Abnahme: Nach Behebung der Testprobleme `npm run check` vollstaendig erfolgreich durchlaufen lassen; zusaetzlich `git diff --check` pruefen.
- T071 · Dokumentation: Release-Text regelmaessig aus den echten Aenderungen ableiten.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
