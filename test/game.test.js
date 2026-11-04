import test from "node:test";
import assert from "node:assert/strict";
import { addRandomTile, emptyBoard, hasMoves, move } from "../src/game.js";

test("一次移动中，每个方块只合并一次", () => {
  const board = emptyBoard();
  board[0] = [2, 2, 2, 2];
  const result = move(board, "left");
  assert.deepEqual(result.board[0], [4, 4, 0, 0]);
  assert.equal(result.points, 8);
  assert.deepEqual(board[0], [2, 2, 2, 2]);
});

test("四个方向移动及无效移动", () => {
  const board = emptyBoard();
  board[0][0] = 2;
  board[1][0] = 2;
  assert.deepEqual(move(board, "down").board.map((row) => row[0]), [0, 0, 0, 4]);
  assert.deepEqual(move(board, "up").board.map((row) => row[0]), [4, 0, 0, 0]);
  assert.deepEqual(move(board, "right").board[0], [0, 0, 0, 2]);
  assert.equal(move(board, "left").changed, false);
  assert.equal(move(emptyBoard(), "left").changed, false);
});

test("新方块只出现在空格中", () => {
  const board = emptyBoard();
  board[0][0] = 2;
  assert.deepEqual(addRandomTile(board, () => 0), { row: 0, col: 1 });
  assert.equal(board[0][1], 2);
});

test("棋盘无空格且无相邻相同数字时结束", () => {
  const board = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ];
  assert.equal(hasMoves(board), false);
  board[3][3] = 4;
  assert.equal(hasMoves(board), true);
});

test("首次合成 2048 时标记获胜", () => {
  const board = emptyBoard();
  board[0] = [1024, 1024, 0, 0];
  const result = move(board, "left");
  assert.equal(result.reachedTarget, true);
  assert.equal(result.points, 2048);
});
