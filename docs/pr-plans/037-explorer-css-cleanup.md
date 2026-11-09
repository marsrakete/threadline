# refactor: Explorer-CSS nach Komponenten ordnen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-037 · Priorität: P2

## Problem und Ziel

Alte Layoutversuche und ungeordnete Regeln erschweren die Wartung des Explorers.

## Geplanter Umfang

Selektoren nach Komponenten ordnen und nachweislich tote Regeln entfernen. Bestehende Geometrie und responsive Zustände erhalten.

## Abnahme

- [ ] Vorher-/Nachherbilder für Baum-/Clustermodus, Mobil/Desktop, Zoom und Dialoge vergleichen. Layoutbounds und Screenshotstabilität müssen bestehen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-007](007-explorer-screenshot-stability.md), [PR-038](038-explorer-smoke-fixtures.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T057 · Guidelines Durchsetzen: CSS-Regeln fuer Thread Explorer nach Komponenten sortieren und alte Layout-Experimente entfernen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
