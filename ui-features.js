const $ = (id) => document.getElementById(id);
const gameSection = $("game-section");
const featureStatus = $("feature-status");
const activityList = $("activity-list");
const activityCount = $("activity-count");
const soundToggle = $("sound-toggle");

const storagePrefix = "stack7-local-v1:";
const maxSavedEvents = 100;
const maxVisibleEvents = 30;
const moveButtons = new Map([
  ["btn-place-1", 1],
  ["btn-place-2", 2],
  ["btn-place-3", 3]
]);

let roomKey = null;
let previousState = null;
let store = createEmptyStore();
let settlingUntil = 0;
let syncTimer = null;
let statusTimer = null;
let soundContext = null;
let storageAvailable = true;
const pendingMoves = [];

function createEmptyStore() {
  return { ownTurns: 0, ownChips: 0, events: [] };
}

function announce(message, kind = "success") {
  featureStatus.textContent = message;
  featureStatus.dataset.kind = kind;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    featureStatus.textContent = "";
    delete featureStatus.dataset.kind;
  }, 6000);
}

function persistStore() {
  if (!storageAvailable || !roomKey) return;
  try {
    localStorage.setItem(storagePrefix + roomKey, JSON.stringify({ version: 1, ...store }));
  } catch (error) {
    storageAvailable = false;
    announce(`Lokales Speichern nicht möglich: ${error.message}`, "error");
  }
}

function loadStore(key) {
  if (!storageAvailable) return createEmptyStore();
  try {
    const saved = localStorage.getItem(storagePrefix + key);
    if (!saved) return createEmptyStore();
    const parsed = JSON.parse(saved);
    if (
      parsed?.version !== 1 ||
      !Number.isSafeInteger(parsed.ownTurns) ||
      !Number.isSafeInteger(parsed.ownChips) ||
      !Array.isArray(parsed.events)
    ) {
      announce("Gespeicherte lokale Statistik ist ungültig und wurde ignoriert.", "error");
      return createEmptyStore();
    }
    return {
      ownTurns: Math.max(0, parsed.ownTurns),
      ownChips: Math.max(0, parsed.ownChips),
      events: parsed.events
        .filter((event) =>
          typeof event?.message === "string" &&
          Number.isFinite(event.at) &&
          Number.isFinite(new Date(event.at).getTime())
        )
        .slice(-maxSavedEvents)
    };
  } catch (error) {
    storageAvailable = false;
    announce(`Lokale Daten konnten nicht gelesen werden: ${error.message}`, "error");
    return createEmptyStore();
  }
}

function renderStore(playerCount = 0) {
  $("stat-players").textContent = String(playerCount);
  $("stat-own-turns").textContent = String(store.ownTurns);
  $("stat-own-chips").textContent = String(store.ownChips);
  activityCount.textContent = String(store.events.length);
  activityList.replaceChildren();

  if (store.events.length === 0) {
    const empty = document.createElement("li");
    empty.className = "activity-empty";
    empty.textContent = "Noch keine Änderungen erfasst.";
    activityList.appendChild(empty);
    return;
  }

  store.events.slice(-maxVisibleEvents).reverse().forEach((event) => {
    const item = document.createElement("li");
    const message = document.createElement("span");
    const time = document.createElement("time");
    message.textContent = event.message;
    time.dateTime = new Date(event.at).toISOString();
    time.textContent = new Date(event.at).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });
    item.append(message, time);
    activityList.appendChild(item);
  });
}

function addActivity(message) {
  store.events.push({ at: Date.now(), message });
  store.events = store.events.slice(-maxSavedEvents);
}

function pulse(id) {
  const element = $(id);
  const card = element.closest(".status-card") || element;
  card.classList.remove("is-updating");
  requestAnimationFrame(() => card.classList.add("is-updating"));
  setTimeout(() => card.classList.remove("is-updating"), 500);
}

function playTone() {
  if (!soundToggle.checked) return;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) {
    soundToggle.checked = false;
    announce("Sound wird von diesem Browser nicht unterstützt.", "error");
    return;
  }

  try {
    soundContext ??= new AudioContextConstructor();
    if (soundContext.state === "suspended") {
      soundContext.resume().catch((error) => {
        announce(`Sound konnte nicht gestartet werden: ${error.message}`, "error");
      });
    }
    const oscillator = soundContext.createOscillator();
    const gain = soundContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, soundContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, soundContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, soundContext.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(soundContext.destination);
    oscillator.start();
    oscillator.stop(soundContext.currentTime + 0.13);
  } catch (error) {
    soundToggle.checked = false;
    announce(`Sound konnte nicht abgespielt werden: ${error.message}`, "error");
  }
}

function getVisibleState() {
  const code = $("display-room-code").textContent.trim();
  const username = $("username").value.trim().replace(/\s+/g, " ").slice(0, 20);
  if (!code || code === "------" || !username) return null;

  return {
    key: `${encodeURIComponent(code)}:${encodeURIComponent(username.toLocaleLowerCase("de-DE"))}`,
    chips: Number($("my-chips").textContent) || 0,
    pot: Number($("global-pot").textContent) || 0,
    height: Number($("tower-height").textContent) || 0,
    players: $("players-list").children.length
  };
}

function syncState() {
  syncTimer = null;
  if (gameSection.classList.contains("hidden")) {
    previousState = null;
    roomKey = null;
    pendingMoves.length = 0;
    return;
  }

  const state = getVisibleState();
  if (!state) return;

  if (state.key !== roomKey) {
    roomKey = state.key;
    store = loadStore(roomKey);
    previousState = state;
    settlingUntil = Date.now() + 1800;
    renderStore(state.players);
    return;
  }

  if (!previousState) {
    previousState = state;
    settlingUntil = Date.now() + 1800;
    renderStore(state.players);
    return;
  }

  if (Date.now() < settlingUntil) {
    previousState = state;
    renderStore(state.players);
    return;
  }

  const old = previousState;
  previousState = state;
  const changes = [];
  const chipDelta = state.chips - old.chips;
  const potDelta = state.pot - old.pot;
  const heightDelta = state.height - old.height;

  if (state.players !== old.players) {
    changes.push(`Spielerzahl: ${state.players}`);
  }
  if (chipDelta !== 0) {
    changes.push(`Dein Stack: ${chipDelta > 0 ? "+" : ""}${chipDelta} Chips`);
  }
  if (potDelta !== 0) {
    changes.push(`Pot: ${potDelta > 0 ? "+" : ""}${potDelta} Chips`);
    pulse("global-pot");
  }
  if (heightDelta !== 0) {
    changes.push(`Turm: ${heightDelta > 0 ? "+" : ""}${heightDelta}`);
    pulse("tower-height");
  }

  const now = Date.now();
  for (let index = pendingMoves.length - 1; index >= 0; index -= 1) {
    const move = pendingMoves[index];
    if (move.expiresAt < now) {
      pendingMoves.splice(index, 1);
      continue;
    }
    if (state.chips <= move.startChips - move.amount && state.height >= move.startHeight + move.amount) {
      pendingMoves.splice(index, 1);
      store.ownTurns += 1;
      store.ownChips += move.amount;
      changes.push(`Dein Zug erfasst: ${move.amount} Chips gesetzt`);
    }
  }

  if (changes.length === 0) {
    renderStore(state.players);
    return;
  }

  addActivity(changes.join(" · "));
  persistStore();
  renderStore(state.players);
  playTone();
}

function scheduleSync() {
  if (syncTimer !== null) clearTimeout(syncTimer);
  syncTimer = setTimeout(syncState, 120);
}

async function copyText(text) {
  let clipboardError = null;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      clipboardError = error;
    }
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  let copied;
  try {
    copied = document.execCommand("copy");
  } finally {
    field.remove();
  }
  if (!copied) {
    const reason = clipboardError ? `: ${clipboardError.message}` : ".";
    throw new Error(`Kopieren wird von diesem Browser nicht unterstützt${reason}`);
  }
}

async function shareRoom() {
  const code = $("display-room-code").textContent.trim();
  if (!/^\d{6}$/.test(code)) {
    announce("Der Raumcode ist noch nicht verfügbar.", "error");
    return;
  }

  const appUrl = new URL(window.location.href);
  appUrl.search = "";
  appUrl.hash = "";
  const message = `STACK 7 LIVE – Raumcode: ${code}. Öffne ${appUrl.href} und gib den Code ein.`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "STACK 7 LIVE", text: message });
      announce("Raumcode wurde geteilt.");
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  try {
    await copyText(message);
    announce("Einladungslink und Raumcode wurden kopiert.");
  } catch (error) {
    announce(`Teilen fehlgeschlagen. Raumcode: ${code} (${error.message})`, "error");
  }
}

$("btn-share-room").addEventListener("click", shareRoom);

soundToggle.addEventListener("change", () => {
  if (soundToggle.checked && !window.AudioContext) {
    soundToggle.checked = false;
    announce("Sound wird von diesem Browser nicht unterstützt.", "error");
    return;
  }
  try {
    localStorage.setItem(`${storagePrefix}sound`, soundToggle.checked ? "on" : "off");
  } catch (error) {
    announce(`Sound-Einstellung konnte nicht gespeichert werden: ${error.message}`, "error");
  }
  if (soundToggle.checked) playTone();
});

try {
  soundToggle.checked = localStorage.getItem(`${storagePrefix}sound`) === "on";
} catch (error) {
  announce(`Sound-Einstellung konnte nicht gelesen werden: ${error.message}`, "error");
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("button");
  if (!button || button.disabled || !moveButtons.has(button.id)) return;
  const state = getVisibleState();
  if (!state) return;
  const move = {
    amount: moveButtons.get(button.id),
    startChips: state.chips,
    startHeight: state.height,
    expiresAt: Date.now() + 15000
  };
  pendingMoves.push(move);
  setTimeout(() => {
    const index = pendingMoves.indexOf(move);
    if (index !== -1) pendingMoves.splice(index, 1);
  }, 15000);
});

const gameObserver = new MutationObserver(scheduleSync);
gameObserver.observe(gameSection, { attributes: true, attributeFilter: ["class"] });

for (const id of ["my-chips", "global-pot", "tower-height", "players-list"]) {
  const observer = new MutationObserver(scheduleSync);
  observer.observe($(id), { childList: true, characterData: true, subtree: true });
}

scheduleSync();
