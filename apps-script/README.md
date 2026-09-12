# Google Sheet + Apps Script aufsetzen (Schritt 8/9)

Diese Schritte machst du einmalig in deinem eigenen Google-Konto — das kann
ich nicht für dich ausführen, da es dein Google-Login braucht. Dauert ca.
10 Minuten.

## Schritt 8 — Sheet + Script anlegen

1. Gehe zu [sheets.google.com](https://sheets.google.com) und erstelle ein
   neues, leeres Sheet. Nenne es z. B. **„Berger Fest — Anmeldungen“**.
2. Im Sheet: **Erweiterungen → Apps Script**. Es öffnet sich der Script-Editor
   in einem neuen Tab.
3. Lösche den Beispielcode (`function myFunction() {...}`) im Editor komplett.
4. Öffne [Code.gs](Code.gs) aus diesem Projekt, kopiere den gesamten Inhalt
   und füge ihn im Script-Editor ein.
5. Oben das Projekt benennen (z. B. „Berger Fest Webhook“) und mit dem
   Speichern-Symbol speichern.
6. Links im Editor auf das Zahnrad **Projekteinstellungen** klicken, dann
   unten bei **Script-Properties** auf **Property hinzufügen**:
   - Name: `FORM_TOKEN`
   - Wert: derselbe Wert wie `token` in [assets/config.js](../assets/config.js)
     (aktuell `berger-fest-2026` — du kannst das ändern, muss aber an beiden
     Stellen exakt gleich sein).
   - Speichern.

## Schritt 9 — Als Web App bereitstellen

1. Zurück im Script-Editor: oben rechts **Bereitstellen → Neue Bereitstellung**.
2. Bei „Typ auswählen“ das Zahnrad klicken → **Web App**.
3. Einstellungen:
   - Beschreibung: z. B. „v1“
   - Ausführen als: **Ich** (dein Konto)
   - Zugriff: **Alle** (nötig, damit das Formular ohne Login senden kann)
4. **Bereitstellen** klicken. Google fragt nach Berechtigungen — bestätigen
   (ggf. „Erweitert“ → „Zu Berger Fest Webhook (unsicher) wechseln“, das ist
   normal bei eigenen, unveröffentlichten Scripts).
5. Du bekommst eine **Web-App-URL**, die auf `/exec` endet. Diese URL
   kopieren.
6. In [assets/config.js](../assets/config.js) bei `webhookUrl` genau diese
   URL eintragen, z. B.:
   ```js
   webhookUrl: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
7. Datei speichern.

## Testen

1. Öffne die `/exec`-URL direkt im Browser — es sollte „Berger Fest Webhook
   läuft.“ erscheinen (das ist `doGet`, nur ein Health-Check).
2. Öffne `index.html` (lokal oder über GitHub Pages), fülle das Formular
   testweise aus und sende ab.
3. Im Google Sheet sollte ein neuer Tab **„Anmeldungen“** mit einer Kopfzeile
   und deiner Testzeile erscheinen — Spalte **Zählt** als angehakte Checkbox.
4. Du solltest eine Bestätigungsmail an die eingetragene Adresse bekommen
   (kommt von deinem Google-Konto, das das Script ausführt).
5. Testzeile danach im Sheet manuell löschen.

## Bei Änderungen am Code.gs

Jede Änderung an `Code.gs` braucht eine **neue Bereitstellung**
(Bereitstellen → Bereitstellungen verwalten → Stift-Symbol bei der aktiven
Bereitstellung → Version: „Neue Version“ → Bereitstellen). Die `/exec`-URL
bleibt dabei gleich, du musst `assets/config.js` also nicht erneut anpassen.

## Wie die Spalte „Zählt“ funktioniert

Jede Person landet als eigene Zeile im Sheet, „Zählt“ ist standardmäßig
angehakt. Bei doppelten oder fehlerhaften Anmeldungen hakst du die
überflüssige Zeile manuell ab — kein automatischer Abgleich, du behältst die
Kontrolle über die Zahlen fürs Catering.
