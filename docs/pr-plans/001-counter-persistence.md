# fix: „Zähler anhängen“ über Neustarts speichern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-001 · Priorität: P1

## Problem und Ziel

Eine abgewählte Zähleroption ist beim nächsten App-Start wieder aktiv. Die ausdrücklich gewählte Einstellung muss erhalten bleiben.

## Geplanter Umfang

Control, Speicherpayload, Worker-Normalisierung und Wiederherstellung verfolgen. Ausschließlich die Zähleroption korrigieren; einen fehlenden Legacywert vom expliziten false unterscheiden.

## Abnahme

- [ ] Option deaktivieren, speichern, Seite und Worker neu starten und den deaktivierten Zustand auf beiden Einstiegen prüfen. Danach aktivieren und erneut prüfen; fehlende Legacywerte mit dem bisherigen Standard testen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T041 · Composer: Bug (Nutzermeldung): Post-Einstellung `Zähler anhängen` persistiert nicht. Reproduktion: Post-Einstellungen oeffnen, `Zähler anhängen` abwaehlen, App schliessen und erneut starten. Beobachtet: Option ist wieder aktiviert. Erwartet: Die deaktivierte Einstellung bleibt nach Neustart erhalten. Speicher- und Wiederherstellungspfad pruefen und mit einem Neustart-/Reload-Regressionstest absichern.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
