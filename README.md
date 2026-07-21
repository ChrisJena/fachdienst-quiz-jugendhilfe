# Fachdienst im Dialog – Live-Quiz

## Ansichten

- `index.html` – Smartphone-Ansicht der Teilnehmenden
- `presenter.html` – Präsentationsansicht für die Leinwand
- `admin.html` – Moderationsansicht

## Zentrale Fragenquelle

Alle Fragen werden aus `quizfragen.xlsx`, Tabellenblatt `Quizfragen`, geladen.
Für Änderungen muss nur diese Datei unter demselben Namen ersetzt werden.

Pflichtangaben je aktiver Frage:

- Themenbereich
- Frage
- richtige Antwort als ganze Zahl
- Auflösungstext

Die Antwortzeit beträgt für jede Frage fest 30 Sekunden. Hintergrundbilder
werden in `assets/backgrounds/` gespeichert und in Excel über ihren Dateipfad
zugeordnet, zum Beispiel `assets/backgrounds/frage1.jpg`.

## Punkte

- maximal 1.000 Genauigkeitspunkte
- maximal 200 Zeitbonuspunkte
- der Zeitbonus wird mit der Genauigkeit gekoppelt
- ab 100 Prozent Abweichung werden keine Punkte vergeben

## Test und Veröffentlichung

Die Excel-Datei wird über `fetch()` geladen. Deshalb funktionieren die Seiten
nicht zuverlässig über einen bloßen Doppelklick auf die HTML-Dateien. Das
Projekt muss über GitHub Pages oder einen lokalen Webserver geöffnet werden.

Vor der Veranstaltung nach jeder Änderung an der Excel-Datei alle drei
Ansichten einmal neu laden und in der Adminansicht auf den grünen Hinweis
`Fragen aus Excel geladen` achten.

## Noch offen

- Supabase-Konfiguration und Tabellen
- Live-Synchronisierung zwischen den drei Ansichten
- Speicherung von Antworten und Punkteständen
- finale Rangliste
