(function () {
  "use strict";

  const gate = document.getElementById("adminGate");
  const shell = document.getElementById("adminShell");
  const form = document.getElementById("adminLoginForm");
  const email = document.getElementById("adminEmail");
  const password = document.getElementById("adminPassword");
  const message = document.getElementById("adminLoginMessage");
  const submit = document.getElementById("adminLoginButton");
  const logout = document.getElementById("adminLogout");

  function setMessage(value, isError) {
    message.textContent = value || "";
    message.classList.toggle("success", !isError && Boolean(value));
  }

  function revealAdmin(user) {
    document.body.classList.remove("admin-locked");
    document.body.classList.add("admin-unlocked");
    gate.hidden = true;
    shell.hidden = false;
    const account = document.getElementById("adminAccount");
    if (account) account.textContent = user.email || "Angemeldet";
    window.dispatchEvent(new CustomEvent("quiz-admin-ready", { detail: { user } }));
  }

  function showGate() {
    document.body.classList.add("admin-locked");
    document.body.classList.remove("admin-unlocked");
    shell.hidden = true;
    gate.hidden = false;
    window.setTimeout(() => email.focus(), 0);
  }

  async function verifyAndReveal(user) {
    if (!user) return false;
    const allowed = await QuizLive.isAdmin();
    if (!allowed) {
      await QuizLive.client.auth.signOut();
      throw new Error("Dieses Konto ist nicht für die Quizsteuerung freigeschaltet.");
    }
    revealAdmin(user);
    return true;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const loginEmail = email.value.trim();
    const loginPassword = password.value;
    if (!loginEmail || !loginPassword) {
      setMessage("Bitte E-Mail-Adresse und Passwort eingeben.", true);
      return;
    }

    submit.disabled = true;
    setMessage("Anmeldung wird geprüft …", false);
    try {
      const { data, error } = await QuizLive.client.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });
      if (error) throw error;
      await verifyAndReveal(data.user);
      password.value = "";
      setMessage("", false);
    } catch (error) {
      await QuizLive.client.auth.signOut();
      setMessage(
        error.message === "Invalid login credentials"
          ? "E-Mail-Adresse oder Passwort ist nicht korrekt."
          : QuizUtils.errorMessage(error, "Anmeldung nicht möglich."),
        true
      );
      password.focus();
    } finally {
      submit.disabled = false;
    }
  });

  logout.addEventListener("click", async () => {
    await QuizLive.client.auth.signOut();
    password.value = "";
    setMessage("Erfolgreich abgemeldet.", false);
    showGate();
  });

  async function initializeAuth() {
    showGate();
    setMessage("Bestehende Anmeldung wird geprüft …", false);
    try {
      const { data, error } = await QuizLive.client.auth.getSession();
      if (error) throw error;
      if (data.session && await verifyAndReveal(data.session.user)) {
        setMessage("", false);
      } else {
        setMessage("", false);
      }
    } catch (error) {
      await QuizLive.client.auth.signOut();
      setMessage(QuizUtils.errorMessage(error, "Anmeldung konnte nicht geprüft werden."), true);
      showGate();
    }
  }

  initializeAuth();
})();
