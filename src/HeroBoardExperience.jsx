import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Rotate3D } from "lucide-react";
import { preloadBoardModel, supportsWebGL, useMediaQuery } from "./media.js";
import { HIDDEN_PENDANT_QUERY, NARROW_HERO_QUERY } from "./heroLayout.js";
import { useHeroStageLayout } from "./useHeroStageLayout.js";
import { BOARD_RETURN_SECONDS, HERO_LAND_SECONDS, HERO_LIFT_SECONDS } from "./heroMotion.js";

const BoardCanvas = lazy(() => import("./BoardCanvas.jsx"));

gsap.registerPlugin(useGSAP);

export function HeroBoardExperience({ backgrounds, boards, dracoPath, theme }) {
  const rootRef = useRef(null);
  const zoneRef = useRef(null);
  const triggerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const controlsRef = useRef(null);
  const returnFocusRef = useRef(false);
  const [mode, setMode] = useState("rest");
  const [mounted3D, setMounted3D] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [webGLAvailable] = useState(supportsWebGL);
  const isMobileAsset = useMediaQuery(NARROW_HERO_QUERY);
  const isPhone = useMediaQuery(HIDDEN_PENDANT_QUERY);
  const sceneStyle = useHeroStageLayout(rootRef, isMobileAsset);
  const isCompact = useMediaQuery("(max-width: 620px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const board = boards[0];

  useEffect(() => {
    if (mode === "rest") {
      if (returnFocusRef.current) {
        returnFocusRef.current = false;
        triggerRef.current?.focus({ preventScroll: true });
      }
      return undefined;
    }
    const closeWithKeyboard = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      returnFocusRef.current = true;
      setMode(mode === "preparing" ? "rest" : "returning");
    };
    window.addEventListener("keydown", closeWithKeyboard);
    return () => window.removeEventListener("keydown", closeWithKeyboard);
  }, [mode]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let intersects = true;
    const update = () => setInView(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      update();
    });
    observer.observe(root);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const handleModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  // Отличаем клик по плате от вращения: короткое нажатие без сдвига закрывает 3D.
  const pressRef = useRef(null);

  function onCanvasPointerDown(event) {
    if (!event.isPrimary) {
      pressRef.current = null;
      return;
    }
    pressRef.current = { x: event.clientX, y: event.clientY, at: Date.now(), dragged: false };
  }

  function onCanvasPointerMove(event) {
    const press = pressRef.current;
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) >= 6) {
      press.dragged = true;
    }
  }

  function onCanvasPointerUp(event) {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press || mode !== "interactive") return;

    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (!press.dragged && moved < 6 && Date.now() - press.at < 400) setMode("returning");
  }

  const warm3D = useCallback(() => {
    if (webGLAvailable) {
      preloadBoardModel(board.model, dracoPath);
      setMounted3D(true);
    }
  }, [board.model, dracoPath, webGLAvailable]);

  useEffect(() => {
    if (mounted3D || !inView || !webGLAvailable) return;
    // Prepare the real Canvas as well as the GLB, before the first click.
    // Hidden at rest and demand-rendered after its two GPU upload frames.
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm3D, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm3D, 250);
    return () => window.clearTimeout(id);
  }, [inView, mounted3D, warm3D, webGLAvailable]);

  useEffect(() => {
    if (mode === "preparing" && modelReady) {
      setMode("lifting");
    }
  }, [mode, modelReady]);

  useGSAP(
    () => {
      const zone = zoneRef.current;
      const trigger = triggerRef.current;
      const image = imageRef.current;
      const canvas = canvasRef.current;
      const controls = controlsRef.current;
      if (!zone || !trigger || !image) return undefined;

      gsap.killTweensOf([zone, trigger, image, canvas, controls]);

      if (mode === "rest") {
        gsap.set(zone, { yPercent: 0, scale: 1, rotate: 0 });
        gsap.set(trigger, { opacity: 1, filter: "blur(0px)" });
        gsap.set(image, { opacity: 1, scale: 1 });
        if (canvas) {
          gsap.set(canvas, {
            opacity: 0,
            scale: isPhone ? 1 : 1.05,
            yPercent: isPhone ? 1 : 2.4,
            filter: "blur(0px)",
          });
        }
        if (controls) gsap.set(controls, { opacity: 0, y: 7 });
        return undefined;
      }

      if (mode === "lifting" && canvas) {
        const timeline = gsap.timeline({
          onComplete: () => setMode("interactive"),
        });
        timeline
          .to(zone, {
            yPercent: isCompact ? -1.8 : -2.8,
            scale: isCompact ? 1.014 : 1.024,
            duration: reducedMotion ? .01 : HERO_LIFT_SECONDS,
            ease: "power2.inOut",
          }, 0)
          // Match the live silhouette to the photographed pose, then change
          // illumination immediately while the SAME lift is still underway.
          .set(canvas, { scale: isPhone ? 1 : 1.05, yPercent: isPhone ? 1 : 2.4, filter: "none" }, 0)
          .to(canvas, { opacity: 1, duration: reducedMotion ? .01 : .18, ease: "sine.inOut" }, 0)
          .to(trigger, { opacity: 0, filter: "none", duration: reducedMotion ? .01 : .18, ease: "sine.inOut" }, 0);
        return () => timeline.kill();
      }

      if (mode === "interactive" && canvas) {
        const timeline = gsap.timeline();
        if (controls) {
          timeline.fromTo(
            controls,
            { opacity: 0, y: 7 },
            {
              opacity: 1,
              y: 0,
              duration: reducedMotion ? 0.01 : 0.28,
              ease: "power2.out",
            },
            0,
          );
        }
        return () => timeline.kill();
      }

      if (mode === "returning") {
        // One uninterrupted descent, with the short curved camera return
        // happening concurrently. Crossfade only once the board faces home.
        const landingAt = reducedMotion ? .01 : BOARD_RETURN_SECONDS;
        const landingDuration = reducedMotion ? .01 : HERO_LAND_SECONDS;
        const timeline = gsap.timeline({
          onComplete: () => {
            // Keep this prepared Canvas for the next lift; stop rendering it
            // at rest instead of rebuilding its WebGL context on each click.
            setMode("rest");
          },
        });
        if (controls) {
          timeline.to(controls, {
            opacity: 0,
            y: 6,
            duration: reducedMotion ? 0.01 : 0.14,
          });
        }
        if (canvas) {
          timeline.to(
            canvas,
            {
              opacity: 0,
              filter: "blur(0px)",
              duration: landingDuration,
              ease: "power2.inOut",
            },
            landingAt,
          );
        }
        timeline
          .set(trigger, {
            opacity: 0,
            filter: "blur(0px)",
          }, landingAt)
          .to(trigger, {
            opacity: 1,
            filter: "blur(0px)",
            duration: landingDuration,
            ease: "power2.inOut",
          }, landingAt)
          .to(
            zone,
            {
              yPercent: 0,
              scale: 1,
              duration: landingAt + landingDuration,
              ease: "power2.inOut",
            },
            0,
          );
        return () => timeline.kill();
      }

      return undefined;
    },
    {
      scope: rootRef,
      dependencies: [isCompact, isPhone, mode, reducedMotion],
      revertOnUpdate: false,
    },
  );

  function open3D() {
    if (!webGLAvailable || mode !== "rest") return;
    warm3D();
    setMounted3D(true);
    if (!mounted3D) setModelReady(false);
    setMode(modelReady ? "lifting" : "preparing");
  }

  return (
    <div
      className="hero-product-experience"
      data-mode={mode}
      data-model-ready={modelReady}
      data-theme={theme}
      ref={rootRef}
      onDragStart={(event) => event.preventDefault()}
    >
      <div className="hero-composite-stage" style={isPhone ? undefined : sceneStyle}>
        <picture className="hero-stage-background">
          <source media={NARROW_HERO_QUERY} srcSet={backgrounds.mobile} />
          <img
            src={backgrounds.desktop}
            alt="Лабораторный стенд с реальной платой полётного контроллера"
            width="1586"
            height="992"
            fetchPriority="high"
            draggable={false}
          />
        </picture>

        <div className="hero-product-zone" ref={zoneRef}>
          <button
            className="hero-board-trigger"
            ref={triggerRef}
            type="button"
            aria-label="Поднять плату и открыть интерактивную 3D-модель"
            onClick={open3D}
            onPointerEnter={warm3D}
            onFocus={warm3D}
            disabled={mode !== "rest" || !webGLAvailable}
          >
            <img
              ref={imageRef}
              src={board.image}
              alt="Реальная плата полётного контроллера"
              width="1200"
              height="1200"
              draggable={false}
            />
          </button>

          {mounted3D ? (
            <div
              className="hero-board-canvas"
              ref={canvasRef}
              aria-hidden="true"
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerCancel={() => { pressRef.current = null; }}
              onPointerLeave={() => {
                pressRef.current = null;
              }}
            >
              <Suspense fallback={null}>
                <BoardCanvas
                  board={board}
                  cameraZ={6.4}
                  compact={isCompact}
                  dracoPath={dracoPath}
                  floating={mode === "interactive" && inView && !reducedMotion}
                  transitionMotion="idle"
                  presentationMotion={mode === "returning" ? "returning" : mode === "interactive" ? "idle" : "locked"}
                  onReady={handleModelReady}
                  orbit="stage"
                  reducedMotion={reducedMotion}
                  theme={theme}
                />
              </Suspense>
            </div>
          ) : null}

        </div>
      </div>

      {mounted3D && mode !== "rest" ? (
        <div
          className="hero-3d-ui"
          data-active={mode === "interactive"}
          ref={controlsRef}
        >
          <div className="hero-3d-gesture-hint" aria-hidden="true">
            <Rotate3D size={14} strokeWidth={1.7} />
            <span>
              {isCompact
                ? "Проведите: вращение. Касание: вернуть"
                : "Тяните: вращение на 360°. Клик: вернуть на стенд"}
            </span>
          </div>
        </div>
      ) : null}

      {mode === "rest" ? (
        <p className="hero-3d-note" aria-hidden="true">
          <Rotate3D size={14} strokeWidth={1.7} />
          {webGLAvailable
            ? "Нажмите на плату — откроется 3D"
            : "Рендер реальной платы"}
        </p>
      ) : null}

      {mode === "preparing" && !modelReady ? (
        <p className="hero-model-loading" role="status" aria-live="polite">
          <span aria-hidden="true" />
          Подготавливаем 3D
        </p>
      ) : null}
    </div>
  );
}
