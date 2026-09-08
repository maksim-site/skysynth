import { useLayoutEffect, useState } from "react";
import { fitHeroStage } from "./heroLayout.js";

// One framing rule for the static phone scene and the click-to-3D scene.
// useLayoutEffect commits it under the initial loader, before the first paint.
export function useHeroStageLayout(rootRef, portrait) {
  const [layout, setLayout] = useState(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const resize = () => setLayout(fitHeroStage(root.clientWidth, root.clientHeight, portrait));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    return () => observer.disconnect();
  }, [rootRef, portrait, fitHeroStage]);
  return layout ?? undefined;
}
