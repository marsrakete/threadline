# feat: Archivphasen und Wartezustände verständlich zeigen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-026 · Priorität: P2

## Problem und Ziel

Archivläufe wirken bei langen Phasen oder großen Accounts wie hängen geblieben; Filterwirkung ist nicht klar genug.

## Geplanter Umfang

Vorhandene Phasen, laufenden Fortschritt, Filterumfang und Hinweise zu großen Konten sichtbar machen. Wartende Anfragen von tatsächlichen Fehlern unterscheiden.

## Abnahme

- [ ] Langsame Antworten, Retry/Backoff, leere Auswahl und große Datenmengen simulieren. Status muss korrekt bleiben und darf keinen unbelegten Fertigstellungsgrad zeigen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T028 · Archiv-Funktion: Archivlauf transparenter machen: mehr sichtbare Phasen anzeigen.
- T029 · Archiv-Funktion: Archivlauf transparenter machen: Filter klarer erklaeren.
- T030 · Archiv-Funktion: Archivlauf transparenter machen: bessere Hinweise bei sehr grossen Accounts.
- T033 · Archiv-Funktion: Mehr Schutz vor missverstaendlichen Haengern in einzelnen Archivphasen einbauen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
