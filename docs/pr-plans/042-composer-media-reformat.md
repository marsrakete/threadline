# fix: Medien beim Neuformatieren leerer Segmente erhalten

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-042 · Priorität: P1

## Problem und Ziel

Beim Neuformatieren können medienbehaftete Abschnitte ihren Text verlieren und damit unsichtbar oder löschgefährdet werden.

## Geplanter Umfang

Bilder und Linkkarten unabhängig vom restlichen Segmenttext erhalten. Leere Mediensegmente sichtbar darstellen und bewusstes Löschen ermöglichen.

## Abnahme

- [ ] Bild-/Card-Segmente nach Textentfernung, erneutem Formatieren, Speichern/Reload und explizitem Löschen prüfen. Reihenfolge und Uploadfähigkeit erhalten.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-041](041-image-storage-contract.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T067 · Composer-Medien Und Abschnittsformatierung: Bilder und Link-Cards eines Thread-Abschnitts beim Neuformatieren erhalten, auch wenn der Abschnitt dadurch keinen Text mehr enthaelt.
- T068 · Composer-Medien Und Abschnittsformatierung: Medienbehaftete, dadurch leere Thread-Abschnitte sichtbar belassen und mit einer klaren Loeschmoeglichkeit versehen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
