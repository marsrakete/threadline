# feat: Archivmetadaten als Tabelle exportieren

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-039 · Priorität: P3

## Problem und Ziel

Archivmetadaten sollen außerhalb des HTML-/PDF-Archivs auswertbar sein.

## Geplanter Umfang

CSV-Schema mit Post-/Thread-/Zeit-/Medienfeldern und definiertem Encoding festlegen. Sensible Felder und Formelinjektion berücksichtigen; Export explizit auslösen.

## Abnahme

- [ ] Kommas, Anführungszeichen, Zeilenumbrüche, Unicode, leeres Archiv und Tabellenkalkulations-Formelpräfixe testen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T062 · Archiv-Exports: CSV- oder Tabellenexport fuer Archiv-Metadaten pruefen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
