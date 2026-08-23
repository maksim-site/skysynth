import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Cpu,
  CircuitBoard,
  FileText,
  Library,
  Moon,
  Plane,
  RadioTower,
  Sun,
} from "lucide-react";
import { useCookieChoice, useMetrika, useReveal, useScrolled } from "./useReveal.js";
import { ProcessFlow } from "./ProcessFlow.jsx";
import { Faq } from "./Faq.jsx";
import { preloadBoardModel, supportsWebGL } from "./media.js";

const HeroBoardExperience = lazy(() =>
  import("./HeroBoardExperience").then((module) => ({
    default: module.HeroBoardExperience,
  })),
);

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
  { label: "Процесс", id: "process" },
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

const DRACO_PATH = assetPath("draco/");

// Every board below comes from the company's own 3D files. Descriptions stay
// inside what the client documented, and the AKYMA receiver is left out on
// their request.
const boards = [
  {
    label: "Управление",
    title: "Полётный контроллер",
    text: "Плата управления из набора электронных модулей для FPV-дрона. Проектировали с учётом габаритов, вибрационных нагрузок и тепловыделения.",
    facts: ["Управление полётом", "Компоновка под корпус", "Часть набора модулей"],
    model: assetPath("assets/models/flight-controller.glb"),
    image: assetPath("assets/images/boards/flight-controller-transparent.webp"),
    alt: "3D-рендер платы полётного контроллера",
    sceneScale: 2.9,
  },
  {
    label: "Интерфейсы",
    title: "CAN-to-PWM",
    text: "Контроллер управления девятью PWM-каналами через CAN-шину.",
    facts: ["9 PWM-каналов", "CAN, UART, I²C", "Питание 5 В"],
    model: assetPath("assets/models/can-to-pwm.glb"),
    image: assetPath("assets/images/boards/can-to-pwm-transparent.webp"),
    alt: "3D-рендер платы CAN-to-PWM",
    sceneScale: 4.4,
  },
  {
    label: "Навигация",
    title: "ICM-42605",
    text: "Компактный инерциальный модуль для измерения ускорения и угловой скорости.",
    facts: ["Ускорение", "Угловая скорость", "Компактный форм-фактор"],
    model: assetPath("assets/models/icm-42605.glb"),
    image: assetPath("assets/images/boards/icm-42605-transparent.webp"),
    alt: "3D-рендер инерциального модуля ICM-42605",
    sceneScale: 2.65,
  },
  {
    label: "Питание",
    title: "Плата распределения питания",
    text: "Компактная плата для подключения и централизованного питания нескольких модулей.",
    facts: ["Линии +5 В", "Линии +3,3 В", "Общая GND"],
    model: assetPath("assets/models/power-distribution.glb"),
    image: assetPath("assets/images/boards/power-distribution-transparent.webp"),
    alt: "3D-рендер платы распределения питания",
    sceneScale: 2.65,
  },
  {
    label: "Коммутация",
    title: "RELE",
    text: "Интеллектуальный модуль управления питанием системы: коммутация, распределение силовых линий и контроль питания.",
    facts: ["Коммутация линий", "Контроль питания", "Управление нагрузками"],
    model: assetPath("assets/models/rele.glb"),
    image: assetPath("assets/images/boards/rele-transparent.webp"),
    alt: "3D-рендер модуля управления питанием RELE",
    sceneScale: 3.45,
  },
  {
    label: "Видео",
    title: "STM32R3",
    text: "Модуль видеозахвата: преобразует аналоговый видеосигнал в цифровой формат для обработки и передачи.",
    facts: ["Аналог в цифру", "Интерфейс USB", "Управление режимами"],
    model: assetPath("assets/models/stm32r3.glb"),
    image: assetPath("assets/images/boards/stm32r3-transparent.webp"),
    alt: "3D-рендер модуля видеозахвата STM32R3",
    sceneScale: 3.1,
  },
  {
    label: "Приводы",
    title: "STM32F446RET6",
    text: "Контроллер управления сервоприводами: формирует управляющие сигналы и питает подключённые приводы.",
    facts: ["Управляющие сигналы", "Питание приводов", "Силовая часть на плате"],
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
    title: "Аппаратная часть",
    text: "Логика работы устройства, принципиальная схема, топология платы и подбор элементной базы.",
  },
  {
    title: "Программная часть",
    text: "Программное обеспечение для встраиваемых систем под ту же плату и те же требования.",
  },
  {
    title: "Проверка",
    text: "Опытные образцы, функциональные, климатические и электрические испытания.",
  },
  {
    title: "Передача",
    text: "КД по ЕСКД, Gerber-файлы, сверловочные данные и сопровождение производства.",
  },
];

// Теги ниже — только то, что уже сказано в тексте услуги, без новых обещаний.
const services = [
  {
    number: "01",
    title: "Проектирование печатных плат",
    text: "Трассируем многослойные платы различной сложности, разводим высокочастотные цепи и силовые линии. Готовим Gerber-файлы, сверловочные данные и технические требования к изготовлению.",
    icon: CircuitBoard,
    tags: ["Многослойные платы", "ВЧ и силовые цепи", "Gerber и сверловка"],
  },
  {
    number: "02",
    title: "Высокочастотные узлы и тракты",
    text: "Проектируем СВЧ-узлы и тракты, считаем и разводим цепи с контролируемым волновым сопротивлением.",
    icon: RadioTower,
    tags: ["СВЧ-узлы", "Контролируемое волновое сопротивление"],
  },
  {
    number: "03",
    title: "Электроника для БПЛА",
    text: "Полётные контроллеры, регуляторы скорости, видеопередатчики и каналы связи. Компонуем изделие с учётом вибрационных нагрузок, тепловыделения и габаритов корпуса.",
    icon: Plane,
    tags: ["Полётные контроллеры", "ESC", "Видеопередатчики", "Каналы связи"],
  },
  {
    number: "04",
    title: "Встраиваемое ПО",
    text: "Разрабатываем программное обеспечение для встраиваемых систем. Прошивка и плата проектируются под один набор требований.",
    icon: Cpu,
    tags: ["Прошивка", "Один набор требований с платой"],
  },
  {
    number: "05",
    title: "Документация по ЕСКД",
    text: "Принципиальные электрические схемы по ТЗ, сборочные чертежи и спецификации. Вносим изменения в КД на всех этапах жизненного цикла изделия.",
    icon: FileText,
    tags: ["Схемы", "Сборочные чертежи", "Спецификации", "Изменения в КД"],
  },
  {
    number: "06",
    title: "Библиотеки и импортозамещение",
    text: "Ведём библиотеки компонентов в Altium Designer: УГО, посадочные места и 3D-модели. Подбираем и обосновываем элементную базу с учётом наличия на рынке.",
    icon: Library,
    tags: ["Altium Designer", "УГО и посадочные места", "3D-модели"],
  },
];

const reverseSteps = [
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
    title: "Перечень элементов",
    text: "Элементная база с обоснованием подбора и учётом наличия на рынке.",
  },
  {
    title: "Встраиваемое ПО",
    text: "Программное обеспечение под ту же плату и тот же набор требований.",
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

const faqItems = [
  {
    q: "Можно заказать только один этап, без всей разработки?",
    a: "Да. Основное направление — разработка программно-аппаратного комплекса целиком, но отдельные этапы мы берём как самостоятельные работы: например, только топологию платы или только конструкторскую документацию.",
  },
  {
    q: "В каком виде вы передаёте результат?",
    a: "Принципиальная схема, топология платы, Gerber-файлы и сверловочные данные, технические требования к изготовлению, сборочный чертёж и спецификация, перечень элементов, встраиваемое ПО и результаты испытаний. Комплект оформляется по ЕСКД.",
  },
  {
    q: "Что нужно прислать, чтобы начать разговор?",
    a: "Описание устройства или текущей задачи: назначение, условия работы, требования к габаритам, питанию и интерфейсам. Если есть техническое задание, схемы или файлы, присылайте их письмом на info@skysinth.com.",
  },
  {
    q: "Работаете ли вы с импортозамещением элементной базы?",
    a: "Да. Мы подбираем и обосновываем элементную базу с учётом наличия на рынке и предлагаем замену компонентов, снятых с производства.",
  },
  {
    q: "Что входит в реверс-инжиниринг?",
    a: "Разбираем готовое изделие, определяем элементную базу, восстанавливаем принципиальную схему и топологию платы. На выходе — схема, топология, производственные файлы и предложения по замене снятых с производства компонентов.",
  },
  {
    q: "В каком ПО ведётся разработка?",
    a: "Проектирование и библиотеки компонентов ведём в Altium Designer: условные графические обозначения, посадочные места и 3D-модели.",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Требования к устройству",
    text: "Уточняем назначение устройства, условия работы и границы задачи.",
    visualLabel: "Формируем рамки проекта",
  },
  {
    number: "02",
    title: "Схема и компоненты",
    text: "Разрабатываем логику, принципиальную схему и подбираем элементную базу.",
    visualLabel: "Проектируем электрическую часть",
  },
  {
    number: "03",
    title: "Печатная плата",
    text: "Трассируем плату и готовим Gerber-файлы, сверловочные данные и требования к изготовлению.",
    visualLabel: "Переходим к топологии платы",
  },
  {
    number: "04",
    title: "Прототип и испытания",
    text: "Изготавливаем опытный образец и проводим функциональные, климатические и электрические испытания.",
    visualLabel: "Проверяем опытный образец",
  },
  {
    number: "05",
    title: "Документация и производство",
    text: "Оформляем документацию по ЕСКД, сопровождаем производство и вносим изменения по результатам испытаний.",
    visualLabel: "Передаём комплект в производство",
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [formState, setFormState] = useState({ status: "idle", message: "" });
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
    if (!supportsWebGL()) return undefined;

    // Warm the selector itself and its first GLB immediately after the initial
    // paint. The remaining boards decode during idle time, before a fast scroll
    // reaches the gallery, so the accepted still never flashes before WebGL.
    void import("./BoardGallery.jsx");
    void import("./BoardCanvas.jsx");
    preloadBoardModel(boards[0]?.model, DRACO_PATH);

    const warmRemaining = () => {
      boards.slice(1).forEach((item) => preloadBoardModel(item.model, DRACO_PATH));
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmRemaining, { timeout: 900 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(warmRemaining, 180);
    return () => window.clearTimeout(timerId);
  }, []);

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

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
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
    <div className="site-shell" ref={shellRef}>
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
            <a className="site-nav-mail" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </nav>

          <div className="header-controls">
            <button
              className="theme-toggle"
              type="button"
              aria-label={
                theme === "dark"
                  ? "Включить светлую версию"
                  : "Включить тёмную версию"
              }
              title={theme === "dark" ? "Светлая версия" : "Тёмная версия"}
              aria-pressed={theme === "light"}
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
              aria-expanded={menuOpen}
              aria-controls="site-navigation"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {menuOpen ? "Закрыть" : "Меню"}
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              Инженерная команда · Санкт-Петербург
            </p>
            <h1 id="hero-title">
              <span>Разработка электроники</span>
              <span>для сложных устройств</span>
              <span>от идеи до производства</span>
            </h1>
            <p className="hero-description">
              Проектируем платы, высокочастотные узлы и встраиваемое ПО для
              беспилотных систем и другой сложной радиоэлектроники. Собираем
              прототипы, проводим испытания и передаём документацию по ЕСКД.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Обсудить задачу
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <Suspense
              fallback={
                <div className="hero-media" aria-hidden="true">
                  <picture>
                    <source media="(max-width: 860px)" srcSet={heroAsset.mobile} />
                    <img
                      src={heroAsset.desktop}
                      alt=""
                      width="1586"
                      height="992"
                      fetchPriority="high"
                    />
                  </picture>
                </div>
              }
            >
              <HeroBoardExperience
                backgrounds={heroAsset}
                boards={heroBoards}
                dracoPath={assetPath("draco/")}
                theme={theme}
              />
            </Suspense>
          </div>
        </section>

        <section className="section services-section" id="services">
          <div className="section-shell">
            <div className="section-heading-row section-heading-with-copy" data-reveal="out">
              <div>
                <p className="eyebrow">Услуги</p>
                <h2>Что мы <em>делаем</em></h2>
              </div>
              <p className="section-intro">
                Берём устройство целиком или подключаемся к отдельному этапу.
              </p>
            </div>

            <article className="lead-service" data-reveal="out">
              <div className="lead-service-head">
                <p className="eyebrow">Основная услуга</p>
                <h3>Разработка программно-аппаратных комплексов</h3>
                <p>
                  От требований и схемы до испытаний и комплекта файлов для
                  производства.
                </p>
              </div>

              <div className="lead-service-grid">
                {leadServiceBlocks.map((block, index) => (
                  <div className="lead-service-block" key={block.title}>
                    <span className="lead-service-index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h4>{block.title}</h4>
                    <p>{block.text}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="service-list">
              {services.map((service) => (
                <article className="service-row" data-reveal="out" key={service.number}>
                  <span className="service-icon" aria-hidden="true">
                    <service.icon size={20} strokeWidth={1.5} />
                  </span>
                  <div className="service-head">
                    <p className="item-number">{service.number}</p>
                    <h3>{service.title}</h3>
                  </div>
                  <div className="service-body">
                    <p>{service.text}</p>
                    <ul className="service-tags">
                      {service.tags.map((tag) => (
                        <li key={tag}>{tag}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="accent-band" aria-labelledby="accent-title">
          <div className="accent-inner" data-reveal="out">
            <div>
              <p className="accent-eyebrow">Подход</p>
              <p className="accent-line" id="accent-title">
                Решения ориентированы на <em>импортозамещение</em>, а топология
                прорабатывается с учётом <em>механических и тепловых</em>
                {" "}требований.
              </p>
            </div>
            <a className="accent-cta" href="#contact">
              Обсудить задачу
            </a>
          </div>
        </section>

        <section className="section reverse-section" id="reverse">
          <div className="section-shell">
            <div className="reverse-panel" data-reveal="out">
              <div className="reverse-copy">
                <p className="eyebrow">Дополнительная услуга</p>
                <h2>Реверс-инжиниринг</h2>
                <p>
                  Восстанавливаем документацию по готовому изделию, когда
                  исходных файлов не осталось или их нужно проверить.
                </p>
              </div>

              <figure className="reverse-media">
                <img
                  src={sectionImages.reverse[theme]}
                  alt="Концептуальная визуализация электронной платы на лабораторном стенде"
                  loading="lazy"
                  width="1672"
                  height="941"
                />
                <figcaption>Визуализация по материалам проекта</figcaption>
              </figure>

              <div className="reverse-steps">
                {reverseSteps.map((step) => (
                  <div className="reverse-step" key={step.title}>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                ))}
              </div>
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
                <p className="eyebrow">Результат</p>
                <h2>Что вы получаете <em>на выходе</em></h2>
              </div>
              <p className="section-intro">
                Комплект документов и файлов, по которым устройство можно
                изготавливать и дорабатывать дальше.
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

        <section
          className="section process-section"
          id="process"
        >
          <div className="section-shell">
            <div className="section-heading-row section-heading-with-copy" data-reveal="out">
              <div>
                <p className="eyebrow">Процесс</p>
                <h2>От требований <em>до производства</em></h2>
              </div>
              <p className="section-intro">
                Пять последовательных этапов — от постановки задачи до
                документации и сопровождения производства.
              </p>
            </div>

            <div data-reveal="out">
              <ProcessFlow
                steps={processSteps}
              />
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="section-shell">
            <div className="section-heading-row section-heading-with-copy" data-reveal="out">
              <div>
                <p className="eyebrow">Вопросы</p>
                <h2>
                  Что <em>спрашивают</em> перед началом
                </h2>
              </div>
              <p className="section-intro">
                Если нужного вопроса здесь нет, напишите на {CONTACT_EMAIL}, мы
                ответим по существу.
              </p>
            </div>

            <Faq items={faqItems} />
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

            <form className="project-form" onSubmit={handleSubmit}>
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
                Заявка уходит на {CONTACT_EMAIL}. Большие файлы и техническое
                задание отправляйте письмом на этот же адрес.
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
        <div className="cookie-bar" role="dialog" aria-label="Использование cookie">
          <div className="cookie-text">
            <p>
              После вашего согласия сайт может загрузить Яндекс.Метрику для
              обезличенной статистики посещений. Без согласия счётчик не
              загружается.
            </p>
            <a href={assetPath("privacy.html#cookies")}>
              Как используются cookie и Метрика
            </a>
          </div>
          <div className="cookie-actions">
            <button type="button" className="cookie-decline" onClick={cookies.decline}>
              Только необходимые
            </button>
            <button type="button" className="cookie-accept" onClick={cookies.accept}>
              Разрешить статистику
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
            <a href="#faq">Вопросы</a>
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
