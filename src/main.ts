type Difficulty = "easy" | "medium" | "hard";
type ThemeName = "emoji" | "programming" | "animals" | "flags" | "custom";
type CardKind = "text" | "image";

type CardData = {
  id: number;
  token: string;
  kind: CardKind;
  matched: boolean;
};

type ThemeItem = {
  token: string;
  kind: CardKind;
};

type DifficultyConfig = {
  pairCount: number;
  boardClass: Difficulty;
  baseScore: number;
};

type LeaderboardRecord = {
  name: string;
  score: number;
  time: number;
  moves: number;
  accuracy: number;
  difficulty: Difficulty;
  theme: ThemeName;
  createdAt: string;
};

type LeaderboardRow = {
  name: string;
  bestScore: number;
  bestTime: number;
};

declare global {
  interface Window {
    LEADERBOARD_API_URL?: string;
  }
}

const difficultyConfig: Record<Difficulty, DifficultyConfig> = {
  easy: { pairCount: 4, boardClass: "easy", baseScore: 900 },
  medium: { pairCount: 8, boardClass: "medium", baseScore: 1800 },
  hard: { pairCount: 12, boardClass: "hard", baseScore: 3000 },
};

const themePacks: Record<Exclude<ThemeName, "custom">, string[]> = {
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
  programming: ["</>", "TS", "JS", "API", "SQL", "CLI", "GIT", "BUG", "UX", "UI", "CSS", "NPM"],
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
  flags: [
    "\u{1F1FA}\u{1F1F8}",
    "\u{1F1EB}\u{1F1F7}",
    "\u{1F1EF}\u{1F1F5}",
    "\u{1F1E7}\u{1F1F7}",
    "\u{1F1E9}\u{1F1EA}",
    "\u{1F1E8}\u{1F1E6}",
    "\u{1F1EC}\u{1F1E7}",
    "\u{1F1EE}\u{1F1F3}",
    "\u{1F1E6}\u{1F1FA}",
    "\u{1F1F8}\u{1F1EA}",
    "\u{1F1F2}\u{1F1FD}",
    "\u{1F1F0}\u{1F1F7}",
  ],
};

const leaderboardStorageKey = "memory-game-leaderboard-v1";

const board = document.getElementById("gameBoard") as HTMLElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const movesEl = document.getElementById("moves") as HTMLElement;
const accuracyEl = document.getElementById("accuracy") as HTMLElement;
const timerEl = document.getElementById("timer") as HTMLElement;
const statusEl = document.getElementById("status") as HTMLElement;
const restartBtn = document.getElementById("restartBtn") as HTMLButtonElement;
const difficultySelect = document.getElementById("difficultySelect") as HTMLSelectElement;
const themeSelect = document.getElementById("themeSelect") as HTMLSelectElement;
const playerNameInput = document.getElementById("playerName") as HTMLInputElement;
const customThemeControls = document.getElementById("customThemeControls") as HTMLElement;
const customImageUrlsInput = document.getElementById("customImageUrls") as HTMLInputElement;
const applyCustomThemeBtn = document.getElementById("applyCustomThemeBtn") as HTMLButtonElement;
const leaderboardList = document.getElementById("leaderboardList") as HTMLOListElement;
const gameOverScreen = document.getElementById("gameOverScreen") as HTMLElement;
const finalScoreEl = document.getElementById("finalScore") as HTMLElement;
const finalAccuracyEl = document.getElementById("finalAccuracy") as HTMLElement;
const finalMovesEl = document.getElementById("finalMoves") as HTMLElement;
const finalTimeEl = document.getElementById("finalTime") as HTMLElement;
const restartGameOverBtn = document.getElementById("restartGameOverBtn") as HTMLButtonElement;

let currentDifficulty: Difficulty = "medium";
let currentTheme: ThemeName = "emoji";
let customImages: string[] = [];
let deck: CardData[] = [];
let firstSelection: HTMLButtonElement | null = null;
let secondSelection: HTMLButtonElement | null = null;
let lockBoard = false;
let score = 0;
let moves = 0;
let matchedPairs = 0;
let totalPairs = difficultyConfig[currentDifficulty].pairCount;
let elapsedSeconds = 0;
let timerId: number | null = null;
let hasStarted = false;
let audioContext: AudioContext | null = null;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseCustomImageUrls(raw: string): string[] {
  const unique = new Set<string>();

  raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .forEach((item) => {
      if (/^https?:\/\//i.test(item)) {
        unique.add(item);
      }
    });

  return [...unique];
}

function getThemeItems(): ThemeItem[] | null {
  if (currentTheme === "custom") {
    if (customImages.length < totalPairs) {
      return null;
    }

    return customImages.slice(0, totalPairs).map((token) => ({ token, kind: "image" }));
  }

  const tokens = themePacks[currentTheme].slice(0, totalPairs);
  return tokens.map((token) => ({ token, kind: "text" }));
}

function buildDeck(items: ThemeItem[]): CardData[] {
  const pairs = [...items, ...items];
  return shuffle(pairs).map((item, index) => ({
    id: index,
    token: item.token,
    kind: item.kind,
    matched: false,
  }));
}

function getAccuracy(): number {
  if (moves === 0) {
    return 0;
  }
  return matchedPairs / moves;
}

function calculateScore(): number {
  const cfg = difficultyConfig[currentDifficulty];
  const progressScore = cfg.baseScore * (matchedPairs / totalPairs);
  const accuracyBonus = getAccuracy() * 450;
  const timePenalty = elapsedSeconds * 4;
  const movePenalty = Math.max(0, moves - totalPairs) * 45;
  return Math.max(0, Math.round(progressScore + accuracyBonus - timePenalty - movePenalty));
}

function updateStats() {
  score = calculateScore();
  scoreEl.textContent = String(score);
  movesEl.textContent = String(moves);
  accuracyEl.textContent = `${Math.round(getAccuracy() * 100)}%`;
  timerEl.textContent = formatTime(elapsedSeconds);
}

function getAudioContext(): AudioContext | null {
  if (audioContext) {
    return audioContext;
  }

  const withWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextCtor = window.AudioContext ?? withWebkit.webkitAudioContext;
  if (!AudioContextCtor) {
    return null;
  }

  audioContext = new AudioContextCtor();
  return audioContext;
}

function playTone(
  frequency: number,
  durationSec: number,
  type: OscillatorType,
  volume: number,
  delaySec = 0,
) {
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

function createCardElement(card: CardData, index: number): HTMLButtonElement {
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
    image.alt = "Custom memory card";
    front.appendChild(image);
  } else {
    front.textContent = card.token;
  }

  inner.appendChild(back);
  inner.appendChild(front);
  cardEl.appendChild(inner);

  cardEl.addEventListener("click", () => onCardClick(cardEl));
  return cardEl;
}

function markAsMatched(cardA: HTMLButtonElement, cardB: HTMLButtonElement) {
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

function readLocalLeaderboard(): LeaderboardRecord[] {
  const raw = localStorage.getItem(leaderboardStorageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as LeaderboardRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function writeLocalLeaderboard(records: LeaderboardRecord[]) {
  localStorage.setItem(leaderboardStorageKey, JSON.stringify(records));
}

async function fetchRemoteLeaderboard(): Promise<LeaderboardRecord[] | null> {
  if (!window.LEADERBOARD_API_URL) {
    return null;
  }

  try {
    const response = await fetch(window.LEADERBOARD_API_URL, { method: "GET" });
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as LeaderboardRecord[];
    if (!Array.isArray(data)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

async function saveRemoteLeaderboard(record: LeaderboardRecord): Promise<boolean> {
  if (!window.LEADERBOARD_API_URL) {
    return false;
  }

  try {
    const response = await fetch(window.LEADERBOARD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function buildLeaderboardRows(records: LeaderboardRecord[]): LeaderboardRow[] {
  const byPlayer = new Map<string, LeaderboardRow>();

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

  return [...byPlayer.values()]
    .sort((a, b) => b.bestScore - a.bestScore || a.bestTime - b.bestTime)
    .slice(0, 8);
}

function renderLeaderboard(records: LeaderboardRecord[]) {
  leaderboardList.innerHTML = "";

  const rows = buildLeaderboardRows(records);
  if (rows.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No records yet";
    leaderboardList.appendChild(item);
    return;
  }

  rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${row.name}</strong> <span>Score ${row.bestScore}</span> <span>${formatTime(
      row.bestTime,
    )}</span>`;
    leaderboardList.appendChild(item);
  });
}

async function loadLeaderboard() {
  const localRecords = readLocalLeaderboard();
  const remoteRecords = await fetchRemoteLeaderboard();
  const records = remoteRecords ?? localRecords;

  if (remoteRecords) {
    writeLocalLeaderboard(remoteRecords);
  }

  renderLeaderboard(records);
}

async function saveLeaderboardRecord() {
  const rawName = playerNameInput.value.trim();
  const playerName = rawName.length > 0 ? rawName : "Player";
  playerNameInput.value = playerName;

  const record: LeaderboardRecord = {
    name: playerName,
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

  const remoteSaved = await saveRemoteLeaderboard(record);
  if (remoteSaved) {
    const remoteRecords = await fetchRemoteLeaderboard();
    if (remoteRecords) {
      writeLocalLeaderboard(remoteRecords);
      renderLeaderboard(remoteRecords);
      return;
    }
  }

  renderLeaderboard(localRecords);
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

function onCardClick(cardEl: HTMLButtonElement) {
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

function applyDifficulty(difficulty: Difficulty) {
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
  if (!themeItems) {
    board.innerHTML = "";
    updateStats();
    statusEl.textContent = `Add at least ${totalPairs} image URLs for custom theme.`;
    return;
  }

  statusEl.textContent = "Find all matching pairs.";
  deck = buildDeck(themeItems);
  updateStats();
  renderBoard();
}

function updateThemeControls() {
  customThemeControls.classList.toggle("hidden", currentTheme !== "custom");
}

difficultySelect.addEventListener("change", () => {
  applyDifficulty(difficultySelect.value as Difficulty);
  startGame();
});

themeSelect.addEventListener("change", () => {
  currentTheme = themeSelect.value as ThemeName;
  updateThemeControls();
  startGame();
});

applyCustomThemeBtn.addEventListener("click", () => {
  customImages = parseCustomImageUrls(customImageUrlsInput.value);
  currentTheme = "custom";
  themeSelect.value = "custom";
  updateThemeControls();
  startGame();
});

restartBtn.addEventListener("click", startGame);
restartGameOverBtn.addEventListener("click", startGame);

applyDifficulty(currentDifficulty);
updateThemeControls();
void loadLeaderboard();
startGame();

export {};
