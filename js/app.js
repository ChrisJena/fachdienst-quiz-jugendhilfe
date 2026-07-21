(function () {
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

    const missing = Object.entries(requiredColumns).filter(([, index]) => index < 0).map(([name]) => name);
    if (missing.length) throw new Error(`In der Excel-Datei fehlen Spalten: ${missing.join(", ")}.`);

    const questions = rows.slice(headerIndex + 1)
      .filter(row => text(row[requiredColumns.aktiv]).toLowerCase() !== "nein")
      .filter(row => row.some(value => text(value) !== ""))
      .map((row, index) => {
        const number = Number(row[requiredColumns.nr]);
        const answer = Number(row[requiredColumns.richtigeantwort]);
        const question = {
          id: Number.isInteger(number) ? number : index + 1,
          roundTitle: text(row[requiredColumns.themenbereich]),
          question: text(row[requiredColumns.frage]),
          correctAnswer: answer,
          unit: text(row[requiredColumns.einheit]),
          explanation: text(row[requiredColumns.auflosungstext]),
          background: text(row[requiredColumns.hintergrundmotiv])
        };

        const rowNumber = headerIndex + index + 2;
        if (!question.roundTitle) throw new Error(`Themenbereich in Excel-Zeile ${rowNumber} fehlt.`);
        if (!question.question) throw new Error(`Fragetext in Excel-Zeile ${rowNumber} fehlt.`);
        if (!Number.isInteger(answer)) throw new Error(`Die richtige Antwort in Excel-Zeile ${rowNumber} muss eine ganze Zahl sein.`);
        if (!question.explanation) throw new Error(`Auflösungstext in Excel-Zeile ${rowNumber} fehlt.`);
        return question;
      })
      .sort((a, b) => a.id - b.id);

    if (!questions.length) throw new Error("In der Excel-Datei ist keine aktive und vollständig ausgefüllte Frage vorhanden.");
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

  function calculatePoints(guess, correct, elapsedSeconds) {
    const numericGuess = Number(guess);
    const numericCorrect = Number(correct);
    const elapsed = Math.max(0, Math.min(Number(elapsedSeconds) || 0, cfg.answerDurationSeconds));
    if (!Number.isFinite(numericGuess) || !Number.isFinite(numericCorrect)) {
      return { accuracy: 0, speed: 0, total: 0, relativeDeviation: 1 };
    }

    const deviation = Math.abs(numericGuess - numericCorrect);
    const relativeDeviation = numericCorrect === 0
      ? (deviation === 0 ? 0 : 1)
      : deviation / Math.abs(numericCorrect);
    const accuracyFactor = Math.max(0, 1 - Math.min(relativeDeviation, 1));
    const timeFactor = Math.max(0, 1 - elapsed / cfg.answerDurationSeconds);
    const accuracy = Math.round(cfg.maxAccuracyPoints * accuracyFactor);
    const speed = Math.round(cfg.maxSpeedBonus * timeFactor * accuracyFactor);
    return { accuracy, speed, total: accuracy + speed, relativeDeviation };
  }

  window.QuizUtils = {
    loadQuestions,
    calculatePoints,
    getQuestion(index) {
      return (window.QUIZ_QUESTIONS || [])[index] || null;
    },
    setBackground(element, path) {
      if (path) element.style.backgroundImage = `url("${path}")`;
    },
    showLoadError(error, target = document.body) {
      console.error(error);
      const box = document.createElement("section");
      box.className = "load-error";
      box.innerHTML = `<strong>Quizfragen konnten nicht geladen werden.</strong><span>${error.message}</span><small>Bitte Excel-Datei und Dateinamen prüfen.</small>`;
      target.appendChild(box);
    }
  };
})();
