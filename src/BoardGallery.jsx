import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { preloadBoardModel, supportsWebGL, useMediaQuery } from "./media.js";
import { selectWarmBoards } from "./boardWarmup.js";

const BoardCanvas = lazy(() => import("./BoardCanvas.jsx"));
const SPIN_TRANSITION_MS = 1100;
const SPIN_SETTLE_MS = 520;
// The smootherstep turn reaches its first edge-on quarter-turn at 36%.
// Swap there, while the board is thinnest and the baked speed ramp is fast.
const SPIN_SWAP_MS = 410;

/**
 * Product selector rather than a catalogue: one exact board render floats over
 * the accepted complete laboratory scene.
 */
export function BoardGallery({
  boards,
  preloadEnabled = true,
  dracoPath,
  selectorBackground,
  theme,
  turntableVideo,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inView = true;
  const [readyModels, setReadyModels] = useState(() => new Set());
  const [pendingMove, setPendingMove] = useState(null);
  const [stageVisible, setStageVisible] = useState(false);
  const [videoPrimed, setVideoPrimed] = useState(theme !== "dark" || !turntableVideo);
  const [motion, setMotion] = useState("idle");
  const [softSizeBridge, setSoftSizeBridge] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(1);
  const [infoOpen, setInfoOpen] = useState(false);
  const [webGLAvailable] = useState(supportsWebGL);
  const rootRef = useRef(null);
  const infoRef = useRef(null);
  const transitionTimer = useRef(null);
  const settleTimer = useRef(null);
  const swapTimer = useRef(null);
  const videoRef = useRef(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isCompact = useMediaQuery("(max-width: 900px)");
  const board = boards[activeIndex];
  const modelReady = readyModels.has(board.model);
  const show3D = inView && webGLAvailable && Boolean(board.model);
  const live = show3D && modelReady;
  const transitionReady = !show3D || modelReady;
  const drifting = stageVisible && !reducedMotion;
  const loadedModelCount = readyModels.size;

  useEffect(() => {
    // At the smallest widths the touch-sized filmstrip scrolls horizontally.
    // Keep the current item visible without scrolling the page or the stage.
    const selected = rootRef.current?.querySelector('.board-selector-options [aria-current="true"]');
    const list = selected?.parentElement;
    if (!selected || !list || list.scrollWidth <= list.clientWidth) return;
    const itemBox = selected.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    if (itemBox.left < listBox.left || itemBox.right > listBox.right) {
      list.scrollLeft += itemBox.left - listBox.left - (list.clientWidth - itemBox.width) / 2;
    }
  }, [activeIndex, isCompact]);

  const progressivePreloadBoards = useMemo(() => {
    return selectWarmBoards(boards, activeIndex, readyModels, pendingMove?.nextIndex, motion === "idle" && preloadEnabled);
  }, [activeIndex, boards, motion, pendingMove, preloadEnabled, readyModels]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !("IntersectionObserver" in window)) {
      setStageVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setStageVisible(entry.isIntersecting),
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !webGLAvailable) return;
    preloadBoardModel(board.model, dracoPath);
  }, [board.model, dracoPath, inView, webGLAvailable]);

  useEffect(() => {
    // A light-theme visit does not mount the dark transition clip. Prime it
    // again after a later theme change before enabling the first dark turn.
    setVideoPrimed(theme !== "dark" || !turntableVideo);
  }, [theme, turntableVideo]);

  useEffect(() => {
    setInfoOpen(false);
  }, [activeIndex]);

  useEffect(() => {
    if (!infoOpen) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!infoRef.current?.contains(event.target)) setInfoOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [infoOpen]);

  useEffect(
    () => () => {
      window.clearTimeout(transitionTimer.current);
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(swapTimer.current);
      videoRef.current?.pause();
    },
    [],
  );

  const handleModelReady = useCallback((model) => {
    if (!model) return;
    setReadyModels((current) => {
      if (current.has(model)) return current;
      const next = new Set(current);
      next.add(model);
      return next;
    });
  }, []);

  const primeTurntableVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video || videoPrimed || theme !== "dark") return;

    video.currentTime = 0;
    video.playbackRate = 4;
    video.play().catch(() => {
      setVideoPrimed(true);
    });
  }, [theme, videoPrimed]);

  const finishTurntablePrime = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.playbackRate = 1;
    }
    setVideoPrimed(true);
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

  const beginTransition = useCallback(
    (nextIndex, direction) => {
      if (reducedMotion) {
        setActiveIndex(nextIndex);
        return;
      }

      setSoftSizeBridge(Math.abs(nextIndex - activeIndex) === boards.length - 1);
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
        setSoftSizeBridge(false);
      }, SPIN_TRANSITION_MS + SPIN_SETTLE_MS);
    },
    [activeIndex, boards.length, reducedMotion, startTurntableRamp],
  );

  useEffect(() => {
    if (!pendingMove || motion !== "idle") return;
    const target = boards[pendingMove.nextIndex];
    if (show3D && !readyModels.has(target.model)) return;

    const queued = pendingMove;
    setPendingMove(null);
    beginTransition(queued.nextIndex, queued.direction);
  }, [beginTransition, boards, motion, pendingMove, readyModels, show3D]);

  function moveTo(nextIndex, direction) {
    if (
      motion !== "idle" ||
      pendingMove ||
      !transitionReady ||
      nextIndex === activeIndex
    ) return;

    const target = boards[nextIndex];
    warm3D(target?.model);
    if (show3D && !readyModels.has(target.model)) {
      setPendingMove({ nextIndex, direction });
      return;
    }
    beginTransition(nextIndex, direction);
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
      data-drift={drifting ? "true" : "false"}
      data-info-open={infoOpen ? "true" : "false"}
      data-motion={motion}
      data-pending={pendingMove ? "true" : "false"}
      data-ready-count={loadedModelCount}
      data-soft-size-bridge={softSizeBridge ? "true" : "false"}
      ref={rootRef}
      tabIndex="0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && infoOpen) {
          event.preventDefault();
          setInfoOpen(false);
        }
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
        <div className="board-selector-media" aria-hidden="true">
          <img
            className="board-selector-backdrop"
            src={selectorBackground}
            alt=""
            width="1586"
            height="992"
            draggable={false}
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
              onLoadedData={primeTurntableVideo}
              onEnded={finishTurntablePrime}
            >
              <source src={turntableVideo} type="video/mp4" />
            </video>
          ) : null}
        </div>
        <div className="board-selector-vignette" aria-hidden="true" />

        <div className="board-selector-scene">
          {/* In a WebGL browser the flat render is not mounted at all, so it
              cannot flash for one frame before the canvas becomes ready. */}
          {!webGLAvailable ? (
            <img
              src={board.image}
              alt={board.alt}
              className="selector-board-still"
              data-active="true"
              width="1400"
              height="1400"
              draggable={false}
            />
          ) : null}

          {show3D ? (
            <div className="selector-board-canvas" data-ready={modelReady}>
              <Suspense fallback={null}>
                <BoardCanvas
                  autoRotate={false}
                  board={board}
                  cameraZ={board.galleryCameraZ || (isCompact ? 7.45 : 6.25)}
                  compact={isCompact}
                  dracoPath={dracoPath}
                  floating={drifting}
                  onReady={handleModelReady}
                  onPreloadReady={handleModelReady}
                  orbit="free"
                  preloadBoards={progressivePreloadBoards}
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
          disabled={motion !== "idle" || Boolean(pendingMove) || !transitionReady}
          onClick={() => moveBy(-1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          className="board-selector-arrow board-selector-arrow-next"
          aria-label="Следующая разработка"
          disabled={motion !== "idle" || Boolean(pendingMove) || !transitionReady}
          onClick={() => moveBy(1)}
        >
          <span aria-hidden="true">›</span>
        </button>

        <p className="board-selector-hint" data-visible={live}>
          {isCompact ? "Проведите по плате" : "Плату можно вращать во все стороны"}
        </p>

        {show3D && (loadedModelCount < boards.length || pendingMove) ? (
          <p className="board-selector-loading" role="status" aria-live="polite">
            <span aria-hidden="true" />
            {pendingMove
              ? "Готовим следующую плату"
              : `Загружаем 3D · ${loadedModelCount}/${boards.length}`}
          </p>
        ) : null}

        <div className="board-selector-toolbar">
          <div className="board-selector-meta" aria-live="polite">
            <div className="board-selector-heading">
              <div className="board-selector-info" ref={infoRef}>
                <div className="board-selector-title-row">
                  <h3 id={`board-title-${activeIndex}`}>{board.title}</h3>
                  <button
                    type="button"
                    className="board-selector-info-button"
                    aria-label={`Описание платы ${board.title}`}
                    aria-expanded={infoOpen}
                    aria-controls={`board-info-${activeIndex}`}
                    onClick={() => setInfoOpen((value) => !value)}
                  >
                    <span aria-hidden="true">i</span>
                  </button>
                </div>
                {infoOpen ? (
                  <div
                    className="board-selector-info-card"
                    id={`board-info-${activeIndex}`}
                    role="dialog"
                    aria-labelledby={`board-title-${activeIndex}`}
                  >
                    <button
                      type="button"
                      className="board-selector-info-close"
                      aria-label="Закрыть описание"
                      onClick={() => setInfoOpen(false)}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                    <p className="eyebrow">Описание платы</p>
                    <p>{board.text}</p>
                  </div>
                ) : null}
              </div>
              <p className="board-selector-count">
                {String(activeIndex + 1).padStart(2, "0")} / {String(boards.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="board-selector-switcher" role="group" aria-labelledby="board-switcher-label">
        <p id="board-switcher-label">Выбрать разработку</p>
        <div className="board-selector-options">
          {boards.map((item, index) => (
            <button
              type="button"
              key={item.title}
              aria-label={item.title}
              title={item.title}
              aria-current={index === activeIndex ? "true" : undefined}
              disabled={motion !== "idle" || Boolean(pendingMove) || !transitionReady}
              onClick={() => selectBoard(index)}
              onPointerEnter={() => warm3D(item.model)}
            >
              <img
                src={item.image}
                alt=""
                width="1400"
                height="1400"
                loading="lazy"
                draggable={false}
              />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
