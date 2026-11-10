# test: vollständigen Thread-Explorer-Bedienablauf absichern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-038 · Priorität: P1

## Problem und Ziel

Gezielte Teiltests ersetzen keinen vollständigen Bedienablauf mit breiten und tiefen Threads.

## Geplanter Umfang

Repräsentative Fixtures für Quotes, Cards, fehlende Avatare und Medien sammeln. Feedladen, Auswahl, Rootladen, Falten, Zoom, Drag und Orientierung in einem realen UI-Ablauf prüfen.

## Abnahme

- [ ] Beide Einstiege, schmale/breite Viewports und pageerror-Erfassung verwenden. Netzwerkfixtures klar von Liveabnahme unterscheiden.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-007](007-explorer-screenshot-stability.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T058 · Tests Und Pruefungen: Browser-Smoke-Test fuer Thread Explorer: Feed laden, Post anklicken, Root laden, Fold/Open, Zoom, Drag, Orientierung wechseln.
- T059 · Tests Und Pruefungen: Testdaten fuer breite Threads, tiefe Threads, Quotes, Link-Cards, fehlende Avatare und Medienposts sammeln.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
