# fix: lange Archivläufe zuverlässig fortsetzen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-028 · Priorität: P2

## Problem und Ziel

Lange Läufe benötigen belastbare Wiederaufnahme nach Pause, Abbruch und Neustart.

## Geplanter Umfang

Vorhandene Cursor-/Checkpointgrenzen untersuchen und eine konkrete Lücke schließen. Fortsetzungszustand versionieren, falls das Format wirklich geändert werden muss.

## Abnahme

- [ ] Neustart zwischen Seiten, vor/nach Assetverarbeitung und nach Speicherfehlern testen. Keine unbemerkten Postverluste oder doppelten Assets.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-026](026-archive-progress.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T032 · Archiv-Funktion: Robustere Resume-Strategien bei langen Archivlaeufen pruefen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
