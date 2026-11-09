# test: Browser-Gesamtlauf und Prozessabbau absichern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-009 · Priorität: P1

## Problem und Ziel

Der vollständige Browserlauf und sein Server-/Browserabbau sind nicht zuverlässig abgeschlossen; Befehlsdokumentation muss zur Umgebung passen.

## Geplanter Umfang

Testserverstart, Fehlerpfade und Teardown untersuchen, den Gesamtlauf reproduzierbar machen und unterstützte Standardbefehle mit Voraussetzungen dokumentieren.

## Abnahme

- [ ] Vollständigen Browserlauf mit regulärem Prozessende ausführen und protokollieren. Fehlerpfad darf keine laufenden Server/Browser hinterlassen; gezielte Tests nicht als Gesamtabnahme ausweisen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T008 · Aktueller Pruefstand Und Offene Abnahme: Vollstaendigen Browserlauf in der freigegebenen Testumgebung mit regulaerem Testserver-/Browser-Abbau pruefen; der gezielte HTML-Export-Lauf endet ausserhalb der Sandbox bereits regulaer. Sandbox-Abbruch nicht mit einer erfolgreich abgeschlossenen Gesamtabnahme gleichsetzen.
- T060 · Tests Und Pruefungen: Dokumentierte Standardchecks auf aktuelle Pfade und Befehle abgleichen: `npm run check`, `npm run test:unit`, `npm run test:browser`, `npm run check:encoding` und `git diff --check`.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
