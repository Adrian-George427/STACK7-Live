import { initializeApp } from "https://gstatic.com";
import { getDatabase, ref, set, onValue, runTransaction, onDisconnect } from "https://gstatic.com";

const firebaseConfig = {
    apiKey: "AIzaSyBjz0AHR4g6bhq_TITyjvDUjfG8xTeYXWY",
    authDomain: "://firebaseapp.com",
    projectId: "test-325b5",
    storageBucket: "test-325b5.firebasestorage.app",
    messagingSenderId: "119186396423",
    appId: "1:119186396423:web:3089a1c02c78c1a39121a2",
    measurementId: "G-EE9SJMPYNW"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let currentRoomCode = null;
let myPlayerId = null;
let currentUsername = "";
let isHost = false;

const setupSection = document.getElementById('setup-section');
const gameSection = document.getElementById('game-section');
const usernameInput = document.getElementById('username');
const lobbyCodeInput = document.getElementById('lobby-code-input');
const displayRoomCode = document.getElementById('display-room-code');
const hostBadge = document.getElementById('host-badge');
const playersList = document.getElementById('players-list');
const myChipsDisplay = document.getElementById('my-chips');

const globalPotDisplay = document.getElementById('global-pot');
const towerHeightDisplay = document.getElementById('tower-height');
const checkpointAlert = document.getElementById('checkpoint-alert');
const hostControls = document.getElementById('host-controls');

document.getElementById('btn-create-lobby').addEventListener('click', createLobby);
document.getElementById('btn-join-lobby').addEventListener('click', joinLobby);
document.getElementById('btn-score-1').addEventListener('click', () => changeMyChips(1));
document.getElementById('btn-score-7').addEventListener('click', () => changeMyChips(7));
document.getElementById('btn-score-2').addEventListener('click', () => changeMyChips(-2));

document.getElementById('btn-place-1').addEventListener('click', () => playTurn(1));
document.getElementById('btn-place-2').addEventListener('click', () => playTurn(2));
document.getElementById('btn-place-3').addEventListener('click', () => playTurn(3));
document.getElementById('btn-reset-tower').addEventListener('click', resetTowerAndPot);

function createLobby() {
    currentUsername = usernameInput.value.trim();
    if (!currentUsername) return alert("Bitte gib einen Namen ein!");

    currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
    myPlayerId = "player_" + Date.now();
    isHost = true;

    const roomRef = ref(database, 'rooms/' + currentRoomCode);
    
    set(roomRef, {
        host: myPlayerId,
        createdAt: Date.now(),
        pot: 0,
        towerHeight: 0,
        players: {
            [myPlayerId]: { name: currentUsername, chips: 20 }
        }
    }).then(() => {
        setupGameUI();
    }).catch(err => alert("Fehler beim Erstellen des Raums: " + err.message));
}

function joinLobby() {
    currentUsername = usernameInput.value.trim();
    const code = lobbyCodeInput.value.trim();
    
    if (!currentUsername) return alert("Bitte gib einen Namen ein!");
    if (!code) return alert("Bitte gib einen Raumcode ein!");

    const roomRef = ref(database, 'rooms/' + code);

    onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            alert("Raum existiert nicht!");
            return;
        }

        currentRoomCode = code;
        myPlayerId = "player_" + Date.now();
        isHost = false;

        const playerRef = ref(database, 'rooms/' + currentRoomCode + '/players/' + myPlayerId);
        set(playerRef, { name: currentUsername, chips: 20 }).then(() => {
            setupGameUI();
        });
    }, { onlyOnce: true });
}

function setupGameUI() {
    setupSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    displayRoomCode.innerText = currentRoomCode;
    
    if (isHost) {
        hostBadge.classList.remove('hidden');
        hostControls.classList.remove('hidden');
    }

    // Live-Sync für die Spielerliste
    const playersRef = ref(database, 'rooms/' + currentRoomCode + '/players');
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (!players) return;

        playersList.innerHTML = "";
        for (let id in players) {
            const player = players[id];
            const li = document.createElement('li');
            li.innerHTML = `<span>${player.name}</span> <strong>${player.chips} Chips</strong>`;
            playersList.appendChild(li);

            if (id === myPlayerId) {
                myChipsDisplay.innerText = player.chips;
            }
        }
    });

    // Live-Sync für globalen Pot und Turmhöhe
    const roomRef = ref(database, 'rooms/' + currentRoomCode);
    onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        if (!roomData) return;

        globalPotDisplay.innerText = roomData.pot || 0;
        const height = roomData.towerHeight || 0;
        towerHeightDisplay.innerText = height;

        // Checkpoint-Bedingungen prüfen (7, 14, 21)
        if (height === 7 || height === 14 || height === 21) {
            checkpointAlert.classList.remove('hidden');
        } else {
            checkpointAlert.classList.add('hidden');
        }
    });

    const myPlayerRef = ref(database, 'rooms/' + currentRoomCode + '/players/' + myPlayerId);
    onDisconnect(myPlayerRef).remove();
}

function changeMyChips(amount) {
    if (!currentRoomCode || !myPlayerId) return;
    const playerChipsRef = ref(database, 'rooms/' + currentRoomCode + '/players/' + myPlayerId + '/chips');
    runTransaction(playerChipsRef, (currentChips) => {
        return (currentChips || 0) + amount;
    });
}

// --- LOGIK: EIN CHIP-ZUG WIRD AUSGEFÜHRT ---
function playTurn(amount) {
    if (!currentRoomCode || !myPlayerId) return;

    const playerChipsRef = ref(database, 'rooms/' + currentRoomCode + '/players/' + myPlayerId + '/chips');
    const roomRef = ref(database, 'rooms/' + currentRoomCode);

    // 1. Prüfen und verringern der eigenen Chips
    runTransaction(playerChipsRef, (currentChips) => {
        if (currentChips === undefined || currentChips < amount) {
            alert("Nicht genug Chips für diesen Einsatz!");
            return; // Abbrechen
        }
        return currentChips - amount;
    }).then((result) => {
        if (!result.committed) return;

        // 2. Erhöhe Pot und Turmhöhe im geteilten Raumobjekt
        runTransaction(roomRef, (roomData) => {
            if (roomData) {
                roomData.pot = (roomData.pot || 0) + amount;
                roomData.towerHeight = (roomData.towerHeight || 0) + amount;
            }
            return roomData;
        });
    });
}

// --- HOST AKTION: RESET BEI TURMSTURZ ---
function resetTowerAndPot() {
    if (!isHost || !currentRoomCode) return;
    const roomRef = ref(database, 'rooms/' + currentRoomCode);
    
    runTransaction(roomRef, (roomData) => {
        if (roomData) {
            roomData.pot = 0;
            roomData.towerHeight = 0;
        }
        return roomData;
    });
}
