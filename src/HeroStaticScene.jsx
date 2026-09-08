import { useRef } from "react";
import { useMediaQuery } from "./media.js";
import { useHeroStageLayout } from "./useHeroStageLayout.js";
import { HIDDEN_PENDANT_QUERY, NARROW_HERO_QUERY } from "./heroLayout.js";

// The same resting photograph and PCB geometry as the interactive hero, even
// while its optional JavaScript is still on the network. No 3D dependency.
export default function HeroStaticScene({ backgrounds, board }) {
  const rootRef = useRef(null);
  const portrait = useMediaQuery(NARROW_HERO_QUERY);
  const phone = useMediaQuery(HIDDEN_PENDANT_QUERY);
  const layout = useHeroStageLayout(rootRef, portrait);
  return (
    <div className="hero-product-experience" data-mode="rest" ref={rootRef} aria-hidden="true">
      <div className="hero-composite-stage" style={phone ? undefined : layout}>
        <picture className="hero-stage-background">
          <source media={NARROW_HERO_QUERY} srcSet={backgrounds.mobile} />
          <img src={backgrounds.desktop} alt="" width="1586" height="992" fetchPriority="high" draggable={false} />
        </picture>
        <div className="hero-product-zone">
          <button className="hero-board-trigger" type="button" disabled tabIndex={-1}>
            <img src={board} alt="" width="1200" height="1200" fetchPriority="high" draggable={false} />
          </button>
        </div>
      </div>
    </div>
  );
}
