# feat: Unicode-Schriftformatierung im Composer ergänzen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-034 · Priorität: P3

## Problem und Ziel

Der Composer soll eine Schriftformatierung ähnlich dem verlinkten Bluesky-Formatter anbieten.

## Geplanter Umfang

Lokale Transformation der Auswahl mit klaren Hinweisen zur Unicode-Darstellung integrieren. Vor externer Codeübernahme Lizenz und Eignung prüfen; keinen Text an Drittanbieter senden.

## Abnahme

- [ ] Auswahl, Undo, Emojis, diakritische Zeichen, Zeichenlimits und Facetpositionen nach Transformation prüfen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T052 · Composer: Composer: Schrift-Formatierer fuer Bluesky integrieren, zum Beispiel auf Basis des [Bluesky Text Formatters von Nuelink](https://nuelink.com/tools/bluesky-text-formatter).

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
