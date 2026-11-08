# fix: Archiv-PDF-Kopf und Thumbnailplatzhalter korrigieren

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-011 · Priorität: P2

## Problem und Ziel

Threadhintergründe können Kopf-/Hinweistexte überdecken; fehlende Vorschaubilder bekommen nicht ausreichend Kartenhöhe.

## Geplanter Umfang

Zeichenreihenfolge und Höhenberechnung im vorhandenen PDF-Layout korrigieren. Normale und fehlgeschlagene Medienfälle im gleichen Layoutpfad behandeln.

## Abnahme

- [ ] PDFs rendern und Kopf sowie Placeholder visuell vergleichen. Lange Hinweise, Seitenwechsel und fehlende Vorschaubilder mit Layoutbounds prüfen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T011 · Aktueller Pruefstand Und Offene Abnahme: Bestehende Archiv-PDF-Layoutkanten separat korrigieren: Thread-Hintergrund kann Band-/Hinweistext im Kopf ueberdecken; bei fehlgeschlagenem Vorschaubild beruecksichtigt die Kartenhoehe den Thumbnail-Platzhalter nicht vollstaendig. Im Alt-/Neu-Vergleich unveraendert, durch den neuen visuellen Test sichtbar.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
