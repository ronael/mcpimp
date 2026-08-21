(() => {
"use strict";
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LANG = document.documentElement.lang === "fr" ? "fr" : "en";

/* ── nav ── */
addEventListener("scroll", () => $("#navWrap").classList.toggle("scrolled", scrollY > 24), {passive:true});

/* ── reveal ── */
if (!RM && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add("on"); io.unobserve(e.target); }
  }), {threshold:.14, rootMargin:"0px 0px -48px"});
  $$(".rv").forEach(n => io.observe(n));
} else $$(".rv").forEach(n => n.classList.add("on"));

/* ── hero registry demo ── */
const COPY = {
  en: {
    copied: "Copied",
    copy: "Copy",
    syncLines: [
      {h:`<span class="jp">›</span> <span class="nm">pnpm sources:sync</span>`, cls:""},
      {h:`<span class="nm">ui-skills</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="ok">current</span>`, cls:""},
      {h:`<span class="nm">elaya-design</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="rv-tag">1 update · review</span>`, cls:""},
      {h:`<span class="nm">taste-skill</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="ok">current</span>`, cls:""},
      {h:`→ report generated · nothing written · use <span class="nm">--apply</span> to accept`, cls:"foot"}
    ],
    demos: {
      list: {
        q: "list-capabilities",
        rows: [
          {t:"landing-page", s:"local · SKILL.md", sub:""},
          {t:"elaya-design-landing-page-design", s:"imported · elayadesign/ai-design-skills", sub:""},
          {t:"ui-skills-fixing-accessibility", s:"imported · ibelick/ui-skills", sub:""},
          {t:"upstream-mcp", s:"upstream MCP · 2 exposed tools", sub:""}
        ]
      },
      search: {
        q: 'search-capabilities  "landing accessibility motion"',
        rows: [
          {t:"elaya-design-landing-page-design · Hero", s:"SKILL.md", score:92},
          {t:"ui-skills-fixing-accessibility · Focus states", s:"accessibility synonym", score:81},
          {t:"ui-skills-fixing-motion-performance · Scroll", s:"matching content", score:63}
        ]
      },
      load: {
        q: 'load-capability  "elaya-design-landing-page-design"',
        rows: [
          {t:"Loaded section", s:"skill · 380 useful lines", sub:""},
          {t:"Provenance", s:"commit 1c1e97cb · MIT license", sub:""},
          {t:"Context", s:"imported reference · limited authority", sub:""}
        ]
      }
    }
  },
  fr: {
    copied: "Copié",
    copy: "Copier",
    syncLines: [
      {h:`<span class="jp">›</span> <span class="nm">pnpm sources:sync</span>`, cls:""},
      {h:`<span class="nm">ui-skills</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="ok">à jour</span>`, cls:""},
      {h:`<span class="nm">elaya-design</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="rv-tag">1 mise à jour · review</span>`, cls:""},
      {h:`<span class="nm">taste-skill</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="ok">à jour</span>`, cls:""},
      {h:`→ rapport généré · rien n'écrit — <span class="nm">--apply</span> pour accepter`, cls:"foot"}
    ],
    demos: {
      list: {
        q: "list-capabilities",
        rows: [
          {t:"landing-page", s:"locale · SKILL.md", sub:""},
          {t:"elaya-design-landing-page-design", s:"importée · elayadesign/ai-design-skills", sub:""},
          {t:"ui-skills-fixing-accessibility", s:"importée · ibelick/ui-skills", sub:""},
          {t:"mcp-amont", s:"MCP amont · 2 outils exposés", sub:""}
        ]
      },
      search: {
        q: 'search-capabilities  "landing accessibilité motion"',
        rows: [
          {t:"elaya-design-landing-page-design · Hero", s:"SKILL.md", score:92},
          {t:"ui-skills-fixing-accessibility · Focus states", s:"synonyme « accessibilité »", score:81},
          {t:"ui-skills-fixing-motion-performance · Scroll", s:"contenu correspondant", score:63}
        ]
      },
      load: {
        q: 'load-capability  "elaya-design-landing-page-design"',
        rows: [
          {t:"Section chargée", s:"skill · 380 lignes utiles", sub:""},
          {t:"Provenance", s:"commit 1c1e97cb · licence MIT", sub:""},
          {t:"Contexte", s:"référence importée · autorité limitée", sub:""}
        ]
      }
    }
  }
}[LANG];
const DEMOS = COPY.demos;
const ORDER = ["list","search","load"];
let curDemo = 0, demoToken = 0, cycling = true;

async function playDemo(name){
  const token = ++demoToken;
  const q = $("#demoQ"), caret = $("#demoCaret"), rows = $("#demoRows");
  const d = DEMOS[name];
  rows.innerHTML = "";
  if (RM){ q.textContent = d.q; caret.style.display = "none"; }
  else {
    q.textContent = "";
    for (let i = 0; i < d.q.length; i++){
      if (token !== demoToken) return;
      q.textContent = d.q.slice(0, i+1);
      await sleep(26);
    }
    caret.style.display = "none";
  }
  await sleep(RM ? 0 : 300);
  for (const r of d.rows){
    if (token !== demoToken) return;
    const el = document.createElement("div");
    el.className = "regrow";
    let inner = `<div class="regrow-top"><strong></strong><span class="src"></span></div>`;
    if (r.score){
      inner += `<div class="score"><span class="bar"><i></i></span><span class="val"></span></div>`;
    } else if (r.sub){ inner += `<div class="sub"></div>`; }
    el.innerHTML = inner;
    el.querySelector("strong").textContent = r.t;
    el.querySelector(".src").textContent = r.s;
    if (r.score){
      el.querySelector(".val").textContent = (r.score/100).toFixed(2);
      rows.appendChild(el);
      requestAnimationFrame(() => { el.classList.add("on"); el.querySelector(".score .bar i").style.width = r.score + "%"; });
    } else {
      if (r.sub) el.querySelector(".sub").textContent = r.sub;
      rows.appendChild(el);
      requestAnimationFrame(() => el.classList.add("on"));
    }
    await sleep(RM ? 0 : 340);
  }
}
function selectTab(name){
  $$(".regwin-tab").forEach(t => t.setAttribute("aria-selected", String(t.dataset.demo === name)));
}
$$(".regwin-tab").forEach(t => t.addEventListener("click", () => {
  cycling = false;
  selectTab(t.dataset.demo);
  playDemo(t.dataset.demo);
}));
(async () => {
  for (;;){
    const name = ORDER[curDemo % ORDER.length];
    selectTab(name);
    await playDemo(name);
    await sleep(RM ? 6000 : 5200);
    curDemo++;
    if (!cycling && !RM) { cycling = true; curDemo = ORDER.indexOf(name) + 1; }
    if (RM) break;
  }
  if (RM){ /* static: show full search demo */ selectTab("search"); }
})();

/* ── problem figure : before / after MCPIMP ── */
(() => {
  const fig = $("#probFig");
  if (!fig) return;
  fig.dataset.state = "before";
  if (RM) return;
  setInterval(() => {
    fig.dataset.state = fig.dataset.state === "before" ? "after" : "before";
  }, 5200);
})();

/* ── hub tools pulse ── */
$$(".agent").forEach(a => {
  const c = a.querySelector(".txt");
  if (c) c.textContent = (a.querySelectorAll(".stack>i").length - 1) + "+";
});
if (!RM){
  const tools = [...$$("#hubTools .hub-tool")];
  let ht = 0;
  setInterval(() => {
    tools.forEach(t => t.classList.remove("lit"));
    tools[ht % tools.length].classList.add("lit");
    ht++;
  }, 1400);
}

/* ── tagline word reveal ── */
$$(".tagline-txt").forEach(tag => {
  const words = tag.textContent.trim().split(/\s+/);
  tag.textContent = "";
  words.forEach((w, i) => {
    const s = document.createElement("span");
    s.className = "word"; s.textContent = w;
    tag.append(s, document.createTextNode(i === words.length-1 ? "" : " "));
  });
  if (!RM && "IntersectionObserver" in window){
    const wo = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      setTimeout(() => e.target.classList.add("active"), Number(e.target.dataset.i) * 52);
      wo.unobserve(e.target);
    }), {threshold:.9, rootMargin:"0px 0px -18%"});
    tag.querySelectorAll(".word").forEach((w, i) => { w.dataset.i = i; wo.observe(w); });
  } else tag.querySelectorAll(".word").forEach(w => w.classList.add("active"));
});

/* ── sync viz loop ── */
(() => {
  const body = $("#syncBody");
  if (!body) return;
  const LINES = COPY.syncLines;
  const render = (n) => {
    body.innerHTML = "";
    LINES.slice(0, n).forEach(l => {
      const d = document.createElement("div");
      d.className = "sync-line on " + l.cls;
      d.innerHTML = l.h;
      body.appendChild(d);
    });
  };
  if (RM){ render(LINES.length); return; }
  (async () => {
    for (;;){
      body.innerHTML = "";
      for (let i = 0; i < LINES.length; i++){
        const d = document.createElement("div");
        d.className = "sync-line " + LINES[i].cls;
        d.innerHTML = LINES[i].h;
        body.appendChild(d);
        requestAnimationFrame(() => d.classList.add("on"));
        await sleep(480);
      }
      await sleep(3400);
    }
  })();
})();

/* ── tagline three.js background ── */
function buildWave(cv, opts){
  if (typeof THREE === "undefined") return;
  const {lineColor, lineOp, ptColor, ptOp, ptSize, beaconN, beaconOp, rotSpeed, waveAmp} = opts;
  const sec = cv.parentElement;
  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, .1, 100);
  cam.position.set(0, 2.4, 8);
  cam.lookAt(0, -.4, 0);

  const COLS = 76, ROWS = 30, W = 20, D = 10, N = COLS * ROWS;
  const wave = (ix, iz, t) => (Math.sin(ix * .32 + t * 1.9) * .22 + Math.cos(iz * .42 + t * 1.3) * .18) * waveAmp;
  const px = ix => (ix / (COLS - 1) - .5) * W;
  const pz = iz => (iz / (ROWS - 1) - .5) * D;

  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({color: ptColor, size: ptSize, transparent: true, opacity: ptOp})));

  const segN = ROWS * (COLS - 1) + COLS * (ROWS - 1);
  const lpos = new Float32Array(segN * 2 * 3);
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
  scene.add(new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({color: lineColor, transparent: true, opacity: lineOp})));

  const bpos = new Float32Array(beaconN * 3), bseed = [];
  for (let i = 0; i < beaconN; i++){ bseed.push({x: Math.random(), z: Math.random(), p: Math.random() * 6.28}); }
  const bgeo = new THREE.BufferGeometry();
  bgeo.setAttribute("position", new THREE.BufferAttribute(bpos, 3));
  const bmat = new THREE.PointsMaterial({color: 0xc9ff3d, size: .1, transparent: true, opacity: beaconOp});
  scene.add(new THREE.Points(bgeo, bmat));

  function fill(t){
    for (let i = 0; i < N; i++){
      const ix = i % COLS, iz = (i / COLS) | 0;
      pos[i*3] = px(ix); pos[i*3+1] = wave(ix, iz, t); pos[i*3+2] = pz(iz);
    }
    geo.attributes.position.needsUpdate = true;
    let k = 0;
    const put = (ix, iz) => { lpos[k++] = px(ix); lpos[k++] = wave(ix, iz, t); lpos[k++] = pz(iz); };
    for (let iz = 0; iz < ROWS; iz++) for (let ix = 0; ix < COLS - 1; ix++){ put(ix, iz); put(ix + 1, iz); }
    for (let ix = 0; ix < COLS; ix++) for (let iz = 0; iz < ROWS - 1; iz++){ put(ix, iz); put(ix, iz + 1); }
    lgeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < beaconN; i++){
      const s = bseed[i];
      bpos[i*3] = (s.x - .5) * W * .92;
      bpos[i*3+1] = Math.sin(t * 1.6 + s.p) * .3 + .15;
      bpos[i*3+2] = (s.z - .5) * D * .92;
    }
    bgeo.attributes.position.needsUpdate = true;
    bmat.opacity = beaconOp * (.7 + Math.sin(t * 2.2) * .3);
  }

  function resize(){
    const w = sec.clientWidth, h = sec.clientHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  resize(); addEventListener("resize", resize);

  let t = 0;
  function frame(){ t += .008; fill(t); scene.rotation.y = Math.sin(t * .22) * rotSpeed; renderer.render(scene, cam); }
  if (RM){ frame(); return; }
  renderer.setAnimationLoop(frame);
  if ("IntersectionObserver" in window){
    new IntersectionObserver(es => es.forEach(e =>
      renderer.setAnimationLoop(e.isIntersecting ? frame : null)
    ), {threshold: 0}).observe(sec);
  }
}
/* ── hero three.js : sphère connectée à ses satellites ── */
function buildConstellation(cv, opts){
  if (typeof THREE === "undefined") return;
  const {op, nodeColor, accentOp, nodeSize, satN, arcOp, rotSpeed} = opts;
  const sec = cv.parentElement;
  const renderer = new THREE.WebGLRenderer({canvas: cv, antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 1, .1, 100);
  cam.position.set(0, 0, 11);
  cam.lookAt(0, 0, 0);

  const group = new THREE.Group();
  group.position.set(4.4, .8, 2.4); // sphère décalée à droite, derrière la fenêtre
  scene.add(group);

  const R = 3.4, K = 150;
  const pts = [], lpos = [];
  const P = (i, j) => {
    const phi = (i / 15) * Math.PI * 2, th = (j / 21) * Math.PI;
    return [R * Math.sin(th) * Math.cos(phi), R * Math.cos(th), R * Math.sin(th) * Math.sin(phi)];
  };
  for (let j = 0; j <= 21; j++) for (let i = 0; i <= 15; i++){ pts.push(...P(i, j)); }
  for (let j = 0; j < 21; j++) for (let i = 0; i < 15; i++){
    lpos.push(...P(i, j), ...P(i + 1, j));          // parallèles
    lpos.push(...P(i, j), ...P(i, j + 1));          // méridiens
  }
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  group.add(new THREE.Points(spGeo, new THREE.PointsMaterial({color: 0x9a9a93, size: .055, transparent: true, opacity: op * 1.2})));
  const slGeo = new THREE.BufferGeometry();
  slGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lpos), 3));
  group.add(new THREE.LineSegments(slGeo, new THREE.LineBasicMaterial({color: nodeColor, transparent: true, opacity: op * .75})));

  // satellites en orbite + arcs de connexion
  const sats = [], satGeoArr = [], arcGeoArr = [], pulses = [];
  for (let s = 0; s < satN; s++){
    const o = {
      a: Math.random() * Math.PI * 2,          // angle de départ
      b: (Math.random() - .5) * Math.PI * .8,  // inclinaison
      d: R + 1.6 + Math.random() * 2.2,        // distance
      sp: .12 + Math.random() * .22,           // vitesse
      tilt: Math.random() * Math.PI
    };
    sats.push(o);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    const isAccent = s % 3 === 0;
    group.add(new THREE.Points(g, new THREE.PointsMaterial({
      color: isAccent ? 0xc9ff3d : 0xbdbdb4, size: isAccent ? nodeSize * 1.5 : nodeSize,
      transparent: true, opacity: isAccent ? accentOp : op * 1.15
    })));
    satGeoArr.push(g);

    // arc entre la surface de la sphère et le satellite
    const SEG = 24;
    const ag = new THREE.BufferGeometry();
    ag.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEG + 1) * 3), 3));
    group.add(new THREE.Line(ag, new THREE.LineBasicMaterial({
      color: isAccent ? 0xc9ff3d : nodeColor, transparent: true, opacity: isAccent ? arcOp * 1.4 : arcOp
    })));
    arcGeoArr.push(ag);

    // impulsion qui voyage le long de l'arc
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
    const pm = new THREE.Points(pg, new THREE.PointsMaterial({color: 0xc9ff3d, size: nodeSize * 1.7, transparent: true, opacity: 0}));
    group.add(pm);
    pulses.push({g: pg, m: pm.material, off: Math.random(), sp: .14 + Math.random() * .12, arc: ag, seg: SEG, o});
  }

  function satPos(o, t){
    const a = o.a + t * o.sp, b = o.b + Math.sin(t * .21 + o.tilt) * .16;
    return new THREE.Vector3(o.d * Math.cos(b) * Math.cos(a), o.d * Math.sin(b), o.d * Math.cos(b) * Math.sin(a));
  }
  function arcPoint(o, t, u, out){
    const sat = satPos(o, t);
    const surf = sat.clone().normalize().multiplyScalar(R * .98);
    const mid = sat.clone().normalize().multiplyScalar((R + o.d) * .62);
    // bézier quadratique surf -> mid -> sat
    const v = 1 - u;
    out.set(
      v * v * surf.x + 2 * v * u * mid.x + u * u * sat.x,
      v * v * surf.y + 2 * v * u * mid.y + u * u * sat.y,
      v * v * surf.z + 2 * v * u * mid.z + u * u * sat.z
    );
    return out;
  }
  const tmp = new THREE.Vector3();
  function fill(t){
    sats.forEach((o, i) => {
      const p = satPos(o, t), arr = satGeoArr[i].attributes.position.array;
      arr[0] = p.x; arr[1] = p.y; arr[2] = p.z;
      satGeoArr[i].attributes.position.needsUpdate = true;
      const aarr = arcGeoArr[i].attributes.position.array, SEG = pulses[i].seg;
      for (let k = 0; k <= SEG; k++){
        arcPoint(o, t, k / SEG, tmp);
        aarr[k * 3] = tmp.x; aarr[k * 3 + 1] = tmp.y; aarr[k * 3 + 2] = tmp.z;
      }
      arcGeoArr[i].attributes.position.needsUpdate = true;
    });
    pulses.forEach(pl => {
      const u = (t * pl.sp + pl.off) % 1;
      arcPoint(pl.o, t, u, tmp);
      const arr = pl.g.attributes.position.array;
      arr[0] = tmp.x; arr[1] = tmp.y; arr[2] = tmp.z;
      pl.g.attributes.position.needsUpdate = true;
      pl.m.opacity = accentOp * 1.3 * Math.sin(u * Math.PI);
    });
  }

  function resize(){
    const w = sec.clientWidth, h = sec.clientHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    group.position.x = w < 1024 ? 0 : 4.4;
    group.position.y = w < 1024 ? 3.8 : .8;
    group.scale.setScalar(w < 1024 ? .9 : 1);
  }
  resize(); addEventListener("resize", resize);

  let t = Math.random() * 40;
  function frame(){ t += .008; fill(t); group.rotation.y = t * rotSpeed; group.rotation.x = Math.sin(t * .1) * .08; renderer.render(scene, cam); }
  if (RM){ frame(); return; }
  renderer.setAnimationLoop(frame);
  if ("IntersectionObserver" in window){
    new IntersectionObserver(es => es.forEach(e =>
      renderer.setAnimationLoop(e.isIntersecting ? frame : null)
    ), {threshold: 0}).observe(sec);
  }
}
addEventListener("load", () => {
  const heroCv = document.getElementById("heroCanvas");
  if (heroCv) buildConstellation(heroCv, {op: .42, nodeColor: 0x4a4a44, accentOp: .85, nodeSize: .075, satN: 14, arcOp: .22, rotSpeed: .05});
  const tagCv = document.getElementById("tagCanvas");
  if (tagCv) buildWave(tagCv, {lineColor: 0x2e2e2e, lineOp: .55, ptColor: 0x9a9a93, ptOp: .5, ptSize: .035, beaconN: 30, beaconOp: .9, rotSpeed: .12, waveAmp: 1});
});

/* ── copy buttons ── */
$$(".copy-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const label = btn.querySelector("span");
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch(e){}
    btn.classList.add("ok"); label.textContent = COPY.copied;
    setTimeout(() => { btn.classList.remove("ok"); label.textContent = COPY.copy; }, 1600);
  });
});

/* ── faq ── */
$$(".faq-q").forEach(btn => {
  btn.addEventListener("click", () => btn.setAttribute("aria-expanded", String(btn.getAttribute("aria-expanded") !== "true")));
});
})();
