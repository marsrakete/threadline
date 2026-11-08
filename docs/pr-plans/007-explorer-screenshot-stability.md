# test: Thread-Explorer-Screenshot stabilisieren

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-007 · Priorität: P1

## Problem und Ziel

Der benannte Screenshot-Test wartet auf eine stabile Aufnahme und läuft in ein Timeout, obwohl die Geometrieprüfungen bestehen.

## Geplanter Umfang

Ursache für Animationen, Schrift-/Bildladen oder Layoutänderungen ermitteln. Deterministische Bereitschaft im Test herstellen; keine pauschale Entfernung des Screenshots oder bloße Timeoutverlängerung.

## Abnahme

- [ ] Den betroffenen Test mehrfach auf beiden Einstiegen ausführen, pageerror erfassen und Vergleichsbild sowie bestehende Geometrie prüfen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T006 · Aktueller Pruefstand Und Offene Abnahme: Thread-Explorer-Screenshot-Test `Thread Explorer keeps identity in the header and interactions above counts` in `tests/browser-smoke.test.cjs` untersuchen und stabilisieren. Die Geometriepruefungen bestanden; `toHaveScreenshot()` endete beim Warten auf eine stabile Aufnahme im Timeout.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
