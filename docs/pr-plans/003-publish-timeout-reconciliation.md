# fix: unklare Create-Ergebnisse vor Wiederholung abgleichen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-003 · Priorität: P1

## Problem und Ziel

Ein Timeout beweist nicht, dass kein Record erstellt wurde. Wiederholung oder Rücknahme benötigt einen eindeutigen Abgleich.

## Geplanter Umfang

Vorab bekannte Recordschlüssel und anschließendes getRecord auf technische Eignung prüfen und den gewählten Ablauf umsetzen. Unsicheren Zustand sichtbar machen; keine blinde Doppelanlage oder Erfolgsbehauptung.

## Abnahme

- [ ] Transportabbruch vor und nach serverseitigem Create, verspätete Antwort, Record vorhanden/fehlend und fehlschlagenden Abgleich testen. Wiederholung darf keine Duplikate erzeugen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-002](002-publish-created-references.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T045 · Composer: Bei unklarem Create-Ergebnis durch Timeout/Verbindungsabbruch vor Wiederholung oder Ruecknahme feststellen, ob der Record angelegt wurde; dafuer vorab bekannte Recordschluessel und anschliessende Repo-Pruefung untersuchen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
