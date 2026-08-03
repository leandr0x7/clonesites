/* =========================================================
   VOXA — motion system inspired by TRIONN
   Lenis smooth scroll · custom cursor · magnetic · split · reveals
   ========================================================= */

(() => {
  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;

  if (isTouch) document.body.classList.add("is-touch");

  /* ---------- Lenis smooth scroll ---------- */
  let lenis = null;
  if (typeof Lenis !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    document.documentElement.classList.add("lenis", "lenis-smooth");
  }

  /* Smooth anchor links */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -80 });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeNav();
    });
  });

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById("header");
  const onScroll = () => {
    header?.classList.toggle("is-scrolled", (lenis?.scroll ?? window.scrollY) > 24);
  };
  if (lenis) lenis.on("scroll", onScroll);
  else window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  const nav = document.getElementById("nav");
  const navToggle = document.getElementById("navToggle");
  function closeNav() {
    nav?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
  navToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  /* ---------- Custom cursor (TRIONN-style follower) ---------- */
  const cursor = document.getElementById("cursor");
  const ring = cursor?.querySelector(".cursor__ring");
  const dot = cursor?.querySelector(".cursor__dot");

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { x: mouse.x, y: mouse.y };
  const dotPos = { x: mouse.x, y: mouse.y };

  if (!isTouch && cursor && ring && dot) {
    window.addEventListener(
      "mousemove",
      (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      },
      { passive: true }
    );

    window.addEventListener("mousedown", () => cursor.classList.add("is-down"));
    window.addEventListener("mouseup", () => cursor.classList.remove("is-down"));

    const hoverables = document.querySelectorAll(
      "a, button, summary, .toggle, [data-cursor], .magnetic, .magnetic-card"
    );
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", () => {
        cursor.classList.add("is-hover");
        if (el.matches('[data-cursor="cta"], .btn--primary, .btn--glow, .btn--capture')) {
          cursor.classList.add("is-cta");
        }
      });
      el.addEventListener("mouseleave", () => {
        cursor.classList.remove("is-hover", "is-cta");
      });
    });

    function tickCursor() {
      ringPos.x += (mouse.x - ringPos.x) * 0.18;
      ringPos.y += (mouse.y - ringPos.y) * 0.18;
      dotPos.x += (mouse.x - dotPos.x) * 0.45;
      dotPos.y += (mouse.y - dotPos.y) * 0.45;

      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;
      requestAnimationFrame(tickCursor);
    }
    requestAnimationFrame(tickCursor);
  }

  /* ---------- Magnetic buttons / cards (TRIONN magnetic feel) ---------- */
  if (!isTouch) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      const strength = el.classList.contains("btn--lg") ? 28 : 18;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate3d(${x / strength}px, ${y / strength}px, 0)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate3d(0,0,0)";
      });
    });

    document.querySelectorAll(".magnetic-card").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (py - 0.5) * -6;
        const ry = (px - 0.5) * 8;
        el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------- Split text (char reveal like TRIONN) ---------- */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = "";
    el.setAttribute("aria-label", text);

    const words = text.split(" ");
    words.forEach((word, wi) => {
      const wordSpan = document.createElement("span");
      wordSpan.style.display = "inline-block";
      wordSpan.style.whiteSpace = "nowrap";

      [...word].forEach((ch, ci) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = ch;
        span.style.transitionDelay = `${(wi * 3 + ci) * 18}ms`;
        wordSpan.appendChild(span);
      });

      el.appendChild(wordSpan);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---------- Scroll reveals ---------- */
  const revealEls = document.querySelectorAll("[data-reveal], [data-split]");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delay = Number(el.dataset.delay || 0);
        setTimeout(() => el.classList.add("is-in"), delay);
        io.unobserve(el);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ---------- Waveform canvas ---------- */
  const canvas = document.getElementById("waveCanvas");
  const ctx = canvas?.getContext("2d");
  let waveAmp = 0.18;
  let waveTarget = 0.18;
  let wavePhase = 0;

  function resizeWave() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 640;
    const h = 72;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeWave();
  window.addEventListener("resize", resizeWave);

  function drawWave() {
    if (!ctx || !canvas) return;
    const w = canvas.clientWidth || 640;
    const h = 72;
    waveAmp += (waveTarget - waveAmp) * 0.08;
    wavePhase += 0.08 + waveAmp * 0.12;

    ctx.clearRect(0, 0, w, h);

    // grid
    ctx.strokeStyle = "rgba(0,229,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const bars = Math.floor(w / 6);
    for (let i = 0; i < bars; i++) {
      const x = i * 6 + 2;
      const n =
        Math.sin(i * 0.35 + wavePhase) * 0.45 +
        Math.sin(i * 0.12 + wavePhase * 1.7) * 0.35 +
        Math.sin(i * 0.08 - wavePhase * 0.6) * 0.2;
      const barH = Math.max(4, Math.abs(n) * h * waveAmp * 2.2);
      const y = (h - barH) / 2;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, "rgba(0,255,135,0.9)");
      grad.addColorStop(1, "rgba(0,229,255,0.85)");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, 3, barH);
    }

    requestAnimationFrame(drawWave);
  }
  requestAnimationFrame(drawWave);

  /* ---------- Demo capture simulation ---------- */
  const captures = [
    {
      log: "Serializando DOM · index.html",
      url: "https://trionn.com/",
      title: "TRIONN | Creative Studio",
    },
    {
      log: "Coletando CSS linkado + inline",
      url: "https://exemplo.dev/landing",
      title: "Landing Reference",
    },
    {
      log: "Detectando utilitários Tailwind",
      url: "https://site.ref/pricing",
      title: "Pricing Page Clone",
    },
  ];

  let captureIndex = 0;
  let busy = false;

  const transcriptText = document.getElementById("transcriptText");
  const jsonOut = document.getElementById("jsonOut");
  const statusPill = document.getElementById("statusPill");
  const captureBtn = document.getElementById("captureBtn");
  const demoBtn = document.getElementById("demoBtn");
  const toggleAllBtn = document.getElementById("toggleAllBtn");
  const moduleInputs = [...document.querySelectorAll("#moduleList input[data-module]")];
  const activeCount = document.getElementById("activeCount");
  const featureToggles = document.querySelectorAll(".feature-card .toggle input");

  function getActiveModules() {
    return moduleInputs.filter((i) => i.checked).map((i) => i.dataset.module);
  }

  function updateActive() {
    const mods = getActiveModules();
    if (activeCount) activeCount.textContent = `${mods.length}/${moduleInputs.length} ativos`;
    if (toggleAllBtn) {
      const allOn = mods.length === moduleInputs.length;
      toggleAllBtn.textContent = allOn ? "TUDO OFF" : "TUDO ON";
    }
    if (jsonOut && !busy) {
      jsonOut.innerHTML = `<code>${JSON.stringify(
        {
          url: "https://exemplo.com",
          mode: "page",
          modules: mods,
        },
        null,
        2
      )}</code>`;
    }
  }

  moduleInputs.forEach((input) => input.addEventListener("change", updateActive));
  featureToggles.forEach((t) => t.addEventListener("change", () => {}));

  toggleAllBtn?.addEventListener("click", () => {
    const turnOn = getActiveModules().length < moduleInputs.length;
    moduleInputs.forEach((i) => {
      i.checked = turnOn;
    });
    updateActive();
  });

  function typeText(el, text, speed = 22) {
    return new Promise((resolve) => {
      el.textContent = "";
      el.classList.add("is-typing");
      let i = 0;
      const timer = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if (i >= text.length) {
          clearInterval(timer);
          el.classList.remove("is-typing");
          resolve();
        }
      }, speed);
    });
  }

  async function runDemo() {
    if (busy) return;
    const modules = getActiveModules();
    if (!modules.length) {
      statusPill.textContent = "Ative ao menos 1 módulo para capturar";
      return;
    }

    busy = true;
    captureBtn?.classList.add("is-active");
    waveTarget = 0.9;
    statusPill.textContent = "Capturando página · empacotando módulos…";

    const item = captures[captureIndex % captures.length];
    captureIndex++;

    await typeText(transcriptText, item.log, 20);
    await new Promise((r) => setTimeout(r, 220));
    await typeText(transcriptText, `Exportando ZIP · ${modules.length} módulos`, 18);

    statusPill.textContent = "Montando archive · index.html + styles/…";
    waveTarget = 0.5;

    const payload = {
      status: "ok",
      url: item.url,
      title: item.title,
      captureMode: "page",
      modules: modules,
      files: [
        modules.includes("html") && "index.html",
        modules.includes("css") && "styles/captured.css",
        modules.includes("inline") && "styles/inline.css",
        modules.includes("js") && "scripts/",
        modules.includes("tailwind") && "tailwind-classes.txt",
        modules.includes("meta") && "meta.json",
        modules.includes("meta") && "README.md",
        modules.includes("assets") && "assets/",
        modules.includes("crawl") && "pages/",
      ].filter(Boolean),
      zip: `${item.title.toLowerCase().replace(/\s+/g, "-")}-clone.zip`,
      elapsed_ms: 1840 + modules.length * 120,
    };

    jsonOut.innerHTML = `<code>${JSON.stringify(payload, null, 2)}</code>`;
    jsonOut.classList.add("shake-once");
    setTimeout(() => jsonOut.classList.remove("shake-once"), 500);

    await new Promise((r) => setTimeout(r, 900));
    waveTarget = 0.18;
    statusPill.textContent = "ZIP pronto · sistema idle";
    transcriptText.textContent = `Clone exportado · ${payload.zip}`;
    captureBtn?.classList.remove("is-active");
    busy = false;
  }

  captureBtn?.addEventListener("click", runDemo);
  demoBtn?.addEventListener("click", runDemo);
  document.getElementById("selectElBtn")?.addEventListener("click", () => {
    if (statusPill) statusPill.textContent = "Modo seleção · clique em um elemento na página";
    if (transcriptText) transcriptText.textContent = "Aguardando seleção de elemento…";
  });
  updateActive();

  /* FAQ: only one open (optional accordion feel) */
  document.querySelectorAll(".faq__item").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      document.querySelectorAll(".faq__item").forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });

  /* ---------- 8h offer countdown ---------- */
  const COUNTDOWN_KEY = "mysitecloner_offer_ends_at";
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

  function getOfferEnd() {
    const stored = localStorage.getItem(COUNTDOWN_KEY);
    let end = stored ? Number(stored) : NaN;
    if (!Number.isFinite(end) || end <= Date.now()) {
      end = Date.now() + EIGHT_HOURS_MS;
      localStorage.setItem(COUNTDOWN_KEY, String(end));
    }
    return end;
  }

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  function tickCountdowns() {
    const end = getOfferEnd();
    let remaining = end - Date.now();
    if (remaining <= 0) {
      remaining = EIGHT_HOURS_MS;
      localStorage.setItem(COUNTDOWN_KEY, String(Date.now() + remaining));
    }

    const totalSec = Math.floor(remaining / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    document.querySelectorAll("[data-countdown]").forEach((box) => {
      const h = box.querySelector("[data-hours]");
      const m = box.querySelector("[data-minutes]");
      const s = box.querySelector("[data-seconds]");
      if (h) h.textContent = pad(hours);
      if (m) m.textContent = pad(minutes);
      if (s) s.textContent = pad(seconds);
    });
  }

  tickCountdowns();
  setInterval(tickCountdowns, 1000);
})();
