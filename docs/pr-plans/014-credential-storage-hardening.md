# fix: lokale Kontospeicherung gemäß Sicherheitskonzept härten

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-014 · Priorität: P1

## Problem und Ziel

Dauerhaft gespeicherte Zugangsdaten erhöhen die Folgen von Browserzugriff und XSS.

## Geplanter Umfang

Die in PR-013 freigegebene Speicherstrategie implementieren, einschließlich Bestehende-Daten-Migration und klarer Sessionerneuerung. Geheimnisse aus öffentlichen Projektionen, Diagnoseausgaben und Exporten heraushalten.

## Abnahme

- [ ] Migration, Logout/Löschen, Backup-Projektion und fehlendes gespeichertes Passwort testen. Login-/Refreshfehler und erneute Anmeldung mit kontrollierten Transportantworten prüfen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

[PR-013](013-credential-storage-decision.md) Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T013 · Sicherheit / OWASP: `P1` Zugangsdaten-Haertung: Bluesky-App-Passwort, Access-JWT und Refresh-JWT liegen derzeit unverschluesselt im Browser-Storage beziehungsweise IndexedDB. Bei XSS, boesartigen Browser-Erweiterungen oder lokalem Geraetezugriff waere eine Konto-Uebernahme realistisch.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
