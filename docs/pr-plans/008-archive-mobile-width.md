# fix: Archivkarten im mobilen Viewport begrenzen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-008 · Priorität: P1

## Problem und Ziel

Eine 433 Pixel breite Exportkarte überschreitet den dokumentierten 390-Pixel-Viewport.

## Geplanter Umfang

Mindestbreiten und Grid-/Kindbreiten der Archivkarten korrigieren. Die gesamte Dokumentbreite und lange Inhalte berücksichtigen.

## Abnahme

- [ ] Bei 390 Pixeln und einer Desktopbreite Dokument- und Kartenbounds prüfen; lange Beschriftungen und reale Exportkarten als Screenshot abnehmen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T007 · Aktueller Pruefstand Und Offene Abnahme: Mobile Archiv-Rasterbreite gezielt pruefen: der Exportkarten-Screenshot im 390-Pixel-Viewport zeigt eine 433 Pixel breite Karte. Die bisherige Container-Geometriepruefung ist keine Abnahme der gesamten Viewport-Breite.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
