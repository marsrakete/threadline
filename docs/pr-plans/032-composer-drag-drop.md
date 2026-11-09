# feat: Bildauswahl und Verschieben im Composer verbessern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-032 · Priorität: P2

## Problem und Ziel

Drag-and-Drop und Bildverschiebung zwischen Segmenten benötigen belastbare Desktop-/Touch-Abdeckung.

## Geplanter Umfang

Vorhandene Drop-/Move-Abläufe testen und sichtbare Ziele/Mehrfachauswahl dort ergänzen, wo das Bedienkonzept klar ist. Leere und volle Segmente sowie Reihenfolge erhalten.

## Abnahme

- [ ] Desktop, Touch, Sammel-Drop, Maximalzahl und Verschieben über Segmentgrenzen prüfen. Kein Bildverlust und keine doppelten oder unsichtbaren Medien.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T048 · Composer: Drag-and-Drop fuer Bilder weiter testen: Desktop, Touch, leerer Abschnitt und voller Abschnitt.
- T049 · Composer: Optional bessere Mehrfachauswahl oder Sammel-Drop fuer Bilder pruefen.
- T050 · Composer: Pruefen, ob Bilder zwischen Segmenten noch sichtbarer verschoben werden koennen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
