import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { PCFShadowMap } from "three";
import { BoardModelPreloader, BoardScene } from "./boardScene.jsx";

/**
 * Lazy entry point for everything three.js. Nothing on the first paint imports
 * this file, so the 3D stack only downloads when a visitor opens a board.
 */
export function BoardCanvas({
  autoRotate,
  board,
  cameraZ = 6.4,
  compact,
  dracoPath,
  floating,
  onReady,
  orbit,
  preloadBoards,
  reducedMotion,
  theme,
  transitionDirection,
  transitionMotion,
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.05, cameraZ], fov: 32, near: 0.1, far: 40 }}
      dpr={compact ? [1, 1.25] : [1, 1.65]}
      frameloop={floating || transitionMotion !== "idle" ? "always" : "demand"}
      shadows={{ type: PCFShadowMap }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
    >
      {preloadBoards?.length ? (
        <Suspense fallback={null}>
          <BoardModelPreloader
            boards={preloadBoards}
            dracoPath={dracoPath}
          />
        </Suspense>
      ) : null}
      <BoardScene
        autoRotate={autoRotate}
        board={board}
        compact={compact}
        dracoPath={dracoPath}
        floating={floating}
        onReady={onReady}
        orbit={orbit}
        reducedMotion={reducedMotion}
        theme={theme}
        transitionDirection={transitionDirection}
        transitionMotion={transitionMotion}
      />
    </Canvas>
  );
}

export default BoardCanvas;
