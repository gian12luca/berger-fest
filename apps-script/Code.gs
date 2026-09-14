/**
 * Berger Fest — Apps-Script-Webhook
 *
 * Nimmt die Anmeldungen vom Formular (assets/app.js) entgegen, schreibt sie
 * ins gebundene Google Sheet (eine Zeile pro Person) und verschickt eine
 * Bestätigungsmail an die Absenderin/den Absender.
 *
 * Dieses Script muss an das Google Sheet gebunden sein (Erweiterungen >
 * Apps Script), damit SpreadsheetApp.getActiveSpreadsheet() das richtige
 * Sheet findet. Siehe apps-script/README.md für die Einrichtung.
 */

// Muss mit assets/config.js -> token übereinstimmen. Wert wird in den
// Script Properties gesetzt (Projekteinstellungen > Script Properties),
// nicht hier im Code.
function getExpectedToken_() {
  return PropertiesService.getScriptProperties().getProperty("FORM_TOKEN");
}

// Sheet-Name, in den geschrieben wird. Wird beim ersten Aufruf angelegt,
// falls er noch nicht existiert.
var SHEET_NAME = "Anmeldungen";

// Muss mit assets/config.js -> menus übereinstimmen (nur für die Texte in
// der Bestätigungsmail).
var MENU_LABELS = {
  alles: "Alles (Fleisch/Fisch)",
  vegi_mit_fisch: "Vegi mit Fisch",
  vegi_ohne_fisch: "Vegi ohne Fisch",
};

var HEADER_ROW = [
  "E-Mail",
  "Name",
  "Status",
  "Menü",
  "Allergien",
  "Anmerkung",
  "Zeitstempel",
  "Zählt",
  "Anmeldung-ID",
];

function doPost(e) {
  try {
    var payload = parsePayload_(e);

    if (!payload || payload.token !== getExpectedToken_()) {
      return jsonResponse_({ ok: false, error: "invalid_token" });
    }

    // Bot-Falle: still "ok" melden, aber nichts speichern oder mailen.
    if (payload.website) {
      return jsonResponse_({ ok: true });
    }

    if (
      !payload.email ||
      !Array.isArray(payload.persons) ||
      payload.persons.length === 0
    ) {
      return jsonResponse_({ ok: false, error: "invalid_payload" });
    }

    // Das Formular versucht bei langsamen/fehlgeschlagenen Antworten bis zu
    // dreimal, dieselbe Anmeldung zu senden (fetch → Retry → verstecktes
    // Formular). Ein Lock verhindert, dass zwei fast gleichzeitige Versuche
    // sich beide für "neu" halten und doppelt schreiben.
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      if (payload.submissionId && isDuplicateSubmission_(payload.submissionId)) {
        return jsonResponse_({ ok: true });
      }
      appendToSheet_(payload);
      sendConfirmationEmail_(payload);
      return jsonResponse_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

// Spalte 9 = Anmeldung-ID (siehe HEADER_ROW). Bereits gespeicherte
// Submission-IDs werden beim erneuten Eintreffen übersprungen.
function isDuplicateSubmission_(submissionId) {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var ids = sheet.getRange(2, 9, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === submissionId) return true;
  }
  return false;
}

// Erlaubt einen schnellen Browser-Check nach dem Deployment.
function doGet(e) {
  return ContentService.createTextOutput(
    "Berger Fest Webhook läuft."
  ).setMimeType(ContentService.MimeType.TEXT);
}

function parsePayload_(e) {
  if (!e || !e.postData) return null;

  // Fallback-Weg (verstecktes Formular): x-www-form-urlencoded mit Feld "payload".
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  // Regulärer Weg (fetch): JSON-String im Body.
  if (e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  return null;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER_ROW);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendToSheet_(payload) {
  var sheet = getSheet_();
  var now = new Date();

  payload.persons.forEach(function (p) {
    var statusLabel = p.status === "ja" ? "Kommt" : "Kann nicht";
    var menuLabel = p.menu ? MENU_LABELS[p.menu] || p.menu : "";

    sheet.appendRow([
      payload.email,
      p.name,
      statusLabel,
      menuLabel,
      p.allergies || "",
      payload.note || "",
      now,
      true,
      payload.submissionId || "",
    ]);
  });
}

function sendConfirmationEmail_(payload) {
  var lines = payload.persons.map(function (p) {
    var status = p.status === "ja" ? "kommt" : "kommt nicht";
    var menu =
      p.status === "ja" && p.menu
        ? " — " + (MENU_LABELS[p.menu] || p.menu)
        : "";
    var allergies = p.allergies ? " (Allergien: " + p.allergies + ")" : "";
    return "- " + p.name + ": " + status + menu + allergies;
  });

  var body =
    "Danke für eure Anmeldung zum Berger Fest am 24. Oktober 2026!\n\n" +
    lines.join("\n") +
    (payload.note ? "\n\nAnmerkung: " + payload.note : "") +
    "\n\nFalls sich etwas ändert, meldet euch einfach nochmal über das " +
    "Formular — die neue Anmeldung wird von Hand mit der alten abgeglichen.";

  GmailApp.sendEmail(payload.email, "Berger Fest — Anmeldung erhalten", body);
}
