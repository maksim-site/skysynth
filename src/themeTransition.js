export function themeWaveGeometry(width, height, button) {
  const x = Math.max(0, Math.min(width, button ? button.left + button.width / 2 : width / 2));
  const y = Math.max(0, Math.min(height, button ? button.top + button.height / 2 : 32));
  const feather = Math.max(28, Math.min(84, Math.min(width, height) * 0.1));
  return {
    x, y, feather,
    radius: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + feather,
    duration: width <= 620 ? 650 : 820,
  };
}

/** One viewport snapshot reveal; no per-frame DOM clones, canvas paints or zoom. */
export async function transitionTheme({ commit, button, nextTheme }) {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof document.startViewTransition !== "function") {
    commit();
    if (!reduced) {
      const fade = document.querySelector(".site-shell")?.animate(
        [{ opacity: 0.88 }, { opacity: 1 }], { duration: 180, easing: "ease-out" },
      );
      await fade?.finished.catch(() => undefined);
    }
    return;
  }

  const geometry = themeWaveGeometry(innerWidth, innerHeight, button);
  const wave = typeof CSS.registerProperty === "function" && CSS.supports("mask-image", "radial-gradient(circle, #000, transparent)");
  let applied = false;
  let transition;
  let sheen;
  const animations = [];
  const apply = () => { if (!applied) { commit(); applied = true; } };
  const skipWhenHidden = () => { if (document.hidden) transition?.skipTransition(); };

  try {
    root.dataset.themeTransition = wave ? "wave" : "fade";
    root.dataset.themeDestination = nextTheme;
    if (wave) {
      root.style.setProperty("--theme-wave-x", `${geometry.x}px`);
      root.style.setProperty("--theme-wave-y", `${geometry.y}px`);
      root.style.setProperty("--theme-wave-feather", `${geometry.feather}px`);
      // A transparent named layer gives the light front its own snapshot
      // group above the page. It exists only for this single transition.
      sheen = document.createElement("div");
      sheen.className = "theme-wave-sheen";
      sheen.setAttribute("aria-hidden", "true");
      document.body.append(sheen);
    }
    transition = document.startViewTransition(apply);
    document.addEventListener("visibilitychange", skipWhenHidden);
    await transition.ready;

    // The moving child remains live inside its own static capture frame.
    // Retire its frozen old pose promptly, rather than keeping that pose in
    // the page snapshot for the entire wave. Keep the header above the lamp.
    for (const [selector, name] of [[".hero-pendant-stage", "hero-pendant"], [".site-header", "site-header"]]) {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      if (!bounds?.width || !bounds.height || bounds.bottom <= 0 || bounds.top >= innerHeight) continue;
      animations.push(
        root.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 140, easing: "ease-out", fill: "both", pseudoElement: `::view-transition-old(${name})`,
        }),
        root.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 140, easing: "ease-out", fill: "both", pseudoElement: `::view-transition-new(${name})`,
        }),
      );
    }

    if (wave) {
      const timing = { duration: geometry.duration, easing: "cubic-bezier(0.22, 0.65, 0.25, 1)", fill: "both" };
      const radius = { "--theme-wave-radius": [`${-geometry.feather}px`, `${geometry.radius}px`] };
      animations.push(
        root.animate(radius, { ...timing, pseudoElement: "::view-transition-new(root)" }),
        root.animate(radius, { ...timing, pseudoElement: "::view-transition-group(theme-sheen)" }),
      );
    } else {
      animations.push(root.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 220, easing: "ease-out", fill: "both", pseudoElement: "::view-transition-new(root)" },
      ));
    }
    await transition.finished;
  } catch {
    // Skipped snapshots (background tabs, unsupported capture, etc.) must
    // never prevent the requested theme or leave the toggle locked.
    transition?.skipTransition();
    apply();
    await transition?.finished.catch(() => undefined);
  } finally {
    document.removeEventListener("visibilitychange", skipWhenHidden);
    animations.forEach((animation) => animation.cancel());
    sheen?.remove();
    delete root.dataset.themeTransition;
    delete root.dataset.themeDestination;
    ["--theme-wave-x", "--theme-wave-y", "--theme-wave-feather"].forEach((name) => root.style.removeProperty(name));
  }
}
