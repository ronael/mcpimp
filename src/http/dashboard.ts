import { MCP_TOOLS } from "../mcp/tools";
import { UpstreamMcpGateway } from "../mcp/upstream";
import type { Capability, CapabilityFile, CapabilityRegistry } from "../registry/types";
import { DASHBOARD_COPY, type DashboardCopy, type DashboardLanguage } from "./dashboard-i18n";
import { DASHBOARD_STYLES } from "./dashboard-styles";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function anchorId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "section";
}

interface ReferenceLink {
  title: string;
  url: string;
  sourcePath: string;
}

interface DashboardData {
  capabilities: Capability[];
  resources: ReturnType<CapabilityRegistry["listResources"]>;
  upstreams: ReturnType<UpstreamMcpGateway["listUpstreams"]>;
}

function titleBefore(text: string, index: number): string | undefined {
  const before = text.slice(0, index);
  const headings = [...before.matchAll(/^#{2,3}\s+(.+)$/gm)];
  return headings.at(-1)?.[1]?.trim();
}

function uniqueLinks(links: ReferenceLink[]): ReferenceLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.sourcePath}:${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractReferenceLinks(file: CapabilityFile): ReferenceLink[] {
  const links: ReferenceLink[] = [];
  const text = file.text;
  if (!text) return links;

  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  const bareUrlPattern = /https?:\/\/[^\s)]+/g;

  for (const match of text.matchAll(markdownLinkPattern)) {
    links.push({
      title: match[1].trim(),
      url: match[2],
      sourcePath: file.path,
    });
  }

  for (const match of text.matchAll(bareUrlPattern)) {
    const url = match[0].replace(/[.,;:]$/, "");
    if (links.some((link) => link.url === url)) continue;

    links.push({
      title: titleBefore(text, match.index ?? 0) || url,
      url,
      sourcePath: file.path,
    });
  }

  return uniqueLinks(links);
}

function renderReferenceSources(capability: Capability, copy: DashboardCopy): string {
  const referenceFiles = capability.files.filter((file) => file.type === "reference");
  if (referenceFiles.length === 0) return "";

  const links = referenceFiles.flatMap(extractReferenceLinks);
  const referenceRows = referenceFiles
    .map(
      (file) => `<tr>
        <td><code>${escapeHtml(file.uri)}</code></td>
        <td>${file.lines}</td>
      </tr>`,
    )
    .join("");

  const linkRows =
    links.length > 0
      ? links
          .map(
            (link) => `<tr>
              <td><a href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.title)}</a></td>
              <td><code>${escapeHtml(link.sourcePath)}</code></td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="2">${escapeHtml(copy.noReferenceLinks)}</td></tr>`;

  return `<div class="references">
    <h3>${escapeHtml(copy.referencesTitle)}</h3>
    <div class="reference-grid">
      <div>
        <h4>${escapeHtml(copy.filesTitle)}</h4>
        <table>
          <thead><tr><th>${escapeHtml(copy.uri)}</th><th>${escapeHtml(copy.lines)}</th></tr></thead>
          <tbody>${referenceRows}</tbody>
        </table>
      </div>
      <div>
        <h4>${escapeHtml(copy.linksTitle)}</h4>
        <table>
          <thead><tr><th>${escapeHtml(copy.source)}</th><th>${escapeHtml(copy.file)}</th></tr></thead>
          <tbody>${linkRows}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderProvenance(capability: Capability, copy: DashboardCopy): string {
  const origin = capability.origin;
  if (!origin) return "";

  const location = [origin.repository, origin.path].filter(Boolean).join("/") || origin.url || origin.sourceId;
  const rows: [string, string | undefined][] = [
    [copy.provenanceRows.source, `${origin.type} · ${location}`],
    [copy.provenanceRows.ref, origin.ref],
    [copy.provenanceRows.commit, origin.commit || origin.revision?.value],
    [copy.provenanceRows.contentHash, origin.contentHash],
    [copy.provenanceRows.discoveredVia, origin.discoverySource ? `${origin.discoverySource.type} · ${origin.discoverySource.url}` : undefined],
    [copy.provenanceRows.license, [origin.license?.spdxId, origin.license?.url].filter(Boolean).join(" · ") || undefined],
    [copy.provenanceRows.skillKind, [origin.skillKind, ...(origin.skillTraits || [])].filter(Boolean).join(", ") || undefined],
    [copy.provenanceRows.updatePolicy, origin.update],
    [copy.provenanceRows.lastSync, origin.lastSyncedAt],
  ];

  const body = rows
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td><code>${escapeHtml(String(value))}</code></td></tr>`)
    .join("");

  const skipped =
    origin.skippedAssets && origin.skippedAssets.length > 0
      ? `<p>${escapeHtml(copy.skippedAssets(origin.skippedAssets.length))}</p>`
      : "";

  return `<div class="references">
    <h3>${escapeHtml(copy.provenanceTitle)}</h3>
    <table><tbody>${body}</tbody></table>
    ${skipped}
  </div>`;
}

function renderCapabilityResources(registry: CapabilityRegistry, copy: DashboardCopy): string {
  return registry
    .listCapabilities()
    .map((capability) => {
      const capabilityAnchor = `capability-${anchorId(capability.id)}`;
      const files = capability.files
        .map(
          (file) => `<tr>
            <td><code>${escapeHtml(file.uri)}</code></td>
            <td>${escapeHtml(file.type)}</td>
            <td>${file.binary ? `${file.bytes} B (${escapeHtml(copy.binary)})` : file.lines}</td>
          </tr>`,
        )
        .join("");

      const badge = capability.origin ? `<span class="badge">${escapeHtml(copy.imported)}</span>` : "";

      return `<section class="capability cap-detail" id="${escapeAttribute(capabilityAnchor)}" data-capability-card data-capability-id="${escapeAttribute(capability.id)}" data-capability-title="${escapeAttribute(capability.name)}" data-search="${escapeAttribute(`${capability.name} ${capability.id} ${capability.description}`)}">
        <header>
          <div>
            <h2>${escapeHtml(capability.name)} ${badge}</h2>
            <span class="cid">${escapeHtml(capability.id)}</span>
            <p>${escapeHtml(capability.description || copy.noDescription)}</p>
          </div>
          <strong>${capability.files.length} ${escapeHtml(copy.filesCount)}</strong>
        </header>
        <table>
          <thead>
            <tr><th>${escapeHtml(copy.uri)}</th><th>Type</th><th>${escapeHtml(copy.lines)}</th></tr>
          </thead>
          <tbody>${files}</tbody>
        </table>
        ${renderProvenance(capability, copy)}
        ${renderReferenceSources(capability, copy)}
      </section>`;
    })
    .join("");
}

function renderMobileNav(copy: DashboardCopy): string {
  return `<nav class="mtop" aria-label="${escapeAttribute(copy.navLabel)}">
    <span class="brand-mark">M</span>
    <a href="#overview" data-nav="overview" class="act">${escapeHtml(copy.nav.overview)}</a>
    <a href="#capabilities" data-nav="capabilities">${escapeHtml(copy.nav.capabilities)}</a>
    <a href="#upstreams" data-nav="upstreams">${escapeHtml(copy.nav.upstreams)}</a>
    <a href="#tools" data-nav="tools">${escapeHtml(copy.nav.tools)}</a>
  </nav>`;
}

function renderSidebar(data: DashboardData, copy: DashboardCopy, language: DashboardLanguage): string {
  const sourceGuidePath = language === "fr" ? "/fr/docs/sources.html" : "/docs/sources.html";
  const sitePath = language === "fr" ? "/fr/" : "/";

  return `<aside class="side">
    <a class="side-brand" href="#overview"><span class="brand-mark">M</span>MCPIMP<span class="sub">console</span></a>
    <div class="side-search">
      <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
      <input data-dashboard-search type="search" placeholder="${escapeAttribute(copy.searchPlaceholder)}" autocomplete="off" spellcheck="false">
      <kbd>/</kbd>
    </div>
    <div class="snav-label">Registry</div>
    <nav class="snav" aria-label="${escapeAttribute(copy.navLabel)}">
      <a href="#overview" data-nav="overview" class="act"><i class="ph ph-squares-four" aria-hidden="true"></i>${escapeHtml(copy.nav.overview)}</a>
      <a href="#capabilities" data-nav="capabilities"><i class="ph ph-circles-three-plus" aria-hidden="true"></i>${escapeHtml(copy.nav.capabilities)}<span class="cnt">${data.capabilities.length}</span></a>
      <a href="#upstreams" data-nav="upstreams"><i class="ph ph-network" aria-hidden="true"></i>${escapeHtml(copy.nav.upstreams)}<span class="cnt">${data.upstreams.length}</span></a>
      <a href="#tools" data-nav="tools"><i class="ph ph-wrench" aria-hidden="true"></i>${escapeHtml(copy.nav.tools)}<span class="cnt">${MCP_TOOLS.length + copy.endpoints.length}</span></a>
    </nav>
    <div class="snav-label">${escapeHtml(copy.linksLabel)}</div>
    <nav class="snav">
      <a href="${escapeAttribute(sourceGuidePath)}"><i class="ph ph-book-open" aria-hidden="true"></i>${escapeHtml(copy.sourceGuide)}</a>
      <a href="${escapeAttribute(sitePath)}"><i class="ph ph-arrow-up-right" aria-hidden="true"></i>${escapeHtml(copy.backToSite)}</a>
    </nav>
    <div class="side-foot">
      <span class="side-status">${escapeHtml(copy.localStatus)}</span>
      <p class="side-note">${escapeHtml(copy.localNote)}</p>
    </div>
  </aside>`;
}

function renderEndpointRows(copy: DashboardCopy): string {
  return copy.endpoints
    .map(
      (endpoint) => `<tr>
      <td><span class="method ${endpoint.method.toLowerCase()}">${escapeHtml(endpoint.method)}</span></td>
      <td class="mono">${escapeHtml(endpoint.path)}</td>
      <td>${endpoint.description}</td>
    </tr>`,
    )
    .join("");
}

function renderToolRows(): string {
  return MCP_TOOLS.map(
    (tool) => `<tr>
      <td class="mono"><a href="#tools">${escapeHtml(tool.name)}</a></td>
      <td>${escapeHtml(tool.description)}</td>
    </tr>`,
  ).join("");
}

function renderUpstreamRows(registry: CapabilityRegistry, copy: DashboardCopy): string {
  const gateway = new UpstreamMcpGateway(registry);
  const upstreams = gateway.listUpstreams();

  if (upstreams.length === 0) {
    return `<tr><td colspan="5">${escapeHtml(copy.noUpstreams)}</td></tr>`;
  }

  return upstreams
    .map(
      (upstream) => `<tr>
        <td class="mono"><a href="#capability-${escapeAttribute(anchorId(upstream.capabilityId))}">${escapeHtml(upstream.capabilityId)}</a></td>
        <td><span class="chip info plain">${escapeHtml(upstream.transport)}</span></td>
        <td>${renderStatusChip(upstream.status)}</td>
        <td class="mono wrap">${escapeHtml(upstream.url)}</td>
        <td>${upstream.missingEnv.map((name) => `<code>${escapeHtml(name)}</code>`).join(", ") || `<span class="muted">n/a</span>`}</td>
      </tr>`,
    )
    .join("");
}

function renderStatusChip(status: string): string {
  const variant = status === "ready" ? "ok" : status === "missing-env" ? "warn" : "err";
  return `<span class="chip ${variant}">${escapeHtml(status)}</span>`;
}

function skillKind(capability: Capability): string {
  if (capability.origin?.skillKind) return capability.origin.skillKind;
  if (capability.files.some((file) => file.type === "script")) return "executable";
  if (capability.files.some((file) => file.type === "asset" || file.type === "data")) return "resource-dependent";
  return "portable";
}

function lastSync(capability: Capability, copy: DashboardCopy): string {
  return capability.origin?.lastSyncedAt || copy.never;
}

function percent(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function renderStats(data: DashboardData, copy: DashboardCopy): string {
  const imported = data.capabilities.filter((capability) => capability.origin).length;
  const binaries = data.capabilities.flatMap((capability) => capability.files).filter((file) => file.binary).length;
  const alerts = data.upstreams.filter((upstream) => upstream.status !== "ready").length;

  return `<div class="stats">
    <div class="stat"><div class="s-ic"><i class="ph ph-circles-three-plus" aria-hidden="true"></i><span class="trend">${escapeHtml(copy.stats.imported(imported))}</span></div><span class="v">${data.capabilities.length}</span><span class="l">${escapeHtml(copy.stats.capabilities)}</span></div>
    <div class="stat"><div class="s-ic"><i class="ph ph-files" aria-hidden="true"></i><span class="trend">${escapeHtml(copy.stats.binaries(binaries))}</span></div><span class="v">${data.resources.length}</span><span class="l">${escapeHtml(copy.stats.resources)}</span></div>
    <div class="stat"><div class="s-ic"><i class="ph ph-wrench" aria-hidden="true"></i><span class="trend">${escapeHtml(copy.stats.jsonRpc)}</span></div><span class="v">${MCP_TOOLS.length}</span><span class="l">${escapeHtml(copy.stats.tools)}</span></div>
    <div class="stat"><div class="s-ic"><i class="ph ph-network" aria-hidden="true"></i><span class="trend">${escapeHtml(copy.stats.upstreamAlerts(alerts))}</span></div><span class="v">${data.upstreams.length}</span><span class="l">${escapeHtml(copy.stats.upstreams)}</span></div>
  </div>`;
}

function renderDistribution(data: DashboardData, copy: DashboardCopy): string {
  const total = data.capabilities.length;
  const imported = data.capabilities.filter((capability) => capability.origin).length;
  const local = total - imported;
  const kinds = new Map<string, number>();
  for (const capability of data.capabilities) {
    const kind = skillKind(capability);
    kinds.set(kind, (kinds.get(kind) || 0) + 1);
  }

  const rows = [
    { label: copy.localOrigin, count: local, color: "var(--acid)" },
    { label: copy.importedOrigin, count: imported, color: "var(--cyan)" },
    ...[...kinds.entries()].map(([label, count], index) => ({
      label,
      count,
      color: ["var(--acid)", "var(--amber)", "var(--cyan)", "var(--coral)", "var(--violet)"][index % 5],
    })),
  ];

  return `<div class="dist">
    ${rows
      .map((row) => {
        const ratio = percent(row.count, total);
        return `<div class="dist-row"><span class="dl">${escapeHtml(row.label)}</span><div class="dist-track"><i style="width:${ratio}%;background:${row.color}"></i></div><span class="dist-val">${row.count} · ${ratio}%</span></div>`;
      })
      .join("")}
  </div>`;
}

function renderDiscovery(copy: DashboardCopy): string {
  return `<div class="panel" id="discovery">
    <div class="p-h"><h2><i class="ph ph-radar" aria-hidden="true"></i>${escapeHtml(copy.discoveryTitle)}</h2><a class="p-meta" href="#discovery">registry -> tools -> agent</a></div>
    <div class="flow">
      ${copy.discoverySteps
        .map(
          (step, index) =>
            `<div class="step"><span class="n">${String(index + 1).padStart(2, "0")} ·</span><strong>${escapeHtml(step.title.replace(/^\d+\.\s*/, ""))}</strong><p>${step.body}</p></div>`,
        )
        .join("")}
    </div>
  </div>`;
}

function renderCapabilityRows(capabilities: Capability[], copy: DashboardCopy): string {
  return capabilities
    .map((capability) => {
      const kind = skillKind(capability);
      const origin = capability.origin ? "import" : "local";
      const search = `${capability.name} ${capability.id} ${capability.description} ${kind} ${origin}`;
      const capabilityAnchor = `capability-${anchorId(capability.id)}`;
      return `<tr class="caprow" data-capability-row data-drawer-target="${escapeAttribute(capabilityAnchor)}" tabindex="0" role="button" aria-label="${escapeAttribute(`${copy.details}: ${capability.name}`)}" data-search="${escapeAttribute(search)}" data-origin="${origin}" data-kind="${escapeAttribute(kind)}" data-name="${escapeAttribute(capability.name.toLowerCase())}" data-files="${capability.files.length}" data-sync="${escapeAttribute(capability.origin?.lastSyncedAt || "")}">
        <td><a class="capname" href="#capability-${escapeAttribute(anchorId(capability.id))}"><strong>${escapeHtml(capability.name)}</strong><span class="cid">${escapeHtml(capability.id)}</span></a></td>
        <td><span class="capdesc">${escapeHtml(capability.description || copy.noDescription)}</span></td>
        <td><span class="chip ${origin === "import" ? "info" : "ok"}">${escapeHtml(kind)}</span></td>
        <td class="num-c">${capability.files.length}</td>
        <td class="mono">${escapeHtml(lastSync(capability, copy))}</td>
        <td><button class="row-action" type="button" data-drawer-target="${escapeAttribute(capabilityAnchor)}">${escapeHtml(copy.details)}</button></td>
      </tr>`;
    })
    .join("");
}

function renderKindOptions(capabilities: Capability[]): string {
  return [...new Set(capabilities.map(skillKind))]
    .sort((a, b) => a.localeCompare(b))
    .map((kind) => `<option value="${escapeAttribute(kind)}">${escapeHtml(kind)}</option>`)
    .join("");
}

function renderDashboardScript(copy: DashboardCopy, totalCapabilities: number): string {
  return `<script>
(() => {
  const views = [...document.querySelectorAll("[data-view]")];
  const navLinks = [...document.querySelectorAll("[data-nav]")];
  const rows = [...document.querySelectorAll("[data-capability-row]")];
  const cards = [...document.querySelectorAll("[data-capability-card]")];
  const searches = [...document.querySelectorAll("[data-dashboard-search], #capSearch")];
  const originButtons = [...document.querySelectorAll("[data-origin-filter]")];
  const kindSelect = document.querySelector("#kindSel");
  const sortSelect = document.querySelector("#sortSel");
  const resultCount = document.querySelector("#resultCount");
  const emptyRow = document.querySelector("#emptyRow");
  const drawer = document.querySelector("#drawer");
  const backdrop = document.querySelector("#backdrop");
  const drawerContent = document.querySelector("#drawerContent");
  let query = "";
  let origin = "all";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, (char) => {
      if (char === "&") return "&amp;";
      if (char === "<") return "&lt;";
      if (char === ">") return "&gt;";
      return "&quot;";
    });
  }

  function showView(id) {
    const viewId = id && id.startsWith("capability-") ? "capabilities" : ["overview", "capabilities", "upstreams", "tools"].includes(id) ? id : "overview";
    views.forEach((view) => view.classList.toggle("on", view.dataset.view === viewId));
    navLinks.forEach((link) => link.classList.toggle("act", link.dataset.nav === viewId));
  }

  function openDrawer(targetId) {
    const source = document.getElementById(targetId);
    if (!source || !drawer || !drawerContent || !backdrop) return;
    const title = source.dataset.capabilityTitle || targetId;
    const id = source.dataset.capabilityId || targetId;
    drawerContent.innerHTML =
      '<div class="d-top"><span class="d-id">' + esc(id) + '</span><button class="d-close" type="button" aria-label="${escapeAttribute(copy.close)}"><i class="ph ph-x" aria-hidden="true"></i></button></div>' +
      '<div class="d-title">' + esc(title) + '</div>' +
      source.innerHTML;
    drawer.classList.add("on");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("on");
    document.body.style.overflow = "hidden";
    drawer.scrollTop = 0;
    drawerContent.querySelector(".d-close")?.addEventListener("click", closeDrawer);
  }

  function closeDrawer() {
    if (!drawer || !backdrop) return;
    drawer.classList.remove("on");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("on");
    document.body.style.overflow = "";
  }

  function syncSearch(value) {
    query = value.trim().toLowerCase();
    searches.forEach((input) => {
      if (input.value !== value) input.value = value;
    });
    filterRows();
  }

  function matches(row) {
    const textMatch = !query || row.dataset.search.toLowerCase().includes(query);
    const originMatch = origin === "all" || row.dataset.origin === origin;
    const kindMatch = !kindSelect || kindSelect.value === "all" || row.dataset.kind === kindSelect.value;
    return textMatch && originMatch && kindMatch;
  }

  function filterRows() {
    const sorted = [...rows].sort((a, b) => {
      if (!sortSelect || sortSelect.value === "name") return a.dataset.name.localeCompare(b.dataset.name);
      if (sortSelect.value === "files") return Number(b.dataset.files) - Number(a.dataset.files);
      return b.dataset.sync.localeCompare(a.dataset.sync);
    });
    const body = document.querySelector("#capRows");
    sorted.forEach((row) => body.append(row));
    let visible = 0;
    rows.forEach((row) => {
      const ok = matches(row);
      row.hidden = !ok;
      visible += ok ? 1 : 0;
    });
    cards.forEach((card) => {
      card.hidden = query ? !card.dataset.search.toLowerCase().includes(query) : false;
    });
    if (emptyRow) emptyRow.hidden = visible !== 0;
    if (resultCount) resultCount.innerHTML = "<b>" + visible + "</b> / ${totalCapabilities} ${escapeHtml(copy.stats.capabilities)}";
  }

  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    showView(id);
    if (id.startsWith("capability-")) openDrawer(id);
  });
  navLinks.forEach((link) => link.addEventListener("click", () => showView(link.dataset.nav)));
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-drawer-target]");
    if (!trigger) return;
    event.preventDefault();
    openDrawer(trigger.dataset.drawerTarget);
  });
  rows.forEach((row) => {
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDrawer(row.dataset.drawerTarget);
    });
  });
  backdrop?.addEventListener("click", closeDrawer);
  searches.forEach((input) => input.addEventListener("input", () => syncSearch(input.value)));
  originButtons.forEach((button) => {
    button.addEventListener("click", () => {
      origin = button.dataset.originFilter;
      originButtons.forEach((candidate) => candidate.classList.toggle("act", candidate === button));
      filterRows();
    });
  });
  kindSelect?.addEventListener("change", filterRows);
  sortSelect?.addEventListener("change", filterRows);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    } else if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
      event.preventDefault();
      searches[0]?.focus();
    }
  });
  showView(location.hash.slice(1));
  if (location.hash.slice(1).startsWith("capability-")) openDrawer(location.hash.slice(1));
  filterRows();
})();
</script>`;
}

export function renderDashboard(registry: CapabilityRegistry, language: DashboardLanguage = "en"): string {
  const capabilities = registry.listCapabilities();
  const resources = registry.listResources();
  const upstreams = new UpstreamMcpGateway(registry).listUpstreams();
  const data = { capabilities, resources, upstreams };
  const copy = DASHBOARD_COPY[language];

  return `<!doctype html>
<html lang="${escapeAttribute(copy.htmlLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(copy.title)}</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/geist@5.2.6/index.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/geist-mono@5.2.6/index.css">
  <script src="https://unpkg.com/@phosphor-icons/web@2.1.1" defer></script>
  <style>
${DASHBOARD_STYLES}
  </style>
</head>
<body>
  ${renderMobileNav(copy)}
  ${renderSidebar(data, copy, language)}

  <main class="main">
    <section class="view on" id="overview" data-view="overview">
      <div class="v-head">
        <div>
          <div class="kicker">${escapeHtml(copy.overviewKicker)}</div>
          <h1>${escapeHtml(copy.overviewTitle)}</h1>
          <p class="sub">${copy.intro}</p>
        </div>
      </div>
      ${renderStats(data, copy)}
      ${renderDiscovery(copy)}
      <div class="grid2">
        <section class="panel">
          <div class="p-h"><h2><i class="ph ph-chart-pie-slice" aria-hidden="true"></i>${escapeHtml(copy.distributionTitle)}</h2><span class="p-meta">${escapeHtml(copy.distributionMeta)}</span></div>
          ${renderDistribution(data, copy)}
        </section>
        <section class="panel" id="quick-test">
          <div class="p-h"><h2><i class="ph ph-terminal" aria-hidden="true"></i>${escapeHtml(copy.quickTestTitle)}</h2><span class="p-meta">${escapeHtml(copy.quickTestMeta)}</span></div>
          <div class="term">
            <div class="term-bar"><span class="dots"><i></i><i></i><i></i></span><span>zsh — localhost:3901</span></div>
            <pre><span class="jp">$</span> curl -sS http://localhost:3901/message \\
  -H <span class="js">'content-type: application/json'</span> \\
  -d <span class="js">'{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list-capabilities","arguments":{}}}'</span></pre>
          </div>
        </section>
      </div>
    </section>

    <section class="view" id="capabilities" data-view="capabilities">
      <div class="v-head">
        <div>
          <div class="kicker">${escapeHtml(copy.capabilitiesKicker)}</div>
          <h1>${escapeHtml(copy.capabilitiesTitle)}</h1>
          <p class="sub">${escapeHtml(copy.capabilitiesIntro)}</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="searchbox">
          <i class="ph ph-magnifying-glass" aria-hidden="true"></i>
          <input id="capSearch" type="search" placeholder="${escapeAttribute(copy.capabilitiesSearchPlaceholder)}" autocomplete="off" spellcheck="false">
        </div>
        <div class="fchips">
          <button class="fchip act" data-origin-filter="all">${escapeHtml(copy.allOrigins)}</button>
          <button class="fchip" data-origin-filter="local">${escapeHtml(copy.localOrigin)}</button>
          <button class="fchip" data-origin-filter="import">${escapeHtml(copy.importedOrigin)}</button>
        </div>
        <select class="sel" id="kindSel" aria-label="${escapeAttribute(copy.capabilityHeaders.type)}">
          <option value="all">${escapeHtml(copy.allTypes)}</option>
          ${renderKindOptions(capabilities)}
        </select>
        <select class="sel" id="sortSel" aria-label="${escapeAttribute(copy.sortName)}">
          <option value="name">${escapeHtml(copy.sortName)}</option>
          <option value="files">${escapeHtml(copy.sortFiles)}</option>
          <option value="sync">${escapeHtml(copy.sortSync)}</option>
        </select>
        <span class="result-count" id="resultCount">${escapeHtml(copy.resultCount(capabilities.length, capabilities.length))}</span>
      </div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>${escapeHtml(copy.capabilityHeaders.capability)}</th><th>${escapeHtml(copy.capabilityHeaders.description)}</th><th>${escapeHtml(copy.capabilityHeaders.type)}</th><th>${escapeHtml(copy.capabilityHeaders.files)}</th><th>${escapeHtml(copy.capabilityHeaders.sync)}</th><th></th></tr></thead>
          <tbody id="capRows">
            ${renderCapabilityRows(capabilities, copy)}
            <tr class="empty-row" id="emptyRow" hidden><td colspan="6"><i class="ph ph-magnifying-glass" aria-hidden="true"></i>${escapeHtml(copy.noResults)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="cap-details">
        ${renderCapabilityResources(registry, copy)}
      </div>
    </section>

    <section class="view" id="upstreams" data-view="upstreams">
      <div class="v-head">
        <div>
          <div class="kicker">${escapeHtml(copy.upstreamKicker)}</div>
          <h1>${escapeHtml(copy.nav.upstreams)}</h1>
          <p class="sub">${copy.upstreamIntro}</p>
        </div>
      </div>
      <section class="panel">
        <div class="tbl-wrap flush">
          <table class="tbl">
            <thead><tr><th>${escapeHtml(copy.upstreamHeaders.capability)}</th><th>${escapeHtml(copy.upstreamHeaders.transport)}</th><th>${escapeHtml(copy.upstreamHeaders.status)}</th><th>${escapeHtml(copy.upstreamHeaders.url)}</th><th>${escapeHtml(copy.upstreamHeaders.missingEnv)}</th></tr></thead>
            <tbody>${renderUpstreamRows(registry, copy)}</tbody>
          </table>
        </div>
      </section>
    </section>

    <section class="view" id="tools" data-view="tools">
      <div class="v-head">
        <div>
          <div class="kicker">${escapeHtml(copy.toolsKicker)}</div>
          <h1>${escapeHtml(copy.nav.tools)}</h1>
          <p class="sub">${copy.toolsIntro}</p>
        </div>
      </div>
      <div class="grid2">
        <section class="panel">
          <div class="p-h"><h2><i class="ph ph-wrench" aria-hidden="true"></i>${escapeHtml(copy.toolsTitle)}</h2><span class="p-meta">${MCP_TOOLS.length} ${escapeHtml(copy.stats.tools)}</span></div>
          <div class="tbl-wrap">
            <table class="tbl"><tbody>${renderToolRows()}</tbody></table>
          </div>
        </section>
        <section class="panel" id="endpoints">
          <div class="p-h"><h2><i class="ph ph-plugs-connected" aria-hidden="true"></i>${escapeHtml(copy.endpointsTitle)}</h2><span class="p-meta">${copy.endpoints.length} routes</span></div>
          <div class="tbl-wrap">
            <table class="tbl"><tbody>${renderEndpointRows(copy)}</tbody></table>
          </div>
        </section>
      </div>
    </section>
  </main>
  <div class="backdrop" id="backdrop"></div>
  <aside class="drawer" id="drawer" aria-hidden="true" aria-live="polite">
    <div class="drawer-in" id="drawerContent"></div>
  </aside>
  ${renderDashboardScript(copy, capabilities.length)}
</body>
</html>`;
}
