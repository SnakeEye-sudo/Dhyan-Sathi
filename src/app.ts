(() => {
  const root = document.getElementById("appRoot");
  if (!root) return;

  const STORAGE_KEY = "dhyan-sathi-state";
  const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"preset":25,"remaining":1500,"running":false,"cycle":"focus","completed":0,"task":"Math revision"}');
  let timerId = 0;

  root.innerHTML = `
    <section class="section-stack">
      <article class="tool-card">
        <div class="toolbar">
          <div>
            <p class="eyebrow">Study watch</p>
            <h3>Deep work ka calm timer</h3>
          </div>
          <div class="button-row">
            <button class="mode-btn active" data-preset="25" type="button">25 min</button>
            <button class="mode-btn" data-preset="45" type="button">45 min</button>
            <button class="mode-btn" data-preset="60" type="button">60 min</button>
          </div>
        </div>
        <div class="focus-stage">
          <p class="mini-label" id="cycleLabel">Focus session</p>
          <strong class="timer-clock" id="clockText">25:00</strong>
          <div class="progress-track"><div class="progress-bar" id="progressBar"></div></div>
          <div class="button-row">
            <button class="action-btn primary" id="toggleBtn" type="button">Start</button>
            <button class="ghost-btn" id="skipBtn" type="button">Switch cycle</button>
            <button class="ghost-btn" id="resetBtn" type="button">Reset</button>
          </div>
        </div>
      </article>

      <article class="tool-card">
        <p class="eyebrow">Task anchor</p>
        <label class="field-label" for="taskInput">Aaj kis cheez par focus karna hai?</label>
        <input class="text-input" id="taskInput" type="text" placeholder="e.g. Physics numericals">
        <div class="result-panel">
          <p class="mini-label">Session note</p>
          <strong id="taskEcho">Math revision</strong>
          <p class="muted" id="focusHint">Start dabate hi countdown chalega aur break ke baad cycle flip hogi.</p>
        </div>
      </article>
    </section>

    <aside class="section-stack">
      <article class="info-card">
        <p class="eyebrow">Focus stats</p>
        <div class="score-row"><span>Completed cycles</span><strong id="doneCount">0</strong></div>
        <div class="score-row"><span>Current preset</span><strong id="presetCount">25m</strong></div>
        <div class="score-row"><span>Break rule</span><strong>5m reset</strong></div>
      </article>
      <article class="info-card">
        <p class="eyebrow">Rhythm</p>
        <div class="history-grid">
          <div class="history-card"><strong>Focus</strong><span class="muted">Phone door, one task only.</span></div>
          <div class="history-card"><strong>Break</strong><span class="muted">Paani, stretch, breath.</span></div>
        </div>
      </article>
    </aside>
  `;

  const clockText = document.getElementById("clockText");
  const cycleLabel = document.getElementById("cycleLabel");
  const progressBar = document.getElementById("progressBar");
  const toggleBtn = document.getElementById("toggleBtn");
  const doneCount = document.getElementById("doneCount");
  const presetCount = document.getElementById("presetCount");
  const taskInput = document.getElementById("taskInput");
  const taskEcho = document.getElementById("taskEcho");
  const focusHint = document.getElementById("focusHint");

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function totalSeconds() {
    return state.cycle === "focus" ? state.preset * 60 : 5 * 60;
  }

  function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  async function maybeNotify(text) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification("Dhyan Sathi", { body: text });
    }
  }

  function render() {
    clockText.textContent = formatTime(state.remaining);
    cycleLabel.textContent = state.cycle === "focus" ? "Focus session" : "Break session";
    toggleBtn.textContent = state.running ? "Pause" : "Start";
    doneCount.textContent = String(state.completed);
    presetCount.textContent = `${state.preset}m`;
    taskInput.value = state.task;
    taskEcho.textContent = state.task || "One important task";
    focusHint.textContent = state.cycle === "focus"
      ? "Focused sprint chal raha hai."
      : "Break lo, phir naya focus round ready hai.";
    const progress = ((totalSeconds() - state.remaining) / totalSeconds()) * 100;
    progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    document.querySelectorAll("[data-preset]").forEach((button) => {
      button.classList.toggle("active", Number(button.getAttribute("data-preset")) === state.preset);
    });
  }

  function switchCycle(autoCompleted) {
    if (state.cycle === "focus") {
      if (autoCompleted) state.completed += 1;
      state.cycle = "break";
      state.remaining = 5 * 60;
      void maybeNotify("Focus round complete. 5 minute break lo.");
    } else {
      state.cycle = "focus";
      state.remaining = state.preset * 60;
      void maybeNotify("Break khatam. Agla focus round ready hai.");
    }
    save();
    render();
  }

  function stopTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = 0;
    state.running = false;
    save();
    render();
  }

  function startTimer() {
    if (state.running) return;
    state.running = true;
    save();
    render();
    timerId = window.setInterval(() => {
      state.remaining -= 1;
      if (state.remaining <= 0) {
        stopTimer();
        switchCycle(true);
        return;
      }
      save();
      render();
    }, 1000);
  }

  document.getElementById("toggleBtn")?.addEventListener("click", () => {
    if (state.running) stopTimer();
    else startTimer();
  });
  document.getElementById("skipBtn")?.addEventListener("click", () => {
    stopTimer();
    switchCycle(false);
  });
  document.getElementById("resetBtn")?.addEventListener("click", () => {
    stopTimer();
    state.remaining = totalSeconds();
    save();
    render();
  });
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      stopTimer();
      state.preset = Number(button.getAttribute("data-preset")) || 25;
      state.cycle = "focus";
      state.remaining = state.preset * 60;
      save();
      render();
    });
  });
  taskInput?.addEventListener("input", () => {
    state.task = taskInput.value.trim();
    save();
    render();
  });

  render();
})();