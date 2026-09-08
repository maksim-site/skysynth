import assert from "node:assert/strict";
import test from "node:test";
import { selectWarmBoards } from "../src/boardWarmup.js";

const boards = Array.from({ length: 7 }, (_, i) => ({ model: `${i}.glb` }));
const ready = (...indices) => new Set(indices.map((i) => boards[i].model));

test("the first board gets exclusive preparation priority", () => {
  assert.deepEqual(selectWarmBoards(boards, 0, ready(), null, true), [boards[0]]);
});
test("only one new neighbour warms at a time", () => {
  assert.deepEqual(selectWarmBoards(boards, 0, ready(0), null, true), [boards[0], boards[1]]);
  assert.deepEqual(selectWarmBoards(boards, 0, ready(0, 1), null, true), [boards[0], boards[1], boards[6]]);
});
test("an explicit pending choice warms before other neighbours", () => {
  assert.deepEqual(selectWarmBoards(boards, 0, ready(0), 4, true), [boards[0], boards[4]]);
});
test("a visible spin never mounts a new unprepared model", () => {
  assert.deepEqual(selectWarmBoards(boards, 1, ready(0, 1, 6), null, false), [boards[0], boards[1], boards[6]]);
});
test("ready instances remain mounted across all seven selections", () => {
  for (let i = 0; i < 7; i += 1) {
    assert.deepEqual(selectWarmBoards(boards, i, ready(0, 1, 2, 3, 4, 5, 6), null, true), boards);
  }
});
