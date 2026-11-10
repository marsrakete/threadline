# fix: Bildbearbeitungsmetadaten konsistent speichern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-041 · Priorität: P1

## Problem und Ziel

Der Worker verwirft fitMode und Validierungsdimensionen, obwohl das Frontend diese Felder nutzt.

## Geplanter Umfang

Bestehende Frontend-/Workerverträge bewusst angleichen und Legacy-Edit-Inferenz erhalten. Persistiertes Format und Bestandsdatenkompatibilität dokumentieren.

## Abnahme

- [ ] Bearbeitete Bilder speichern, neu laden und Uploadvorschau vergleichen. Alte Datensätze ohne neue Felder, Rotation/Zoom und Dimensionsvalidierung prüfen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T066 · Composer-Medien Und Abschnittsformatierung: Frontend-/Worker-Bildformat gezielt angleichen: Worker verwirft bisher `edit.fitMode` und Validierungsdimensionen (`width`, `height`, `exceedsDimensions`), waehrend das Frontend sie fuehrt. Vor Aenderung Reload-/Bestandsdatenverhalten und Legacy-Edit-Inferenz mit echten Bildfaellen absichern; bestehender Unterschied ist in `tests/worker-composer-image-models.test.cjs` dokumentiert.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
