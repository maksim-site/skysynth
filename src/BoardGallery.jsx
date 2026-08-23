import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { preloadBoardModel, supportsWebGL, useMediaQuery } from "./media.js";

const BoardCanvas = lazy(() => import("./BoardCanvas.jsx"));
const SPIN_TRANSITION_MS = 1100;
const SPIN_SETTLE_MS = 520;
// The smootherstep turn reaches its first edge-on quarter-turn at 36%.
// Swap there, while the board is thinnest and the baked speed ramp is fast.
const SPIN_SWAP_MS = Math.round(SPIN_TRANSITION_MS * 0.36);

/**
 * Product selector rather than a catalogue: one exact board render floats over
 * the accepted complete laboratory scene.
 */
export function BoardGallery({
  boards,
  dracoPath,
  selectorBackground,
  theme,
  turntableVideo,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [motion, setMotion] = useState("idle");
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [webGLAvailable] = useState(supportsWebGL);
  const rootRef = useRef(null);
  const transitionTimer = useRef(null);
  const settleTimer = useRef(null);
  const swapTimer = useRef(null);
  const videoRef = useRef(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isCompact = useMediaQuery("(max-width: 900px)");
  const board = boards[activeIndex];
  const show3D = inView && webGLAvailable && Boolean(board.model);
  const live = show3D && modelReady;

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setInView(true);
        observer.disconnect();
      },
      { rootMargin: "1400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !webGLAvailable) return;
    // Warm every exact model before the selector reaches the viewport. This
    // keeps direct dot selections and the 7 -> 1 wrap from flashing a still
    // while a GLB is decoded.
    boards.forEach((item) => preloadBoardModel(item.model, dracoPath));
  }, [boards, dracoPath, inView, webGLAvailable]);

  useEffect(
    () => () => {
      window.clearTimeout(transitionTimer.current);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(swapTimer.current);
      videoRef.current?.pause();
    },
    [],
  );

  const handleModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  const warm3D = useCallback(
    (model) => {
      if (webGLAvailable && model) preloadBoardModel(model, dracoPath);
    },
    [dracoPath, webGLAvailable],
  );

  const startTurntableRamp = useCallback(() => {
    const video = videoRef.current;
    if (!video || theme !== "dark") return;

    video.pause();
    video.currentTime = 0;
    video.playbackRate = 1;
    video.play().catch(() => {
      // The exact GLB transition still works if a browser blocks video playback.
    });
  }, [theme]);

  function moveTo(nextIndex, direction) {
    if (motion !== "idle" || nextIndex === activeIndex) return;

    if (reducedMotion) {
      setActiveIndex(nextIndex);
      return;
    }

    warm3D(boards[nextIndex]?.model);
    setTransitionDirection(direction >= 0 ? 1 : -1);
    setMotion("spin-out");
    startTurntableRamp();

    swapTimer.current = window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setMotion("spin-in");
    }, SPIN_SWAP_MS);

    transitionTimer.current = window.setTimeout(() => {
      setMotion("settle");
      videoRef.current?.pause();
    }, SPIN_TRANSITION_MS);

    settleTimer.current = window.setTimeout(() => {
      setMotion("idle");
    }, SPIN_TRANSITION_MS + SPIN_SETTLE_MS);
  }

  function moveBy(delta) {
    const nextIndex = (activeIndex + delta + boards.length) % boards.length;
    moveTo(nextIndex, delta);
  }

  function selectBoard(index) {
    const directDistance = index - activeIndex;
    const wrappedDistance =
      directDistance > 0 ? directDistance - boards.length : directDistance + boards.length;
    const direction =
      Math.abs(directDistance) <= Math.abs(wrappedDistance)
        ? Math.sign(directDistance)
        : Math.sign(wrappedDistance);
    moveTo(index, direction || 1);
  }

  return (
    <div
      className="board-selector"
      data-direction={transitionDirection}
      data-motion={motion}
      ref={rootRef}
      tabIndex="0"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveBy(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveBy(1);
        }
      }}
    >
      <div className="board-selector-stage" data-live={live}>
        <img
          className="board-selector-backdrop"
          src={selectorBackground}
          alt=""
          width="1586"
          height="992"
          aria-hidden="true"
        />
        {theme === "dark" && turntableVideo ? (
          <video
            ref={videoRef}
            className="board-selector-transition-video"
            data-active={
              motion === "spin-out" || motion === "spin-in" ? "true" : "false"
            }
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          >
            <source src={turntableVideo} type="video/mp4" />
          </video>
        ) : null}
        <div className="board-selector-vignette" aria-hidden="true" />

        <div className="board-selector-scene">
          <img
            src={board.image}
            alt={board.alt}
            className="selector-board-still"
            data-active={!live}
            width="1400"
            height="1400"
          />

          {show3D ? (
            <div className="selector-board-canvas" data-ready={modelReady}>
              <Suspense fallback={null}>
                <BoardCanvas
                  autoRotate={false}
                  board={board}
                  cameraZ={board.galleryCameraZ || (isCompact ? 6.9 : 6.25)}
                  compact={isCompact}
                  dracoPath={dracoPath}
                  floating={!reducedMotion}
                  onReady={handleModelReady}
                  orbit="free"
                  reducedMotion={reducedMotion}
                  theme={theme}
                  // The source platter turns clockwise for the right arrow;
                  // invert the WebGL yaw so its screen-space motion agrees.
                  transitionDirection={-transitionDirection}
                  // Keep one uninterrupted 3D phase across the model swap.
                  transitionMotion={
                    motion === "idle"
                      ? "idle"
                      : motion === "settle"
                        ? "settle"
                        : "spin"
                  }
                />
              </Suspense>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="board-selector-arrow board-selector-arrow-prev"
          aria-label="Предыдущая разработка"
          disabled={motion !== "idle"}
          onClick={() => moveBy(-1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className="board-selector-arrow board-selector-arrow-next"
          aria-label="Следующая разработка"
          disabled={motion !== "idle"}
          onClick={() => moveBy(1)}
        >
          <span aria-hidden="true">›</span>
        </button>

        <p className="board-selector-hint" data-visible={live}>
          {isCompact ? "Проведите по плате" : "Плату можно вращать во все стороны"}
        </p>

        {show3D && !modelReady ? (
          <p className="board-selector-loading" role="status" aria-live="polite">
            <span aria-hidden="true" />
            Загружаем 3D
          </p>
        ) : null}

        <div className="board-selector-meta" aria-live="polite">
          <div className="board-selector-heading">
            <h3>{board.title}</h3>
            <p className="board-selector-count">
              {String(activeIndex + 1).padStart(2, "0")} / {String(boards.length).padStart(2, "0")}
            </p>
          </div>
        </div>

        <div className="board-selector-dots" aria-label="Выбор разработки">
          {boards.map((item, index) => (
            <button
              type="button"
              key={item.title}
              aria-label={item.title}
              aria-current={index === activeIndex ? "true" : undefined}
              disabled={motion !== "idle"}
              onClick={() => selectBoard(index)}
              onPointerEnter={() => warm3D(item.model)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
