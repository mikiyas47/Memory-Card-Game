const difficultyConfig = {
    easy: { pairCount: 4, boardClass: "easy", baseScore: 900, label: "Easy" },
    medium: { pairCount: 8, boardClass: "medium", baseScore: 1800, label: "Medium" },
    hard: { pairCount: 12, boardClass: "hard", baseScore: 3000, label: "Hard" },
};
const themeLabels = {
    emoji: "Emoji",
    programming: "Programming",
    animals: "Animals",
    flags: "Flags",
};
const textThemePacks = {
    emoji: [
        "\u{1F604}",
        "\u{1F929}",
        "\u{1F60E}",
        "\u{1F973}",
        "\u{1F60A}",
        "\u{1F60D}",
        "\u{1F914}",
        "\u{1F60F}",
        "\u{1F970}",
        "\u{1F9E0}",
        "\u{1F60B}",
        "\u{1F47D}",
    ],
    animals: [
        "\u{1F436}",
        "\u{1F431}",
        "\u{1F42F}",
        "\u{1F98A}",
        "\u{1F43C}",
        "\u{1F984}",
        "\u{1F98B}",
        "\u{1F438}",
        "\u{1F437}",
        "\u{1F981}",
        "\u{1F428}",
        "\u{1F43B}",
    ],
};
const imageThemePacks = {
    programming: [
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg",
        "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg",
    ],
    flags: [
        "https://flagcdn.com/w80/us.png",
        "https://flagcdn.com/w80/fr.png",
        "https://flagcdn.com/w80/jp.png",
        "https://flagcdn.com/w80/br.png",
        "https://flagcdn.com/w80/de.png",
        "https://flagcdn.com/w80/ca.png",
        "https://flagcdn.com/w80/in.png",
        "https://flagcdn.com/w80/gb.png",
        "https://flagcdn.com/w80/mx.png",
        "https://flagcdn.com/w80/kr.png",
        "https://flagcdn.com/w80/au.png",
        "https://flagcdn.com/w80/se.png",
    ],
};
const leaderboardStorageKey = "memory-game-leaderboard-v1";
const defaultApiHost = window.location.hostname || "127.0.0.1";
const leaderboardApiUrl = window.LEADERBOARD_API_URL ?? `http://${defaultApiHost}:5000/api/leaderboard`;
const landingScreen = document.getElementById("landingScreen");
const difficultyScreen = document.getElementById("difficultyScreen");
const themeScreen = document.getElementById("themeScreen");
const gameScreen = document.getElementById("gameScreen");
const playerNameInput = document.getElementById("playerName");
const selectedDifficultyLabel = document.getElementById("selectedDifficultyLabel");
const selectedThemeLabel = document.getElementById("selectedThemeLabel");
const playerStandingEl = document.getElementById("playerStanding");
const leaderboardList = document.getElementById("leaderboardList");
const openDifficultyBtn = document.getElementById("openDifficultyBtn");
const openThemeBtn = document.getElementById("openThemeBtn");
const startGameBtn = document.getElementById("startGameBtn");
const difficultyBackBtn = document.getElementById("difficultyBackBtn");
const themeBackBtn = document.getElementById("themeBackBtn");
const difficultyOptionButtons = Array.from(document.querySelectorAll("[data-difficulty-option]"));
const themeOptionButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
const board = document.getElementById("gameBoard");
const movesEl = document.getElementById("moves");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");
const backToSetupBtn = document.getElementById("backToSetupBtn");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalScoreEl = document.getElementById("finalScore");
const finalAccuracyEl = document.getElementById("finalAccuracy");
const finalMovesEl = document.getElementById("finalMoves");
const finalTimeEl = document.getElementById("finalTime");
const restartGameOverBtn = document.getElementById("restartGameOverBtn");
let currentDifficulty = "medium";
let currentTheme = "emoji";
let currentPlayerName = playerNameInput.value.trim() || "Player";
let cachedLeaderboardRecords = [];
let deck = [];
let firstSelection = null;
let secondSelection = null;
let lockBoard = false;
let score = 0;
let moves = 0;
let matchedPairs = 0;
let totalPairs = difficultyConfig[currentDifficulty].pairCount;
let elapsedSeconds = 0;
let timerId = null;
let hasStarted = false;
let audioContext = null;
function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function syncPlayerNameFromInput() {
    const enteredName = playerNameInput.value.trim();
    currentPlayerName = enteredName.length > 0 ? enteredName : "Player";
}
function normalizePlayerNameInput() {
    syncPlayerNameFromInput();
    playerNameInput.value = currentPlayerName;
}
function getThemeItems() {
    if (currentTheme === "emoji" || currentTheme === "animals") {
        const items = textThemePacks[currentTheme].slice(0, totalPairs);
        return items.map((token) => ({ token, kind: "text" }));
    }
    const imageItems = imageThemePacks[currentTheme].slice(0, totalPairs);
    return imageItems.map((token) => ({ token, kind: "image" }));
}
function buildDeck(items) {
    const pairs = [...items, ...items];
    return shuffle(pairs).map((item, index) => ({
        id: index,
        token: item.token,
        kind: item.kind,
        matched: false,
    }));
}
function getAccuracy() {
    if (moves === 0) {
        return 0;
    }
    return matchedPairs / moves;
}
function calculateScore() {
    const cfg = difficultyConfig[currentDifficulty];
    const progressScore = cfg.baseScore * (matchedPairs / totalPairs);
    const accuracyBonus = getAccuracy() * 450;
    const timePenalty = elapsedSeconds * 4;
    const movePenalty = Math.max(0, moves - totalPairs) * 45;
    return Math.max(0, Math.round(progressScore + accuracyBonus - timePenalty - movePenalty));
}
function updateStats() {
    score = calculateScore();
    movesEl.textContent = String(moves);
    timerEl.textContent = formatTime(elapsedSeconds);
}
function getAudioContext() {
    if (audioContext) {
        return audioContext;
    }
    const withWebkit = window;
    const AudioContextCtor = window.AudioContext ?? withWebkit.webkitAudioContext;
    if (!AudioContextCtor) {
        return null;
    }
    audioContext = new AudioContextCtor();
    return audioContext;
}
function playTone(frequency, durationSec, type, volume, delaySec = 0) {
    const ctx = getAudioContext();
    if (!ctx) {
        return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + delaySec;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + durationSec);
}
function playFlipSound() {
    playTone(460, 0.08, "triangle", 0.04);
}
function playMatchSound() {
    playTone(520, 0.11, "sine", 0.05);
    playTone(660, 0.14, "sine", 0.05, 0.1);
}
function playVictorySound() {
    playTone(523, 0.16, "triangle", 0.055);
    playTone(659, 0.16, "triangle", 0.055, 0.12);
    playTone(784, 0.22, "triangle", 0.06, 0.24);
}
function startTimer() {
    if (timerId !== null) {
        return;
    }
    timerId = window.setInterval(() => {
        elapsedSeconds += 1;
        updateStats();
    }, 1000);
}
function stopTimer() {
    if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
    }
}
function showGameOver() {
    finalScoreEl.textContent = String(score);
    finalAccuracyEl.textContent = `${Math.round(getAccuracy() * 100)}%`;
    finalMovesEl.textContent = String(moves);
    finalTimeEl.textContent = formatTime(elapsedSeconds);
    gameOverScreen.classList.remove("hidden");
}
function hideGameOver() {
    gameOverScreen.classList.add("hidden");
}
function updateSelectionCards() {
    selectedDifficultyLabel.textContent = difficultyConfig[currentDifficulty].label;
    selectedThemeLabel.textContent = themeLabels[currentTheme];
}
function updatePickerSelectionState() {
    difficultyOptionButtons.forEach((button) => {
        const value = button.dataset.difficultyOption;
        button.classList.toggle("active", value === currentDifficulty);
    });
    themeOptionButtons.forEach((button) => {
        const value = button.dataset.themeOption;
        button.classList.toggle("active", value === currentTheme);
    });
}
function showLandingScreen() {
    stopTimer();
    hideGameOver();
    landingScreen.classList.remove("hidden");
    difficultyScreen.classList.add("hidden");
    themeScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    updateSelectionCards();
    updatePickerSelectionState();
    renderLeaderboard(cachedLeaderboardRecords);
}
function showDifficultyScreen() {
    landingScreen.classList.add("hidden");
    difficultyScreen.classList.remove("hidden");
    themeScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    updatePickerSelectionState();
}
function showThemeScreen() {
    landingScreen.classList.add("hidden");
    difficultyScreen.classList.add("hidden");
    themeScreen.classList.remove("hidden");
    gameScreen.classList.add("hidden");
    updatePickerSelectionState();
}
function showGameScreen() {
    landingScreen.classList.add("hidden");
    difficultyScreen.classList.add("hidden");
    themeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
}
function createCardElement(card, index) {
    const cardEl = document.createElement("button");
    cardEl.className = "card deal-in";
    cardEl.type = "button";
    cardEl.style.setProperty("--delay", `${index * 45}ms`);
    cardEl.dataset.id = String(card.id);
    cardEl.dataset.token = card.token;
    cardEl.setAttribute("aria-label", "Hidden memory card");
    const inner = document.createElement("span");
    inner.className = "card-inner";
    const back = document.createElement("span");
    back.className = "card-face card-back";
    back.textContent = "?";
    const front = document.createElement("span");
    front.className = "card-face card-front";
    if (card.kind === "image") {
        const image = document.createElement("img");
        image.className = "card-image";
        image.src = card.token;
        image.alt = "Memory card icon";
        image.loading = "lazy";
        front.appendChild(image);
    }
    else {
        front.textContent = card.token;
    }
    inner.appendChild(back);
    inner.appendChild(front);
    cardEl.appendChild(inner);
    cardEl.addEventListener("click", () => onCardClick(cardEl));
    return cardEl;
}
function markAsMatched(cardA, cardB) {
    cardA.classList.add("matched");
    cardB.classList.add("matched");
    cardA.disabled = true;
    cardB.disabled = true;
}
function resetSelections() {
    firstSelection = null;
    secondSelection = null;
    lockBoard = false;
}
function readLocalLeaderboard() {
    const raw = localStorage.getItem(leaderboardStorageKey);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed;
    }
    catch {
        return [];
    }
}
function writeLocalLeaderboard(records) {
    localStorage.setItem(leaderboardStorageKey, JSON.stringify(records));
}
async function fetchRemoteLeaderboard() {
    try {
        const response = await fetch(leaderboardApiUrl, { method: "GET" });
        if (!response.ok) {
            return null;
        }
        const data = (await response.json());
        if (!Array.isArray(data)) {
            return null;
        }
        return data;
    }
    catch {
        return null;
    }
}
async function saveRemoteLeaderboard(record) {
    try {
        const response = await fetch(leaderboardApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
function buildLeaderboardRows(records) {
    const byPlayer = new Map();
    records.forEach((record) => {
        const existing = byPlayer.get(record.name);
        if (!existing) {
            byPlayer.set(record.name, {
                name: record.name,
                bestScore: record.score,
                bestTime: record.time,
            });
            return;
        }
        existing.bestScore = Math.max(existing.bestScore, record.score);
        existing.bestTime = Math.min(existing.bestTime, record.time);
    });
    const sorted = [...byPlayer.values()].sort((a, b) => b.bestScore - a.bestScore || a.bestTime - b.bestTime);
    return sorted.map((row, index) => ({
        rank: index + 1,
        name: row.name,
        bestScore: row.bestScore,
        bestTime: row.bestTime,
    }));
}
function renderLeaderboard(records) {
    leaderboardList.innerHTML = "";
    const rows = buildLeaderboardRows(records);
    if (rows.length === 0) {
        playerStandingEl.textContent = "Play to create your standing.";
        const item = document.createElement("li");
        item.textContent = "No records yet";
        leaderboardList.appendChild(item);
        return;
    }
    const normalizedCurrentName = currentPlayerName.trim().toLowerCase();
    const playerRow = rows.find((row) => row.name.toLowerCase() === normalizedCurrentName);
    const topRows = rows.slice(0, 5);
    const playerInTopRows = !!playerRow && topRows.some((row) => row.name === playerRow.name);
    if (playerRow) {
        playerStandingEl.textContent = `Your standing: #${playerRow.rank} of ${rows.length}`;
    }
    else {
        playerStandingEl.textContent = "Play a game to appear in the standings.";
    }
    const rowsToRender = [...topRows];
    if (playerRow && !playerInTopRows) {
        rowsToRender.push(playerRow);
    }
    rowsToRender.forEach((row, index) => {
        if (playerRow && !playerInTopRows && index === topRows.length) {
            const divider = document.createElement("li");
            divider.className = "leaderboard-divider";
            divider.textContent = "...";
            leaderboardList.appendChild(divider);
        }
        const item = document.createElement("li");
        item.className = "leaderboard-row";
        if (playerRow && row.name.toLowerCase() === playerRow.name.toLowerCase()) {
            item.classList.add("me");
        }
        const identity = document.createElement("span");
        identity.className = "leaderboard-name";
        identity.textContent = `#${row.rank} ${row.name}`;
        const scoreText = document.createElement("span");
        scoreText.className = "leaderboard-score";
        scoreText.textContent = `Score ${row.bestScore}`;
        const timeText = document.createElement("span");
        timeText.className = "leaderboard-time";
        timeText.textContent = formatTime(row.bestTime);
        item.appendChild(identity);
        item.appendChild(scoreText);
        item.appendChild(timeText);
        // make rows clickable to view full leaderboard
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            window.location.href = 'leaderboard.html';
        });
        leaderboardList.appendChild(item);
    });
    // if there are more rows, add a "View all" link
    if (rows.length > topRows.length) {
        const viewAll = document.createElement('li');
        viewAll.className = 'leaderboard-view-all';
        const link = document.createElement('a');
        link.href = 'leaderboard.html';
        link.textContent = 'View all standings';
        viewAll.appendChild(link);
        leaderboardList.appendChild(viewAll);
    }
}
async function loadLeaderboard() {
    const localRecords = readLocalLeaderboard();
    const remoteRecords = await fetchRemoteLeaderboard();
    const records = remoteRecords ?? localRecords;
    if (remoteRecords) {
        writeLocalLeaderboard(remoteRecords);
    }
    cachedLeaderboardRecords = records;
    renderLeaderboard(records);
}
async function saveLeaderboardRecord() {
    const record = {
        name: currentPlayerName,
        score,
        time: elapsedSeconds,
        moves,
        accuracy: getAccuracy(),
        difficulty: currentDifficulty,
        theme: currentTheme,
        createdAt: new Date().toISOString(),
    };
    const localRecords = readLocalLeaderboard();
    localRecords.push(record);
    writeLocalLeaderboard(localRecords);
    cachedLeaderboardRecords = localRecords;
    renderLeaderboard(cachedLeaderboardRecords);
    const remoteSaved = await saveRemoteLeaderboard(record);
    if (remoteSaved) {
        const remoteRecords = await fetchRemoteLeaderboard();
        if (remoteRecords) {
            writeLocalLeaderboard(remoteRecords);
            cachedLeaderboardRecords = remoteRecords;
            renderLeaderboard(cachedLeaderboardRecords);
        }
    }
}
function checkWin() {
    if (matchedPairs === totalPairs) {
        lockBoard = true;
        stopTimer();
        updateStats();
        statusEl.textContent = `You won in ${moves} moves with ${score} points.`;
        playVictorySound();
        showGameOver();
        void saveLeaderboardRecord();
    }
}
function onCardClick(cardEl) {
    if (lockBoard || cardEl === firstSelection || cardEl.classList.contains("matched")) {
        return;
    }
    if (!hasStarted) {
        hasStarted = true;
        startTimer();
    }
    playFlipSound();
    cardEl.classList.add("flipped");
    if (!firstSelection) {
        firstSelection = cardEl;
        return;
    }
    secondSelection = cardEl;
    lockBoard = true;
    moves += 1;
    updateStats();
    const isMatch = firstSelection.dataset.token === secondSelection.dataset.token;
    if (isMatch) {
        markAsMatched(firstSelection, secondSelection);
        matchedPairs += 1;
        playMatchSound();
        updateStats();
        statusEl.textContent = "Match found!";
        resetSelections();
        checkWin();
        return;
    }
    statusEl.textContent = "No match, try again.";
    setTimeout(() => {
        firstSelection?.classList.remove("flipped");
        secondSelection?.classList.remove("flipped");
        resetSelections();
    }, 700);
}
function renderBoard() {
    board.innerHTML = "";
    deck.forEach((card, index) => {
        board.appendChild(createCardElement(card, index));
    });
}
function applyDifficulty(difficulty) {
    currentDifficulty = difficulty;
    totalPairs = difficultyConfig[difficulty].pairCount;
    board.classList.remove("easy", "medium", "hard");
    board.classList.add(difficultyConfig[difficulty].boardClass);
}
function startGame() {
    stopTimer();
    score = 0;
    moves = 0;
    matchedPairs = 0;
    elapsedSeconds = 0;
    hasStarted = false;
    firstSelection = null;
    secondSelection = null;
    lockBoard = false;
    hideGameOver();
    const themeItems = getThemeItems();
    statusEl.textContent = "Find all matching pairs.";
    deck = buildDeck(themeItems);
    updateStats();
    renderBoard();
}
function startConfiguredGame() {
    normalizePlayerNameInput();
    showGameScreen();
    startGame();
}
openDifficultyBtn.addEventListener("click", () => {
    syncPlayerNameFromInput();
    showDifficultyScreen();
});
openThemeBtn.addEventListener("click", () => {
    syncPlayerNameFromInput();
    showThemeScreen();
});
difficultyBackBtn.addEventListener("click", showLandingScreen);
themeBackBtn.addEventListener("click", showLandingScreen);
difficultyOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const selected = button.dataset.difficultyOption;
        if (!selected) {
            return;
        }
        applyDifficulty(selected);
        showLandingScreen();
    });
});
themeOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const selected = button.dataset.themeOption;
        if (!selected) {
            return;
        }
        currentTheme = selected;
        showLandingScreen();
    });
});
playerNameInput.addEventListener("input", () => {
    syncPlayerNameFromInput();
    renderLeaderboard(cachedLeaderboardRecords);
});
playerNameInput.addEventListener("blur", () => {
    normalizePlayerNameInput();
    renderLeaderboard(cachedLeaderboardRecords);
});
startGameBtn.addEventListener("click", startConfiguredGame);
restartBtn.addEventListener("click", startGame);
restartGameOverBtn.addEventListener("click", startGame);
backToSetupBtn.addEventListener("click", showLandingScreen);
applyDifficulty(currentDifficulty);
updateSelectionCards();
updatePickerSelectionState();
void loadLeaderboard();
showLandingScreen();
export {};
