// The highest components in the approved dark/light source plates begin
// below 40% of the original image. Never put the fade on that region.
export function panoramaTopFade({ imageWidth, imageHeight, imageTop, sourceWidth, sourceHeight, objectFit, positionY = .5 }) {
  if (!sourceWidth || !sourceHeight || !imageWidth || !imageHeight) return 0;
  const scale = objectFit === "cover"
    ? Math.max(imageWidth / sourceWidth, imageHeight / sourceHeight)
    : Math.min(imageWidth / sourceWidth, imageHeight / sourceHeight);
  const renderedHeight = sourceHeight * scale;
  const sourceTop = imageTop + (imageHeight - renderedHeight) * positionY;
  const clearRoom = sourceTop + renderedHeight * .4 - 8;
  return Math.max(0, Math.min(96, clearRoom));
}
