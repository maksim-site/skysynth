import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "./media.js";
import { pendulumKeyframes, preparePendantAssets } from "./pendantAssets.js";
import { fitPendantStage, HIDDEN_PENDANT_QUERY } from "./heroLayout.js";
import "./hero-pendant.css";

const asset = (name) => `${import.meta.env.BASE_URL}assets/images/hero-pendant/${name}`;

export default function HeroPendant({ level = 0.8, onReady }) {
  const rootRef = useRef(null);
  const rigRef = useRef(null);
  const [images, setImages] = useState(null);
  const [size, setSize] = useState(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    let cancelled = false;
    preparePendantAssets(asset("pendant-photo.webp"), asset("pendant-mask.webp"), asset("pendant-white-v2.webp"))
      .then((result) => { if (!cancelled) setImages(result); })
      .catch(() => { if (!cancelled) onReady?.(false); });
    return () => { cancelled = true; };
  }, [onReady]);

  useLayoutEffect(() => {
    const hero = rootRef.current?.closest(".hero-visual");
    if (!hero) return undefined;
    const resize = () => {
      setSize(fitPendantStage(hero.clientWidth, hero.clientHeight));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(hero);
    return () => observer.disconnect();
  }, [fitPendantStage]);

  useLayoutEffect(() => {
    if (images && size?.width > 0 && size?.height > 0) onReady?.(true);
  }, [images, size, onReady]);

  useEffect(() => {
    if (!images || reducedMotion) return undefined;
    const hero = rootRef.current?.closest(".hero");
    if (!hero || !rigRef.current) return undefined;
    const rig = rigRef.current.animate(pendulumKeyframes(), {
      duration: 10000, iterations: Infinity, easing: "linear",
    });
    let onScreen = true;
    const compact = window.matchMedia(HIDDEN_PENDANT_QUERY);
    const update = () => {
      const running = onScreen && !document.hidden && !compact.matches;
      if (running) rig.play();
      else rig.pause();
      rootRef.current.dataset.motion = running ? "running" : "paused";
    };
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); }, { threshold: 0 });
    observer.observe(hero);
    document.addEventListener("visibilitychange", update);
    compact.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      compact.removeEventListener("change", update);
      rig.cancel();
    };
  }, [images, reducedMotion, HIDDEN_PENDANT_QUERY, pendulumKeyframes]);

  return (
    <div className="hero-pendant" ref={rootRef} aria-hidden="true" style={{ "--pendant-level": level }} data-ready={Boolean(images && size)} data-motion={reducedMotion ? "static" : undefined}>
      <div className="hero-pendant-stage" style={size ? {
        "--pendant-stage-width": `${size.width}px`, "--pendant-stage-height": `${size.height}px`,
        "--pendant-stage-top": `${size.top}px`, "--hero-stage-nudge": size["--hero-stage-nudge"],
      } : undefined}>
        {images ? (
          <div className="hero-pendant-rig" ref={rigRef}>
            <div className="hero-pendant-illumination">
              <img className="hero-pendant-beam" src={images.beam} alt="" draggable={false} />
              <img className="hero-pendant-mist" src={images.mist} alt="" draggable={false} />
              <div className="hero-pendant-pool" />
              <div className="hero-pendant-rim" />
            </div>
            <img className="hero-pendant-lamp hero-pendant-lamp-dark" src={images.lamp} alt="" draggable={false} />
            <img className="hero-pendant-lamp hero-pendant-lamp-light" src={images.lampLight} alt="" draggable={false} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
