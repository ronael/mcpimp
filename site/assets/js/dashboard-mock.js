/* ─── données d'exemple (dans dashboard.ts : sérialisées par le serveur) ─── */
window.__MCPIMP__ = [
  { id:"landing-page", name:"landing-page", cid:"local/landing-page", desc:"Méthode complète pour concevoir une landing page qui convertit : structure, preuve, hiérarchie visuelle.",
    imported:false, kind:"portable", sync:"", files:3,
    fileList:[
      {uri:"skill://landing-page/SKILL.md", type:"skill", size:"212"},
      {uri:"skill://landing-page/references/checklist.md", type:"reference", size:"148"},
      {uri:"skill://landing-page/references/copywriting.md", type:"reference", size:"96"}
    ], prov:[], skipped:0,
    refFiles:[{uri:"skill://landing-page/references/checklist.md", size:"148"}],
    refLinks:[{title:"Référence rapide WCAG 2.2", url:"https://www.w3.org/WAI/WCAG22/quickref/", sourcePath:"references/checklist.md"}] },

  { id:"copywriting-fr", name:"copywriting-fr", cid:"local/copywriting-fr", desc:"Formules de copywriting en français : accroches, CTA, pages de vente.",
    imported:false, kind:"portable", sync:"", files:2,
    fileList:[
      {uri:"skill://copywriting-fr/SKILL.md", type:"skill", size:"132"},
      {uri:"skill://copywriting-fr/references/formules.md", type:"reference", size:"88"}
    ], prov:[], skipped:0, refFiles:[], refLinks:[] },

  { id:"mcp-amont", name:"mcp-amont", cid:"local/mcp-amont", desc:"Proxy vers un serveur MCP amont : ses outils sont exposés sous le préfixe amont.*, secrets référencés via env:.",
    imported:false, kind:"config", sync:"", files:3,
    fileList:[
      {uri:"skill://mcp-amont/mcp.json", type:"config", size:"18"},
      {uri:"skill://mcp-amont/SKILL.md", type:"skill", size:"64"},
      {uri:"skill://mcp-amont/references/outils.md", type:"reference", size:"92"}
    ], prov:[], skipped:0, refFiles:[], refLinks:[] },

  { id:"brand-voice", name:"brand-voice", cid:"local/brand-voice", desc:"Ton éditorial de la marque : vocabulaire, tournures à éviter, exemples avant/après.",
    imported:false, kind:"portable", sync:"", files:2,
    fileList:[
      {uri:"skill://brand-voice/SKILL.md", type:"skill", size:"74"},
      {uri:"skill://brand-voice/references/exemples.md", type:"reference", size:"51"}
    ], prov:[], skipped:0, refFiles:[], refLinks:[] },

  { id:"ui-skills-improve-ui", name:"improve-ui", cid:"ui-skills/improve-ui", desc:"Audit et amélioration d'interfaces existantes : contraste, espacement, états, micro-interactions.",
    imported:true, kind:"portable", sync:"2026-08-18 14:32", files:5,
    fileList:[
      {uri:"skill://ui-skills-improve-ui/SKILL.md", type:"skill", size:"184"},
      {uri:"skill://ui-skills-improve-ui/references/checklist.md", type:"reference", size:"121"},
      {uri:"skill://ui-skills-improve-ui/references/motion.md", type:"reference", size:"87"},
      {uri:"skill://ui-skills-improve-ui/mcpimp-notes.md", type:"override", size:"24"},
      {uri:"skill://ui-skills-improve-ui/assets/palette.png", type:"asset", size:"142 308 B", binary:true}
    ],
    prov:[["Source","github · ibelick/ui-skills/skills/improve-ui"],["Ref","main"],["Commit","1c1e97cb2d4a"],["Content hash","sha256:9f2c…e771"],["Licence","MIT"],["Politique d'update","review"],["Dernière synchro","2026-08-18 14:32"]],
    skipped:0,
    refFiles:[{uri:"skill://ui-skills-improve-ui/references/checklist.md", size:"121"},{uri:"skill://ui-skills-improve-ui/references/motion.md", size:"87"}],
    refLinks:[
      {title:"ibelick.com — journal", url:"https://ibelick.com", sourcePath:"references/checklist.md"},
      {title:"Référence rapide WCAG 2.2", url:"https://www.w3.org/WAI/WCAG22/quickref/", sourcePath:"references/checklist.md"},
      {title:"Motion — docs", url:"https://motion.dev", sourcePath:"references/motion.md"}
    ] },

  { id:"ui-skills-baseline-ui", name:"baseline-ui", cid:"ui-skills/baseline-ui", desc:"Fondations d'une interface propre : grille, typographie, échelle d'espacement.",
    imported:true, kind:"portable", sync:"2026-08-18 14:32", files:4,
    fileList:[
      {uri:"skill://ui-skills-baseline-ui/SKILL.md", type:"skill", size:"156"},
      {uri:"skill://ui-skills-baseline-ui/references/grid.md", type:"reference", size:"77"},
      {uri:"skill://ui-skills-baseline-ui/references/type-scale.md", type:"reference", size:"64"},
      {uri:"skill://ui-skills-baseline-ui/references/spacing.md", type:"reference", size:"58"}
    ],
    prov:[["Source","github · ibelick/ui-skills/skills/baseline-ui"],["Ref","main"],["Commit","1c1e97cb2d4a"],["Licence","MIT"],["Politique d'update","review"],["Dernière synchro","2026-08-18 14:32"]],
    skipped:0, refFiles:[], refLinks:[] },

  { id:"ui-skills-fixing-accessibility", name:"fixing-accessibility", cid:"ui-skills/fixing-accessibility", desc:"Corriger l'accessibilité d'une page : focus, contrastes, ARIA, navigation clavier.",
    imported:true, kind:"portable", sync:"2026-08-18 14:32", files:4,
    fileList:[
      {uri:"skill://ui-skills-fixing-accessibility/SKILL.md", type:"skill", size:"203"},
      {uri:"skill://ui-skills-fixing-accessibility/references/aria.md", type:"reference", size:"112"},
      {uri:"skill://ui-skills-fixing-accessibility/references/contrast.md", type:"reference", size:"49"},
      {uri:"skill://ui-skills-fixing-accessibility/references/keyboard.md", type:"reference", size:"71"}
    ],
    prov:[["Source","github · ibelick/ui-skills/skills/fixing-accessibility"],["Ref","main"],["Commit","1c1e97cb2d4a"],["Licence","MIT"],["Politique d'update","review"],["Dernière synchro","2026-08-18 14:32"]],
    skipped:0, refFiles:[], refLinks:[] },

  { id:"addy-web-perf", name:"web-perf", cid:"addy/web-perf", desc:"Audit de performance web : budgets, Core Web Vitals, analyse du bundle et pistes d'optimisation.",
    imported:true, kind:"executable", sync:"2026-08-20 09:14", files:6,
    fileList:[
      {uri:"skill://addy-web-perf/SKILL.md", type:"skill", size:"231"},
      {uri:"skill://addy-web-perf/references/budgets.md", type:"reference", size:"104"},
      {uri:"skill://addy-web-perf/references/vitals.md", type:"reference", size:"142"},
      {uri:"skill://addy-web-perf/scripts/analyze.py", type:"script", size:"316"},
      {uri:"skill://addy-web-perf/scripts/lighthouse.sh", type:"script", size:"28"},
      {uri:"skill://addy-web-perf/assets/report-template.html", type:"asset", size:"412"}
    ],
    prov:[["Source","github · addyosmani/agent-skills/skills/web-perf"],["Ref","main"],["Commit","9a3f21c8e0b1"],["Content hash","sha256:41bd…09ac"],["Licence","Apache-2.0"],["Politique d'update","auto"],["Dernière synchro","2026-08-20 09:14"]],
    skipped:2,
    refFiles:[{uri:"skill://addy-web-perf/references/vitals.md", size:"142"}],
    refLinks:[{title:"web.dev — Core Web Vitals", url:"https://web.dev/articles/vitals", sourcePath:"references/vitals.md"}] },

  { id:"emil-skill", name:"emil-skill", cid:"emil/skill", desc:"Micro-interactions et animations d'interface : timing, easing, feedback tactile.",
    imported:true, kind:"portable", sync:"2026-08-15 11:02", files:2,
    fileList:[
      {uri:"skill://emil-skill/SKILL.md", type:"skill", size:"97"},
      {uri:"skill://emil-skill/references/easings.md", type:"reference", size:"45"}
    ],
    prov:[["Source","github · emilkowalski/skill"],["Ref","main"],["Commit","b7d04aa19c55"],["Licence","MIT"],["Politique d'update","review"],["Dernière synchro","2026-08-15 11:02"]],
    skipped:0, refFiles:[], refLinks:[] },

  { id:"matt-pocock-codebase-design", name:"codebase-design", cid:"matt-pocock/codebase-design", desc:"Organisation d'un codebase TypeScript : modules, frontières, conventions de nommage.",
    imported:true, kind:"portable", sync:"2026-08-10 17:45", files:5,
    fileList:[
      {uri:"skill://matt-pocock-codebase-design/SKILL.md", type:"skill", size:"168"},
      {uri:"skill://matt-pocock-codebase-design/references/modules.md", type:"reference", size:"133"},
      {uri:"skill://matt-pocock-codebase-design/references/naming.md", type:"reference", size:"81"},
      {uri:"skill://matt-pocock-codebase-design/references/boundaries.md", type:"reference", size:"94"},
      {uri:"skill://matt-pocock-codebase-design/references/examples.md", type:"reference", size:"120"}
    ],
    prov:[["Source","github · mattpocock/skills/codebase-design"],["Ref","v2.1.0"],["Commit","e55c17f2a930"],["Licence","MIT"],["Politique d'update","manual"],["Dernière synchro","2026-08-10 17:45"]],
    skipped:0, refFiles:[], refLinks:[] },

  { id:"ui-ux-pro-max", name:"ui-ux-pro-max", cid:"ui-ux-pro-max/ui-ux-pro-max", desc:"Pack UI/UX complet : audit, wireframes, design system. Attend ${CLAUDE_PLUGIN_ROOT}.",
    imported:true, kind:"platform-specific", sync:"2026-08-12 08:31", files:8,
    fileList:[
      {uri:"skill://ui-ux-pro-max/SKILL.md", type:"skill", size:"274"},
      {uri:"skill://ui-ux-pro-max/references/audit.md", type:"reference", size:"145"},
      {uri:"skill://ui-ux-pro-max/references/wireframes.md", type:"reference", size:"98"},
      {uri:"skill://ui-ux-pro-max/references/design-system.md", type:"reference", size:"187"},
      {uri:"skill://ui-ux-pro-max/assets/cover.png", type:"asset", size:"96 412 B", binary:true},
      {uri:"skill://ui-ux-pro-max/assets/grid.png", type:"asset", size:"61 208 B", binary:true},
      {uri:"skill://ui-ux-pro-max/scripts/scaffold.sh", type:"script", size:"42"},
      {uri:"skill://ui-ux-pro-max/references/checklist.md", type:"reference", size:"76"}
    ],
    prov:[["Source","github · nextlevelbuilder/ui-ux-pro-max-skill"],["Découverte via","web-catalog · agent-design.com/skills"],["Ref","main"],["Commit","c02fe88d1b7a"],["Licence","MIT"],["Politique d'update","review"],["Dernière synchro","2026-08-12 08:31"]],
    skipped:0, refFiles:[], refLinks:[] },

  { id:"saas-pricing", name:"saas-pricing", cid:"saas/pricing", desc:"Concevoir une page pricing SaaS : ancres de prix, plans, objections, FAQ commerciale.",
    imported:true, kind:"resource-dependent", sync:"2026-08-19 16:20", files:6,
    fileList:[
      {uri:"skill://saas-pricing/SKILL.md", type:"skill", size:"189"},
      {uri:"skill://saas-pricing/references/psychologie-prix.md", type:"reference", size:"112"},
      {uri:"skill://saas-pricing/references/objections.md", type:"reference", size:"67"},
      {uri:"skill://saas-pricing/data/benchmarks.csv", type:"asset", size:"58"},
      {uri:"skill://saas-pricing/data/plans.json", type:"asset", size:"34"},
      {uri:"skill://saas-pricing/assets/pricing-table.svg", type:"asset", size:"12 940 B", binary:true}
    ],
    prov:[["Source","github · exemple/saas-skills/skills/pricing"],["Ref","main"],["Commit","7a1c90be04dd"],["Licence","CC-BY-4.0"],["Politique d'update","auto"],["Dernière synchro","2026-08-19 16:20"]],
    skipped:0, refFiles:[], refLinks:[] }
];

/* ─── logique console (partagée avec dashboard.ts) ─── */
(function(){
  var DATA = window.__MCPIMP__ || [];
  var state = { q:"", origin:"all", kind:"all", sort:"name" };

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
    });
  }

  function kindChipCls(kind){
    if(kind === "portable") return "ok";
    if(kind === "resource-dependent") return "info";
    if(kind === "executable") return "warn";
    if(kind === "platform-specific") return "err";
    return "plain";
  }
  function fileChipCls(type, binary){
    if(binary) return "warn";
    if(type === "skill") return "ok";
    if(type === "reference") return "vio";
    if(type === "script") return "warn";
    if(type === "config") return "info";
    return "plain";
  }

  /* ── vues ── */
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  function currentView(){
    var h = (location.hash || "#overview").slice(1);
    return views.some(function(v){ return v.dataset.view === h; }) ? h : "overview";
  }
  function applyView(){
    var v = currentView();
    views.forEach(function(el){ el.classList.toggle("on", el.dataset.view === v); });
    navLinks.forEach(function(a){ a.classList.toggle("act", a.getAttribute("data-nav") === v); });
  }
  window.addEventListener("hashchange", applyView);
  applyView();

  /* ── recherche globale (sidebar) → pilote la vue capabilities ── */
  var gs = document.getElementById("globalSearch");
  var cs = document.getElementById("capSearch");
  if(gs){
    gs.addEventListener("input", function(){
      state.q = gs.value.trim().toLowerCase();
      if(cs) cs.value = gs.value;
      if(currentView() !== "capabilities") location.hash = "#capabilities";
      renderRows();
    });
  }
  document.addEventListener("keydown", function(e){
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); (gs || cs).focus(); }
    else if(e.key === "/" && document.activeElement.tagName !== "INPUT"){ e.preventDefault(); (gs || cs).focus(); }
    else if(e.key === "Escape"){ closeDrawer(); }
  });

  /* ── filtres ── */
  var kindSel = document.getElementById("kindSel");
  if(kindSel){
    var kinds = [];
    DATA.forEach(function(c){ if(c.kind && kinds.indexOf(c.kind) < 0) kinds.push(c.kind); });
    kinds.sort();
    kinds.forEach(function(k){
      var o = document.createElement("option");
      o.value = k; o.textContent = k;
      kindSel.appendChild(o);
    });
    kindSel.addEventListener("change", function(){ state.kind = kindSel.value; renderRows(); });
  }
  var originChips = document.getElementById("originChips");
  if(originChips){
    originChips.addEventListener("click", function(e){
      var b = e.target.closest(".fchip"); if(!b) return;
      Array.prototype.forEach.call(originChips.children, function(c){ c.classList.remove("act"); });
      b.classList.add("act");
      state.origin = b.dataset.origin;
      renderRows();
    });
  }
  if(cs){ cs.addEventListener("input", function(){ state.q = cs.value.trim().toLowerCase(); if(gs) gs.value = cs.value; renderRows(); }); }
  var sortSel = document.getElementById("sortSel");
  if(sortSel){ sortSel.addEventListener("change", function(){ state.sort = sortSel.value; renderRows(); }); }

  function matches(c){
    if(state.origin === "local" && c.imported) return false;
    if(state.origin === "import" && !c.imported) return false;
    if(state.kind !== "all" && c.kind !== state.kind) return false;
    if(state.q){
      var hay = (c.name + " " + c.id + " " + c.cid + " " + (c.desc || "")).toLowerCase();
      if(hay.indexOf(state.q) < 0) return false;
    }
    return true;
  }
  function sortCaps(list){
    var l = list.slice();
    if(state.sort === "files") l.sort(function(a,b){ return b.files - a.files; });
    else if(state.sort === "sync") l.sort(function(a,b){ return (b.sync || "").localeCompare(a.sync || ""); });
    else l.sort(function(a,b){ return a.name.localeCompare(b.name); });
    return l;
  }

  /* ── table capabilities ── */
  var rowsEl = document.getElementById("capRows");
  var countEl = document.getElementById("resultCount");
  function renderRows(){
    if(!rowsEl) return;
    var list = sortCaps(DATA.filter(matches));
    if(countEl) countEl.innerHTML = "<b>" + list.length + "</b> / " + DATA.length + " capacités";
    if(!list.length){
      rowsEl.innerHTML = '<tr class="empty-row"><td colspan="6"><i class="ph ph-ghost"></i>Aucune capacité ne correspond à ces filtres.</td></tr>';
      return;
    }
    var html = "";
    list.forEach(function(c){
      var chips = '<span class="chip ' + (c.imported ? "info" : "") + ' plain">' + (c.imported ? "importé" : "locale") + "</span>";
      if(c.kind) chips += '<span class="chip ' + kindChipCls(c.kind) + ' plain">' + esc(c.kind) + "</span>";
      html += '<tr class="caprow" data-id="' + esc(c.id) + '" tabindex="0" role="button" aria-label="Ouvrir ' + esc(c.name) + '">'
        + '<td><div class="capname"><strong>' + esc(c.name) + "</strong><span class=\"cid\">" + esc(c.cid) + "</span></div></td>"
        + '<td><div class="capdesc">' + esc(c.desc || "") + "</div></td>"
        + "<td>" + chips + "</td>"
        + '<td class="num-c">' + c.files + "</td>"
        + '<td class="mono" style="color:var(--muted)">' + (c.sync ? esc(c.sync) : "—") + "</td>"
        + '<td><i class="ph ph-caret-right" aria-hidden="true"></i></td>'
        + "</tr>";
    });
    rowsEl.innerHTML = html;
  }
  renderRows();

  if(rowsEl){
    rowsEl.addEventListener("click", function(e){
      var tr = e.target.closest("tr.caprow"); if(tr) openDrawer(tr.dataset.id);
    });
    rowsEl.addEventListener("keydown", function(e){
      if(e.key !== "Enter" && e.key !== " ") return;
      var tr = e.target.closest("tr.caprow"); if(!tr) return;
      e.preventDefault(); openDrawer(tr.dataset.id);
    });
  }

  /* ── drawer ── */
  var drawer = document.getElementById("drawer");
  var backdrop = document.getElementById("backdrop");
  var drawerContent = document.getElementById("drawerContent");

  function fileRows(c){
    var html = "";
    c.fileList.forEach(function(f){
      html += "<tr><td class=\"mono\" style=\"white-space:normal;overflow-wrap:anywhere\">" + esc(f.uri) + "</td>"
        + '<td><span class="chip ' + fileChipCls(f.type, f.binary) + ' plain">' + esc(f.binary ? "binaire" : f.type) + "</span></td>"
        + '<td class="num-c">' + esc(f.size) + "</td></tr>";
    });
    return html;
  }
  function provGrid(c){
    if(!c.prov || !c.prov.length) return "";
    var cells = "";
    c.prov.forEach(function(p){ cells += '<div><div class="k">' + esc(p[0]) + '</div><div class="vv">' + esc(p[1]) + "</div></div>"; });
    var skipped = c.skipped > 0
      ? '<div class="note-inline"><i class="ph ph-warning"></i>' + c.skipped + " asset(s) binaire(s) référencé(s) mais non téléchargé(s) — voir <code>skippedAssets</code> dans <code>SOURCE.json</code>.</div>"
      : "";
    return '<div class="d-sec"><div class="cs-h"><i class="ph ph-seal-check"></i>Provenance</div><div class="prov">' + cells + "</div>" + skipped + "</div>";
  }
  function refsBlock(c){
    if((!c.refFiles || !c.refFiles.length) && (!c.refLinks || !c.refLinks.length)) return "";
    var files = "", links = "";
    (c.refFiles || []).forEach(function(f){ files += "<tr><td class=\"mono\" style=\"white-space:normal;overflow-wrap:anywhere\">" + esc(f.uri) + '</td><td class="num-c">' + esc(f.size) + "</td></tr>"; });
    (c.refLinks || []).forEach(function(l){ links += '<tr><td><a href="' + esc(l.url) + '" target="_blank" rel="noreferrer">' + esc(l.title) + '</a></td><td class="mono" style="white-space:normal;overflow-wrap:anywhere">' + esc(l.sourcePath) + "</td></tr>"; });
    if(!links) links = '<tr><td colspan="2">Aucun lien détecté dans les références.</td></tr>';
    return '<div class="d-sec"><div class="cs-h"><i class="ph ph-link"></i>Sources &amp; références</div>'
      + '<div class="tbl-wrap" style="margin-bottom:14px"><table class="tbl"><thead><tr><th>URI</th><th>Lignes</th></tr></thead><tbody>' + files + "</tbody></table></div>"
      + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Source</th><th>Fichier</th></tr></thead><tbody>' + links + "</tbody></table></div></div>";
  }

  function openDrawer(id){
    var c = DATA.filter(function(x){ return x.id === id; })[0];
    if(!c || !drawer) return;
    var chips = '<span class="chip ' + (c.imported ? "info" : "") + ' plain">' + (c.imported ? "importé" : "locale") + "</span>";
    if(c.kind) chips += '<span class="chip ' + kindChipCls(c.kind) + ' plain">' + esc(c.kind) + "</span>";
    drawerContent.innerHTML =
      '<div class="d-top"><span class="d-id">' + esc(c.id) + '</span><button class="d-close" id="dClose" aria-label="Fermer"><i class="ph ph-x"></i></button></div>'
      + '<div class="d-title">' + esc(c.name) + "</div>"
      + '<div class="d-chips">' + chips + "</div>"
      + '<p class="d-desc">' + esc(c.desc || "Pas de description.") + "</p>"
      + '<div class="d-sec"><div class="cs-h"><i class="ph ph-files"></i>Fichiers · ' + c.files + "</div>"
      + '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>URI</th><th>Type</th><th>Lignes</th></tr></thead><tbody>' + fileRows(c) + "</tbody></table></div></div>"
      + provGrid(c)
      + refsBlock(c);
    drawer.classList.add("on");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("on");
    document.body.style.overflow = "hidden";
    drawer.scrollTop = 0;
    document.getElementById("dClose").addEventListener("click", closeDrawer);
  }
  function closeDrawer(){
    if(!drawer) return;
    drawer.classList.remove("on");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("on");
    document.body.style.overflow = "";
  }
  if(backdrop) backdrop.addEventListener("click", closeDrawer);
})();
