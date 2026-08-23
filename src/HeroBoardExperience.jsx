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

const BoardCanvas = lazy(() => import("./BoardCanvas.jsx"));

gsap.registerPlugin(useGSAP);

export function HeroBoardExperience({ backgrounds, boards, dracoPath, theme }) {
  const rootRef = useRef(null);
  const zoneRef = useRef(null);
  const triggerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const controlsRef = useRef(null);
  const [mode, setMode] = useState("rest");
  const [mounted3D, setMounted3D] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [liftComplete, setLiftComplete] = useState(false);
  const [stageSize, setStageSize] = useState(null);
  const [webGLAvailable] = useState(supportsWebGL);
  const isMobileAsset = useMediaQuery("(max-width: 860px)");
  const isCompact = useMediaQuery("(max-width: 620px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const board = boards[0];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const updateStage = () => {
      const rect = root.getBoundingClientRect();
      const sourceWidth = isMobileAsset ? 1084 : 1586;
      const sourceHeight = isMobileAsset ? 1451 : 992;
      const scale = Math.max(
        rect.width / sourceWidth,
        rect.height / sourceHeight,
      );

      setStageSize({
        width: sourceWidth * scale,
        height: sourceHeight * scale,
      });
    };

    updateStage();
    const observer = new ResizeObserver(updateStage);
    observer.observe(root);
    return () => observer.disconnect();
  }, [isMobileAsset]);

  const handleModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  // Отличаем клик по плате от вращения: короткое нажатие без сдвига закрывает 3D.
  const pressRef = useRef(null);

  function onCanvasPointerDown(event) {
    pressRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
  }

  function onCanvasPointerUp(event) {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press || mode !== "interactive") return;

    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved < 6 && Date.now() - press.at < 400) setMode("returning");
  }

  const warm3D = useCallback(() => {
    if (webGLAvailable && !isCompact) {
      preloadBoardModel(board.model, dracoPath);
    }
  }, [board.model, dracoPath, isCompact, webGLAvailable]);

  useEffect(() => {
    if (mode === "lifting" && liftComplete && modelReady) {
      setMode("interactive");
    }
  }, [liftComplete, mode, modelReady]);

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
            scale: 1,
            filter: "blur(0px)",
          });
        }
        if (controls) gsap.set(controls, { opacity: 0, y: 7 });
        return undefined;
      }

      if (mode === "lifting") {
        const timeline = gsap.timeline({
          onComplete: () => setLiftComplete(true),
        });
        timeline
          .to(zone, {
            yPercent: isCompact ? -0.8 : -1.2,
            scale: isCompact ? 1.007 : 1.012,
            duration: reducedMotion ? 0.01 : 0.32,
            ease: "power2.inOut",
          })
          .to(zone, {
            yPercent: isCompact ? -3.2 : -5.2,
            scale: isCompact ? 1.026 : 1.055,
            duration: reducedMotion ? 0.01 : 0.18,
            ease: "power4.in",
          })
          .to(
            trigger,
            {
              filter: reducedMotion ? "blur(0px)" : "blur(2.6px)",
              duration: reducedMotion ? 0.01 : 0.14,
              ease: "power3.in",
            },
            "-=0.14",
          );
        return () => timeline.kill();
      }

      if (mode === "interactive" && canvas) {
        const timeline = gsap.timeline();
        timeline
          .to(trigger, {
            opacity: 0,
            duration: reducedMotion ? 0.01 : 0.13,
            ease: "power3.in",
          })
          .fromTo(
            canvas,
            { opacity: 0, scale: 1, filter: "blur(3.5px)" },
            {
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              duration: reducedMotion ? 0.01 : 0.2,
              ease: "power2.out",
            },
            0.06,
          )
          .to(
            zone,
            {
              yPercent: isCompact ? -1.8 : -2.8,
              scale: isCompact ? 1.014 : 1.024,
              duration: reducedMotion ? 0.01 : 0.52,
              ease: "expo.out",
            },
            0.07,
          );
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
            0.22,
          );
        }
        return () => timeline.kill();
      }

      if (mode === "returning") {
        const timeline = gsap.timeline({
          onComplete: () => {
            setMounted3D(false);
            setLiftComplete(false);
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
              filter: reducedMotion ? "blur(0px)" : "blur(3px)",
              duration: reducedMotion ? 0.01 : 0.14,
              ease: "power3.in",
            },
            0,
          );
        }
        timeline
          .set(trigger, {
            opacity: 0,
            filter: reducedMotion ? "blur(0px)" : "blur(2.4px)",
          })
          .to(trigger, {
            opacity: 1,
            filter: "blur(0px)",
            duration: reducedMotion ? 0.01 : 0.18,
            ease: "power2.out",
          })
          .to(
            zone,
            {
              yPercent: 0,
              scale: 1,
              duration: reducedMotion ? 0.01 : 0.58,
              ease: "power3.out",
            },
            "-=0.08",
          );
        return () => timeline.kill();
      }

      return undefined;
    },
    {
      scope: rootRef,
      dependencies: [isCompact, mode, reducedMotion],
      revertOnUpdate: false,
    },
  );

  function open3D() {
    if (isCompact || !webGLAvailable || mode !== "rest") return;
    warm3D();
    setMounted3D(true);
    setModelReady(false);
    setLiftComplete(false);
    setMode("lifting");
  }

  const sceneStyle = stageSize
    ? { width: stageSize.width, height: stageSize.height }
    : undefined;

  return (
    <div
      className="hero-product-experience"
      data-mode={mode}
      data-theme={theme}
      ref={rootRef}
    >
      <div className="hero-composite-stage" style={sceneStyle}>
        <picture className="hero-stage-background">
          <source media="(max-width: 860px)" srcSet={backgrounds.mobile} />
          <img
            src={backgrounds.desktop}
            alt="Лабораторный стенд с реальной платой полётного контроллера"
            width="1586"
            height="992"
            fetchPriority="high"
          />
        </picture>

        <div className="hero-product-zone" ref={zoneRef}>
          {isCompact ? (
            <div className="hero-board-trigger hero-board-static" ref={triggerRef}>
              <img
                ref={imageRef}
                src={board.image}
                alt="Реальная плата полётного контроллера"
                width="1200"
                height="1200"
              />
            </div>
          ) : (
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
              />
            </button>
          )}

          {mounted3D ? (
            <div
              className="hero-board-canvas"
              ref={canvasRef}
              aria-hidden="true"
              onPointerDown={onCanvasPointerDown}
              onPointerUp={onCanvasPointerUp}
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
                  floating={mode === "interactive"}
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

      {mounted3D ? (
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
                : "Тяните: вращение. Клик: вернуть на стенд"}
            </span>
          </div>
        </div>
      ) : null}

      {mode === "rest" && !isCompact ? (
        <p className="hero-3d-note" aria-hidden="true">
          <Rotate3D size={14} strokeWidth={1.7} />
          {webGLAvailable
            ? "Нажмите на плату — откроется 3D"
            : "Рендер реальной платы"}
        </p>
      ) : null}

      {mode === "lifting" && !modelReady ? (
        <p className="hero-model-loading" role="status" aria-live="polite">
          <span aria-hidden="true" />
          Подготавливаем 3D
        </p>
      ) : null}
    </div>
  );
}
