import { addRandomTile, cloneBoard, emptyBoard, hasMoves, move, SIZE } from "./game.js";

const STORAGE_KEY = "zhizhi-2048-state-v1";
const BEST_KEY = "zhizhi-2048-best-v1";
const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best-score");
const statusElement = document.querySelector("#status");
const undoButton = document.querySelector("#undo-button");
const overlay = document.querySelector("#overlay");

function readNumber(key) {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function isValidBoard(board) {
  return Array.isArray(board) && board.length === SIZE && board.every((row) =>
    Array.isArray(row) && row.length === SIZE && row.every((value) =>
      Number.isSafeInteger(value) && (value === 0 || (value >= 2 && (value & (value - 1)) === 0)),
    ),
  );
}

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidBoard(saved?.board) && Number.isSafeInteger(saved.score) && saved.score >= 0) {
      return {
        board: saved.board,
        score: saved.score,
        won: Boolean(saved.won),
        keepPlaying: Boolean(saved.keepPlaying),
        over: !hasMoves(saved.board),
        previous: null,
        newTile: null,
      };
    }
  } catch {
    // 存储不可用或数据损坏时，直接开始新游戏。
  }
  return null;
}

let best = readNumber(BEST_KEY);
let state = loadGame();
let animationTimer = null;
let animationFrame = null;
let animationId = 0;
let animating = false;
let queuedDirection = null;

function stopAnimation() {
  animationId++;
  clearTimeout(animationTimer);
  cancelAnimationFrame(animationFrame);
  animationTimer = null;
  animationFrame = null;
  animating = false;
  queuedDirection = null;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      board: state.board,
      score: state.score,
      won: state.won,
      keepPlaying: state.keepPlaying,
    }));
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // 隐私模式等环境中可能无法写入，游戏仍可正常进行。
  }
}

function startGame() {
  stopAnimation();
  state = {
    board: emptyBoard(),
    score: 0,
    won: false,
    keepPlaying: false,
    over: false,
    previous: null,
    newTile: null,
  };
  addRandomTile(state.board);
  state.newTile = addRandomTile(state.board);
  persist();
  render();
}

function renderOverlay() {
  const visible = state.over || (state.won && !state.keepPlaying);
  overlay.hidden = !visible;
  if (!visible) return;

  document.querySelector("#overlay-icon").textContent = state.over ? "↻" : "✦";
  document.querySelector("#overlay-title").textContent = state.over ? "游戏结束" : "太棒了，你做到了！";
  document.querySelector("#overlay-message").textContent = state.over
    ? "棋盘已经没有可移动的位置。再来一局，刷新你的记录吧。"
    : "你合成了 2048！还想看看能走多远吗？";
  const actions = document.querySelector("#overlay-actions");
  actions.replaceChildren();
  if (!state.over) {
    const continueButton = document.createElement("button");
    continueButton.className = "button button-subtle";
    continueButton.textContent = "继续挑战";
    continueButton.addEventListener("click", () => {
      state.keepPlaying = true;
      persist();
      render();
    });
    actions.append(continueButton);
  }
  const restartButton = document.createElement("button");
  restartButton.className = "button button-primary";
  restartButton.textContent = "再玩一次";
  restartButton.addEventListener("click", startGame);
  actions.append(restartButton);
}

function render(mergedCells = []) {
  boardElement.replaceChildren();
  state.board.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `${rowIndex + 1} 行 ${colIndex + 1} 列：${value || "空"}`);
    if (value) {
      cell.classList.add("filled", `tile-${Math.min(value, 2048)}`);
      if (value > 2048) cell.classList.add("tile-super");
      if (state.newTile?.row === rowIndex && state.newTile?.col === colIndex) cell.classList.add("tile-new");
      if (mergedCells.some(({ row, col }) => row === rowIndex && col === colIndex)) cell.classList.add("tile-merged");
      cell.textContent = value;
    }
    boardElement.append(cell);
  }));
  scoreElement.textContent = state.score.toLocaleString("zh-CN");
  bestElement.textContent = best.toLocaleString("zh-CN");
  undoButton.disabled = !state.previous;
  statusElement.textContent = state.over
    ? "这局结束啦，再试一次？"
    : state.won && !state.keepPlaying
      ? "恭喜合成 2048！"
      : "用方向键移动方块，合成更大的数字。";
  renderOverlay();
}

function animateMove(movements, mergedCells) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    render(mergedCells);
    return;
  }

  const cells = [...boardElement.children];
  const boardRect = boardElement.getBoundingClientRect();
  const rectangles = cells.map((cell) => cell.getBoundingClientRect());
  const movingTiles = movements.map(({ from, to }) => {
    const sourceIndex = from.row * SIZE + from.col;
    const targetIndex = to.row * SIZE + to.col;
    const tile = cells[sourceIndex].cloneNode(true);
    const source = rectangles[sourceIndex];
    const target = rectangles[targetIndex];
    tile.classList.remove("tile-new", "tile-merged");
    tile.classList.add("moving-tile");
    tile.setAttribute("aria-hidden", "true");
    tile.style.left = `${source.left - boardRect.left}px`;
    tile.style.top = `${source.top - boardRect.top}px`;
    tile.style.width = `${source.width}px`;
    tile.style.height = `${source.height}px`;
    boardElement.append(tile);
    cells[sourceIndex].classList.add("tile-departing");
    return { tile, dx: target.left - source.left, dy: target.top - source.top };
  });

  animating = true;
  const id = ++animationId;
  animationFrame = requestAnimationFrame(() => {
    if (id !== animationId) return;
    for (const { tile, dx, dy } of movingTiles) {
      tile.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  });
  animationTimer = setTimeout(() => {
    if (id !== animationId) return;
    animating = false;
    animationTimer = null;
    render(mergedCells);
    const nextDirection = queuedDirection;
    queuedDirection = null;
    if (nextDirection) handleMove(nextDirection);
  }, 175);
}

function handleMove(direction) {
  if (animating) {
    queuedDirection = direction;
    return;
  }
  if (state.over || (state.won && !state.keepPlaying)) return;
  const result = move(state.board, direction);
  if (!result.changed) return;

  state.previous = {
    board: cloneBoard(state.board),
    score: state.score,
    won: state.won,
    keepPlaying: state.keepPlaying,
  };
  state.board = result.board;
  state.score += result.points;
  state.won ||= result.reachedTarget;
  best = Math.max(best, state.score);
  state.newTile = addRandomTile(state.board);
  state.over = !hasMoves(state.board);
  persist();
  animateMove(result.movements, result.mergedCells);
}

function undo() {
  if (!state.previous) return;
  stopAnimation();
  const previous = state.previous;
  state.board = previous.board;
  state.score = previous.score;
  state.won = previous.won;
  state.keepPlaying = previous.keepPlaying;
  state.over = false;
  state.previous = null;
  state.newTile = null;
  persist();
  render();
}

document.querySelector("#new-game-button").addEventListener("click", startGame);
undoButton.addEventListener("click", undo);

const keyDirections = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};
document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (keyDirections[key]) {
    event.preventDefault();
    handleMove(keyDirections[key]);
  } else if (key === "z") {
    event.preventDefault();
    undo();
  }
});

let touchStart = null;
boardElement.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
boardElement.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  handleMove(Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? "right" : "left")
    : (dy > 0 ? "down" : "up"));
}, { passive: true });

if (state) render();
else startGame();
