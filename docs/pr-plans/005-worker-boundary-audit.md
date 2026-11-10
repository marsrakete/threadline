# refactor: verbleibende Workergrenzen erfassen und bereinigen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-005 · Priorität: P1

## Problem und Ziel

Die bisherigen Domänen sind weitgehend ausgelagert; der übergreifende Modularisierungspunkt ist weiterhin offen und enthält veraltete Restbereichsangaben.

## Geplanter Umfang

Verbleibende Funktionen, Archive-Wave-Verdrahtung und gemeinsame Normalisierungen inventarisieren. Eine klar abgegrenzte verbleibende Verantwortung extrahieren oder dokumentiert als Einstieg belassen; weitere große Blöcke als eigene Folge-PRs benennen.

## Abnahme

- [ ] Funktionsinventar und Import-/Aufrufernachweis vorlegen. Jede tatsächliche Extraktion mit Vertrag und betroffenen Browseraufrufern prüfen. Kein Versions- oder Cachebump.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T001 · Modularisierung - Reihenfolge Der Naechsten Schritte: `sw.js` weiter nach Domaenen aufteilen: Suche, DM, Archivlaufsteuerung/-modelle/-Threadservice sowie Quellen-/Wiederherstellungs-/Ergebnisaufbau, Seitenkollektion, Metrikbatches, Avatar-/Linkkarten-/Bildassets und Wellenabschluss sowie Threadimport und die komplette Worker-Analyse sind ausgelagert. Gemeinsamer XRPC-Transport, Authdatenmodelle und IndexedDB-Zugriff sind gekapselt. Login/Session-Erneuerung und DID-/PDS-Aufloesung sind an explizite Dienste gebunden. Kontowechsel/-import/-entfernen, Logout und Sessionpruefung sind im Kontodienst gekapselt. Gemeinsame Post-/Like-/Aktivitaets-/Graph-/Followdaten sind im Netzwerkdatendienst gekapselt. Netzwerk-Slice-/Fokus-/Mutuals-Steuerung und Profilzusammenfuehrung sind im Netzwerk-Arbeitsbereichsdienst gekapselt. Composer-Bildspeicher mit Hydrierung und Referenzbereinigung ist ausgelagert. Worker-Bildnormalisierung ist als eigenes Modell mit bisherigem Speicherformat gekapselt; Unterschiede zum Frontend sind getestet. Thread-Explorer-Record-/Baummodelle sind im Explorer-Modell gekapselt. Feedregeln und Feed-/Thread-/URL-/Quellenladen sind in Feedmodell und Ladedienst gekapselt. Medien-/Avatarhydrierung samt Cache-/Timeout-/Heartbeatregeln ist im Hydrierungsdienst gekapselt; reine Sammlungshelfer liegen im Explorermodell. Reaktionsladen ist im Reaktionsdienst gekapselt. Medienexportpfade/-Manifeste liegen im Medienexportmodell. Medienscan-/Downloadablaeufe sind im Medienexportdienst gekapselt; reine Abbruchregeln liegen im Medienmodell. Richtext-/Mentionmodelle und Aufloesungs-/Suchdienst sind gekapselt. Einstellungs-/Entwurfsfeldmodelle und Lese-/Speicherablaeufe sind gekapselt. Replyberechtigung und Editpruefung sind in Modell/Pruefdienst gekapselt. Posting- und Interaktionsschreibdienste sind ausgelagert. Als Naechstes verbleibende Worker-Verdrahtungs-/Helfergrenzen und Normalisierungen inventarisieren und die offene Gesamt-/Browserabnahme angehen. Gesamtmodularisierung weiterhin offen. Weitere verbleibende Bereiche: Richtext/Mentions, Medienexport, Einstellungen/Entwuerfe und Posting/Reply. Gesamtmodularisierung noch nicht abgeschlossen.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
