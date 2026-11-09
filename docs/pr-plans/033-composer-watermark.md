# feat: optionales Wasserzeichen für Uploadbilder anbieten

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-033 · Priorität: P3

## Problem und Ziel

Bilder sollen auf Wunsch vor dem Upload mit einem Wasserzeichen versehen werden.

## Geplanter Umfang

Explizite Option mit Text/Position und Vorschau definieren. Nichtdestruktive Originaldaten behalten und bestehende Resize-/Qualitätsverarbeitung wiederverwenden.

## Abnahme

- [ ] Orientierung, Transparenz, kleine Bilder, Exportgrenzen und deaktivierte Option visuell prüfen; Original-/Uploaddaten dürfen nicht verwechselt werden.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T051 · Composer: Hochgeladene Bilder optional automatisch mit einem Wasserzeichen versehen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
