import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getDatabase, ref, get, set, onValue, runTransaction, onDisconnect, update } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjz0AHR4g6bhq_TITyjvDUjfG8xTeYXWY",
  authDomain: "test-325b5.firebaseapp.com",
  databaseURL: "https://test-325b5-default-rtdb.firebaseio.com",
  projectId: "test-325b5",
  storageBucket: "test-325b5.firebasestorage.app",
  messagingSenderId: "119186396423",
  appId: "1:119186396423:web:3089a1c02c78c1a39121a2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let currentRoomCode = null;
let myPlayerId = null;
let currentUsername = "";
let isHost = false;
let stopPlayersListener = null;
let stopRoomListener = null;

const $ = (id) => document.getElementById(id);
const setupSection = $("setup-section");
const gameSection = $("game-section");
const usernameInput = $("username");
const lobbyCodeInput = $("lobby-code-input");
const displayRoomCode = $("display-room-code");
const hostBadge = $("host-badge");
const playersList = $("players-list");
const myChipsDisplay = $("my-chips");
const globalPotDisplay = $("global-pot");
const towerHeightDisplay = $("tower-height");
const checkpointAlert = $("checkpoint-alert");
const hostControls = $("host-controls");

$("btn-create-lobby").addEventListener("click", () => guarded(createLobby));
$("btn-join-lobby").addEventListener("click", () => guarded(joinLobby));
$("btn-score-1").addEventListener("click", () => guarded(() => changeMyChips(1)));
$("btn-score-7").addEventListener("click", () => guarded(() => changeMyChips(7)));
$("btn-score-2").addEventListener("click", () => guarded(() => changeMyChips(-2)));
$("btn-place-1").addEventListener("click", () => guarded(() => playTurn(1)));
$("btn-place-2").addEventListener("click", () => guarded(() => playTurn(2)));
$("btn-place-3").addEventListener("click", () => guarded(() => playTurn(3)));
$("btn-reset-tower").addEventListener("click", () => guarded(resetTowerAndPot));

function guarded(action) {
  Promise.resolve().then(action).catch((error) => {
    console.error(error);
    alert("Fehler: " + (error?.message || error));
  });
}

async function signedInUser() {
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

function getName() {
  const name = usernameInput.value.trim().replace(/\s+/g, " ").slice(0, 20);
  if (!name) throw new Error("Bitte gib einen Namen ein.");
  currentUsername = name;
}

function makeRoomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createLobby() {
  getName();
  myPlayerId = (await signedInUser()).uid;
  let created = false;

  for (let i = 0; i < 10 && !created; i++) {
    currentRoomCode = makeRoomCode();
    const roomRef = ref(database, "rooms/" + currentRoomCode);
    const result = await runTransaction(roomRef, (room) => {
      if (room !== null) return;
      return {
        host: myPlayerId,
        createdAt: Date.now(),
        pot: 0,
        towerHeight: 0,
        players: {
          [myPlayerId]: { name: currentUsername, chips: 20, joinedAt: Date.now() }
        }
      };
    }, { applyLocally: false });
    created = result.committed;
  }

  if (!created) throw new Error("Kein freier Raumcode gefunden. Bitte erneut versuchen.");
  isHost = true;
  await enterRoom();
}

async function joinLobby() {
  getName();
  myPlayerId = (await signedInUser()).uid;
  const code = lobbyCodeInput.value.trim();
  if (!/^\d{6}$/.test(code)) throw new Error("Bitte gib den sechsstelligen Raumcode ein.");

  const roomRef = ref(database, "rooms/" + code);
  const playerRef = ref(database, "rooms/" + code + "/players/" + myPlayerId);

  // Erst den eigenen Eintrag versuchen: Die Regeln erlauben das nur,
  // wenn der Raum existiert. Danach darf das Mitglied den Raum lesen.
  await set(playerRef, { name: currentUsername, chips: 20, joinedAt: Date.now() });
  const after = await get(roomRef);
  if (!after.exists()) {
    throw new Error("Raum nicht gefunden. Prüfe den Code.");
  }

  currentRoomCode = code;
  isHost = after.val().host === myPlayerId;
  await enterRoom();
}

async function enterRoom() {
  setupSection.classList.add("hidden");
  gameSection.classList.remove("hidden");
  displayRoomCode.textContent = currentRoomCode;
  hostBadge.classList.toggle("hidden", !isHost);
  hostControls.classList.toggle("hidden", !isHost);

  if (stopPlayersListener) stopPlayersListener();
  if (stopRoomListener) stopRoomListener();

  const roomRef = ref(database, "rooms/" + currentRoomCode);
  const playersRef = ref(database, "rooms/" + currentRoomCode + "/players");
  const myPlayerRef = ref(database, "rooms/" + currentRoomCode + "/players/" + myPlayerId);
  await onDisconnect(myPlayerRef).remove();

  stopPlayersListener = onValue(playersRef, (snapshot) => {
    const players = snapshot.val() || {};
    playersList.replaceChildren();
    Object.entries(players).forEach(([id, player]) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      const chips = document.createElement("strong");
      name.textContent = player.name || "Spieler";
      chips.textContent = String(Number(player.chips) || 0) + " Chips";
      li.append(name, document.createTextNode(" "), chips);
      playersList.appendChild(li);
      if (id === myPlayerId) myChipsDisplay.textContent = String(Number(player.chips) || 0);
    });
  }, (error) => alert("Spielerliste: " + error.message));

  stopRoomListener = onValue(roomRef, (snapshot) => {
    const room = snapshot.val();
    if (!room) {
      alert("Dieser Raum ist nicht mehr verfügbar.");
      leaveLocalRoom();
      return;
    }
    globalPotDisplay.textContent = String(Number(room.pot) || 0);
    const height = Number(room.towerHeight) || 0;
    towerHeightDisplay.textContent = String(height);
    checkpointAlert.classList.toggle("hidden", ![7, 14, 21].includes(height));
  }, (error) => alert("Live-Synchronisierung: " + error.message));
}

function leaveLocalRoom() {
  if (stopPlayersListener) stopPlayersListener();
  if (stopRoomListener) stopRoomListener();
  stopPlayersListener = stopRoomListener = null;
  currentRoomCode = null;
  myPlayerId = null;
  isHost = false;
  gameSection.classList.add("hidden");
  setupSection.classList.remove("hidden");
}

async function changeMyChips(amount) {
  if (!currentRoomCode || !myPlayerId) throw new Error("Du bist keinem Raum beigetreten.");
  const chipsRef = ref(database, "rooms/" + currentRoomCode + "/players/" + myPlayerId + "/chips");
  const result = await runTransaction(chipsRef, (value) => {
    const next = (Number(value) || 0) + amount;
    if (next < 0 || next > 999999) return;
    return next;
  }, { applyLocally: false });
  if (!result.committed) throw new Error("Chip-Änderung nicht möglich.");
}

async function playTurn(amount) {
  if (!currentRoomCode || !myPlayerId) throw new Error("Du bist keinem Raum beigetreten.");
  const playerRef = ref(database, "rooms/" + currentRoomCode + "/players/" + myPlayerId);
  const playerResult = await runTransaction(playerRef, (player) => {
    if (!player || Number(player.chips) < amount) return;
    player.chips = Number(player.chips) - amount;
    return player;
  }, { applyLocally: false });
  if (!playerResult.committed) throw new Error("Nicht genug Chips.");

  const heightRef = ref(database, "rooms/" + currentRoomCode + "/towerHeight");
  const heightResult = await runTransaction(heightRef, (height) => {
    const next = (Number(height) || 0) + amount;
    if (next > 21) return;
    return next;
  }, { applyLocally: false });

  if (!heightResult.committed) {
    await runTransaction(ref(database, "rooms/" + currentRoomCode + "/players/" + myPlayerId + "/chips"), (chips) => (Number(chips) || 0) + amount, { applyLocally: false });
    throw new Error("Der Turm kann nicht höher als 21 werden. Die Chips wurden zurückerstattet.");
  }

  const potRef = ref(database, "rooms/" + currentRoomCode + "/pot");
  await runTransaction(potRef, (pot) => (Number(pot) || 0) + amount, { applyLocally: false });
}

async function resetTowerAndPot() {
  if (!isHost || !currentRoomCode) throw new Error("Nur der Host kann zurücksetzen.");
  const roomRef = ref(database, "rooms/" + currentRoomCode);
  const snap = await get(roomRef);
  if (!snap.exists() || snap.val().host !== myPlayerId) throw new Error("Host-Berechtigung konnte nicht bestätigt werden.");
  await update(roomRef, { pot: 0, towerHeight: 0 });
}
