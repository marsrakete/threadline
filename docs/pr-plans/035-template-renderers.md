# refactor: verbleibende Markup-Renderer mit Templates aufbauen

Status: geplant – Beschreibung für einen eigenen Umsetzungs-PR.

Plan-ID: PR-035 · Priorität: P2

## Problem und Ziel

Große Markup-Strings erschweren Strukturpflege und konsistente sichere Textdarstellung.

## Geplanter Umfang

Verbleibende tatsächliche Markuperzeugung inventarisieren und einen zusammenhängenden Renderer auf Templates/DOM umstellen. Bloße Leerungen separat behandeln; weitere unabhängige Renderer als Folge-PRs ausweisen.

## Abnahme

- [ ] Literaltext mit Sonderzeichen, leere Daten, wiederholtes Rendering und vorhandene Aktionen im Browser prüfen; alte Renderinglogik entfernen.
- [ ] Gemeinsame [PR-Abnahmekriterien](../PR-PLAN.md#gemeinsame-abnahmekriterien) erfüllt.

## Abhängigkeiten

Keine fachliche Abhängigkeit zu anderen geplanten Aufgaben. Alle Entwürfe setzen den gesicherten Modularisierungsstand aus [GitHub-PR #1](https://github.com/marsrakete/threadline/pull/1) voraus; vor Umsetzung jeweils aktuellen Basisstand prüfen.

## Zugeordnete TODO-Punkte

- T053 · Guidelines Durchsetzen: Verbleibende grosse Markup-Strings und kontrollierte `innerHTML`-Renderer schrittweise durch `<template>` und DOM-APIs ersetzen; reine Leerungen getrennt von Markup-Erzeugung bewerten.

Quelle: [TODO.md](../../TODO.md). Die T-Nummern beziehen sich auf die Bestandsaufnahme dieses Plans; Aufgaben bleiben in TODO offen, bis ihre jeweilige Umsetzung und Abnahme abgeschlossen sind.
