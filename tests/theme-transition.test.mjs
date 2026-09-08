import assert from "node:assert/strict";
import test from "node:test";
import { themeWaveGeometry } from "../src/themeTransition.js";

for (const [width, height, left, top] of [[1440, 900, 860, 24], [393, 852, 230, 16], [320, 568, 246, 12], [844, 390, 680, 12]]) {
  test(`theme wave covers every corner at ${width} x ${height}`, () => {
    const g = themeWaveGeometry(width, height, { left, top, width: 44, height: 44 });
    assert.equal(g.x, left + 22);
    assert.equal(g.y, top + 22);
    for (const [x, y] of [[0, 0], [width, 0], [0, height], [width, height]]) {
      assert.ok(g.radius - g.feather >= Math.hypot(x - g.x, y - g.y) - 0.0001);
    }
    assert.ok(g.duration <= 850);
  });
}

test("theme wave has a safe origin without a pointer event", () => {
  const g = themeWaveGeometry(400, 800);
  assert.equal(g.x, 200);
  assert.equal(g.y, 32);
});
