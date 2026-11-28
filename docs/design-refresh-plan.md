# Threadline: Plan für Design- und Farbschema-Auswahl

## Ziel

Threadline erhält zwei voneinander unabhängige Darstellungsoptionen in den Einstellungen:

1. **Design:** bisherige Threadline-Oberfläche oder neues Editorial-Design.
2. **Farbschema:** Threadline-Blau/Türkis oder gedeckte Farben in Off-White und Blau.

Der bestehende Dark Mode und der Kompaktmodus bleiben erhalten. Beide Farbschemata brauchen deshalb helle und dunkle Varianten.

## Begriffe und Composer-Prototyp

Das im Prototyp „alte“ Layout ist **nicht** die aktuelle Threadline-Oberfläche. Es ist eine eigenständige Kartenvariante, die dem Nutzer gefällt. Die aktuelle App-Oberfläche ist der tatsächliche Vergleichsstand.

Empfohlene Umsetzung:

- **Bisheriges Threadline-Design:** aktuelle App-Struktur und -Gestaltung.
- **Editorial-Design:** Markante Typografie, klare Raster und feine Linien. Die abgerundeten Karten aus dem Prototyp fließen als Gestaltungselement ein.
- **Farbschemata:** unabhängig vom Design wählbar. So können beide Layouts mit beiden Paletten betrachtet werden.

Die Kartenvariante aus dem Prototyp wird zunächst nicht als drittes vollständiges Design eingeführt. Falls sie später als eigenständige Oberfläche gewünscht ist, kann die Designauswahl erweitert werden.

## Bestandsaufnahme

- [styles.css](../styles.css) enthält die aktuellen Farbvariablen, `theme-dark` und zahlreiche Komponentenregeln.
- [app-shell.js](../js/core/app-shell.js) verwaltet Darstellungseinstellungen, lokale Speicherung, Seitenwechsel-URLs und Einstellungsstatus.
- [app-state.js](../js/core/app-state.js) normalisiert die Einstellungen beim Start.
- [settings-service.js](../js/worker/settings-service.js) lädt und speichert die zentralen App-Einstellungen.
- [app-backup.js](../js/core/app-backup.js) exportiert und importiert Darstellungseinstellungen.
- [index.html](../index.html) und [tools.html](../tools.html) enthalten jeweils einen Einstellungsdialog.
- [app-translations.js](../js/core/app-translations.js) enthält die sichtbaren Texte auf Deutsch, Englisch und Französisch.
- Der Service Worker verwendet eine versionierte App-Shell; Änderungen an CSS und JavaScript benötigen eine passende Cache-Version.

## Arbeitsschritte

### 1. Gestaltungswerte und Verhalten festlegen

- Farben, Typografie, Abstände, Linien, Oberflächen, Radien, Schatten, Fokus- und Fehlerzustände als übersichtliche Designwerte festlegen.
- Trennen, welche Regeln zum **Design** gehören und welche zum **Farbschema**.
- Für beide Paletten helle und dunkle Werte definieren.
- Festlegen, welche Variante für bestehende Installationen und neue Installationen voreingestellt ist. Empfehlung: bestehende Installationen behalten zunächst ihre bisherige Darstellung; neue Installationen starten nach Freigabe im Editorial-Design.

### 2. Theme-CSS ergänzen

- Eine abgegrenzte externe CSS-Datei für Designwerte und Editorial-Regeln ergänzen, die von `index.html` und `tools.html` gemeinsam geladen wird.
- Den bestehenden Threadline-Stil als auswählbare Variante erhalten.
- Neue Editorial-Regeln anhand weniger stabiler Selektoren beziehungsweise `data-*`-Werte anwenden, statt Komponenten-CSS für jede Kombination zu duplizieren.
- Harte Farbwerte in gemeinsam verwendeten Komponenten schrittweise auf Designvariablen umstellen.
- Responsives Verhalten für Sidebar, Composer, Werkzeugbereiche, Karten, Formulare und Dialoge festlegen.

### 3. Einstellungsmodell erweitern

- Zwei normalisierte Werte ergänzen, zum Beispiel `designMode` (`threadline` oder `editorial`) und `colorScheme` (`threadline` oder `muted`).
- Die Werte über den bestehenden Darstellungscontroller auf beide App-Seiten anwenden und früh genug beim Start wiederherstellen, damit kein falsches Farbschema aufblitzt.
- Speicherung in den Worker-Einstellungen und im lokalen Sofort-Cache konsistent halten.
- Seitenwechsel-URLs um die beiden Werte ergänzen und die temporären Parameter nach dem Einlesen entfernen.
- Backup-Export und -Import erweitern; ältere Backups ohne diese Felder müssen weiterhin funktionieren.

### 4. Einstellungen und Übersetzungen ergänzen

- Im Darstellungsbereich zwei zugängliche Auswahlfelder ergänzen: **Design** und **Farbschema**.
- Aktuelle Auswahl sichtbar und per Tastatur bedienbar machen.
- Vorhandene Dark-Mode- und Kompaktmodus-Einstellungen beibehalten.
- Beide Einstellungsdialoge in `index.html` und `tools.html` synchron halten.
- Alle Labels und Statusmeldungen zentral in Deutsch, Englisch und Französisch pflegen.

### 5. Editorial-Design auf die gesamte App ausweiten

- Gemeinsame App-Oberfläche: Kopf-/Seitenbereiche, Sidebar, Workspace-Hintergrund und Navigation.
- Composer: Eingabe, Hashtags, Aktionen, Statusmeldungen und Thread-Abschnitte.
- Werkzeugseite: Archiv, Suche, Netzwerk, Analyse, Thread Explorer und Direktnachrichten.
- Dialoge und wiederverwendete Bedienelemente: Einstellungen, Hilfe, Bestätigungen, Fortschritt und Formulare.
- Bluesky-Postvorschauen und Exportausgaben behalten ihre Darstellung als Zielplattform-Inhalte; das App-Theme darf deren Inhalt nicht verfälschen.

### 6. Prüfung und Auslieferung

- Einstellungen normalisieren, speichern, laden und über Backup-Rundlauf abdecken.
- Beide App-Seiten mit beiden Designs, beiden Farbschemata und Light/Dark-Modus prüfen.
- Desktop- und Mobilansichten auf abgeschnittene Texte, Überlappungen, Fokusdarstellung und Kontrast prüfen.
- Browserprüfungen sammeln `pageerror`-Ereignisse und sichern passende Screenshots oder Geometrieassertions.
- Service-Worker-App-Shell sowie Versions- und Cache-Metadaten synchron aktualisieren.
- Die fertige Änderung als einen zusammenhängenden, reviewbaren Feature-PR liefern.

## Abnahmekriterien

- Design und Farbschema lassen sich unabhängig in den Einstellungen wechseln.
- Die Auswahl bleibt nach Neuladen, App-Neustart, Seitenwechsel und Backup-Import erhalten.
- Dark Mode und Kompaktmodus funktionieren weiterhin mit beiden Designs und Paletten.
- Composer und alle Werkzeugbereiche sind in beiden Designs mobil und am Desktop lesbar.
- Veröffentlichungs- und Exportvorschauen bleiben inhaltlich und visuell auf die Zielplattform ausgerichtet.
- Ältere Einstellungs- und Backup-Daten werden ohne Fehler weiterverwendet.
