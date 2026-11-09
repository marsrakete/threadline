# test: Speicher-, Offline- und Auth-Abnahme ergänzen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-010 · Priorität: P1

## Problem und Ziel

Kontrollierte Workerfixtures weisen noch keine echte Wiederherstellung oder Service-Worker-Aktivierung nach.

## Geplanter Umfang

Getrennte, reproduzierbare Abnahme für IndexedDB, Cachewechsel/Offlinebetrieb und authentifizierte Providerabläufe dokumentieren und soweit ohne Secrets möglich automatisieren. Livekonten nur im ausdrücklich freigegebenen Testsetup verwenden.

## Abnahme

- [ ] Neustart mit gespeicherten Bildern/Einstellungen, Cacheupgrade mit altem Client, Offlinezustände und Auth-Erneuerung prüfen. Manuelle und automatisierte Nachweise getrennt berichten.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-009](009-browser-suite-lifecycle.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T010 · Aktueller Pruefstand Und Offene Abnahme: Echte IndexedDB-/Offline-Wiederherstellung, Service-Worker-Cache-Aktivierung und authentifizierte Netzwerkablaeufe separat abnehmen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
