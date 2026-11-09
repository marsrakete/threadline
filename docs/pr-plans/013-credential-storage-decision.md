# docs: Kontospeicherung und Sicherheitsmodus festlegen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-013 · Priorität: P1

## Problem und Ziel

App-Passwort und Sitzung werden aus Komfortgründen gespeichert; Alternativen haben unterschiedliche Auswirkungen auf Erneuerung und Offlinekomfort.

## Geplanter Umfang

Kein dauerhaftes Passwort, nur Session und optionalen Sicherheitsmodus vergleichen. Bedrohungsmodell, UX und Migration dokumentieren und eine begründete Empfehlung zur Produktentscheidung vorlegen.

## Abnahme

- [ ] Jede Variante auf Login, abgelaufene Tokens, Kontowechsel und bestehende Daten abbilden. Clientseitige Verschlüsselung darf nicht als allgemeiner XSS-Schutz dargestellt werden.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T075 · Allgemein: Persistente Speicherung des Bluesky-App-Passworts erneut pruefen: aktuell aus Komfortgruenden beibehalten, sicherheitlich aber heikel bei XSS, kompromittierten Browser-Erweiterungen oder lokalem Zugriff.
- T076 · Allgemein: Moegliche Sicherheitsalternative pruefen: App-Passwort nicht dauerhaft speichern.
- T077 · Allgemein: Moegliche Sicherheitsalternative pruefen: nur Session speichern.
- T078 · Allgemein: Moegliche Sicherheitsalternative pruefen: optionalen Sicherheitsmodus ohne gespeichertes App-Passwort anbieten.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
