# fix: lokale Viewer-Nutzung und Zugriffsschutz absichern

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-017 · Priorität: P3

## Problem und Ziel

Lokale Startskripte binden nur an Loopback; ein späteres Webserverdeployment hat keine entsprechende Zugriffskontrolle.

## Geplanter Umfang

Lokalen Betriebsmodus ausdrücklich dokumentieren und unbeabsichtigte öffentliche Freigabe verhindern. Für entfernten Betrieb eine klare Auth-/Zugriffsgrenze definieren, bevor er als unterstützt gilt.

## Abnahme

- [ ] Loopbackbindung und Fehlkonfiguration testen; Remotezugriff darf nicht stillschweigend ungeschützte Archivdaten bereitstellen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T016 · Sicherheit / OWASP: `P3` Viewer nur lokal absichern: Die aktuellen Startskripte binden absichtlich nur an `localhost` beziehungsweise `127.0.0.1`. Wenn `viewer/index.php` spaeter auf einem normalen Webserver landet, fehlen Schutzschritte gegen unbefugten Zugriff auf Archivdaten komplett.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
