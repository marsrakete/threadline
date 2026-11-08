# fix: erstellte Posts vor Gatefehlern erfassen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-002 · Priorität: P1

## Problem und Ziel

Ein Create kann erfolgreich sein, obwohl anschließendes Threadgate/Postgate scheitert. Der aktuelle Teilfehler zählt den Post dann nicht zu den abgeschlossenen Referenzen.

## Geplanter Umfang

Erstellte Referenzen sofort dokumentieren und vollständig an die Fehleroberfläche liefern. Erstellung und Gateabschluss getrennt abbilden; bestehende Felder kompatibel ergänzen. Keine automatische Löschung.

## Abnahme

- [ ] Fehler nach erfolgreichem ersten/späteren Create sowie Threadgate-/Postgatefehler simulieren. Referenzen, sichtbare Restzustände und Teilfehlerdetails auf Dienst- und Browserniveau prüfen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T043 · Composer: Jede erfolgreich erstellte Postreferenz sofort erfassen, auch wenn danach Threadgate-/Postgate-Einstellungen scheitern; Referenzen und verbleibenden Zustand im Teilfehler an die Oberflaeche liefern.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
