(() => {
    const $ = id => document.getElementById(id);
    const defaultSettings = {
        accent: '#00dfff',
        background: '#111111',
        panel: '#1e1e1e',
        text: '#f5f5f5'
    };
    const deckPool = ['Bluff', 'Counter', 'Rage', 'Focus', 'Lucky Shot', 'Shield', 'Mikro-Deal', 'Power Move', 'Tempo', 'Betrug'];
    const roles = ['Risk-Taker', 'Taktiker', 'Bluffer', 'Dealer', 'Macher', 'Coup-Artist'];

    let players = [], pot = 0, height = 0, logs = [];
    let settings = loadSettings();

    function loadSettings() {
        try {
            const raw = localStorage.getItem('stack7-settings');
            const stored = raw ? JSON.parse(raw) : {};
            return Object.fromEntries(Object.keys(defaultSettings).map(key => [key, stored[key] || defaultSettings[key]]));
        } catch {
            return { ...defaultSettings };
        }
    }

    function saveSettings() {
        localStorage.setItem('stack7-settings', JSON.stringify(settings));
    }

    function applyTheme() {
        const root = document.documentElement;
        for (const key of ['accent', 'background', 'panel', 'text']) {
            const value = settings[key] || defaultSettings[key];
            settings[key] = value;
            root.style.setProperty(`--${key === 'background' ? 'bg' : key}`, value);
            const input = $(`${key}Color`);
            if (input) input.value = value;
        }
    }

    const stamp = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function log(msg) { logs.unshift({ time: stamp(), msg }); renderLog(); }

    function renderLog() {
        $('log').innerHTML = logs.map(x => `<div><time>${x.time}</time>${escapeHtml(x.msg)}</div>`).join('') || '<div>Noch keine Aktionen.</div>';
    }

    function actor() { return players.find(p => p.id === $('actor').value); }

    function randomDeck() {
        const used = [];
        for (let i = 0; i < 3; i++) {
            const entry = deckPool[Math.floor(Math.random() * deckPool.length)];
            if (!used.includes(entry)) used.push(entry);
        }
        return used;
    }

    function renderPlayerBoard() {
        $('playerBoard').innerHTML = players.map((p) => {
            const deck = p.deck || randomDeck();
            return `
                <div class="player-card">
                    <div class="player-head">
                        <div>
                            <h3>${escapeHtml(p.name)}</h3>
                            <small>${p.ruined ? 'Ausgeschieden' : 'Im Spiel'}</small>
                        </div>
                        <span class="player-badge">${escapeHtml(p.role)}</span>
                    </div>
                    <p><strong>${p.chips}</strong> Chips · ${p.ruined ? 'Runde verloren' : 'Aktiv'}</p>
                    <p>${escapeHtml(p.note)}</p>
                    <div class="player-hand">
                        ${deck.map(card => `<span class="card-chip">${escapeHtml(card)}</span>`).join('')}
                    </div>
                    <div class="player-actions">
                        <button data-chip-action="plus1" data-player-id="${p.id}">+1</button>
                        <button data-chip-action="minus1" data-player-id="${p.id}">−1</button>
                    </div>
                </div>
            `;
        }).join('') || '<div class="mini-card"><h3>Keine Spieler</h3><p>Füge Spieler hinzu, damit jede Karte ihren eigenen Bereich bekommt.</p></div>';

        document.querySelectorAll('[data-chip-action]').forEach(button => {
            button.onclick = () => {
                const id = button.dataset.playerId;
                const target = players.find(p => p.id === id);
                if (!target) return;
                const delta = button.dataset.chipAction === 'plus1' ? 1 : -1;
                changeChips(target, delta);
                render();
            };
        });
    }

    function render() {
        $('pot').textContent = pot;
        $('height').textContent = height;
        $('active').textContent = players.filter(p => !p.ruined).length;

        $('players').innerHTML = players.map(p => `
            <div class="player ${p.ruined ? 'ruined' : ''}">
                <div>
                    <span class="name">${escapeHtml(p.name)}</span>${p.ruined ? '<span class="tag">RUINIERT</span>' : ''}
                    <small>${p.ruined ? 'Ausgeschieden' : 'Im Spiel'}</small>
                </div>
                <div class="chips">${p.chips} ◉</div>
            </div>
        `).join('') || '<p class="note">Noch keine Spieler hinzugefügt.</p>';

        const oldActor = $('actor').value;
        const oldTarget = $('target').value;
        $('actor').innerHTML = players.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.chips})${p.ruined ? ' – RUINIERT' : ''}</option>`).join('');
        $('target').innerHTML = players.filter(p => p.id !== oldActor).map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.chips})</option>`).join('');

        if (!players.length) {
            $('actor').innerHTML = '';
            $('target').innerHTML = '';
        } else {
            if (players.some(p => p.id === oldActor)) $('actor').value = oldActor;
            if (players.some(p => p.id === oldTarget)) $('target').value = oldTarget;
            if (!$('actor').value) $('actor').value = players[0].id;
            if (!$('target').value && players.length > 1) $('target').value = players[1].id;
        }

        for (const n of [7, 14, 21]) $('cp' + n).classList.toggle('active', height >= n);
        $('checkpointMessage').textContent = height >= 21 ? 'Checkpoint 21 erreicht: CASH OUT oder STAY entscheiden!' : height >= 14 ? 'Checkpoint 14 erreicht: CASH OUT oder STAY entscheiden!' : height >= 7 ? 'Checkpoint 7 erreicht: CASH OUT oder STAY entscheiden!' : 'Noch kein Checkpoint erreicht.';

        const disabled = !actor() || actor().ruined;
        document.querySelectorAll('[data-action]').forEach(b => b.disabled = disabled);
        renderPlayerBoard();
    }

    function changeChips(p, delta) {
        if (!p) return false;
        if (delta < 0 && p.chips < -delta) {
            log(`${p.name} hat nicht genug Chips.`);
            return false;
        }
        p.chips += delta;
        if (p.chips <= 0) {
            p.chips = 0;
            p.ruined = true;
            log(`${p.name} ist RUINIERT.`);
        }
        return true;
    }

    for (const key of ['accent', 'background', 'panel', 'text']) {
        $(`${key}Color`).addEventListener('input', event => {
            settings[key] = event.target.value;
            applyTheme();
            saveSettings();
        });
    }

    $('addBtn').onclick = () => {
        const name = $('playerName').value.trim();
        if (!name) return alert('Bitte einen Namen eingeben.');
        if (players.length >= 12) return alert('Maximal 12 Spieler.');

        players.push({
            id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
            name,
            chips: 20,
            ruined: false,
            role: roles[Math.floor(Math.random() * roles.length)],
            note: `${name} spielt mit Tempo und Risiko.`,
            deck: randomDeck()
        });
        $('playerName').value = '';
        log(`${name} tritt mit 20 Chips bei.`); 
        render();
    };

    $('playerName').addEventListener('keydown', e => { if (e.key === 'Enter') $('addBtn').click(); });

    document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => {
        const p = actor();
        if (!p || p.ruined) return;
        switch (b.dataset.action) {
            case 'plus1': if (changeChips(p, 1)) log(`${p.name}: +1 Chip.`); break;
            case 'plus7': if (changeChips(p, 7)) log(`${p.name}: +7 Chips.`); break;
            case 'minus2': if (changeChips(p, -2)) log(`${p.name}: −2 Chips.`); break;
            case 'steal': {
                const t = players.find(x => x.id === $('target').value);
                if (!t || t.ruined || t.chips < 1) {
                    log('STEAL nicht möglich: Ziel hat keine verfügbaren Chips.');
                    break;
                }
                changeChips(t, -1);
                changeChips(p, 1);
                log(`${p.name} stiehlt 1 Chip von ${t.name} (Platzhalterregel).`);
                break;
            }
            case 'bust':
                if (changeChips(p, -2)) {
                    pot += 2;
                    log(`BUST: ${p.name} zahlt 2 Chips in den Pot (Platzhalterregel).`);
                }
                break;
            case 'double': if (changeChips(p, 2)) log(`${p.name} spielt DOUBLE: +2 Chips (Platzhalterregel).`); break;
            case 'insure': log(`${p.name} spielt INSURE. Versicherungsstatus noch nicht umgesetzt.`); break;
            case 'block': log(`${p.name} spielt BLOCK. Blockstatus noch nicht umgesetzt.`); break;
            case 'contribute': {
                const n = Math.max(1, Math.min(99, Number($('potAmount').value) || 1));
                if (changeChips(p, -n)) {
                    pot += n;
                    log(`${p.name} legt ${n} Chip(s) in den Pot.`);
                }
                break;
            }
        }
        render();
    });

    $('addPot').onclick = () => {
        const p = actor();
        const n = Math.max(1, Math.min(99, Number($('potAmount').value) || 1));
        if (!p || p.ruined) return;
        if (changeChips(p, -n)) {
            pot += n;
            log(`${p.name} legt ${n} Chip(s) in den Pot.`);
        }
        render();
    };

    $('towerPlus').onclick = () => { height++; log(`Turmhöhe steigt auf ${height}.`); render(); };
    $('towerMinus').onclick = () => { if (height > 0) { height--; log(`Turmhöhe sinkt auf ${height}.`); } render(); };
    $('resetTower').onclick = () => { if (confirm('Turmhöhe wirklich auf 0 setzen?')) { height = 0; log('Turmhöhe zurückgesetzt.'); render(); } };
    $('resetBtn').onclick = () => { if (confirm('Alle Spieler, Chips, Pot, Turm und Protokoll löschen?')) { players = []; pot = 0; height = 0; logs = []; render(); renderLog(); } };
    $('exportBtn').onclick = () => {
        const body = ['STACK 7 LIVE – Aktionsprotokoll', 'Export: ' + new Date().toLocaleString('de-DE'), '', 'Spieler:', ...players.map(p => `${p.name}: ${p.chips} Chips${p.ruined ? ' (RUINIERT)' : ''}`), `Pot: ${pot}`, `Turmhöhe: ${height}`, '', 'Aktionen:', ...logs.map(x => `[${x.time}] ${x.msg}`)].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
        a.download = 'stack-7-protokoll.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    applyTheme();
    saveSettings();
    render();
    renderLog();
})();