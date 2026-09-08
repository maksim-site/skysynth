import { useEffect, useState } from "react";

/**
 * Reveals every `[data-reveal]` element once it scrolls into view.
 * Elements keep their final state afterwards, so nothing animates on the way back up.
 */
export function useReveal() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!nodes.length) return undefined;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.setAttribute("data-reveal", "in"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute("data-reveal", "in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "240px 0px 240px 0px", threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    // Anchor navigation is an explicit request to read a section, not watch
    // its entrance. Reveal before the browser begins its smooth scroll.
    const revealForNavigation = (event) => {
      const anchor = event.target?.closest?.('a[href^="#"]');
      if (event.type === "click" && (!anchor || !anchor.hash)) return;
      nodes.forEach((node) => {
        node.dataset.revealImmediate = "true";
        node.dataset.reveal = "in";
      });
      observer.disconnect();
    };
    document.addEventListener("click", revealForNavigation, true);
    window.addEventListener("hashchange", revealForNavigation);
    if (window.location.hash && window.location.hash !== "#top") revealForNavigation({ type: "hashchange" });
    return () => {
      observer.disconnect();
      document.removeEventListener("click", revealForNavigation, true);
      window.removeEventListener("hashchange", revealForNavigation);
    };
  }, []);
}

/** Adds `data-scrolled` to the shell once the page leaves the very top. */
export function useScrolled(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      node.dataset.scrolled = window.scrollY > 24 ? "true" : "false";
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref]);
}

/** Подключает Яндекс.Метрику один раз, если номер счётчика задан. */
export function useMetrika(id) {
  useEffect(() => {
    if (!id || document.getElementById("ym-loader")) return;

    window.ym =
      window.ym ||
      function ymStub(...args) {
        (window.ym.a = window.ym.a || []).push(args);
      };
    window.ym.l = Number(new Date());

    const script = document.createElement("script");
    script.id = "ym-loader";
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js";
    document.head.appendChild(script);

    window.ym(id, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: false,
    });
  }, [id]);
}

/**
 * Согласие на cookie. Пока посетитель не ответил, счётчик статистики не
 * запускается: отказ должен что-то значить. Ответ хранится в localStorage.
 */
export function useCookieChoice() {
  const [choice, setChoice] = useState("pending");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sks-cookie");
      setChoice(saved === "accepted" || saved === "declined" ? saved : "ask");
    } catch {
      setChoice("ask");
    }
  }, []);

  function decide(value) {
    setChoice(value);
    try {
      window.localStorage.setItem("sks-cookie", value);
    } catch {
      // Решение действует на текущую сессию, если хранилище недоступно.
    }
  }

  return {
    asking: choice === "ask",
    accepted: choice === "accepted",
    accept: () => decide("accepted"),
    decline: () => decide("declined"),
  };
}
