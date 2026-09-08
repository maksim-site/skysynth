import { Canvas } from "@react-three/fiber";
import { PCFShadowMap } from "three";
import { BoardScene } from "./boardScene.jsx";

/**
 * Lazy entry point for everything three.js. Nothing on the first paint imports
 * this file. Idle/near-viewport preparation loads it ahead of interaction.
 */
export function BoardCanvas({
  autoRotate,
  board,
  cameraZ = 6.4,
  compact,
  dracoPath,
  floating,
  onReady,
  onPreloadReady,
  onPresentationRest,
  orbit,
  preloadBoards,
  presentationMotion = "idle",
  reducedMotion,
  theme,
  transitionDirection,
  transitionMotion,
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.05, cameraZ], fov: 32, near: 0.1, far: 40 }}
      dpr={compact ? [1, 1.25] : [1, 1.65]}
      frameloop={floating || transitionMotion !== "idle" || presentationMotion === "returning" ? "always" : "demand"}
      shadows={{ type: PCFShadowMap }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
    >
      <BoardScene
        autoRotate={autoRotate}
        board={board}
        cameraZ={cameraZ}
        compact={compact}
        dracoPath={dracoPath}
        floating={floating}
        onReady={onReady}
        onPreloadReady={onPreloadReady}
        preloadBoards={preloadBoards}
        presentationMotion={presentationMotion}
        onPresentationRest={onPresentationRest}
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
