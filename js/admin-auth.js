(function () {
  "use strict";

  const SESSION_KEY = "fdQuizAdminUnlocked";
  const ATTEMPTS_KEY = "fdQuizAdminFailedAttempts";
  const LOCK_KEY = "fdQuizAdminLockedUntil";
  const MAX_ATTEMPTS = 5;
  const LOCK_SECONDS = 60;

  const gate = document.getElementById("adminGate");
  const shell = document.getElementById("adminShell");
  const form = document.getElementById("adminLoginForm");
  const input = document.getElementById("adminPin");
  const message = document.getElementById("adminLoginMessage");
  const submit = document.getElementById("adminLoginButton");
  const logout = document.getElementById("adminLogout");

  function revealAdmin() {
    document.body.classList.remove("admin-locked");
    document.body.classList.add("admin-unlocked");
    gate.hidden = true;
    shell.hidden = false;
  }

  function showGate() {
    document.body.classList.add("admin-locked");
    document.body.classList.remove("admin-unlocked");
    shell.hidden = true;
    gate.hidden = false;
    window.setTimeout(() => input.focus(), 0);
  }

  function lockedSeconds() {
    const until = Number(sessionStorage.getItem(LOCK_KEY) || 0);
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  }

  function updateLockMessage() {
    const seconds = lockedSeconds();
    if (!seconds) {
      submit.disabled = false;
      message.textContent = "";
      return;
    }
    submit.disabled = true;
    message.textContent = `Zu viele Fehlversuche. Bitte noch ${seconds} Sekunden warten.`;
    window.setTimeout(updateLockMessage, 1000);
  }

  async function sha256(value) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (lockedSeconds()) return updateLockMessage();

    const candidate = input.value;
    if (!candidate) {
      message.textContent = "Bitte den Zugangscode eingeben.";
      return;
    }

    submit.disabled = true;
    const candidateHash = await sha256(candidate);
    if (candidateHash === window.QUIZ_CONFIG.adminPinHash) {
      sessionStorage.setItem(SESSION_KEY, "true");
      sessionStorage.removeItem(ATTEMPTS_KEY);
      sessionStorage.removeItem(LOCK_KEY);
      input.value = "";
      revealAdmin();
      return;
    }

    const attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) || 0) + 1;
    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
    input.value = "";

    if (attempts >= MAX_ATTEMPTS) {
      sessionStorage.setItem(ATTEMPTS_KEY, "0");
      sessionStorage.setItem(LOCK_KEY, String(Date.now() + LOCK_SECONDS * 1000));
      updateLockMessage();
    } else {
      submit.disabled = false;
      message.textContent = `Zugangscode nicht korrekt. Noch ${MAX_ATTEMPTS - attempts} Versuche.`;
      input.focus();
    }
  });

  logout.addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    showGate();
  });

  if (sessionStorage.getItem(SESSION_KEY) === "true") revealAdmin();
  else showGate();

  updateLockMessage();
})();
