import { useRef } from "react";
import { useHeroStageLayout } from "./useHeroStageLayout.js";
import { useMediaQuery } from "./media.js";
import { HIDDEN_PENDANT_QUERY } from "./heroLayout.js";

export default function HeroMobileScene({ background, board }) {
  const rootRef = useRef(null);
  const phone = useMediaQuery(HIDDEN_PENDANT_QUERY);
  const layout = useHeroStageLayout(rootRef, true);
  return (
    <div className="hero-mobile-scene" aria-hidden="true" ref={rootRef}>
      <div className="hero-mobile-composite" style={phone ? undefined : layout}>
        <picture className="hero-mobile-stage">
          <img src={background} alt="" width="1084" height="1451" fetchPriority="high" draggable={false} />
        </picture>
        {phone ? (
          <img className="hero-mobile-board" src={board} alt="" width="1600" height="1600" fetchPriority="high" draggable={false} />
        ) : <div className="hero-product-zone">
          <div className="hero-board-trigger hero-board-static">
            <img src={board} alt="" width="1600" height="1600" fetchPriority="high" draggable={false} />
          </div>
        </div>}
      </div>
    </div>
  );
}
