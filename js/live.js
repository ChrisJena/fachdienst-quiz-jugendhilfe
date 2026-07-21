(function () {
  "use strict";

  const cfg = window.QUIZ_CONFIG;
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("Die Supabase-Browserbibliothek konnte nicht geladen werden.");
  }
  if (!cfg.supabaseUrl || !/^https:\/\/.+\.supabase\.co$/.test(cfg.supabaseUrl)) {
    throw new Error("Die Supabase-Projekt-URL fehlt oder ist ungültig.");
  }
  if (!cfg.supabasePublishableKey || !cfg.supabasePublishableKey.startsWith("sb_publishable_")) {
    throw new Error("Der öffentliche Supabase-Schlüssel fehlt oder ist ungültig.");
  }

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    realtime: { params: { eventsPerSecond: 8 } }
  });

  function unwrap(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  async function rpc(name, args) {
    return unwrap(await client.rpc(name, args || {}));
  }

  async function getState() {
    const rows = await rpc("get_public_state");
    if (!rows || !rows.length) throw new Error("Der Quizstatus wurde nicht gefunden.");
    return rows[0];
  }

  function subscribeState(callback, onError) {
    let stopped = false;
    let loading = false;
    let lastRevision = null;

    const refresh = async force => {
      if (stopped || loading) return;
      loading = true;
      try {
        const state = await getState();
        lastRevision = state.revision;
        callback(state);
      } catch (error) {
        if (onError) onError(error);
      } finally {
        loading = false;
      }
    };

    const channel = client
      .channel(`quiz-state-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "quiz_state",
        filter: "id=eq.1"
      }, () => refresh(true))
      .subscribe(status => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (onError) onError(new Error("Live-Verbindung unterbrochen – automatische Aktualisierung läuft weiter."));
        }
      });

    refresh(true);
    const pollId = window.setInterval(() => refresh(false), 2500);
    const visibilityHandler = () => {
      if (!document.hidden) refresh(true);
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      stopped = true;
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", visibilityHandler);
      client.removeChannel(channel);
    };
  }

  window.QuizLive = {
    client,
    getState,
    subscribeState,
    join(nickname) {
      return rpc("join_quiz", { p_nickname: nickname });
    },
    resume(accessToken) {
      return rpc("resume_quiz", { p_access_token: accessToken });
    },
    submit(participantId, accessToken, guess) {
      return rpc("submit_quiz_answer", {
        p_participant_id: participantId,
        p_access_token: accessToken,
        p_guess: guess
      });
    },
    getRanking() {
      return rpc("get_quiz_ranking");
    },
    isAdmin() {
      return rpc("is_quiz_admin");
    },
    syncQuestions(questions) {
      return rpc("admin_sync_questions", { p_questions: questions });
    },
    adminAction(action) {
      return rpc("admin_quiz_action", { p_action: action });
    }
  };
})();
