import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  Cpu,
  CircuitBoard,
  FileText,
  Library,
  Moon,
  Plane,
  RadioTower,
  ScanSearch,
  Sun,
} from "lucide-react";
import { useCookieChoice, useMetrika, useReveal, useScrolled } from "./useReveal.js";
import { preloadBoardModel, supportsWebGL, useMediaQuery } from "./media.js";
import "./services.css";
import { HIDDEN_PENDANT_QUERY, NARROW_HERO_QUERY } from "./heroLayout.js";
import { transitionTheme } from "./themeTransition.js";
import ServiceOffering from "./ServiceOffering.jsx";
import HeroMobileScene from "./HeroMobileScene.jsx";

const loadHeroBoardExperience = () =>
  import("./HeroBoardExperience").then((module) => ({
    default: module.HeroBoardExperience,
  }));
const HeroBoardExperience = lazy(loadHeroBoardExperience);

const HeroPendant = lazy(() => import("./HeroPendant.jsx"));

const BoardGallery = lazy(() =>
  import("./BoardGallery").then((module) => ({
    default: module.BoardGallery,
  })),
);

const ContactPanorama = lazy(() =>
  import("./ContactPanorama").then((module) => ({
    default: module.ContactPanorama,
  })),
);

const assetPath = (path) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const CONTACT_EMAIL = "info@skysinth.com";

/**
 * Пока пусто: форма открывает письмо на CONTACT_EMAIL. Настоящую отправку
 * подключим при заливке на сервер. Достаточно вписать сюда https-эндпоинт,
 * который пересылает заявку на эту почту, остальной код уже готов, например
 * `https://formsubmit.co/ajax/${CONTACT_EMAIL}`.
 */
const FORM_ENDPOINT = "";

/** Номер счётчика Яндекс.Метрики. Пустая строка — счётчик не подключается. */
const METRIKA_ID = "";

const navigation = [
  { label: "Услуги", id: "services" },
  { label: "Разработки", id: "developments" },
  { label: "Контакты", id: "contact" },
];

const logoAssets = {
  dark: assetPath("brand/sks-logo-for-dark-bg.svg"),
  light: assetPath("brand/sks-logo-for-light-bg.svg"),
};



const heroAssets = {
  dark: {
    desktop: assetPath("assets/images/hero-stage-dark-wide.webp"),
    mobile: assetPath("assets/images/hero-stage-dark.webp"),
  },
  light: {
    desktop: assetPath("assets/images/hero-stage-light-wide.webp"),
    mobile: assetPath("assets/images/hero-stage-light.webp"),
  },
};

const sectionImages = {
  reverse: {
    dark: assetPath("assets/images/sections/reverse-engineering-scene-final.webp"),
    light: assetPath("assets/images/sections/reverse-engineering-scene-light-v3.webp"),
  },
};

const sceneAssets = {
  selector: {
    dark: assetPath("assets/images/sections/selector-levitation-lab.webp"),
    light: assetPath("assets/images/sections/selector-indexing-lab-light-v3.webp"),
  },
  contactPanorama: {
    dark: assetPath("assets/images/sections/contact-panorama-boards-final.png"),
    light: assetPath("assets/images/sections/contact-panorama-boards-light-v2.webp"),
  },
};

const themeImagePromises = new Map();

function preloadThemeImage(src) {
  if (!src || typeof Image === "undefined") return Promise.resolve();
  if (themeImagePromises.has(src)) return themeImagePromises.get(src);

  const promise = new Promise((resolve) => {
    const image = new Image();
    const finish = () => resolve();

    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().catch(() => undefined).finally(finish);
      } else {
        finish();
      }
    };
    // A missing optional image must not leave the theme control locked.
    image.onerror = finish;
    image.src = src;

    if (image.complete) {
      if (typeof image.decode === "function") {
        image.decode().catch(() => undefined).finally(finish);
      } else {
        finish();
      }
    }
  });

  themeImagePromises.set(src, promise);
  return promise;
}

function preloadThemeImages(themeName) {
  return Promise.all([
    logoAssets[themeName],
    heroAssets[themeName].desktop,
    heroAssets[themeName].mobile,
    heroBoards[0].image,
    sectionImages.reverse[themeName],
    sceneAssets.selector[themeName],
    sceneAssets.contactPanorama[themeName],
  ].map(preloadThemeImage));
}

function preloadCriticalFonts() {
  if (typeof document === "undefined" || !document.fonts?.load) {
    return Promise.resolve();
  }

  const faces = [
    ['300 32px "Unbounded"', "Разработка электроники для сложных устройств"],
    ['500 32px "Unbounded"', "от идеи до производства"],
    ['400 16px "Golos Text"', "Проектируем платы и встраиваемое ПО"],
    ['600 15px "Golos Text"', "Обсудить задачу"],
  ];

  return Promise.all(
    faces.map(([font, sample]) =>
      document.fonts.load(font, sample).catch(() => []),
    ),
  );
}

const DRACO_PATH = assetPath("draco/");

// Every board below comes from the company's own 3D files. Descriptions stay
// inside what the client documented, and the AKYMA receiver is left out on
// their request.
const boards = [
  {
    label: "Управление",
    title: "Полётный контроллер",
    text: "Плата управления из набора специализированных электронных модулей для FPV-дрона. В составе комплекта отвечает за управление полётом.",
    facts: ["Управление полётом", "Плата управления", "Модуль FPV-комплекта"],
    model: assetPath("assets/models/flight-controller.glb"),
    image: assetPath("assets/images/boards/flight-controller-transparent.webp"),
    alt: "3D-рендер платы полётного контроллера",
    sceneScale: 3.45,
  },
  {
    label: "Интерфейсы",
    title: "CAN-to-PWM",
    text: "Компактная плата для управления девятью независимыми PWM-каналами через CAN-шину. Оснащена интерфейсами CAN, UART и I²C, питание — 5 В.",
    facts: ["9 PWM-каналов", "CAN, UART, I²C", "Питание 5 В"],
    model: assetPath("assets/models/can-to-pwm.glb"),
    image: assetPath("assets/images/boards/can-to-pwm-transparent.webp"),
    alt: "3D-рендер платы CAN-to-PWM",
    baseRotation: 0.39,
    sceneScale: 4.4,
  },
  {
    label: "Навигация",
    title: "ICM-42605",
    text: "Компактный инерциальный модуль для измерения ускорения и угловой скорости. Используется для определения положения, наклона и движения объекта в пространстве.",
    facts: ["Ускорение", "Угловая скорость", "Компактный форм-фактор"],
    model: assetPath("assets/models/icm-42605.glb"),
    image: assetPath("assets/images/boards/icm-42605-transparent.webp"),
    alt: "3D-рендер инерциального модуля ICM-42605",
    sceneScale: 2.65,
  },
  {
    label: "Питание",
    title: "Плата распределения питания",
    text: "Компактная плата для подключения и централизованного питания нескольких модулей системы. Распределяет линии +5 В, +3,3 В и GND по нескольким каналам.",
    facts: ["Линии +5 В", "Линии +3,3 В", "Общая GND"],
    model: assetPath("assets/models/power-distribution.glb"),
    image: assetPath("assets/images/boards/power-distribution-transparent.webp"),
    alt: "3D-рендер платы распределения питания",
    sceneScale: 2.65,
  },
  {
    label: "Коммутация",
    title: "RELE",
    text: "Интеллектуальный модуль управления питанием системы. Обеспечивает коммутацию и распределение силовых линий, контроль питания и управление подключёнными нагрузками через встроенный контроллер.",
    facts: ["Коммутация линий", "Контроль питания", "Управление нагрузками"],
    model: assetPath("assets/models/rele.glb"),
    image: assetPath("assets/images/boards/rele-transparent.webp"),
    alt: "3D-рендер модуля управления питанием RELE",
    sceneScale: 3.45,
  },
  {
    label: "Видео",
    title: "STM32R3",
    text: "Компактный модуль видеозахвата для преобразования аналогового видеосигнала в цифровой формат, дальнейшей обработки и передачи. Оснащён интерфейсами USB и средствами управления режимами работы.",
    facts: ["Аналог в цифру", "Интерфейс USB", "Управление режимами"],
    model: assetPath("assets/models/stm32r3.glb"),
    image: assetPath("assets/images/boards/stm32r3-transparent.webp"),
    alt: "3D-рендер модуля видеозахвата STM32R3",
    sceneScale: 3.1,
  },
  {
    label: "Приводы",
    title: "STM32F446RET6",
    text: "Контроллер управления сервоприводами: формирует управляющие сигналы и питает подключённые приводы. Оснащён микроконтроллером STM32F446 и несколькими каналами подключения сервоприводов.",
    facts: ["Управляющие сигналы", "Питание приводов", "Несколько каналов"],
    model: assetPath("assets/models/stm32f446ret6.glb"),
    image: assetPath("assets/images/boards/servo-controller-transparent.webp"),
    alt: "3D-рендер контроллера управления сервоприводами",
    sceneScale: 3.1,
  },
];

// The hero keeps the framed straight-on render that was composited into the
// photographed stage. The gallery uses the free-standing cutout instead.
const heroBoards = [
  {
    ...boards[0],
    sceneScale: 3.55,
    image: assetPath(
      "assets/images/boards/flight-controller-front-polished.webp",
    ),
  },
];

const leadServiceBlocks = [
  {
    title: "Разработка",
    text: "Схемотехника, печатные платы и программное обеспечение для встраиваемых систем.",
  },
  {
    title: "Производство",
    text: "Опытные образцы и серийное производство. Координация подрядчиков и поставщиков компонентов.",
  },
  {
    title: "Испытания и контроль качества",
    text: "Функциональные, климатические и электрические испытания. Контроль качества на всех этапах.",
  },
  {
    title: "Сопровождение",
    text: "Техническое сопровождение проектов, модернизация и доработка существующих изделий.",
  },
];

const services = [
  {
    title: "Проектирование печатных плат",
    text: "Трассируем многослойные платы, ВЧ-цепи и силовые линии. Выпускаем Gerber, сверловку и требования к изготовлению.",
    icon: CircuitBoard,
  },
  {
    title: "Высокочастотные узлы и тракты",
    text: "Проектируем СВЧ-узлы и тракты, считаем и разводим цепи с контролируемым волновым сопротивлением.",
    icon: RadioTower,
  },
  {
    title: "Электроника для БАС",
    text: "Проектируем полётные контроллеры, ESC, видеопередатчики и каналы связи с учётом вибраций, тепла и габаритов корпуса.",
    icon: Plane,
  },
  {
    title: "Встраиваемое ПО",
    text: "Разрабатываем программное обеспечение для встраиваемых систем.",
    icon: Cpu,
  },
  {
    title: "Документация по ЕСКД",
    text: "Готовим схемы по ТЗ, сборочные чертежи и спецификации по ЕСКД. Вносим изменения в КД на всех этапах жизненного цикла изделия.",
    icon: FileText,
  },
  {
    title: "Библиотеки и импортозамещение",
    text: "Создаём и ведём библиотеки Altium Designer: УГО, посадочные места и 3D-модели. Подбираем элементную базу с учётом доступности и задач импортозамещения.",
    icon: Library,
  },
];

// Development is shortened from скс.docx. Reverse-engineering copy is restored
// verbatim from the published 2cb1635 baseline, confirmed by the user on 05.09.
const serviceOfferings = [
  {
    id: "development-service",
    icon: CircuitBoard,
    title: "Разработка программно-аппаратных комплексов",
    description: "Разрабатываем радиоэлектронную аппаратуру, электронные модули и системы.",
    details: leadServiceBlocks,
  },
  {
    id: "reverse",
    icon: ScanSearch,
    title: "Реверс-инжиниринг",
    description: "Восстанавливаем документацию по готовому изделию, когда исходных файлов не осталось или их нужно проверить.",
    details: [
      {
        title: "На входе",
        text: "Готовая плата или устройство, к которому не осталось схемы, топологии и производственных файлов.",
      },
      {
        title: "Что делаем",
        text: "Разбираем изделие, определяем элементную базу, восстанавливаем принципиальную схему и топологию платы.",
      },
      {
        title: "На выходе",
        text: "Схема, топология, производственные файлы и предложения по замене снятых с производства компонентов.",
      },
    ],
  },
];

// Всё перечисленное названо в скс.docx как результат работы компании.
const deliverables = [
  {
    title: "Принципиальная схема",
    text: "Логика работы устройства, разработанная по техническому заданию.",
  },
  {
    title: "Топология печатной платы",
    text: "Трассировка со всеми высокочастотными, силовыми и сигнальными цепями.",
  },
  {
    title: "Gerber и сверловка",
    text: "Производственные файлы и сверловочные данные для изготовления плат.",
  },
  {
    title: "Технические требования",
    text: "Требования к изготовлению платы, которые передаются на производство.",
  },
  {
    title: "Сборочный чертёж и спецификация",
    text: "Документы сборки, оформленные по ЕСКД.",
  },
  {
    title: "Подбор элементной базы",
    text: "Элементная база с обоснованием подбора и учётом наличия на рынке.",
  },
  {
    title: "Встраиваемое ПО",
    text: "Программное обеспечение для встраиваемых систем.",
  },
  {
    title: "Опытный образец",
    text: "Изготовленный прототип и результаты проведённых испытаний.",
  },
  {
    title: "Сопровождение производства",
    text: "Изменения в КД по результатам испытаний и запросам заказчика.",
  },
];

function buildMailto(form) {
  const data = new FormData(form);
  const lines = [
    `Имя: ${data.get("name") || ""}`,
    `Компания: ${data.get("company") || ""}`,
    `Контакт: ${data.get("contact") || ""}`,
    "",
    "Задача:",
    String(data.get("message") || ""),
  ];

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    "Заявка с сайта: разработка устройства",
  )}&body=${encodeURIComponent(lines.join("\n"))}`;
}

export function App() {
  const shellRef = useRef(null);
  const isPhoneHero = useMediaQuery(HIDDEN_PENDANT_QUERY);
  const [menuOpen, setMenuOpen] = useState(false);
  const [siteReady, setSiteReady] = useState(false);
  const [pendantEnabled, setPendantEnabled] = useState(true);
  const [pendantStartup] = useState(() => {
    const signal = { ready: false };
    signal.promise = new Promise((resolve) => { signal.resolve = resolve; });
    return signal;
  });
  const handlePendantReady = useCallback((ready) => {
    pendantStartup.ready = ready;
    pendantStartup.resolve();
    if (!ready) setPendantEnabled(false);
  }, [pendantStartup]);
  const [formState, setFormState] = useState({ status: "idle", message: "" });
  const [themeSwitching, setThemeSwitching] = useState(false);
  const themeSwitchLock = useRef(false);
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem("skysynth-theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });
  const heroAsset = heroAssets[theme];

  useReveal();
  useScrolled(shellRef);
  const cookies = useCookieChoice();
  useMetrika(cookies.accepted ? METRIKA_ID : "");

  useEffect(() => {
    let cancelled = false;
    let timeoutId;
    let revealTimer;
    let layoutFrame;
    let revealFrame;
    const minimumDisplayMs = 620;
    const startedAt = performance.now();
    const compactHero = window.matchMedia(HIDDEN_PENDANT_QUERY).matches;
    const narrowHero = window.matchMedia(NARROW_HERO_QUERY).matches;
    const needsPendant = !window.matchMedia(HIDDEN_PENDANT_QUERY).matches;
    // This is a failure watchdog, not an extra intro delay. The complete
    // desktop scene may need longer on a cold/slow connection.
    const maximumDisplayMs = needsPendant ? 8000 : compactHero ? 3600 : 2200;
    const currentHero = narrowHero
      ? heroAssets[theme].mobile
      : heroAssets[theme].desktop;

    document.body.classList.add("site-loading");

    const criticalAssets = Promise.all([
      preloadThemeImage(logoAssets[theme]),
      preloadThemeImage(currentHero),
      preloadThemeImage(heroBoards[0].image),
      preloadCriticalFonts(),
      loadHeroBoardExperience().catch(() => undefined),
      needsPendant ? pendantStartup.promise : null,
    ]);

    const timeout = new Promise((resolve) => {
      timeoutId = window.setTimeout(resolve, maximumDisplayMs);
    });

    Promise.race([criticalAssets, timeout]).then(() => {
      if (cancelled) return;
      const remaining = Math.max(
        0,
        minimumDisplayMs - (performance.now() - startedAt),
      );
      revealTimer = window.setTimeout(() => {
        if (cancelled) return;
        // If the optional layer failed/timed out, keep the original hero for
        // this visit; never insert a late lamp after the loader has left.
        if (needsPendant && !pendantStartup.ready) setPendantEnabled(false);
        document.body.classList.remove("site-loading");
        // Commit final viewport geometry and decoded image layers underneath
        // the still-opaque loader before starting its fade.
        layoutFrame = requestAnimationFrame(() => {
          revealFrame = requestAnimationFrame(() => {
            if (!cancelled) setSiteReady(true);
          });
        });
      }, remaining);
      window.clearTimeout(timeoutId);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearTimeout(revealTimer);
      cancelAnimationFrame(layoutFrame);
      cancelAnimationFrame(revealFrame);
      document.body.classList.remove("site-loading");
    };
    // The initial theme and viewport are intentionally captured once. A later
    // theme switch has its own image warm-up and must not reopen the loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!siteReady) return;
    document.body.classList.remove("site-loading");
    // Hash targets do not exist when the initial HTML first loads. Resolve
    // them once the ready layout is mounted, without changing later scrolling.
    const target = document.getElementById(window.location.hash.slice(1));
    const frame = target
      ? requestAnimationFrame(() => target.scrollIntoView({ behavior: "instant" }))
      : null;
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [siteReady]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#08090a" : "#f3f0ea");

    try {
      window.localStorage.setItem("skysynth-theme", theme);
    } catch {
      // The theme still works for the current session when storage is blocked.
    }
  }, [theme]);

  useEffect(() => {
    // On phones the active 3D board has priority over an alternate theme the
    // visitor may never request. The toggle already warms that theme on demand.
    if (window.matchMedia("(max-width: 620px)").matches) return undefined;

    const alternateTheme = theme === "dark" ? "light" : "dark";
    const warmAlternateTheme = () => {
      void preloadThemeImages(alternateTheme);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmAlternateTheme, {
        timeout: 800,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(warmAlternateTheme, 120);
    return () => window.clearTimeout(timerId);
  }, [theme]);

  useEffect(() => {
    if (!supportsWebGL()) return undefined;

    const compactViewport = window.matchMedia("(max-width: 620px)").matches;

    // Warm the selector itself and its first GLB immediately after the initial
    // paint. The remaining boards decode during idle time, before a fast scroll
    // reaches the gallery, so the accepted still never flashes before WebGL.
    void import("./BoardGallery.jsx");
    void import("./BoardCanvas.jsx");
    preloadBoardModel(boards[0]?.model, DRACO_PATH);

    // A phone must finish the first 3.7 MB board before spending bandwidth and
    // parse time on the other six models. The gallery schedules neighbours
    // after the active model is actually ready.
    if (compactViewport) return undefined;

    // Decode the remaining GLBs one at a time. Starting all six together made
    // the main thread hitch on slower phones even though the gallery itself is
    // several sections below the fold.
    let cancelled = false;
    let idleId;
    let timerId;
    let nextIndex = 1;
    const warmNext = () => {
      if (cancelled || nextIndex >= boards.length) return;
      preloadBoardModel(boards[nextIndex]?.model, DRACO_PATH);
      nextIndex += 1;
      scheduleNext();
    };
    const scheduleNext = () => {
      if (cancelled || nextIndex >= boards.length) return;
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(warmNext, { timeout: 650 });
      } else {
        timerId = window.setTimeout(warmNext, 220);
      }
    };

    scheduleNext();
    return () => {
      cancelled = true;
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      window.requestAnimationFrame(() => {
        document.querySelector(".menu-button")?.focus();
      });
    };
    const closeOnOutsidePress = (event) => {
      if (event.target.closest(".header-inner")) return;
      setMenuOpen(false);
    };
    const closeOnWideViewport = () => {
      if (window.matchMedia("(min-width: 32.5em)").matches) setMenuOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("resize", closeOnWideViewport);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("resize", closeOnWideViewport);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  /** `#top` lands below the sticky header, so the logo goes to the real top. */
  function scrollToTop(event) {
    event.preventDefault();
    setMenuOpen(false);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  async function toggleTheme(event) {
    if (themeSwitchLock.current) return;
    themeSwitchLock.current = true;
    const button = event.currentTarget.getBoundingClientRect();
    const nextTheme = theme === "dark" ? "light" : "dark";
    setThemeSwitching(true);
    try {
      await preloadThemeImages(nextTheme);
      await transitionTheme({
        button,
        nextTheme,
        commit: () => flushSync(() => setTheme(nextTheme)),
      });
    } finally {
      themeSwitchLock.current = false;
      setThemeSwitching(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!FORM_ENDPOINT) {
      window.location.href = buildMailto(form);
      setFormState({
        status: "mail",
        message: `Открыли письмо на ${CONTACT_EMAIL} с вашими данными. Если почтовая программа не открылась, напишите на этот адрес напрямую.`,
      });
      return;
    }

    setFormState({ status: "sending", message: "Отправляем заявку." });

    const payload = new FormData(form);
    payload.set("_subject", "Заявка с сайта СКАЙСИНТ ИНЖИНИРИНГ");
    payload.set("_template", "table");
    payload.set("_captcha", "false");

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: payload,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(String(response.status));

      form.reset();
      if (METRIKA_ID) window.ym?.(METRIKA_ID, "reachGoal", "form_sent");
      setFormState({
        status: "sent",
        message: "Заявка отправлена. Ответим на указанные контакты.",
      });
    } catch {
      window.location.href = buildMailto(form);
      setFormState({
        status: "mail",
        message: `Не удалось отправить через сайт, поэтому открыли письмо на ${CONTACT_EMAIL} с вашими данными.`,
      });
    }
  }

  return (
    <div
      className="site-shell"
      data-ready={siteReady ? "true" : "false"}
      ref={shellRef}
      onDragStart={(event) => {
        if (event.target instanceof HTMLImageElement) event.preventDefault();
      }}
    >
      <div
        className="site-loader"
        data-visible={siteReady ? "false" : "true"}
        role="status"
        aria-label="Загрузка сайта"
        aria-hidden={siteReady ? "true" : undefined}
      >
        <img
          src={logoAssets[theme]}
          alt="СКАЙСИНТ ИНЖИНИРИНГ"
          width="208"
          height="68"
          fetchPriority="high"
          draggable={false}
        />
        <span className="site-loader-track" aria-hidden="true">
          <span />
        </span>
      </div>

      <a className="skip-link" href="#main">
        Перейти к содержанию
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a className="brand-lockup" href="#top" onClick={scrollToTop}>
            <img
              className="brand-logo"
              src={logoAssets[theme]}
              alt="СКАЙСИНТ ИНЖИНИРИНГ"
              width="1311"
              height="355"
              draggable="false"
            />
            <span className="brand-name">СКАЙСИНТ ИНЖИНИРИНГ</span>
          </a>

          <nav
            className={menuOpen ? "site-nav site-nav-open" : "site-nav"}
            id="site-navigation"
            aria-label="Основная навигация"
          >
            {navigation.map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
            <a className="site-nav-cta" href="#project-form" onClick={closeMenu}>
              Оставить заявку
            </a>
          </nav>

          <div className="header-controls">
            <button
              className="theme-toggle"
              type="button"
              aria-busy={themeSwitching}
              aria-label={
                theme === "dark"
                  ? "Включить светлую версию"
                  : "Включить тёмную версию"
              }
              title={theme === "dark" ? "Светлая версия" : "Тёмная версия"}
              aria-pressed={theme === "light"}
              disabled={themeSwitching}
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" size={18} strokeWidth={1.8} />
              ) : (
                <Moon aria-hidden="true" size={18} strokeWidth={1.8} />
              )}
              <span className="sr-only">
                {theme === "dark" ? "Светлая версия" : "Тёмная версия"}
              </span>
            </button>

            <button
              className="menu-button"
              type="button"
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={menuOpen}
              aria-controls="site-navigation"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <span className="menu-button-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="sr-only">
                {menuOpen ? "Закрыть меню" : "Открыть меню"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              <span>Разработка электроники</span>
              <span>для сложных устройств</span>
              <span>от идеи до производства</span>
            </h1>
            <p className="hero-description">
              Разрабатываем электронику для БАС и других сложных систем: платы,
              высокочастотные узлы, встроенное ПО, прототипы, испытания и КД по
              ЕСКД. Также выполняем реверс-инжиниринг готовых изделий.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Обсудить задачу
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <Suspense
              fallback={isPhoneHero ? (
                <HeroMobileScene background={heroAsset.mobile} board={heroBoards[0].image} />
              ) : (
                <div className="hero-media" aria-hidden="true">
                  <picture>
                    <source media={NARROW_HERO_QUERY} srcSet={heroAsset.mobile} />
                    <img
                      src={heroAsset.desktop}
                      alt=""
                      width="1586"
                      height="992"
                      fetchPriority="high"
                      draggable={false}
                    />
                  </picture>
                </div>
              )}
            >
              <HeroBoardExperience
                backgrounds={heroAsset}
                boards={heroBoards}
                dracoPath={assetPath("draco/")}
                theme={theme}
              />
            </Suspense>
            {pendantEnabled ? (
              <Suspense fallback={null}>
                <HeroPendant onReady={handlePendantReady} />
              </Suspense>
            ) : null}
          </div>
        </section>

        <section className="section services-section" id="services" aria-labelledby="services-title">
          <div className="section-shell">
            <div className="section-heading-row" data-reveal="out">
              <h2 id="services-title">Услуги</h2>
            </div>

            <div className="service-offerings">
              <div className="service-scene-art" aria-hidden="true">
                <img
                  src={sectionImages.reverse[theme]}
                  alt=""
                  loading="lazy"
                  width="1672"
                  height="941"
                  draggable={false}
                />
              </div>
              {serviceOfferings.map((offering) => (
                <ServiceOffering offering={offering} key={offering.id} />
              ))}
            </div>

            <h3 className="service-directions-title" data-reveal="out">
              Направления разработки
            </h3>
            <div className="service-list">
              {services.map((service) => (
                <article className="service-row" data-reveal="out" key={service.title}>
                  <span className="service-icon" aria-hidden="true">
                    <service.icon size={20} strokeWidth={1.5} />
                  </span>
                  <div className="service-head">
                    <h4>{service.title}</h4>
                  </div>
                  <div className="service-body">
                    <p>{service.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section developments-section" id="developments">
          <div className="section-shell developments-head">
            <div className="section-heading-row section-heading-with-copy" data-reveal="out">
              <div>
                <h2>Разработки</h2>
              </div>
              <p className="section-intro">
                Это модули, которые мы спроектировали. Переключайте разработки
                стрелками; 3D-модель можно вращать во все стороны.
              </p>
            </div>
          </div>

          <Suspense
            fallback={<div className="board-gallery-fallback" aria-hidden="true" />}
          >
            <BoardGallery
              boards={boards}
              dracoPath={DRACO_PATH}
              selectorBackground={sceneAssets.selector[theme]}
              theme={theme}
              turntableVideo={assetPath("assets/video/gallery-turntables-right-ramp-v2.mp4")}
            />
          </Suspense>
        </section>

        <section className="section deliverables-section" id="deliverables">
          <div className="section-shell">
            <div className="section-heading-row section-heading-with-copy" data-reveal="out">
              <div>
                <p className="eyebrow">Результат работы</p>
                <h2>Материалы <em>по проекту</em></h2>
              </div>
              <p className="section-intro">
                Документация, производственные файлы, программное обеспечение,
                опытный образец и результаты испытаний.
              </p>
            </div>

            <div className="deliverables-grid">
              {deliverables.map((item, index) => (
                <article className="deliverable" data-reveal="out" key={item.title}>
                  <p className="item-number">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <ContactPanorama background={sceneAssets.contactPanorama[theme]} />
        </Suspense>

        <section className="section contact-section" id="contact">
          <div className="section-shell contact-grid">
            <div className="contact-copy">
              <p className="eyebrow">Заявка</p>
              <h2>Расскажите, что нужно разработать</h2>
              <p>
                Опишите устройство или текущую задачу и оставьте контакты.
                Техническое задание, схемы и файлы присылайте на почту: письмом
                удобнее передать весь комплект.
              </p>

              <a className="contact-mail" href={`mailto:${CONTACT_EMAIL}`}>
                <span>Почта для ТЗ и заявок</span>
                <strong>{CONTACT_EMAIL}</strong>
              </a>

              <dl className="legal-summary">
                <div>
                  <dt>Компания</dt>
                  <dd>ООО «СКАЙСИНТ ИНЖИНИРИНГ»</dd>
                </div>
                <div>
                  <dt>Город</dt>
                  <dd>Санкт-Петербург</dd>
                </div>
              </dl>
            </div>

            <form className="project-form" id="project-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <label>
                  <span>Имя</span>
                  <input type="text" name="name" autoComplete="name" required />
                </label>
                <label>
                  <span>Компания</span>
                  <input type="text" name="company" autoComplete="organization" />
                </label>
              </div>

              <label>
                <span>Телефон или email</span>
                <input type="text" name="contact" autoComplete="email" required />
              </label>

              <label>
                <span>Что нужно разработать</span>
                <textarea name="message" rows="5" required />
              </label>

              <label className="form-consent">
                <input type="checkbox" name="consent" required />
                <span>
                  Согласен на обработку персональных данных в соответствии с{" "}
                  <a
                    href={assetPath("privacy.html#form-data")}
                    target="_blank"
                    rel="noreferrer"
                  >
                    политикой конфиденциальности
                  </a>
                  .
                </span>
              </label>

              <button
                className="button button-primary"
                type="submit"
                disabled={formState.status === "sending"}
              >
                {formState.status === "sending" ? "Отправляем" : "Отправить заявку"}
              </button>
              <p className="form-note">
                Форма подготовит письмо на {CONTACT_EMAIL}. Большие файлы и
                техническое задание отправляйте на этот же адрес.
              </p>
              {formState.message ? (
                <p className="form-status" role="status" aria-live="polite">
                  {formState.message}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </main>

      {cookies.asking ? (
        <div className="cookie-bar" role="dialog" aria-label="Настройки cookie">
          <div className="cookie-text">
            <p>
              Используем cookie для работы сайта и обезличенной статистики.
            </p>
            <a href={assetPath("privacy.html#cookies")}>Подробнее</a>
          </div>
          <div className="cookie-actions">
            <button type="button" className="cookie-decline" onClick={cookies.decline}>
              Отклонить
            </button>
            <button type="button" className="cookie-accept" onClick={cookies.accept}>
              Принять
            </button>
          </div>
        </div>
      ) : null}

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <img
              className="footer-logo"
              src={logoAssets[theme]}
              alt="СКАЙСИНТ ИНЖИНИРИНГ"
              width="1311"
              height="355"
              draggable="false"
            />
            <p className="footer-brand">СКАЙСИНТ ИНЖИНИРИНГ</p>
            <p>
              Разработка программно-аппаратных комплексов и бортовой электроники.
            </p>
          </div>
          <nav aria-label="Навигация в подвале">
            {navigation.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                {item.label}
              </a>
            ))}
            <a href="#reverse">Реверс-инжиниринг</a>
          </nav>
          <div className="footer-legal">
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            <p>ИНН 7811807479</p>
            <p>ОГРН 1257800037461</p>
            <p>Санкт-Петербург</p>
            <p>
              <a href={assetPath("privacy.html")}>Политика конфиденциальности</a>
            </p>
            <p>
              <a href={assetPath("privacy.html#cookies")}>
                Cookie и статистика посещений
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
