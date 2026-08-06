(() => {
  const CHECKOUT = "https://pay.cakto.com.br/kegfpsr_1020937";
  const COUNTDOWN_MS = 8 * 60 * 60 * 1000;
  const COUNTDOWN_KEY = "msc_offer_deadline";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Sticky nav scrolled state ---------- */
  const nav = document.getElementById("nav");
  const stickyCta = document.getElementById("stickyCta");
  const hero = document.querySelector(".hero");
  const pricing = document.getElementById("precos");

  const onScroll = () => {
    const y = window.scrollY || window.pageYOffset;
    nav?.classList.toggle("nav--scrolled", y > 8);

    if (stickyCta) {
      const pastHero = hero ? y > hero.offsetHeight * 0.55 : y > 480;
      let nearPricing = false;
      if (pricing) {
        const rect = pricing.getBoundingClientRect();
        const vh = window.innerHeight || 0;
        nearPricing = rect.top < vh * 0.9 && rect.bottom > vh * 0.2;
      }
      const show = pastHero && !nearPricing && y > 80;
      stickyCta.classList.toggle("sticky-cta--show", show);
      stickyCta.setAttribute("aria-hidden", show ? "false" : "true");
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const navLinks = document.getElementById("navLinks");
  const navToggle = document.getElementById("navToggle");

  function closeNav() {
    navLinks?.classList.remove("nav__links--open");
    navToggle?.setAttribute("aria-expanded", "false");
  }

  navToggle?.addEventListener("click", () => {
    const open = navLinks?.classList.toggle("nav__links--open");
    navToggle.setAttribute("aria-expanded", String(Boolean(open)));
  });

  navLinks?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", closeNav);
  });

  /* ---------- Smooth anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      closeNav();
    });
  });

  /* ---------- Scroll reveal ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if (reduceMotion) {
    reveals.forEach((el) => el.classList.add("is-visible"));
  } else {
    reveals.forEach((el) => el.classList.add("reveal-pending"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          entry.target.classList.remove("reveal-pending");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  }

  /* ---------- Module accordions ---------- */
  document.querySelectorAll("[data-acc]").forEach((item) => {
    const btn = item.querySelector(".acc__trigger");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("acc--open");
      document.querySelectorAll("[data-acc]").forEach((other) => {
        other.classList.remove("acc--open");
        other.querySelector(".acc__trigger")?.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("acc--open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq__item").forEach((item) => {
    const btn = item.querySelector("button");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const isOpen = item.classList.contains("faq__item--open");
      document.querySelectorAll(".faq__item").forEach((other) => {
        other.classList.remove("faq__item--open");
        other.querySelector("button")?.setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("faq__item--open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Video demo ---------- */
  document.querySelectorAll(".video-stage").forEach((stage) => {
    const video = stage.querySelector("video");
    const playBtn = stage.querySelector(".video-stage__play");
    if (!video || !playBtn) return;

    const play = () => {
      stage.classList.add("is-playing");
      video.controls = true;
      video.play().catch(() => {});
    };

    playBtn.addEventListener("click", play);
    stage.querySelector(".video-stage__poster")?.addEventListener("click", play);
  });

  /* ---------- 8h countdown (localStorage) ---------- */
  function getDeadline() {
    try {
      const stored = localStorage.getItem(COUNTDOWN_KEY);
      if (stored) {
        const n = Number(stored);
        if (!Number.isNaN(n) && n > Date.now()) return n;
      }
      const next = Date.now() + COUNTDOWN_MS;
      localStorage.setItem(COUNTDOWN_KEY, String(next));
      return next;
    } catch {
      return Date.now() + COUNTDOWN_MS;
    }
  }

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, "0");
  }

  function tickCountdown() {
    const deadline = getDeadline();
    const left = Math.max(0, deadline - Date.now());
    const h = Math.floor(left / 3600000);
    const m = Math.floor((left % 3600000) / 60000);
    const s = Math.floor((left % 60000) / 1000);

    document.querySelectorAll("[data-countdown]").forEach((root) => {
      const hours = root.querySelector("[data-hours]");
      const minutes = root.querySelector("[data-minutes]");
      const seconds = root.querySelector("[data-seconds]");
      if (hours) hours.textContent = pad(h);
      if (minutes) minutes.textContent = pad(m);
      if (seconds) seconds.textContent = pad(s);
    });

    if (left <= 0) {
      try {
        localStorage.setItem(COUNTDOWN_KEY, String(Date.now() + COUNTDOWN_MS));
      } catch {
        /* ignore */
      }
    }
  }

  tickCountdown();
  setInterval(tickCountdown, 1000);

  window.MSC_CHECKOUT = CHECKOUT;
})();
