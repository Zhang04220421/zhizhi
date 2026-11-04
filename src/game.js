export const SIZE = 4;
export const TARGET = 2048;

export function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function addRandomTile(board, random = Math.random) {
  const empty = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === 0) empty.push([row, col]);
    }
  }
  if (empty.length === 0) return null;
  const [row, col] = empty[Math.floor(random() * empty.length)];
  board[row][col] = random() < 0.9 ? 2 : 4;
  return { row, col };
}

function mergeLine(line) {
  const values = line.filter((value) => value !== 0);
  const result = [];
  let points = 0;
  let reachedTarget = false;

  for (let index = 0; index < values.length; index++) {
    if (values[index] === values[index + 1]) {
      const merged = values[index] * 2;
      result.push(merged);
      points += merged;
      reachedTarget ||= merged === TARGET;
      index++;
    } else {
      result.push(values[index]);
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, points, reachedTarget };
}

export function move(board, direction) {
  if (!["up", "down", "left", "right"].includes(direction)) {
    throw new Error(`未知方向: ${direction}`);
  }

  const next = emptyBoard();
  let points = 0;
  let reachedTarget = false;

  for (let index = 0; index < SIZE; index++) {
    const vertical = direction === "up" || direction === "down";
    const reverse = direction === "right" || direction === "down";
    const original = vertical
      ? board.map((row) => row[index])
      : [...board[index]];
    if (reverse) original.reverse();

    const merged = mergeLine(original);
    if (reverse) merged.line.reverse();
    points += merged.points;
    reachedTarget ||= merged.reachedTarget;

    for (let position = 0; position < SIZE; position++) {
      if (vertical) next[position][index] = merged.line[position];
      else next[index][position] = merged.line[position];
    }
  }

  return {
    board: next,
    points,
    reachedTarget,
    changed: next.some((row, rowIndex) =>
      row.some((value, colIndex) => value !== board[rowIndex][colIndex]),
    ),
  };
}

export function hasMoves(board) {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === 0) return true;
      if (col < SIZE - 1 && board[row][col] === board[row][col + 1]) return true;
      if (row < SIZE - 1 && board[row][col] === board[row + 1][col]) return true;
    }
  }
  return false;
}
