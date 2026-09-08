// Prepare small, reusable bitmap layers once. Nothing is painted or filtered
// on each animation frame; the browser only composites transforms and opacity.
const cache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
        resolve(image);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error("Pendant asset could not load"));
    image.src = src;
  });
}

function canvas(width, height) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return element;
}

function bitmapUrl(element) {
  return new Promise((resolve, reject) => {
    element.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
      else reject(new Error("Pendant bitmap could not be prepared"));
    }, "image/png");
  });
}

function lampBitmap(photo, matte) {
  const crop = { x: 278, y: 0, width: 268, height: 254 };
  const result = canvas(crop.width, crop.height);
  const context = result.getContext("2d", { willReadFrequently: true });
  const maskCanvas = canvas(crop.width, crop.height);
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(photo, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  maskContext.drawImage(matte, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  const pixels = context.getImageData(0, 0, crop.width, crop.height);
  const mask = maskContext.getImageData(0, 0, crop.width, crop.height).data;
  const exposure = [0.81, 0.79, 0.76];
  for (let index = 0; index < pixels.data.length; index += 4) {
    // Match the already-reviewed luminance matte while removing its black noise.
    pixels.data[index + 3] = Math.round(255 * Math.min(1, Math.max(0, (mask[index] / 255 - 0.57) / 0.29)));
    for (let channel = 0; channel < 3; channel += 1) {
      pixels.data[index + channel] = Math.round(255 * exposure[channel] * (pixels.data[index + channel] / 255) ** 1.24);
    }
  }
  context.putImageData(pixels, 0, 0);
  return bitmapUrl(result);
}

function hash(x, y) {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y) {
  const left = Math.floor(x);
  const top = Math.floor(y);
  let tx = x - left;
  let ty = y - top;
  tx = tx * tx * (3 - 2 * tx);
  ty = ty * ty * (3 - 2 * ty);
  const a = hash(left, top) * (1 - tx) + hash(left + 1, top) * tx;
  const b = hash(left, top + 1) * (1 - tx) + hash(left + 1, top + 1) * tx;
  return a * (1 - ty) + b * ty;
}

function atmosphereBitmap(kind) {
  const width = 256;
  const height = kind === "beam" ? 384 : 256;
  const result = canvas(width, height);
  const context = result.getContext("2d");
  const pixels = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const u = x / (width - 1);
      const v = y / (height - 1);
      const cloud = noise(u * 3.7 + 12, v * 4.1 + 4) * 0.57 + noise(u * 8.1, v * 8.4) * 0.29 + noise(u * 18.2, v * 20.5) * 0.14;
      let alpha;
      if (kind === "beam") {
        const spread = 0.15 + v * 0.3;
        const sides = Math.exp(-(((u - 0.5) / spread) ** 4) * 2.5);
        const ends = Math.min(1, v * 28) * (1 - v) ** 1.7;
        alpha = sides * ends * (0.12 + cloud * 0.1);
      } else {
        const edge = Math.exp(-(((u - 0.5) / 0.39) ** 4 + ((v - 0.5) / 0.38) ** 4) * 2);
        alpha = edge * Math.max(0, cloud - 0.24) * 0.19;
      }
      const index = (y * width + x) * 4;
      pixels.data[index] = 209;
      pixels.data[index + 1] = 190;
      pixels.data[index + 2] = 158;
      pixels.data[index + 3] = Math.round(alpha * 255);
    }
  }
  context.putImageData(pixels, 0, 0);
  return bitmapUrl(result);
}

export function preparePendantAssets(photoUrl, maskUrl, whiteUrl) {
  const key = `${photoUrl}|${maskUrl}|${whiteUrl}`;
  if (!cache.has(key)) {
    const promise = Promise.all([loadImage(photoUrl), loadImage(maskUrl), loadImage(whiteUrl)])
      .then(async ([photo, matte]) => {
        // The new white lamp has its own genuine alpha. Never force it into
        // the dark photograph's mask: their contours are not interchangeable.
        const lampLight = whiteUrl;
        const [lamp, beam, mist] = await Promise.all([
          lampBitmap(photo, matte), atmosphereBitmap("beam"), atmosphereBitmap("mist"),
        ]);
        // Blob creation alone does not mean both lamp materials and atmosphere
        // can paint. Decode them before releasing the first-screen loader.
        await Promise.all([lamp, lampLight, beam, mist].map(loadImage));
        return { lamp, lampLight, beam, mist };
      })
      .catch((error) => { cache.delete(key); throw error; });
    cache.set(key, promise);
  }
  // Blob URLs deliberately live for the page lifetime and are reused across
  // StrictMode, theme changes, and section remounts rather than recreated.
  return cache.get(key);
}

export function pendulumKeyframes(amplitude = 3.6) {
  // Two smooth half-swings rather than 120 separate interpolation segments.
  // Explicit 3D transforms keep the whole prepared light rig compositable.
  return [-amplitude, amplitude, -amplitude].map((angle, index) => ({
    transform: `translate3d(0, 0, 0) rotate(${angle}deg)`,
    offset: index / 2,
    easing: "cubic-bezier(0.37, 0, 0.63, 1)",
  }));
}
