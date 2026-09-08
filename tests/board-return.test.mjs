import assert from "node:assert/strict";
import test from "node:test";
import { Vector3 } from "three";
import { createBoardReturn, sampleBoardReturn } from "../src/boardReturn.js";

for (const pose of [[5, 3, -2], [0, .05, -6.4], [-6, -1, .4], [.1, 6.4, .1]]) {
  test(`hero returns smoothly from ${pose} without crossing the board`, () => {
    const start = new Vector3(...pose), initialTarget = new Vector3(.1, .02, 0);
    const path = createBoardReturn(start, initialTarget, 6.4);
    const position = new Vector3(), target = new Vector3();
    sampleBoardReturn(path, 0, position, target);
    assert.ok(position.distanceTo(start) < 1e-10);
    assert.ok(target.distanceTo(initialTarget) < 1e-10);
    const minimumRadius = Math.min(path.from.radius, path.home.radius);
    for (let frame = 0; frame <= 100; frame += 1) {
      sampleBoardReturn(path, frame / 100, position, target);
      assert.ok(position.distanceTo(target) >= minimumRadius - 1e-10);
      assert.ok(Number.isFinite(position.x + position.y + position.z));
    }
    assert.ok(position.distanceTo(new Vector3(0, .05, 6.4)) < 1e-10);
    assert.ok(target.length() < 1e-10);
    assert.ok(Math.abs(path.turn) <= Math.PI);
  });
}
test("return ease has no starting or landing velocity kick", () => {
  const path = createBoardReturn(new Vector3(5, 2, -3), new Vector3(), 6.4);
  const a = new Vector3(), b = new Vector3(), target = new Vector3();
  for (const [t0, t1] of [[0, .0001], [.9999, 1]]) {
    sampleBoardReturn(path, t0, a, target);
    sampleBoardReturn(path, t1, b, target);
    assert.ok(a.distanceTo(b) < 1e-8);
  }
});
