# STACK7-Live# STACK 7

**Projektstand:** 23\. Oktober 2026
**Projektart:** Physisches Gruppenspiel mit digitaler Begleit\-App
**Ziel:** Entwicklung möglichst vollständig über ein Android\-Smartphone – ohne PC\.

## 1\. Projektidee

STACK 7 ist ein selbst entwickeltes Spiel für **2–12 Spieler**\. Es kombiniert:

- Push\-your\-luck\-Entscheidungen
- Einen physischen Chip\-Turm nach dem Stapelprinzip
- Risiko, Einsätze und Versicherungen
- Spielkarten mit besonderen Effekten
- Eine digitale Punkte\-App

Ziel ist es, möglichst viele Chips zu gewinnen\. Die Zahl **7** ist zentral: Bei Turmhöhen von **7, 14 und 21 Chips** werden Checkpoints ausgelöst\.

## 2\. Geplante Spielregeln

- Jeder Spieler startet mit **20 Chips**\.
- In der Mitte befindet sich ein gemeinsamer Pot\.
- Pro Zug setzt ein Spieler **1–3 Chips**\.
- Eine Versicherung kostet nach bisherigem Plan **2 Chips**\.
- Pro Zug darf freiwillig eine Karte gespielt werden\.
- Bei den Checkpoints 7, 14 und 21 entscheiden alle Spieler gleichzeitig zwischen **CASH OUT** und **STAY**\.

> **Offen:** Die Regeln für Checkpoints, Schulden, Versicherung, Turmstürze und die genaue Abwicklung von Gewinnen und Verlusten müssen noch abschließend festgelegt werden. Bis dahin sind die Angaben als Entwurf zu verstehen.

## 3\. Geplantes Kartendeck

Insgesamt **48 Karten**:

|Karte |Anzahl|Geplante Funktion                                                    |
|------|-----:|---------------------------------------------------------------------|
|DOUBLE|12    |Verstärkt den eigenen Gewinn, erhöht aber das Verlustrisiko          |
|INSURE|12    |Kostenlose Versicherung                                              |
|STEAL |12    |Chips von einem anderen Spieler nehmen; Risiko von 7 Schulden        |
|BLOCK |8     |Verhindert einen Booster des nächsten Spielers                       |
|BUST  |4     |Löst einen absichtlichen Turzsturz aus; andere Spieler zahlen 2 Chips|

Die endgültigen Kartentexte und Interaktionen müssen noch mit den vollständigen Spielregeln abgeglichen werden\.

## 4\. Komponenten und Herstellung

### Spielchips

- Geplant: **120 Chips**
- Farben: **7 Farben plus Schuld\-Chips**
- Durchmesser: **30 mm**
- Höhe: **4 mm**
- Herstellung: Anycubic Kobra 3

### Karten

- Anzahl: **48**
- Format: Pokerkarten, **63 × 88 mm**
- Druck: A4\-Bögen auf einem Epson\-Drucker, anschließend ausschneiden

### Turmbasis

- Projektname: **BASE 7**
- Geplante Ausgabe: STL\-Datei für den 3D\-Druck

### Noch zu erstellende Dateien

- STL\-Dateien für Chips und BASE 7
- Druckfertige PDF\-Dateien für die Karten
- Passender G\-Code für den Anycubic Kobra 3
- HTML\-, CSS\- und JavaScript\-Dateien für die App

> G-Code muss auf den konkreten Drucker, das Material und die Druckeinstellungen abgestimmt werden. Er sollte vor dem Druck überprüft werden.

## 5\. STACK 7 LIVE – digitale Begleit\-App

Die App soll im mobilen Browser funktionieren und möglichst keine Installation benötigen\.

### Geplante Funktionen

- Spieler hinzufügen
- Startkapital von 20 Chips pro Spieler
- Punkteaktionen: **\+1**, **\+7** und **−2**
- Aktionen für STEAL und BUST
- Gemeinsamen Pot anzeigen und verwalten
- Turmhöhe anzeigen
- Checkpoints bei 7, 14 und 21
- Status **RUINIERT**
- Aktionsprotokoll
- Räume über einen Raumcode
- Live\-Synchronisierung zwischen mehreren Smartphones

### Vorgesehene Technik

- HTML, CSS und JavaScript
- Firebase Realtime Database für gemeinsame Spielstände
- Firebase Authentication für Authentifizierung
- Netlify als mögliche Hosting\-Plattform

### Aktueller technischer Status

- Firebase ist noch nicht eingerichtet\.
- Die App wurde noch nicht erfolgreich veröffentlicht\.
- Die Synchronisierung auf mehreren Geräten wurde noch nicht erfolgreich getestet\.
- Ein früher HTML\-Prototyp wurde im Chat bereitgestellt; er ist als Entwicklungsgerüst zu betrachten\.

Für einen echten Multiplayer\-Betrieb müssen insbesondere Berechtigungen, Datenvalidierung, Spielzustandsübergänge und Schutz vor manipulierten Spielaktionen umgesetzt und getestet werden\.

## 6\. Entwicklung ohne PC

Die Entwicklung soll möglichst direkt über ein Android\-Smartphone erfolgen\.

Bevorzugter Arbeitsablauf:

1. Projektdateien auf dem Smartphone erstellen und bearbeiten\.
2. HTML\-Prototyp im mobilen Browser testen\.
3. Spielregeln und Spiellogik anhand von Testspielen überprüfen\.
4. Firebase einrichten und Zugriffsregeln konfigurieren\.
5. App veröffentlichen und auf mehreren Smartphones testen\.
6. Druckvorlagen als PDF exportieren\.
7. STL\-Dateien und Druckeinstellungen für den 3D\-Druck vorbereiten\.

## 7\. Empfohlene Projektstruktur

```text
stack-7/
├── README.md
├── app/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── cards/
│   └── README.md
├── 3d/
│   ├── chips/
│   └── base-7/
└── docs/
    └── rules.md
```

Dies ist eine vorgeschlagene Struktur\. Die Ordner und Dateien müssen noch angelegt werden\.

## 8\. Nächste Schritte

- [ ] Spielregeln für Einsätze, Versicherung, Schulden und Turmstürze finalisieren
- [ ] Kartenfunktionen und Kartentexte eindeutig festlegen
- [ ] Lokalen HTML\-Prototyp erstellen und auf Android testen
- [ ] Chip\- und Pot\-Logik implementieren
- [ ] Checkpoints und CASH OUT / STAY implementieren
- [ ] Aktionsprotokoll und RUINIERT\-Status ergänzen
- [ ] Firebase\-Projekt einrichten
- [ ] Sichere Datenbankregeln und Multiplayer\-Logik entwickeln
- [ ] App veröffentlichen und mit mehreren Geräten testen
- [ ] Druckfertige Kartenvorlagen erstellen
- [ ] STL\-Dateien für Chips und BASE 7 erstellen
- [ ] Druckeinstellungen prüfen und Testdrucke durchführen

## 9\. Wichtige Projektprinzipien

- **Mobile\-first:** Alle wichtigen Entwicklungsschritte sollen auf Android möglich sein\.
- **Erst lokal testen:** Die grundlegende Spiellogik soll ohne Server testbar sein\.
- **Regeln vor Multiplayer:** Unklare Spielregeln müssen vor der finalen Online\-Implementierung entschieden werden\.
- **Sicherheit:** Vertraue bei Multiplayer\-Spielen nicht ausschließlich auf Berechnungen im Browser\. Kritische Aktionen müssen zuverlässig validiert werden\.
- **Testen:** Vor Veröffentlichung müssen Spielabläufe, Randfälle und mehrere Geräte geprüft werden\.