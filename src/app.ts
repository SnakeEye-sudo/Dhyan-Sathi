type StudyLog = {
  task: string;
  seconds: number;
  completedAt: string;
};

type State = {
  preset: number;
  remaining: number;
  running: boolean;
  overlayVisible: boolean;
  task: string;
  completedFocusRounds: number;
  logs: StudyLog[];
};

(() => {
  const root = document.getElementById("appRoot");
  if (!root) return;

  const STORAGE_KEY = "dhyan-sathi-state-v2";
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as State | null;
  const state: State = saved || {
    preset: 50,
    remaining: 50 * 60,
    running: false,
    overlayVisible: false,
    task: "Aaj ki padhai",
    completedFocusRounds: 0,
    logs: []
  };

  let timerId = 0;
  let wakeLock: WakeLockSentinel | null = null;

  root.innerHTML = `
    <div class="app-shell">
      <section class="topbar">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">◎</div>
          <div>
            <p class="eyebrow">Immersive study watch</p>
            <h1>Dhyan Sathi</h1>
          </div>
        </div>
        <div class="top-actions">
          <span class="chip">Fullscreen watch</span>
          <span class="chip">Daily tracking</span>
          <span class="chip">Monthly praise</span>
        </div>
      </section>

      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Focus without clutter</p>
          <h2>Padhai start karo aur puri screen watch me ghus jao.</h2>
          <p>Timer start hote hi analog watch overlay full screen mode me aa sakta hai, screen wake lock try karta hai, aur session complete hone par study log update karta hai. System notifications ko web app fully band nahi kar sakta, isliye zen mode ke saath DND on karna best rahega.</p>
          <div class="preset-row" id="presetRow"></div>
        </div>
        <div class="hero-card">
          <div>
            <p class="eyebrow">Live timer</p>
            <h3 class="clock-number" id="heroClock">50:00</h3>
          </div>
          <p id="heroTaskLine">Task set karo aur focus mode start karo.</p>
          <div class="mini-tags" id="heroTags"></div>
        </div>
      </section>

      <section class="dashboard-grid">
        <article class="panel">
          <div>
            <p class="eyebrow">Current session</p>
            <h3>Study watch controls</h3>
          </div>
          <label class="task-field">
            <span>Task / subject</span>
            <input class="text-input" id="taskInput" type="text" placeholder="Physics numericals">
          </label>
          <div class="watch-card">
            <p class="micro-label">Session state</p>
            <h4 class="clock-number" id="mainClock">50:00</h4>
            <p id="watchHint">Focus mode ready hai.</p>
            <div class="control-row">
              <button class="primary-btn" id="toggleBtn" type="button">Start focus</button>
              <button class="ghost-btn" id="resetBtn" type="button">Reset</button>
              <button class="ghost-btn" id="overlayBtn" type="button">Watch kholo</button>
            </div>
          </div>
          <div class="motivation">
            <p class="eyebrow">Motivation</p>
            <h4 id="motivationLine">Aaj ka ek focused session bhi kal se behtar hai.</h4>
          </div>
        </article>

        <article class="panel">
          <div>
            <p class="eyebrow">Study dashboard</p>
            <h3>Roz ka hisaab</h3>
          </div>
          <div class="mini-stats" id="statsGrid"></div>
          <div>
            <p class="eyebrow">Recent study logs</p>
            <div class="history-list" id="historyList"></div>
          </div>
        </article>
      </section>
    </div>

    <section class="focus-overlay" id="focusOverlay" aria-hidden="true">
      <div class="overlay-content">
        <div class="watch-stage">
          <div class="overlay-digital" id="overlayDigital">50:00</div>
          <div class="analog-watch">
            <div class="watch-ring"></div>
            <div id="tickRing"></div>
            <div class="watch-hand hour" id="hourHand"></div>
            <div class="watch-hand minute" id="minuteHand"></div>
            <div class="watch-hand second" id="secondHand"></div>
            <div class="analog-center">
              <div>
                <div id="overlayTask">Aaj ki padhai</div>
                <small id="overlayStatus">Focus mode</small>
              </div>
            </div>
          </div>
        </div>

        <div class="overlay-side">
          <article class="overlay-card">
            <p class="eyebrow">Zen mode</p>
            <h3 id="overlayTitle">Focus chal raha hai</h3>
            <p id="overlayMotivation">Saans stable rakho, nazar kaam par rakho, aur timer ko bas flow me chalne do.</p>
          </article>
          <article class="overlay-card">
            <p class="eyebrow">Today</p>
            <h3 id="overlayTodayTotal">0 min</h3>
            <p id="overlayMonthTotal">Is month ka total yahan dikh raha hai.</p>
          </article>
          <div class="overlay-actions">
            <button class="overlay-btn primary" id="overlayToggleBtn" type="button">Pause</button>
            <button class="overlay-btn" id="overlayExitBtn" type="button">Watch band karo</button>
          </div>
        </div>
      </div>
    </section>
  `;

  const heroClock = document.getElementById("heroClock");
  const mainClock = document.getElementById("mainClock");
  const heroTaskLine = document.getElementById("heroTaskLine");
  const heroTags = document.getElementById("heroTags");
  const watchHint = document.getElementById("watchHint");
  const motivationLine = document.getElementById("motivationLine");
  const taskInput = document.getElementById("taskInput") as HTMLInputElement | null;
  const statsGrid = document.getElementById("statsGrid");
  const historyList = document.getElementById("historyList");
  const toggleBtn = document.getElementById("toggleBtn");
  const overlayBtn = document.getElementById("overlayBtn");
  const focusOverlay = document.getElementById("focusOverlay");
  const overlayDigital = document.getElementById("overlayDigital");
  const overlayTask = document.getElementById("overlayTask");
  const overlayStatus = document.getElementById("overlayStatus");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayMotivation = document.getElementById("overlayMotivation");
  const overlayTodayTotal = document.getElementById("overlayTodayTotal");
  const overlayMonthTotal = document.getElementById("overlayMonthTotal");
  const overlayToggleBtn = document.getElementById("overlayToggleBtn");
  const hourHand = document.getElementById("hourHand");
  const minuteHand = document.getElementById("minuteHand");
  const secondHand = document.getElementById("secondHand");
  const tickRing = document.getElementById("tickRing");

  const motivationPool = [
    "Aaj ka ek focused session bhi kal se behtar hai.",
    "Timer ko mat dekho, bas flow ko pakdo.",
    "Thoda thoda roz padhoge to mountain bhi hil jayega.",
    "Distraction kam, repetition zyada, confidence automatic."
  ];

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatTime(seconds: number) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function currentPresetSeconds() {
    return state.preset * 60;
  }

  function todayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function monthKey(date = new Date()) {
    return date.toISOString().slice(0, 7);
  }

  function readLogsFor(filter: (log: StudyLog) => boolean) {
    return state.logs.filter(filter).reduce((sum, log) => sum + log.seconds, 0);
  }

  function humanMinutes(seconds: number) {
    const mins = Math.round(seconds / 60);
    return `${mins} min`;
  }

  function monthlyPraise(monthSeconds: number) {
    if (monthSeconds >= 40 * 3600) return "Is mahine aapne zabardast consistency dikhayi.";
    if (monthSeconds >= 20 * 3600) return "Bahut solid month hai, pace bana hua hai.";
    if (monthSeconds >= 10 * 3600) return "Good build-up hai, isi flow ko maintain rakho.";
    return "Month abhi shuruat par hai, daily sessions add karte raho.";
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator) || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    } catch {
      wakeLock = null;
    }
  }

  async function enterImmersiveMode() {
    state.overlayVisible = true;
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Ignore if fullscreen is blocked.
      }
    }
    await requestWakeLock();
    save();
    render();
  }

  async function exitImmersiveMode() {
    state.overlayVisible = false;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore exit failure.
      }
    }
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch {
        // Ignore.
      }
      wakeLock = null;
    }
    save();
    render();
  }

  function logStudySession(seconds: number) {
    if (seconds < 60) return;
    state.logs.unshift({
      task: state.task || "Focused study",
      seconds,
      completedAt: new Date().toISOString()
    });
    state.logs = state.logs.slice(0, 90);
  }

  function resetTimer(stopOnly = false) {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = 0;
    }
    state.running = false;
    if (!stopOnly) {
      state.remaining = currentPresetSeconds();
    }
    save();
    render();
  }

  function completeFocusRound() {
    logStudySession(currentPresetSeconds());
    state.completedFocusRounds += 1;
    state.running = false;
    state.remaining = currentPresetSeconds();
    void maybeNotify("Session complete. Thoda break le lo, phir next round chalu karo.");
    save();
    render();
  }

  async function maybeNotify(message: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification("Dhyan Sathi", { body: message });
    }
  }

  function startTimer() {
    if (state.running) return;
    state.running = true;
    void enterImmersiveMode();
    save();
    render();
    timerId = window.setInterval(() => {
      state.remaining -= 1;
      if (state.remaining <= 0) {
        window.clearInterval(timerId);
        timerId = 0;
        completeFocusRound();
        return;
      }
      save();
      render();
    }, 1000);
  }

  function pauseTimer() {
    if (!state.running) return;
    resetTimer(true);
  }

  function updateHands() {
    const total = currentPresetSeconds();
    const elapsed = total - state.remaining;
    const progress = elapsed / total;
    const secondAngle = (state.remaining % 60) * 6;
    const minuteAngle = progress * 360;
    const hourAngle = progress * 90;
    hourHand!.setAttribute("style", `transform: rotate(${hourAngle}deg);`);
    minuteHand!.setAttribute("style", `transform: rotate(${minuteAngle}deg);`);
    secondHand!.setAttribute("style", `transform: rotate(${secondAngle}deg);`);
  }

  function renderTicks() {
    tickRing!.innerHTML = Array.from({ length: 12 }, (_, index) => `
      <span class="watch-tick" style="transform: rotate(${index * 30}deg)"></span>
    `).join("");
  }

  function renderStats() {
    const todaySeconds = readLogsFor((log) => log.completedAt.slice(0, 10) === todayKey());
    const monthSeconds = readLogsFor((log) => log.completedAt.slice(0, 7) === monthKey());
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthSeconds = readLogsFor((log) => log.completedAt.slice(0, 7) === monthKey(lastMonthDate));

    statsGrid!.innerHTML = `
      <article class="mini-card">
        <p class="micro-label">Aaj</p>
        <strong>${humanMinutes(todaySeconds)}</strong>
        <p>Aaj itni padhai log hui hai.</p>
      </article>
      <article class="mini-card">
        <p class="micro-label">Is month</p>
        <strong>${humanMinutes(monthSeconds)}</strong>
        <p>${monthlyPraise(monthSeconds)}</p>
      </article>
      <article class="mini-card">
        <p class="micro-label">Last month</p>
        <strong>${humanMinutes(lastMonthSeconds)}</strong>
        <p>Comparison se pace samajh aata hai.</p>
      </article>
    `;

    overlayTodayTotal!.textContent = humanMinutes(todaySeconds);
    overlayMonthTotal!.textContent = `${humanMinutes(monthSeconds)} studied this month. ${monthlyPraise(monthSeconds)}`;
  }

  function renderHistory() {
    historyList!.innerHTML = state.logs.length
      ? state.logs.slice(0, 6).map((log) => `
        <article class="history-item">
          <strong>${log.task}</strong>
          <p>${humanMinutes(log.seconds)} • ${new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(log.completedAt))}</p>
        </article>
      `).join("")
      : '<article class="history-item"><strong>Abhi koi session save nahi hua</strong><p>Ek full round complete karte hi log ban jayega.</p></article>';
  }

  function renderPresets() {
    document.getElementById("presetRow")!.innerHTML = [25, 40, 50, 60].map((value) => `
      <button class="preset-btn ${state.preset === value ? "active" : ""}" data-preset="${value}" type="button">${value} min</button>
    `).join("");
  }

  function render() {
    const timeText = formatTime(state.remaining);
    const todaySeconds = readLogsFor((log) => log.completedAt.slice(0, 10) === todayKey());
    const monthSeconds = readLogsFor((log) => log.completedAt.slice(0, 7) === monthKey());
    const motivation = motivationPool[(state.completedFocusRounds + state.logs.length) % motivationPool.length];

    heroClock!.textContent = timeText;
    mainClock!.textContent = timeText;
    if (taskInput) taskInput.value = state.task;
    heroTaskLine!.textContent = `${state.task || "Aaj ki padhai"} ke liye ${state.preset} min focus preset ready hai.`;
    heroTags!.innerHTML = `
      <span class="chip">Aaj ${humanMinutes(todaySeconds)}</span>
      <span class="chip">Month ${humanMinutes(monthSeconds)}</span>
      <span class="chip">Rounds ${state.completedFocusRounds}</span>
    `;
    watchHint!.textContent = state.running
      ? "Focus chal raha hai. Overlay watch active hai."
      : "Ready ho to focus start karo.";
    motivationLine!.textContent = motivation;
    toggleBtn!.textContent = state.running ? "Pause focus" : "Start focus";
    overlayToggleBtn!.textContent = state.running ? "Pause" : "Resume";
    overlayDigital!.textContent = timeText;
    overlayTask!.textContent = state.task || "Aaj ki padhai";
    overlayStatus!.textContent = `${state.preset} minute study watch`;
    overlayTitle!.textContent = state.running ? "Focus chal raha hai" : "Watch ready hai";
    overlayMotivation!.textContent = motivation;
    focusOverlay!.classList.toggle("active", state.overlayVisible);
    focusOverlay!.setAttribute("aria-hidden", state.overlayVisible ? "false" : "true");
    document.body.classList.toggle("focus-running", state.running || state.overlayVisible);
    renderStats();
    renderHistory();
    renderPresets();
    updateHands();
  }

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const preset = target.closest("[data-preset]") as HTMLElement | null;
    if (!preset) return;
    state.preset = Number(preset.dataset.preset) || 50;
    state.remaining = currentPresetSeconds();
    save();
    render();
  });

  toggleBtn?.addEventListener("click", () => {
    if (state.running) {
      pauseTimer();
      return;
    }
    startTimer();
  });

  overlayToggleBtn?.addEventListener("click", () => {
    if (state.running) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  document.getElementById("resetBtn")?.addEventListener("click", () => {
    if (state.running) {
      const studied = currentPresetSeconds() - state.remaining;
      if (studied > 0) logStudySession(studied);
    }
    resetTimer();
  });

  overlayBtn?.addEventListener("click", () => {
    void enterImmersiveMode();
  });

  document.getElementById("overlayExitBtn")?.addEventListener("click", () => {
    void exitImmersiveMode();
  });

  taskInput?.addEventListener("input", () => {
    state.task = taskInput.value.trim() || "Aaj ki padhai";
    save();
    render();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.running) {
      void requestWakeLock();
    }
  });

  renderTicks();
  render();
})();
