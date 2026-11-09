# test: Backup-Erinnerung und „Später“ absichern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-019 · Priorität: P2

## Problem und Ziel

Die Erinnerung muss bei fehlenden und alten Backups korrekt erscheinen und bei frischen Backups ausbleiben.

## Geplanter Umfang

Zeitabhängigen Erinnerungsablauf mit kontrollierter Uhr und persistierter Später-Aktion prüfen; bestehende Texte und Grenzen beibehalten.

## Abnahme

- [ ] Kein Backup, jünger/älter als 30 Tage und Grenzzeitpunkt testen; Später darf nicht sofort erneut erinnern und muss nach Reload konsistent bleiben.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T019 · Backup Und Lokale Daten: Backup-Erinnerung testen: kein Backup, Backup juenger als 30 Tage, Backup aelter als 30 Tage, `Spaeter`.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
