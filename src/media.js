import { useEffect, useState } from "react";

/** Kept free of three.js so the entry bundle never pulls the 3D stack in. */
export function supportsWebGL() {
  if (typeof document === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** Warms the GLB for a board without loading three.js on the main path. */
export function preloadBoardModel(model, dracoPath) {
  if (!model) return;
  import("./boardScene.jsx").then((module) => {
    module.useGLTF.preload(model, dracoPath);
  });
}
