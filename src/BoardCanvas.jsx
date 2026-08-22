import { Canvas } from "@react-three/fiber";
import { BoardScene } from "./boardScene.jsx";

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
  reducedMotion,
  theme,
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.05, cameraZ], fov: 32, near: 0.1, far: 40 }}
      dpr={compact ? [1, 1.5] : [1, 1.65]}
      shadows
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
    >
      <BoardScene
        autoRotate={autoRotate}
        board={board}
        dracoPath={dracoPath}
        floating={floating}
        onReady={onReady}
        orbit={orbit}
        reducedMotion={reducedMotion}
        theme={theme}
      />
    </Canvas>
  );
}

export default BoardCanvas;
