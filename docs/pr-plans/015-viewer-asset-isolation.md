# fix: aktive Archivassets im Viewer isolieren

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-015 · Priorität: P1

## Problem und Ziel

Direkt ausgelieferte SVG-/aktive Archivdateien können unter der Viewer-Origin Zugriff auf lokale Archivdaten erhalten.

## Geplanter Umfang

Auslieferung und direkte Assetnavigation untersuchen. Aktive Inhalte zuverlässig deaktivieren oder auf eine getrennte Sicherheitsgrenze legen; Content-Type und Responseheader konsistent setzen.

## Abnahme

- [ ] Präparierte SVG-/HTML-Dateien, direkte Navigation und eingebettete Medien prüfen. Keine Scriptausführung mit Viewerzugriff; normale Bilder bleiben darstellbar.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T014 · Sicherheit / OWASP: `P1` Archiv-Asset-Haertung: Der Viewer liefert archivierte Dateien direkt unter derselben Origin aus, inklusive `svg`. Ein boesartiges SVG aus einem Archiv oder einer externen Card koennte bei direktem Oeffnen aktiven Inhalt ausfuehren und lokale Archivdaten auslesen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
