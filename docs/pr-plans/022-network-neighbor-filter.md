# feat: Netzwerk auf Mutuals und direkte Nachbarn filtern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-022 · Priorität: P3

## Problem und Ziel

Große Netzwerke benötigen eine gezielte Ansicht der gemeinsamen Mutuals und ihrer direkten Nachbarn.

## Geplanter Umfang

Optionalen Filter mit klarer Definition direkter Nachbarn und nachvollziehbarem Rücksetzen umsetzen; vollständigen Datenbestand behalten.

## Abnahme

- [ ] Bekannten Testgraph mit isolierten Knoten und Nachbarn filtern. Mengen, Kanten, Auswahl und Wiederherstellung der Gesamtansicht prüfen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-020](020-mutuals-focus-list.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T023 · Netzwerk Und Analyse: Netzwerkfilter pruefen: optional `nur gemeinsame Mutuals + direkte Nachbarn`.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
