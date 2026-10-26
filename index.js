// Importiere die benötigten Firebase v13 Funktionen direkt über das Web-CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getDatabase, ref, set, once, onValue, runTransaction, onDisconnect, remove } from "https://gstatic.com";

// Deine verifizierte Firebase-Konfiguration
const firebaseConfig = {
    apiKey: "AIzaSyBjz0AHR4g6bhq_TITyjvDUjfG8xTeYXWY",
    authDomain: "test-325b5.firebaseapp.com",
    projectId: "test-325b5",
    storageBucket: "test-325b5.firebasestorage.app",
    messagingSenderId: "119186396423",
    appId: "1:119186396423:web:3089a1c02c78c1a39121a2",
    measurementId: "G-EE9SJMPYNW"
};

// Initialisiere Firebase und die Realtime Database
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// --- GLOBALE VARIABLEN ---
let currentRoomCode = null;
let myPlayerId = null;
let currentUsername = "";
let isHost = false;

// --- DOM ELEMENTE ---
const setupSection = document.getElementById('setup-section');
const gameSection = document.getElementById('game-section');
const usernameInput = document.getElementById('username');
const lobbyCodeInput = document.getElementById('lobby-code-input');
const displayRoomCode = document.getElementById('display-room-code');
const hostBadge = document.getElementById('host-badge');
const playersList = document.getElementById('players-list');
const myChipsDisplay = document.getElementById('my-chips');

// --- EVENT LISTENERS ---
document.getElementById('btn-create-lobby').addEventListener('click', createLobby);
document.getElementById('btn-join-lobby').addEventListener('click', joinLobby);
document.getElementById('btn-score-1').addEventListener('click', () => changeMyChips(1));
document.getElementById('btn-score-7').addEventListener('click', () => changeMyChips(7));
document.getElementById('btn-score-2').addEventListener('click', () => changeMyChips(-2));

// --- FUNKTION: SPIEL HOSTEN (RAUM ERSTELLEN) ---
function createLobby() {
    currentUsername = usernameInput.value.trim();
    if (!currentUsername) return alert("Bitte gib einen Namen ein!");

    // Generiere einen zufälligen 4-stelligen Raumcode
    currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
    myPlayerId = "player_" + Date.now();
    isHost = true;

    const roomRef = ref(database, 'rooms/' + currentRoomCode);
    
    set(roomRef, {
        host: myPlayerId,
        createdAt: Date.now(),
        players: {
            [myPlayerId]: {
                name: currentUsername,
                chips: 20
            }
        }
    }).then(() => {
        setupGameUI();
    }).catch(err => alert("Fehler beim Erstellen des Raums: " + err.message));
}

// --- FUNKTION: RAUM BEITRETEN ---
function joinLobby() {
    currentUsername = usernameInput.value.trim();
    const code = lobbyCodeInput.value.trim();
    
    if (!currentUsername) return alert("Bitte gib einen Namen ein!");
    if (!code) return alert("Bitte gib einen Raumcode ein!");

    const roomRef = ref(database, 'rooms/' + code);

    // Einmalige Abfrage, ob der Raum existiert
    onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            alert("Raum existiert nicht!");
            return;
        }

        currentRoomCode = code;
        myPlayerId = "player_" + Date.now();
        isHost = false;

        const playerRef = ref(database, 'rooms/' + currentRoomCode + '/players/' + myPlayerId);
        set(playerRef, {
            name: currentUsername,
            chips: 20
        }).then(() => {
            setupGameUI();
        });
    }, { onlyOnce: true });
}

// --- FUNKTION: SPIELOBERFLÄCHE ZEIGEN & LIVE-SYNC ---
function setupGameUI() {
    setupSection.classList.add('hidden');
    gameSection.classList.remove('hidden');
    displayRoomCode.innerText = currentRoomCode;
    
    if (isHost) {
        hostBadge.classList.remove('hidden');
    }

    const playersRef = ref(database, 'rooms/' + currentRoomCode + '/players');

    // Live-Abhören aller Änderungen in diesem Raum
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

    // Automatisches Löschen aus der Firebase-Liste, wenn die Verbindung abbricht (z.B. Tab geschlossen)
    const myPlayerRef = ref(database, 'rooms/' + currentRoomCode + '/players/' + myPlayerId);
    onDisconnect(myPlayerRef).remove();
}

// --- FUNKTION: EIGENE CHIPS BEARBEITEN ---
function changeMyChips(amount) {
    if (!currentRoomCode || !myPlayerId) return;

    const playerChipsRef = ref(database, 'rooms/' + currentRoomCode + '/players/' + myPlayerId + '/chips');
    
    // Nutze eine sichere Transaktion gegen asynchrone Berechnungsfehler
    runTransaction(playerChipsRef, (currentChips) => {
        return (currentChips || 0) + amount;
    });
}
