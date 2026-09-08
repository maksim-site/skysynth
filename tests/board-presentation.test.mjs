import assert from "node:assert/strict";
import test from "node:test";
import { restoreBoardPresentation, setBoardPresentationHome } from "../src/boardPresentation.js";

const vector = (values = [0, 0, 0]) => ({
  values,
  set(...next) { this.values = next; },
});

function controlsWithStaleHome() {
  return {
    target0: vector([2, -1, 3]),
    position0: vector([5, 3, -1]),
    zoom0: 2,
    object: { position: vector([5, 3, 1]), zoom: 1 },
    enableDamping: true,
    autoRotate: false,
    momentum: 0.8,
    update() { if (!this.enableDamping) this.momentum = 0; },
    reset() {
      this.object.position.set(...this.position0.values);
      this.object.position.values[0] += this.momentum;
      this.object.zoom = this.zoom0;
    },
  };
}

test("pinning the home pose does not move the outgoing inspection pose", () => {
  const c = controlsWithStaleHome();
  setBoardPresentationHome(c, 6.25);
  assert.deepEqual(c.object.position.values, [5, 3, 1]);
  assert.deepEqual(c.position0.values, [0, 0.05, 6.25]);
});

for (const distance of [6.25, 7.45]) {
  test(`landing restores the approved ${distance} camera distance without drag inertia`, () => {
    const c = controlsWithStaleHome();
    restoreBoardPresentation(c, distance);
    assert.deepEqual(c.object.position.values, [0, 0.05, distance]);
    assert.deepEqual(c.target0.values, [0, 0, 0]);
    assert.equal(c.object.zoom, 1);
    assert.equal(c.momentum, 0);
    assert.equal(c.enableDamping, true);
    assert.equal(c.autoRotate, false);
  });
}

test("missing controls are safe before mount", () => {
  assert.doesNotThrow(() => restoreBoardPresentation(null, 6.25));
});
