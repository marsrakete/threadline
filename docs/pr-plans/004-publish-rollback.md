# feat: unvollständige Threads auf Wunsch zurücknehmen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-004 · Priorität: P2

## Problem und Ziel

Nach einem Teilfehler benötigt die Person eine kontrollierte Möglichkeit, bereits veröffentlichte Teile zurückzunehmen.

## Geplanter Umfang

Explizite Aktion mit Rückwärtsreihenfolge, zugehörigen Gate-Records, Einzelstatus und Wiederholung fehlgeschlagener Schritte anbieten. Sichtbare Posts/Antworten berücksichtigen; keine ungefragte oder als atomar dargestellte Rücknahme.

## Abnahme

- [ ] Erster/späterer Postfehler, Gatefehler, unklares Timeout, bereits fehlende Records, Löschfehler und abgelaufene Auth testen. Nur kontrollierte Schreibantworten automatisiert verwenden.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-002](002-publish-created-references.md), [PR-003](003-publish-timeout-reconciliation.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T042 · Composer: Optionale Aktion `Unvollstaendigen Thread zuruecknehmen` nach einem Teilfehler anbieten; keine ungefragte automatische Loeschung. Bereits sichtbare Posts und Antworten bei der Entscheidung beruecksichtigen.
- T044 · Composer: Ruecknahme mit expliziter Nutzeraktion in umgekehrter Erstellreihenfolge ausfuehren; zugehoerige Gate-Records mitberuecksichtigen, einzelne Loeschfehler anzeigen und fehlgeschlagene Schritte erneut versuchen koennen. Keine atomare Ruecknahme versprechen.
- T046 · Composer: Ruecknahme mit kontrollierten Schreib-/Loeschantworten testen: Fehler beim ersten/spaeteren Post, Gatefehler nach erfolgreichem Create, unbekanntes Timeout-Ergebnis, bereits entfernte Records, Loeschfehler und fehlgeschlagene erneute Authentifizierung.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
