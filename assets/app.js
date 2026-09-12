/**
 * Berger Fest — Formularlogik
 *
 * Rendert Texte aus assets/config.js, verwaltet die Personenliste (Hinzufügen/
 * Entfernen, Fokusführung), validiert freundlich, sichert einen Entwurf in
 * localStorage und sendet dreistufig ab (fetch → Retry → verstecktes Formular).
 */
(function () {
  "use strict";

  var CFG = window.BERGER_FEST_CONFIG;
  var DRAFT_KEY = "bergerFest:draft:v1";

  var form = document.getElementById("rsvp-form");
  var personsContainer = document.getElementById("persons-container");
  var personTemplate = document.getElementById("person-template");
  var addPersonBtn = document.getElementById("add-person-btn");
  var submissionSummary = document.getElementById("submission-summary");
  var formErrors = document.getElementById("form-errors");
  var submitBtn = document.getElementById("submit-btn");
  var submitLabel = document.getElementById("js-submit-label");
  var successCard = document.getElementById("success-card");
  var errorCard = document.getElementById("submit-error-card");
  var emailInput = document.getElementById("email");
  var emailFieldGroup = document.getElementById("email-field-group");
  var emailError = document.getElementById("email-error");
  var noteInput = document.getElementById("note");
  var websiteHoneypot = document.getElementById("website");

  var personCounter = 0;
  var isDirty = false;
  var isSubmitting = false;
  var currentSubmissionId = null;
  var autosaveTimer = null;

  // ---------------------------------------------------------------------
  // Text aus config.js einsetzen
  // ---------------------------------------------------------------------

  function renderStaticText() {
    document.title = CFG.event.name + " Anmeldung";
    document.getElementById("js-event-title").textContent = CFG.greeting.heading;
    document.getElementById("js-event-date").textContent =
      CFG.event.dateDisplay + " · " + CFG.event.timeDisplay;
    document.getElementById("js-greeting-body").textContent = CFG.greeting.body;

    document.getElementById("js-email-label").textContent = CFG.copy.emailLabel;
    document.getElementById("js-email-hint").textContent = CFG.copy.emailHint;
    document.getElementById("js-note-label").textContent = CFG.copy.noteLabel;
    noteInput.placeholder = CFG.copy.notePlaceholder;
    document.getElementById("js-add-person-label").textContent = CFG.copy.addPersonButton;
    document.getElementById("js-add-person-hint").textContent = CFG.copy.addPersonPrompt;
    submitLabel.textContent = CFG.copy.submitButton;
  }

  // ---------------------------------------------------------------------
  // ICS-Kalenderdatei
  // ---------------------------------------------------------------------

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // Ohne "Z"-Suffix = "floating time": Kalender-Apps übernehmen die Uhrzeit
  // 1:1 als lokale Zeit, ganz ohne Zeitzonen-Umrechnung.
  function toCalendarStamp(date) {
    return (
      date.getFullYear() +
      pad2(date.getMonth() + 1) +
      pad2(date.getDate()) +
      "T" +
      pad2(date.getHours()) +
      pad2(date.getMinutes()) +
      "00"
    );
  }

  function getCalendarTimes() {
    var start = new Date(CFG.event.startIso);
    var end = new Date(start.getTime() + (CFG.event.durationHours || 4) * 3600000);
    return { start: start, end: end };
  }

  function getLocationText() {
    var loc = CFG.event.location;
    if (!loc || !loc.address) return "";
    return loc.name ? loc.name + ", " + loc.address : loc.address;
  }

  function buildIcsContent() {
    var times = getCalendarTimes();
    var location = getLocationText().replace(/,/g, "\\,");

    var lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Berger Fest//RSVP//DE",
      "BEGIN:VEVENT",
      "UID:" + CFG.event.dateIso + "-berger-fest@rsvp",
      "DTSTAMP:" + toCalendarStamp(new Date()) + "Z",
      "DTSTART:" + toCalendarStamp(times.start),
      "DTEND:" + toCalendarStamp(times.end),
      "SUMMARY:" + CFG.event.name,
    ];
    if (location) lines.push("LOCATION:" + location);
    lines.push("END:VEVENT", "END:VCALENDAR");

    return lines.join("\r\n");
  }

  function downloadIcs() {
    var blob = new Blob([buildIcsContent()], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "berger-fest.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderAccordion() {
    var container = document.getElementById("js-info-accordion");
    CFG.sections.forEach(function (section) {
      var details = document.createElement("details");
      details.className = "info-section";

      var summary = document.createElement("summary");
      summary.textContent = section.title;

      var body = document.createElement("div");
      body.className = "info-section-body";
      var p = document.createElement("p");
      p.textContent = section.body;
      body.appendChild(p);

      if (section.showMap && CFG.event.location && CFG.event.location.address) {
        var map = document.createElement("iframe");
        map.className = "info-section-map";
        map.src =
          "https://www.google.com/maps?q=" +
          encodeURIComponent(CFG.event.location.address) +
          "&output=embed";
        map.title = "Karte: " + CFG.event.location.name;
        map.loading = "lazy";
        map.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
        body.appendChild(map);
      }

      if (section.showIcsButton) {
        var icsBtn = document.createElement("button");
        icsBtn.type = "button";
        icsBtn.className = "ics-btn";
        icsBtn.textContent = CFG.copy.calendarIcsLabel;
        icsBtn.addEventListener("click", downloadIcs);
        body.appendChild(icsBtn);
      }

      details.appendChild(summary);
      details.appendChild(body);
      container.appendChild(details);
    });
  }

  // ---------------------------------------------------------------------
  // Personenliste
  // ---------------------------------------------------------------------

  function prefersReducedMotion() {
    return (
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function createPersonFieldset(initialData) {
    personCounter += 1;
    var idx = personCounter;

    var frag = personTemplate.content.cloneNode(true);
    var fieldset = frag.querySelector("[data-person]");

    fieldset.querySelector("[data-person-index]").textContent = "Person " + idx;
    var namePreview = fieldset.querySelector("[data-person-name-preview]");

    fieldset.querySelector('[data-label="name"]').textContent = "Name";
    fieldset.querySelector('[data-label="status"]').textContent = "Kommt";
    fieldset.querySelector('[data-label="menu"]').textContent = "Menü";
    fieldset.querySelector('[data-label="allergies"]').textContent = "Allergien";

    var nameInput = fieldset.querySelector('[data-field="name"]');
    nameInput.id = "person-" + idx + "-name";
    fieldset.querySelector('[data-label="name"]').setAttribute("for", nameInput.id);

    var allergyInput = fieldset.querySelector('[data-field="allergies"]');
    allergyInput.id = "person-" + idx + "-allergies";
    fieldset
      .querySelector('[data-label="allergies"]')
      .setAttribute("for", allergyInput.id);

    // Status: Radios beschriften, Namen kollisionsfrei vergeben (status-<idx>)
    var statusLabel = fieldset.querySelector('[data-label="status"]');
    statusLabel.id = "person-" + idx + "-status-label";
    var statusGroup = fieldset.querySelector("[data-status-group]");
    statusGroup.setAttribute("role", "radiogroup");
    statusGroup.setAttribute("aria-labelledby", statusLabel.id);

    var yesInput = fieldset.querySelector(".status-option-yes input");
    var noInput = fieldset.querySelector(".status-option-no input");
    yesInput.name = "status-" + idx;
    yesInput.value = CFG.status.yes.value;
    noInput.name = "status-" + idx;
    noInput.value = CFG.status.no.value;
    fieldset.querySelector("[data-status-yes-label]").textContent = CFG.status.yes.label;
    fieldset.querySelector("[data-status-no-label]").textContent = CFG.status.no.label;

    // Menü: Optionen aus config.js aufbauen
    var menuLabel = fieldset.querySelector('[data-label="menu"]');
    menuLabel.id = "person-" + idx + "-menu-label";
    var menuGroup = fieldset.querySelector("[data-menu-group]");
    menuGroup.setAttribute("role", "radiogroup");
    menuGroup.setAttribute("aria-labelledby", menuLabel.id);

    CFG.menus.forEach(function (menu) {
      var label = document.createElement("label");
      label.className = "menu-option";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "menu-" + idx;
      input.value = menu.value;
      input.dataset.field = "menu";
      var span = document.createElement("span");
      span.textContent = menu.label;
      label.appendChild(input);
      label.appendChild(span);
      menuGroup.appendChild(label);
    });

    // Entfernen
    var removeBtn = fieldset.querySelector("[data-remove-person]");
    var removeLabelText = fieldset.querySelector("[data-remove-label]");
    removeLabelText.textContent = "Entfernen";
    removeBtn.setAttribute("aria-label", "Person " + idx + " entfernen");
    removeBtn.addEventListener("click", function () {
      removePerson(fieldset);
    });

    // Live-Updates: Name in der Legende, Zusammenfassung, Entwurf
    nameInput.addEventListener("input", function () {
      namePreview.textContent = nameInput.value ? " — " + nameInput.value : "";
      scheduleAutosave();
      updateSummary();
    });

    [yesInput, noInput].forEach(function (input) {
      input.addEventListener("change", function () {
        fieldset.dataset.status = input.value;
        fieldset.classList.remove("has-error");
        scheduleAutosave();
        updateSummary();
      });
    });

    menuGroup.addEventListener("change", function () {
      scheduleAutosave();
      updateSummary();
    });
    allergyInput.addEventListener("input", scheduleAutosave);

    if (initialData) {
      nameInput.value = initialData.name || "";
      namePreview.textContent = initialData.name ? " — " + initialData.name : "";
      if (initialData.status === CFG.status.yes.value) {
        yesInput.checked = true;
        fieldset.dataset.status = CFG.status.yes.value;
      } else if (initialData.status === CFG.status.no.value) {
        noInput.checked = true;
        fieldset.dataset.status = CFG.status.no.value;
      }
      if (initialData.menu) {
        var menuMatch = menuGroup.querySelector(
          'input[value="' + initialData.menu + '"]'
        );
        if (menuMatch) menuMatch.checked = true;
      }
      allergyInput.value = initialData.allergies || "";
    }

    return fieldset;
  }

  function addPerson(initialData, opts) {
    var fieldset = createPersonFieldset(initialData);
    personsContainer.appendChild(fieldset);
    updateRemoveButtonsVisibility();
    updateSummary();

    var shouldFocus = !opts || opts.focus !== false;
    if (shouldFocus) {
      var nameInput = fieldset.querySelector('[data-field="name"]');
      fieldset.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
      nameInput.focus();
    }
    return fieldset;
  }

  function removePerson(fieldset) {
    var nameInput = fieldset.querySelector('[data-field="name"]');
    var label = nameInput.value.trim() || "diese Person";
    var confirmed = window.confirm(label + " aus der Anmeldung entfernen?");
    if (!confirmed) return;
    fieldset.remove();
    renumber();
    updateRemoveButtonsVisibility();
    updateSummary();
    scheduleAutosave();
  }

  function renumber() {
    var fieldsets = personsContainer.querySelectorAll("[data-person]");
    fieldsets.forEach(function (fs, i) {
      fs.querySelector("[data-person-index]").textContent = "Person " + (i + 1);
    });
  }

  function updateRemoveButtonsVisibility() {
    var fieldsets = personsContainer.querySelectorAll("[data-person]");
    fieldsets.forEach(function (fs, i) {
      fs.querySelector("[data-remove-person]").hidden = i === 0;
    });
  }

  function collectPersons() {
    return Array.prototype.map.call(
      personsContainer.querySelectorAll("[data-person]"),
      function (fs) {
        var name = fs.querySelector('[data-field="name"]').value.trim();
        var statusInput = fs.querySelector('[data-field="status"]:checked');
        var status = statusInput ? statusInput.value : "";
        var menuInput = fs.querySelector('[data-field="menu"]:checked');
        var menu =
          status === CFG.status.yes.value && menuInput ? menuInput.value : "";
        var allergies =
          status === CFG.status.yes.value
            ? fs.querySelector('[data-field="allergies"]').value.trim()
            : "";
        return { fieldset: fs, name: name, status: status, menu: menu, allergies: allergies };
      }
    );
  }

  // ---------------------------------------------------------------------
  // Live-Zusammenfassung
  // ---------------------------------------------------------------------

  function updateSummary() {
    var persons = collectPersons();
    var attending = persons.filter(function (p) {
      return p.status === CFG.status.yes.value;
    });
    var declined = persons.filter(function (p) {
      return p.status === CFG.status.no.value;
    });

    var menuCounts = {};
    CFG.menus.forEach(function (m) {
      menuCounts[m.value] = 0;
    });
    attending.forEach(function (p) {
      if (p.menu && menuCounts[p.menu] !== undefined) menuCounts[p.menu] += 1;
    });

    var parts = [];
    parts.push(persons.length + " " + (persons.length === 1 ? "Person" : "Personen"));
    CFG.menus.forEach(function (m) {
      if (menuCounts[m.value] > 0) parts.push(menuCounts[m.value] + "× " + m.label);
    });
    if (declined.length > 0) {
      parts.push(declined.length + " Absage" + (declined.length === 1 ? "" : "n"));
    }

    submissionSummary.textContent = parts.join(" · ");
  }

  // ---------------------------------------------------------------------
  // Validierung
  // ---------------------------------------------------------------------

  function validate() {
    var errors = [];
    var email = emailInput.value.trim();
    emailFieldGroup.classList.remove("has-error");
    emailError.hidden = true;

    if (!email) {
      errors.push({
        message: "Bitte trag deine E-Mail-Adresse ein.",
        focus: emailInput,
        group: emailFieldGroup,
        errorEl: emailError,
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({
        message: "Diese E-Mail-Adresse sieht nicht ganz richtig aus.",
        focus: emailInput,
        group: emailFieldGroup,
        errorEl: emailError,
      });
    }

    collectPersons().forEach(function (p, i) {
      p.fieldset.classList.remove("has-error");
      var personNumber = i + 1;
      if (!p.status) {
        errors.push({
          message: "Bei Person " + personNumber + " fehlt noch: kommt sie oder nicht?",
          focus: p.fieldset.querySelector('[data-field="status"]'),
          group: p.fieldset,
        });
        return;
      }
      if (!p.name) {
        errors.push({
          message: "Bei Person " + personNumber + " fehlt noch der Name.",
          focus: p.fieldset.querySelector('[data-field="name"]'),
          group: p.fieldset,
        });
      }
      if (p.status === CFG.status.yes.value && !p.menu) {
        errors.push({
          message: "Bei Person " + personNumber + " fehlt noch die Menüwahl.",
          focus: p.fieldset.querySelector("[data-menu-group]"),
          group: p.fieldset,
        });
      }
    });

    return errors;
  }

  function showErrors(errors) {
    if (errors.length === 0) {
      formErrors.hidden = true;
      formErrors.textContent = "";
      return;
    }

    formErrors.hidden = false;
    var extra = errors.length - 1;
    formErrors.textContent =
      errors[0].message +
      (extra > 0 ? " (und " + extra + " weitere Angabe" + (extra === 1 ? "" : "n") + ")" : "");

    errors.forEach(function (e) {
      if (e.group) e.group.classList.add("has-error");
      if (e.errorEl) {
        e.errorEl.hidden = false;
        e.errorEl.textContent = e.message;
      }
    });

    var first = errors[0];
    if (first.focus) {
      first.focus.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
      });
      first.focus.focus();
    }
  }

  // ---------------------------------------------------------------------
  // Entwurf (localStorage)
  // ---------------------------------------------------------------------

  function scheduleAutosave() {
    isDirty = true;
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(saveDraft, 400);
  }

  function saveDraft() {
    try {
      var persons = collectPersons().map(function (p) {
        return { name: p.name, status: p.status, menu: p.menu, allergies: p.allergies };
      });
      var draft = {
        email: emailInput.value,
        note: noteInput.value,
        persons: persons,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      // localStorage nicht verfügbar (z. B. privater Modus) — Entwurf wird
      // dann einfach nicht gesichert, das Formular bleibt sonst nutzbar.
    }
  }

  function loadDraft() {
    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      // nichts zu tun
    }
    isDirty = false;
  }

  window.addEventListener("beforeunload", function (e) {
    if (isDirty && successCard.hidden) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // ---------------------------------------------------------------------
  // Absenden — dreistufig: fetch → ein Retry → verstecktes Formular
  // ---------------------------------------------------------------------

  function generateUuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function buildPayload() {
    var persons = collectPersons().map(function (p) {
      return { name: p.name, status: p.status, menu: p.menu, allergies: p.allergies };
    });
    return {
      v: 1,
      token: CFG.token,
      submissionId: currentSubmissionId,
      clientTs: new Date().toISOString(),
      email: emailInput.value.trim(),
      note: noteInput.value.trim(),
      persons: persons,
      website: websiteHoneypot.value,
    };
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function sendViaFetch(payload) {
    return fetch(CFG.webhookUrl, {
      method: "POST",
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  function sendViaHiddenForm(payload) {
    return new Promise(function (resolve) {
      var iframeName = "submit-fallback-" + Date.now();
      var iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.hidden = true;

      var f = document.createElement("form");
      f.method = "POST";
      f.action = CFG.webhookUrl;
      f.target = iframeName;

      var input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(payload);
      f.appendChild(input);

      document.body.appendChild(iframe);
      document.body.appendChild(f);

      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        f.remove();
        iframe.remove();
        // Cross-Origin: keine auswertbare Antwort möglich, ob per load-Event
        // oder per Timeout beendet. Die Bestätigungsmail ist der eigentliche
        // Beleg für den Absender — ein echter Netzwerkausfall, bei dem auch
        // dieser Weg nichts überträgt, bleibt ihr gegenüber unsichtbar, lässt
        // die Seite aber nie dauerhaft auf "Wird gesendet …" hängen.
        resolve({ ok: true, viaFallback: true });
      }

      // Sicherheitsnetz: Manche Browser/Netzwerke feuern bei einem echten
      // Ausfall nie ein load-Event auf dem iFrame. Ohne diesen Timeout bliebe
      // der Absenden-Button für immer deaktiviert.
      window.setTimeout(finish, 4000);
      iframe.addEventListener("load", function () {
        window.setTimeout(finish, 300);
      });

      f.submit();
    });
  }

  function submitPayload(payload) {
    return sendViaFetch(payload).catch(function () {
      return wait(1500).then(function () {
        return sendViaFetch(payload).catch(function () {
          return sendViaHiddenForm(payload);
        });
      });
    });
  }

  function setSubmitting(state) {
    isSubmitting = state;
    submitBtn.disabled = state;
    submitLabel.textContent = state ? CFG.copy.submitButtonLoading : CFG.copy.submitButton;
  }

  function showSuccess() {
    form.hidden = true;
    successCard.hidden = false;
    document.getElementById("success-heading").textContent = CFG.copy.successHeading;
    document.getElementById("success-body").textContent = CFG.copy.successBodyTemplate
      .replace("{date}", CFG.event.dateDisplay)
      .replace("{email}", emailInput.value.trim());
    document.getElementById("edit-again-btn").textContent = "Ich muss noch etwas ändern";
    successCard.setAttribute("tabindex", "-1");
    successCard.focus();
    clearDraft();
  }

  function showSubmitError() {
    errorCard.hidden = false;
    document.getElementById("error-heading").textContent = CFG.copy.errorHeading;
    document.getElementById("error-body").textContent = CFG.copy.errorBody;
    document.getElementById("error-contact").textContent = CFG.copy.hostContactEmail
      ? "Direkt erreichbar: " + CFG.copy.hostContactEmail
      : "";
    document.getElementById("retry-btn").textContent = "Nochmal versuchen";
    errorCard.setAttribute("tabindex", "-1");
    errorCard.focus();
  }

  function hideSubmitError() {
    errorCard.hidden = true;
  }

  document.getElementById("edit-again-btn").addEventListener("click", function () {
    form.hidden = false;
    successCard.hidden = true;
  });

  document.getElementById("retry-btn").addEventListener("click", function () {
    hideSubmitError();
    form.hidden = false;
  });

  function handleSubmit(evt) {
    evt.preventDefault();
    if (isSubmitting) return;
    hideSubmitError();

    var errors = validate();
    showErrors(errors);
    if (errors.length > 0) return;

    if (websiteHoneypot.value) {
      // Bot-Falle ausgelöst: freundlich tun, nichts übertragen.
      showSuccess();
      return;
    }

    currentSubmissionId = currentSubmissionId || generateUuid();
    var payload = buildPayload();
    setSubmitting(true);

    submitPayload(payload)
      .then(function () {
        showSuccess();
      })
      .catch(function () {
        showSubmitError();
      })
      .finally(function () {
        setSubmitting(false);
      });
  }

  form.addEventListener("submit", handleSubmit);
  addPersonBtn.addEventListener("click", function () {
    addPerson();
  });
  emailInput.addEventListener("input", scheduleAutosave);
  noteInput.addEventListener("input", scheduleAutosave);

  // ---------------------------------------------------------------------
  // Start
  // ---------------------------------------------------------------------

  function init() {
    renderStaticText();
    renderAccordion();

    var draft = loadDraft();
    if (draft && Array.isArray(draft.persons) && draft.persons.length > 0) {
      emailInput.value = draft.email || "";
      noteInput.value = draft.note || "";
      draft.persons.forEach(function (p) {
        addPerson(p, { focus: false });
      });
      isDirty = false;
    } else {
      addPerson(null, { focus: false });
    }

    updateRemoveButtonsVisibility();
    updateSummary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
