import { useEffect, useLayoutEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { useMediaQuery } from "./media.js";

export default function ServiceOffering({ offering }) {
  const compact = useMediaQuery("(max-width: 739px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const disclosureRef = useRef(null);
  const animationRef = useRef(null);
  const targetRef = useRef(!compact);

  function settle(expanded, instant = false) {
    const node = disclosureRef.current;
    animationRef.current?.cancel();
    animationRef.current = null;
    if (!node) return;
    if (instant) node.dataset.motion = "instant";
    node.open = expanded;
    node.dataset.expanded = String(expanded);
    node.style.height = "";
    node.style.overflow = "";
    targetRef.current = expanded;
  }

  useLayoutEffect(() => { settle(!compact, true); }, [compact]);
  useEffect(() => {
    if (reducedMotion) settle(targetRef.current, true);
  }, [reducedMotion]);
  useEffect(() => () => animationRef.current?.cancel(), []);

  function toggle(event) {
    if (!compact) return;
    event.preventDefault();
    const node = disclosureRef.current;
    const expanded = !(animationRef.current ? targetRef.current : node.open);
    targetRef.current = expanded;

    // Keyboard activation and reduced-motion settings keep native immediacy.
    if (reducedMotion || event.detail === 0 || !node.animate) {
      settle(expanded, true);
      return;
    }

    // Capture the current interpolated height before reversing an animation.
    const start = node.getBoundingClientRect().height;
    animationRef.current?.cancel();
    node.style.height = "";
    node.open = true;
    node.dataset.motion = "animated";
    node.dataset.expanded = String(expanded);
    const style = getComputedStyle(node);
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const end = expanded
      ? node.getBoundingClientRect().height
      : node.querySelector("summary").getBoundingClientRect().height + borders;
    node.style.height = `${start}px`;
    node.style.overflow = "hidden";
    const animation = node.animate(
      [{ height: `${start}px` }, { height: `${end}px` }],
      { duration: 280, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)", fill: "both" },
    );
    animationRef.current = animation;
    animation.onfinish = () => {
      if (animationRef.current === animation) settle(expanded);
    };
  }

  return (
    <article className="service-offering" id={offering.id} aria-labelledby={`${offering.id}-title`} data-reveal="out">
      <span className="service-offering-icon" aria-hidden="true">
        <offering.icon size={26} strokeWidth={1.4} />
      </span>
      <h3 className="service-offering-title" id={`${offering.id}-title`}>{offering.title}</h3>
      <p className="service-offering-description">{offering.description}</p>
      <details className="service-detail-disclosure" ref={disclosureRef} onToggle={(event) => {
        if (!animationRef.current) {
          targetRef.current = event.currentTarget.open;
          event.currentTarget.dataset.expanded = String(event.currentTarget.open);
        }
      }}>
        <summary onClick={toggle}>
          <span>{offering.id === "reverse" ? "Как проходит работа" : "Что входит в услугу"}</span>
          <Plus aria-hidden="true" size={20} strokeWidth={1.5} />
        </summary>
        <ul className="service-offering-details">
          {offering.details.map((detail) => (
            <li key={detail.title}>
              <h4>{detail.title}</h4>
              <p>{detail.text}</p>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
