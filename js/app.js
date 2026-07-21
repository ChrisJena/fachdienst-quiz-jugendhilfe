(function () {
  "use strict";

  const cfg = window.QUIZ_CONFIG;

  function text(value) {
    return value == null ? "" : String(value).trim();
  }

  function normalizeHeader(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
  }

  function parseQuestions(rows) {
    const headerIndex = rows.findIndex(row => row.some(cell => normalizeHeader(cell) === "nr"));
    if (headerIndex < 0) throw new Error("Die Kopfzeile mit der Spalte ‚Nr.‘ wurde nicht gefunden.");

    const headers = rows[headerIndex].map(normalizeHeader);
    const column = name => headers.indexOf(name);
    const requiredColumns = {
      nr: column("nr"),
      aktiv: column("aktiv"),
      themenbereich: column("themenbereich"),
      frage: column("frage"),
      richtigeantwort: column("richtigeantwort"),
      einheit: column("einheit"),
      auflosungstext: column("auflosungstext"),
      hintergrundmotiv: column("hintergrundmotiv")
    };

    const missing = Object.entries(requiredColumns)
      .filter(([, index]) => index < 0)
      .map(([name]) => name);
    if (missing.length) throw new Error(`In der Excel-Datei fehlen Spalten: ${missing.join(", ")}.`);

    const questions = rows.slice(headerIndex + 1)
      .filter(row => {
        const active = text(row[requiredColumns.aktiv]).toLowerCase();
        return ["ja", "1", "x", "aktiv", "true"].includes(active);
      })
      .filter(row => row.some(value => text(value) !== ""))
      .map((row, index) => {
        const number = Number(row[requiredColumns.nr]);
        const answer = Number(row[requiredColumns.richtigeantwort]);
        const question = {
          id: number,
          roundTitle: text(row[requiredColumns.themenbereich]),
          question: text(row[requiredColumns.frage]),
          correctAnswer: answer,
          unit: text(row[requiredColumns.einheit]),
          explanation: text(row[requiredColumns.auflosungstext]),
          background: text(row[requiredColumns.hintergrundmotiv])
        };

        const rowNumber = headerIndex + index + 2;
        if (!Number.isInteger(number) || number < 1) throw new Error(`Die Nummer in Excel-Zeile ${rowNumber} ist ungültig.`);
        if (!question.roundTitle) throw new Error(`Themenbereich in Excel-Zeile ${rowNumber} fehlt.`);
        if (!question.question) throw new Error(`Fragetext in Excel-Zeile ${rowNumber} fehlt.`);
        if (!Number.isInteger(answer)) throw new Error(`Die richtige Antwort in Excel-Zeile ${rowNumber} muss eine ganze Zahl sein.`);
        if (!question.explanation) throw new Error(`Auflösungstext in Excel-Zeile ${rowNumber} fehlt.`);
        return question;
      })
      .sort((a, b) => a.id - b.id);

    if (!questions.length) throw new Error("In der Excel-Datei ist keine aktive und vollständig ausgefüllte Frage vorhanden.");
    questions.forEach((question, index) => {
      if (question.id !== index + 1) {
        throw new Error("Die aktiven Fragen müssen fortlaufend mit 1, 2, 3 … nummeriert sein.");
      }
    });
    return questions;
  }

  async function loadQuestions() {
    if (!window.XLSX) throw new Error("Die lokale Excel-Lesekomponente konnte nicht geladen werden.");
    const separator = cfg.questionsFile.includes("?") ? "&" : "?";
    const response = await fetch(`${cfg.questionsFile}${separator}v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Die Datei ${cfg.questionsFile} konnte nicht geladen werden (${response.status}).`);

    const bytes = await response.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
    const sheet = workbook.Sheets[cfg.questionsSheet];
    if (!sheet) throw new Error(`Das Tabellenblatt „${cfg.questionsSheet}“ wurde nicht gefunden.`);
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    window.QUIZ_QUESTIONS = parseQuestions(rows);
    return window.QUIZ_QUESTIONS;
  }

  function setBackground(element, path, fallback) {
    const selected = path || fallback || "";
    if (selected) element.style.backgroundImage = `url("${selected}")`;
  }

  function showLoadError(error, target = document.body) {
    console.error(error);
    const previous = target.querySelector(".load-error");
    if (previous) previous.remove();
    const box = document.createElement("section");
    box.className = "load-error";
    const strong = document.createElement("strong");
    strong.textContent = "Quiz konnte nicht geladen werden.";
    const message = document.createElement("span");
    message.textContent = error && error.message ? error.message : String(error);
    const hint = document.createElement("small");
    hint.textContent = "Bitte Internetverbindung und Konfiguration prüfen.";
    box.append(strong, message, hint);
    target.appendChild(box);
  }

  window.QuizUtils = {
    loadQuestions,
    parseQuestions,
    getQuestion(index) {
      return (window.QUIZ_QUESTIONS || [])[index] || null;
    },
    setBackground,
    showLoadError,
    formatNumber(value) {
      const number = Number(value);
      return Number.isFinite(number) ? new Intl.NumberFormat("de-DE").format(number) : "";
    },
    errorMessage(error, fallback = "Es ist ein Fehler aufgetreten.") {
      const raw = error && error.message ? error.message : String(error || "");
      return raw.replace(/^.*?exception:\s*/i, "").trim() || fallback;
    }
  };
})();
