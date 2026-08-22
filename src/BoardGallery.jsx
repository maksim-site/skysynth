import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { preloadBoardModel, supportsWebGL, useMediaQuery } from "./media.js";

const BoardCanvas = lazy(() => import("./BoardCanvas.jsx"));
const EXIT_TRANSITION_MS = 300;
const LANDING_TRANSITION_MS = 440;

/**
 * Product selector rather than a catalogue: one exact board render floats over
 * the accepted complete laboratory scene.
 */
export function BoardGallery({
  boards,
  dracoPath,
  selectorBackground,
  theme,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [motion, setMotion] = useState("idle");
  const [webGLAvailable] = useState(supportsWebGL);
  const rootRef = useRef(null);
  const transitionTimer = useRef(null);
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
      { rootMargin: "420px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setModelReady(false);
    const next = boards[(activeIndex + 1) % boards.length];
    if (webGLAvailable && next.model) preloadBoardModel(next.model, dracoPath);
  }, [activeIndex, boards, dracoPath, webGLAvailable]);

  useEffect(
    () => () => {
      window.clearTimeout(transitionTimer.current);
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

  function moveTo(nextIndex, direction) {
    if (motion !== "idle" || nextIndex === activeIndex) return;

    if (reducedMotion) {
      setActiveIndex(nextIndex);
      return;
    }

    setMotion("exit-up");
    transitionTimer.current = window.setTimeout(() => {
      setActiveIndex(nextIndex);
      setMotion("enter-up");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setMotion("landing");
          transitionTimer.current = window.setTimeout(
            () => setMotion("idle"),
            LANDING_TRANSITION_MS,
          );
        });
      });
    }, EXIT_TRANSITION_MS);
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
