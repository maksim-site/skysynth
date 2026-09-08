import assert from "node:assert/strict";
import test from "node:test";
import { pendulumKeyframes } from "../src/pendantAssets.js";

test("pendant is one smooth repeating pair of half-swings", () => {
  const frames = pendulumKeyframes();
  assert.equal(frames.length, 3);
  assert.deepEqual(frames.map(frame => frame.offset), [0, .5, 1]);
  assert.equal(frames[0].transform, frames[2].transform);
  assert.match(frames[0].transform, /translate3d\(0, 0, 0\) rotate\(-3\.6deg\)/);
  assert.match(frames[1].transform, /rotate\(3\.6deg\)/);
  assert.ok(frames.every(frame => frame.easing === "cubic-bezier(0.37, 0, 0.63, 1)"));
});
