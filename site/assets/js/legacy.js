const demos = {
  discover: {
    command: "list-capabilities",
    rows: [
      ["landing-page", "locale · SKILL.md"],
      ["elaya-design-landing-page-design", "importée · elayadesign/ai-design-skills"],
      ["ui-skills-fixing-accessibility", "importée · ibelick/ui-skills"]
    ]
  },
  search: {
    command: 'search-capabilities  "landing accessibilité motion"',
    rows: [
      ["elaya-design-landing-page-design · Hero", "score classé · SKILL.md"],
      ["ui-skills-fixing-accessibility · Focus states", "résultat ciblé · SKILL.md"],
      ["ui-skills-fixing-motion-performance · Scroll", "résultat ciblé · SKILL.md"]
    ]
  },
  load: {
    command: 'load-capability  "elaya-design-landing-page-design"  section: "skill"',
    rows: [
      ["Section chargée", "skill · 380 lignes utiles"],
      ["Provenance", "commit 1c1e97cb · licence MIT"],
      ["Contexte", "référence importée · autorité limitée"]
    ]
  }
};

const demoCommand = document.querySelector("#demo-command");
const demoOutput = document.querySelector("#demo-output");

function renderDemo(name) {
  const demo = demos[name];
  demoOutput.classList.add("loading");
  window.setTimeout(() => {
    demoCommand.textContent = demo.command;
    demoOutput.replaceChildren(...demo.rows.map(([title, detail]) => {
      const row = document.createElement("div");
      row.className = "terminal-row";
      const strong = document.createElement("strong");
      strong.textContent = title;
      const span = document.createElement("span");
      span.textContent = detail;
      row.append(strong, span);
      return row;
    }));
    demoOutput.classList.remove("loading");
  }, 240);
}

document.querySelectorAll(".tool-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tool-tab").forEach((item) => item.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    renderDemo(tab.dataset.demo);
  });
});

renderDemo("discover");

const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.querySelector("#mobile-menu");

function setMenu(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  mobileMenu.classList.toggle("open", open);
  mobileMenu.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("menu-open", open);
}

menuButton.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenu(false);
});

const navWrap = document.querySelector(".nav-wrap");
const updateHeader = () => navWrap.classList.toggle("scrolled", window.scrollY > 24);
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", async () => {
    const label = button.querySelector("span");
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add("success");
      label.textContent = "Copié";
      window.setTimeout(() => {
        button.classList.remove("success");
        label.textContent = "Copier";
      }, 1600);
    } catch {
      label.textContent = "Copie refusée";
      window.setTimeout(() => { label.textContent = "Copier"; }, 1600);
    }
  });
});

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const nextState = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(nextState));
  });
});

document.querySelectorAll("[data-dialog]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.dialog}`).showModal());
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -48px" });
  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
}

document.querySelectorAll(".tagline").forEach((tagline) => {
  const words = tagline.textContent.trim().split(/\s+/);
  tagline.textContent = "";
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = word;
    tagline.append(span, document.createTextNode(index === words.length - 1 ? "" : " "));
  });

  if (!reduceMotion && "IntersectionObserver" in window) {
    const wordObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = Number(entry.target.dataset.index);
        window.setTimeout(() => entry.target.classList.add("active"), index * 52);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.9, rootMargin: "0px 0px -18%" });
    tagline.querySelectorAll(".word").forEach((word, index) => {
      word.dataset.index = index;
      wordObserver.observe(word);
    });
  } else {
    tagline.querySelectorAll(".word").forEach((word) => word.classList.add("active"));
  }
});

// Comparatif temporaire — Variante B : fond three.js lazy-loaded.
// Fallback automatique sur le pattern SVG (classe .tagline-section--b) si
// WebGL indisponible ou prefers-reduced-motion.
const canvas = document.getElementById("tagline-bg");
if (canvas) {
  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const lazyObserver = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting) return;
    lazyObserver.disconnect();
    if (prefersReducedMotion) return; // fallback = pattern SVG
    try {
      if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) return;
      const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js");
      mountTaglineBackground(THREE, canvas);
    } catch {
      // rester sur le pattern SVG
    }
  }, { rootMargin: "200px" });
  lazyObserver.observe(canvas);
}

function mountTaglineBackground(THREE, canvas) {
  const section = canvas.closest(".tagline-section");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap dpr

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 2;

  // champ de points — géométrie fixe, aucune lecture DOM par frame
  const N = 260;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    positions[i * 3] = Math.random() * 2 - 1;
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * 0.6;
    positions[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, color: 0x0a0a0a, transparent: true, opacity: 0.16 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // taille : une fois par resize, pas par frame
  const resize = () => {
    const { width, height } = section.getBoundingClientRect();
    renderer.setSize(width, height, false);
  };
  resize();
  window.addEventListener("resize", resize, { passive: true });

  // boucle active uniquement quand la section est visible
  let inView = false;
  new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), { rootMargin: "100px" }).observe(section);

  let raf;
  const tick = (t) => {
    raf = requestAnimationFrame(tick);
    if (!inView) return;
    points.rotation.z = t * 0.00002; // drift quasi imperceptible
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(raf);
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  });
}
