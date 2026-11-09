# test: Backup und Restore aller lokalen Metadaten absichern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-018 · Priorität: P2

## Problem und Ziel

Favoriten und weitere lokale Zustände benötigen einen vollständigen Backup-/Restore-Nachweis.

## Geplanter Umfang

Roundtrip-Fälle für Favoriten, Avatare, Hashtags, History und Workspace ergänzen. README bei tatsächlichen Inhaltsänderungen mitziehen; keine Sitzungstokens in Exportdaten aufnehmen.

## Abnahme

- [ ] Export, frischer Speicher, Import und Reload auf beiden Einstiegen prüfen. Legacydateien und fehlende optionale Bereiche testen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T017 · Backup Und Lokale Daten: Einstellungen-Backup mit lokal gespeicherten Thread-Explorer-Favoriten testen.
- T018 · Backup Und Lokale Daten: Restore testen: Favoriten, Account-Avatare, Hashtags, History und Workspace-Status muessen nach Import wieder verfuegbar sein.
- T020 · Backup Und Lokale Daten: README bei Aenderungen am Backup-Inhalt immer mitziehen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
