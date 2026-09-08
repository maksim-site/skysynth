// The same breakpoint controls the picture, its coordinate frame and preload.
export const NARROW_HERO_QUERY = "(max-width: 539px)";
export const HIDDEN_PENDANT_QUERY = "(max-width: 539px)";

export function fitHeroStage(width, height, portrait) {
  const sourceWidth = portrait ? 1084 : 1586;
  const sourceHeight = portrait ? 1451 : 992;
  if (!portrait) {
    if (width <= 960) {
      // Keep the complete wide room beside the fixture in the stacked layout.
      // Its height follows the physical mounting plate; only empty room can
      // fall outside the viewport on narrower tablets.
      const scale = Math.max(1, height - 36) / (sourceHeight * .77);
      const stageWidth = sourceWidth * scale;
      const stageHeight = sourceHeight * scale;
      const top = 12 - stageHeight * .137;
      return {
        width: stageWidth,
        height: stageHeight,
        left: width - stageWidth,
        top,
        "--hero-photo-bottom": `${height - top}px`,
      };
    }
    const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
    // Keep the accepted wide photograph on intermediate windows too. Limit
    // its PHYSICAL fixture to the right column instead of swapping the asset
    // and its coordinate system at 1180px or an aspect-ratio threshold.
    const scale = Math.min(coverScale, width * .48 / (sourceWidth * .427));
    return {
      width: sourceWidth * scale,
      height: sourceHeight * scale,
      // The room reaches the top edge even when its height is constrained.
      // Taller photographs retain their existing centred crop.
      top: Math.min(0, (height - sourceHeight * scale) / 2),
      "--hero-stage-nudge": `${Math.max(0, Math.min(width * .01, (width - 1200) * .06))}px`,
    };
  }

  // Phones centre the fixture; wider stacked layouts progressively make
  // space for the pendant on the left without moving the PCB independently.
  const fixtureTop = 12;
  const scale = Math.min(
    Math.max(1, width - 36) / (sourceWidth * .752),
    Math.max(1, height - fixtureTop - 24) / (sourceHeight * .683),
  );
  const stageWidth = sourceWidth * scale;
  const stageHeight = sourceHeight * scale;
  const top = fixtureTop - stageHeight * .179;
  const shift = Math.max(0, Math.min(width * .15, (width - 496) * .75));
  const left = (width - stageWidth) / 2 + shift;
  return {
    width: stageWidth,
    height: stageHeight,
    left,
    top,
    // Fade the photograph at its VISIBLE crop, not beyond the clipped frame.
    // These stops never apply to the independent, fully opaque PCB.
    "--hero-photo-left": `${Math.max(0, -left)}px`,
    "--hero-photo-right": `${Math.min(stageWidth, width - left)}px`,
    "--hero-photo-top": `${Math.max(0, -top)}px`,
    "--hero-photo-bottom": `${Math.min(stageHeight, height - top)}px`,
  };
}

export function fitPendantStage(width, height) {
  if (width <= 960) {
    return {
      width, height: width * 992 / 1586, top: 0,
      "--hero-stage-nudge": `${-width * .1}px`,
    };
  }
  const frame = fitHeroStage(width, height, false);
  // The cord still hangs from the ceiling when the board's photograph is
  // smaller than the viewport; it must not descend with that photograph.
  return { ...frame, top: Math.min(0, (height - frame.height) / 2) };
}
