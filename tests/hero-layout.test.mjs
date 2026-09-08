import assert from "node:assert/strict";
import test from "node:test";
import { fitHeroStage, fitPendantStage, NARROW_HERO_QUERY, HIDDEN_PENDANT_QUERY } from "../src/heroLayout.js";

for (const [width, height] of [[320,268], [393,374.88], [496,369.6], [540,380], [560,343.2], [620,380], [709,347.16], [720,380]]) {
  test(`compact hero contains the entire physical fixture in ${width} x ${height}`, () => {
    const fit = fitHeroStage(width, height, true);
    const { left, top } = fit;
    assert.ok(left + fit.width * .124 >= 0);
    assert.ok(left + fit.width * .876 <= width);
    assert.ok(Math.abs(top + fit.height * .179 - 12) < .001);
    assert.ok(top + fit.height * .862 <= height - 23.99);
    assert.ok(Math.abs(fit.width / fit.height - 1084 / 1451) < 0.00001);
    assert.ok(fit.width * .752 >= Math.min(190, width * .7), "fixture must remain legible");
  });
}

test("lamp and fixture fit beside each other across the stacked tablet range", () => {
  for (let width = 540; width <= 960; width++) {
    const height = Math.floor(Math.max(380, width * .482 + 37));
    const fit = fitHeroStage(width, height, false);
    const lamp = fitPendantStage(width, 380);
    // Conservative right edge, including the shade/cord's full ±3.6° swing.
    const lampRight = (width - lamp.width) / 2 + parseFloat(lamp["--hero-stage-nudge"]) + lamp.width * .361;
    assert.ok(fit.left + fit.width * .483 - lampRight >= 20, `crowded at ${width}px`);
  }
});

test("stacked tablets show a continuous wide room with the complete fixture", () => {
  for (let width = 540; width <= 960; width++) {
    for (const viewportHeight of [568, 852, 1024]) {
      // ResizeObserver reads integer clientHeight, including short viewports.
      const height = Math.floor(Math.max(Math.min(380, Math.max(268, viewportHeight * .44)), width * .482 + 37));
      const fit = fitHeroStage(width, height, false);
      assert.ok(fit.left <= 0, `room must reach the left edge at ${width}px`);
      assert.ok(Math.abs(fit.left + fit.width - width) < .001);
      assert.ok(fit.left + fit.width * .483 >= 0);
      assert.ok(fit.left + fit.width * .904 <= width);
      assert.ok(Math.abs(fit.top + fit.height * .137 - 12) < .001);
      assert.ok(Math.abs(fit.top + fit.height * .907 - (height - 24)) < .001);
      assert.ok(Math.abs(fit.width / fit.height - 1586 / 992) < .00001);
    }
  }
});

test("phone remains centred; the wider compact fixture shifts smoothly", () => {
  for (let width = 320; width < 720; width++) {
    const a = fitHeroStage(width, 375, true);
    const b = fitHeroStage(width + 1, 375, true);
    assert.ok(Math.abs(b.left - a.left) <= 1.26);
    if (width <= 496) assert.ok(Math.abs(a.left + a.width / 2 - width / 2) < .001);
  }
});

test("wide composition scales continuously across former width/aspect switches", () => {
  for (let width = 961; width < 1600; width++) {
    const a = fitHeroStage(width, 840, false);
    const b = fitHeroStage(width + 1, 840, false);
    assert.ok(Math.abs(b.width - a.width) < 1.13);
    assert.ok(Math.abs(b.top - a.top) < 1);
    assert.ok(a.top <= 0, "wide room must reach the upper viewport edge");
    assert.ok(a.width * .427 <= width * .48 + .001);
    assert.ok(Math.abs(a.width / a.height - 1586 / 992) < .00001);
    const lamp = fitPendantStage(width, 840);
    assert.equal(lamp.width, a.width);
    assert.ok(lamp.top <= 0);
  }
});

test("shorter photographs reach the ceiling without an empty upper slab", () => {
  const fit = fitHeroStage(980, 900, false);
  assert.equal(fit.top, 0);
  assert.ok(fit.top + fit.height * .136 > 74);
});

test("accepted wide hero retains its original framing", () => {
  const fit = fitHeroStage(1202, 840, false);
  assert.ok(Math.abs(fit.height - 840) < .001);
  assert.equal(fit.top, 0);
  assert.equal(fitHeroStage(1440, 900, false).width, 1440);
});

test("portrait photo and hidden pendant both end before the stacked tablet range", () => {
  assert.equal(NARROW_HERO_QUERY, "(max-width: 539px)");
  assert.equal(HIDDEN_PENDANT_QUERY, "(max-width: 539px)");
});
