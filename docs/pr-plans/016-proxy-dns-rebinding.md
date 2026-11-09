# fix: WordPress-Proxy gegen DNS-Rebinding härten

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-016 · Priorität: P2

## Problem und Ziel

Zwischen DNS-Prüfung und eigentlichem Request wird erneut aufgelöst; die geprüfte Adresse ist nicht sicher die verwendete.

## Geplanter Umfang

Adressvalidierung mit dem tatsächlichen Verbindungsziel verknüpfen. Redirects, IPv4/IPv6 und private/Link-local-Ziele berücksichtigen und den WordPress-Transportvertrag erhalten.

## Abnahme

- [ ] Wechselnde DNS-Antworten, Redirectketten und gesperrte IP-Bereiche mit kontrollierter Infrastruktur prüfen; erlaubte öffentliche Ziele weiterhin erfolgreich laden.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T015 · Sicherheit / OWASP: `P2` Proxy-SSRF-Haertung: Das WordPress-Plugin prueft Hosts per DNS vor dem eigentlichen `wp_remote_get`, verbindet danach aber erneut ueber den Hostnamen. Gegen DNS-Rebinding oder andere TOCTOU-Faelle ist das noch nicht hart genug.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
