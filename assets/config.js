/**
 * Berger Fest — Konfiguration
 *
 * Das ist die einzige Datei, die du im Alltag anfassen musst: Termine, Texte,
 * Menünamen, die Webhook-Adresse. Nach jeder Änderung einfach speichern —
 * kein Build-Schritt nötig.
 *
 * TODO-Markierungen unten sind Platzhalter, die du vor der Veröffentlichung
 * ersetzt.
 */

window.BERGER_FEST_CONFIG = {
  // ---- Absicherung gegen Bots (kein echtes Geheimnis) ----
  // Muss mit dem Wert der Script Property FORM_TOKEN in Apps Script übereinstimmen.
  token: "berger-fest-2026", // TODO: eigenen Wert wählen, in Apps Script gleich setzen

  webhookUrl:
    "https://script.google.com/macros/s/AKfycbyO-teZFDh3nHMI1PYSpNyyPAutq3GGHYYVXiVX9HS-MGU-0LSBdxnc3oH2kCger5AF/exec",

  // ---- Eckdaten des Fests ----
  event: {
    name: "Berger Fest",
    dateIso: "2026-10-24",
    dateDisplay: "Samstag, 24. Oktober 2026",
    timeDisplay: "ab 17:30 Uhr",
    // Für den "Zum Kalender hinzufügen"-Link. Ohne Zeitzonen-Suffix (kein
    // "Z"), damit Kalender-Apps es als lokale Uhrzeit übernehmen.
    startIso: "2026-10-24T17:30:00",
    durationHours: 6,
    // TODO: Anmeldeschluss festlegen
    rsvpDeadlineIso: "2026-10-10",
    rsvpDeadlineDisplay: "10. Oktober 2026",
    location: {
      name: "Restaurant Safran Zunft",
      address: "Gerbergasse 11, 4001 Basel",
      mapsUrl: "https://maps.app.goo.gl/mM9TSKCVfXPCGsJ49",
    },
  },

  // ---- Begrüßungstext (oberhalb des Formulars) ----
  greeting: {
    heading: "Wir feiern das Berger Fest und freuen uns auf dich!",
    body:
      "Am 24. Oktober 2026 kommt die Familie zusammen. Melde dich und alle, " +
      "die mit dir kommen, hier gleich an. Das dauert nur ein paar Minuten. " +
      "Egal ob du für dich allein oder gleich für die ganze Familie ausfüllst: " +
      "beides passt.",
  },

  // ---- Accordion-Inhalte ----
  // Aktuell nur ein Platzhalter-Feld — Infos zu Ort, Zeitplan, Anfahrt etc.
  // kommen später dazu, sobald sie feststehen.
  sections: [
    {
      id: "info",
      title: "Info",
      body:
        "Hier kann man noch Info hinzufügen. Zum Beispiel den Ort: " +
        "Restaurant Safran Zunft, Gerbergasse 11, 4001 Basel.",
      showMap: true,
      showIcsButton: true,
    },
  ],

  // ---- Menülinien ----
  // "value" ist der technische Schlüssel (wird 1:1 so im Sheet gespeichert),
  // "label" ist der sichtbare, ausgeschriebene Name.
  menus: [
    { value: "alles", label: "Alles (Fleisch)" },
    { value: "vegetarisch", label: "Vegetarisch" },
  ],

  // ---- Familienstämme ----
  // Die 10 Geschwister der Großeltern-Generation, als Stammhalter der
  // Familie. Jede Anmeldung wählt oben im Formular einen Stamm aus, damit
  // sich die große Familie im Sheet zuordnen lässt.
  familyStems: [
    "Max",
    "Paul",
    "Fritz",
    "Ernst",
    "Elisabeth",
    "Peter",
    "Willi",
    "Theres",
    "Karl",
    "Werner",
  ],

  // ---- Texte für Status-Auswahl ----
  status: {
    yes: { value: "ja", label: "Ich komme", icon: "✓" },
    no: { value: "nein", label: "Kann leider nicht", icon: "✗" },
  },

  // ---- Sonstige Texte ----
  copy: {
    familyStemLabel: "Familienstamm",
    familyStemHint: "Von welchem der zehn Geschwister stammt deine Familie ab?",
    familyStemPlaceholder: "Bitte wählen",
    emailLabel: "Deine E-Mail-Adresse",
    emailHint: "Für die Bestätigung.",
    noteLabel: "Anmerkungen (optional)",
    notePlaceholder: "z. B. späterer Ankunftszeitpunkt, Fragen ...",
    addPersonPrompt: "Meldest du noch jemanden mit an?",
    calendarIcsLabel: "ICS-Datei",
    addPersonButton: "+ Weitere Person hinzufügen",
    submitButton: "Anmeldung absenden",
    submitButtonLoading: "Wird gesendet …",
    successHeading: "Danke! :)",
    successBodyTemplate:
      "Wir freuen uns auf euch am {date}. Eine Bestätigung ist unterwegs an {email}.",
    errorHeading: "Verbindung hat nicht geklappt",
    errorBody:
      "Deine Eingaben sind noch da. Versuch es gleich nochmal. Falls es " +
      "weiter nicht klappt, melde dich einfach direkt bei uns.",
    hostContactEmail: "gian.berger@bluewin.ch", // Notausgang bei Fehlern
  },
};
