# refactor: sichtbare Texte zentralisieren und Titel-Encoding prüfen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-036 · Priorität: P2

## Problem und Ziel

Einzelne sichtbare Texte liegen noch in Fachlogik; fehlerhafte Titelkodierung soll gezielt auffallen.

## Geplanter Umfang

Einen zusammenhängenden verbleibenden Textbereich zentralisieren und einen begrenzten i18n-title-Encodingcheck bewerten/ergänzen. Vorhandene Übersetzungsschlüssel wiederverwenden.

## Abnahme

- [ ] Unterstützte Sprachen, fehlende Schlüssel und gezielte Mojibake-Titel prüfen. Keine legitimen Sonderzeichen als Fehler markieren.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T054 · Guidelines Durchsetzen: Verbleibende sichtbare Texte zentral in `js/core/app-translations.js` halten und Texte in Fachlogik abbauen.
- T061 · Tests Und Pruefungen: Optional: bestehenden Encoding-Check um einen gezielten i18n-title-Scan ergaenzen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
