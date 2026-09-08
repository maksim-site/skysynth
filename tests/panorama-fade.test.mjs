import assert from "node:assert/strict";
import test from "node:test";
import { panoramaTopFade } from "../src/panoramaFade.js";

for (const [imageWidth, imageHeight, imageTop, objectFit, positionY] of [
  [1440,288,0,"cover",.7], [1920,360,0,"cover",.7],
  [675,270,0,"cover",.7], [605.34,201.78,-41.05,"contain",.5],
  [463.74,154.58,-17.45,"contain",.5],
]) {
  test(`panorama fade stays above every board at ${imageWidth}px`, () => {
    const sourceWidth = 2172, sourceHeight = 724;
    const fade = panoramaTopFade({imageWidth,imageHeight,imageTop,objectFit,positionY,sourceWidth,sourceHeight});
    const scale = objectFit === "cover" ? Math.max(imageWidth/sourceWidth,imageHeight/sourceHeight) : Math.min(imageWidth/sourceWidth,imageHeight/sourceHeight);
    const boardTop = imageTop + (imageHeight-sourceHeight*scale)*positionY + sourceHeight*scale*.4;
    assert.ok(fade > 0);
    assert.ok(fade <= boardTop - 7.99);
    assert.ok(fade <= 96);
  });
}

test("unloaded panorama does not paint a speculative veil over the boards", () => {
  assert.equal(panoramaTopFade({imageWidth:600,imageHeight:270,sourceWidth:0,sourceHeight:0}), 0);
});
