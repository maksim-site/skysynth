import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const navigation = [
  { label: "Компетенции", href: "#competencies" },
  { label: "Разработки", href: "#developments" },
  { label: "Процесс", href: "#process" },
  { label: "Контакты", href: "#contact" },
];

const heroAssets = {
  dark: {
    desktop: "/assets/images/hero-concept-dark-wide.webp",
    mobile: "/assets/images/hero-concept-dark.webp",
  },
  light: {
    desktop: "/assets/images/hero-concept-light-wide.webp",
    mobile: "/assets/images/hero-concept-light.webp",
  },
};

const processAssets = {
  dark: "/assets/images/process-concept-dark.webp",
  light: "/assets/images/process-concept-light.webp",
};

const competencies = [
  {
    number: "01",
    title: "Схемотехника и архитектура",
    text: "Разрабатываем структуру устройства, принципиальные схемы и интерфейсы между узлами с учётом ограничений изделия.",
  },
  {
    number: "02",
    title: "Топология PCB",
    text: "Проектируем многослойные печатные платы, библиотеки компонентов и комплект производственных файлов.",
  },
  {
    number: "03",
    title: "Embedded software",
    text: "Готовим программную часть устройства, логику управления и взаимодействие с бортовыми системами.",
  },
  {
    number: "04",
    title: "Прототипы и серия",
    text: "Собираем опытные образцы, проводим проверку и готовим документацию для производства и дальнейшего сопровождения.",
  },
];

const developments = [
  {
    label: "Управление",
    title: "Полётные контроллеры",
    text: "Компактные бортовые модули управления с интерфейсами для периферии и смежных систем.",
    images: {
      dark: "/assets/images/flight-controller-concept.webp",
      light: "/assets/images/flight-controller-concept-light.webp",
    },
    alt: "Концептуальный рендер печатной платы полётного контроллера на лабораторном стенде",
    mediaLabel: "Концептуальная визуализация",
    width: 1254,
    height: 1254,
  },
  {
    label: "Энергия",
    title: "ESC и силовая электроника",
    text: "Платы управления силовыми узлами, разработанные с учётом компоновки, теплового режима и производства.",
    images: {
      dark: "/assets/images/esc-concept.webp",
      light: "/assets/images/esc-concept-light.webp",
    },
    alt: "Концептуальный рендер платы силовой электроники на лабораторном стенде",
    mediaLabel: "Концептуальная визуализация",
    width: 1254,
    height: 1254,
  },
  {
    label: "Сигнал",
    title: "Модули связи",
    text: "Бортовые модули для каналов связи и передачи данных в составе радиоэлектронных систем.",
    images: {
      dark: "/assets/images/comms-concept.webp",
      light: "/assets/images/comms-concept-light.webp",
    },
    alt: "Концептуальный рендер модуля связи на лабораторном стенде",
    mediaLabel: "Концептуальная визуализация",
    width: 1254,
    height: 1254,
  },
];

const processSteps = [
  {
    number: "01",
    title: "Техническое задание",
    text: "Фиксируем назначение устройства, ограничения, интерфейсы и критерии готовности.",
  },
  {
    number: "02",
    title: "Архитектура и схемотехника",
    text: "Определяем состав узлов, электрические связи и ключевые проектные решения.",
  },
  {
    number: "03",
    title: "Топология и документация",
    text: "Разводим PCB и формируем комплект файлов для изготовления и сборки.",
  },
  {
    number: "04",
    title: "Прототип и испытания",
    text: "Изготавливаем опытный образец, проверяем работу узлов и уточняем конструкцию.",
  },
  {
    number: "05",
    title: "Подготовка к серии",
    text: "Передаём производственный комплект и сопровождаем изделие на этапе запуска.",
  },
];

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formStatus, setFormStatus] = useState("");
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
  const processAsset = processAssets[theme];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#080b0d" : "#f4f3ef");

    try {
      window.localStorage.setItem("skysynth-theme", theme);
    } catch {
      // The theme still works for the current session when storage is blocked.
    }
  }, [theme]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFormStatus(
      "Черновик обращения заполнен. Перед публикацией подключим рабочий адрес компании и реальную отправку.",
    );
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">
        Перейти к содержанию
      </a>

      <header className="site-header">
        <div className="header-inner">
          <a className="wordmark" href="#top" onClick={closeMenu}>
            СКАЙСИНТ ИНЖИНИРИНГ
          </a>

          <nav
            className={menuOpen ? "site-nav site-nav-open" : "site-nav"}
            id="site-navigation"
            aria-label="Основная навигация"
          >
            {navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
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
              title={
                theme === "dark"
                  ? "Светлая версия"
                  : "Тёмная версия"
              }
              aria-pressed={theme === "light"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" size={18} strokeWidth={1.8} />
              ) : (
                <Moon aria-hidden="true" size={18} strokeWidth={1.8} />
              )}
              <span className="sr-only">
                {theme === "dark"
                  ? "Светлая версия"
                  : "Тёмная версия"}
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
            <h1 id="hero-title">
              <span>Электроника</span>
              <span>для БПЛА —</span>
              <span>от схемы до серии</span>
            </h1>
            <p className="hero-description">
              Полётные контроллеры, силовая электроника и системы связи.
              Проектируем, испытываем и готовим изделия к производству.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Обсудить проект
              </a>
              <a className="secondary-link" href="#developments">
                Смотреть разработки
              </a>
            </div>
          </div>

          <div
            className="hero-visual"
            aria-label="Концептуальная визуализация печатной платы"
          >
            <div className="hero-media">
              <picture>
                <source
                  media="(max-width: 860px)"
                  srcSet={heroAsset.mobile}
                />
                <img
                  src={heroAsset.desktop}
                  alt="Концептуальный фронтальный рендер чёрной печатной платы на лабораторном стенде"
                  width="1586"
                  height="992"
                  fetchPriority="high"
                />
              </picture>
            </div>
            <p className="hero-caption">Концептуальная визуализация</p>
          </div>
        </section>

        <section className="section competencies-section" id="competencies">
          <div className="section-shell">
            <div className="section-heading-row">
              <p className="eyebrow">Компетенции</p>
              <h2>Инженерный контур внутри одного проекта</h2>
            </div>

            <div className="competency-grid">
              {competencies.map((item) => (
                <article className="competency-item" key={item.number}>
                  <p className="item-number">{item.number}</p>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="developments">
          <div className="section-shell">
            <div className="section-heading-row section-heading-with-copy">
              <div>
                <p className="eyebrow">Разработки</p>
                <h2>Направления разработки — от управления до связи</h2>
              </div>
              <p className="section-intro">
                Формы плат и фото взяты из материалов компании. Концептуальные
                изображения заменим на финальные рендеры после получения
                3D-моделей.
              </p>
            </div>

            <div className="development-grid">
              {developments.map((item) => (
                <article className="development-card" key={item.title}>
                  <div className="development-media">
                    <img
                      src={item.images[theme]}
                      alt={item.alt}
                      loading="lazy"
                      width={item.width}
                      height={item.height}
                    />
                    <span className="development-media-tag">
                      {item.mediaLabel}
                    </span>
                  </div>
                  <div className="development-copy">
                    <p className="development-label">{item.label}</p>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section process-section" id="process">
          <div className="section-shell process-grid">
            <div className="process-content">
              <p className="eyebrow">Процесс</p>
              <h2>От технического задания до готовности к производству</h2>

              <div className="process-list">
                {processSteps.map((step) => (
                  <article className="process-step" key={step.number}>
                    <p className="item-number">{step.number}</p>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <figure className="process-evidence">
              <div className="process-media">
                <img
                  src={processAsset}
                  alt="Концептуальный рендер собранной печатной платы на лабораторном стенде"
                  loading="lazy"
                  width="1122"
                  height="1402"
                />
              </div>
              <figcaption>
                <span>Концептуальная визуализация</span>
                <span>CAD / PCB / производство</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="section-shell contact-grid">
            <div className="contact-copy">
              <p className="eyebrow">Обсудить проект</p>
              <h2>Расскажите, какое устройство нужно разработать</h2>
              <p>
                Достаточно кратко описать задачу, ограничения и текущую стадию.
                Детали и состав материалов можно уточнить на первичном обсуждении.
              </p>
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
                  <input
                    type="text"
                    name="company"
                    autoComplete="organization"
                  />
                </label>
              </div>

              <label>
                <span>Телефон или email</span>
                <input
                  type="text"
                  name="contact"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                <span>Кратко о задаче</span>
                <textarea name="message" rows="5" required />
              </label>

              <label className="file-label">
                <span>Техническое задание, если есть</span>
                <input
                  type="file"
                  name="brief"
                  accept=".pdf,.doc,.docx,.zip"
                />
              </label>

              <button className="button button-primary" type="submit">
                Подготовить обращение
              </button>
              <p className="form-note">
                Форма работает как прототип. Реальную отправку подключим после
                получения рабочего контакта компании.
              </p>
              {formStatus ? (
                <p className="form-status" role="status" aria-live="polite">
                  {formStatus}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <p className="footer-brand">СКАЙСИНТ ИНЖИНИРИНГ</p>
            <p>Электроника для БПЛА — от схемы до серии.</p>
          </div>
          <nav aria-label="Навигация в подвале">
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="footer-legal">
            <p>ИНН 7811807479</p>
            <p>ОГРН 1257800037461</p>
            <p>Санкт-Петербург</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
