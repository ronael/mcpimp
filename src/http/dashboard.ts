import { MCP_TOOLS } from "../mcp/tools";
import { UpstreamMcpGateway } from "../mcp/upstream";
import type { Capability, CapabilityRegistry } from "../registry/types";
import { renderDashboardScript } from "./dashboard-client-script";
import {
  anchorId,
  chipClassForFile,
  chipClassForKind,
  escapeAttribute,
  escapeHtml,
  extractReferenceLinks,
  lastSync,
  percent,
  provenanceRows,
  skillKind,
} from "./dashboard-helpers";
import { DASHBOARD_COPY, type DashboardCopy, type DashboardLanguage } from "./dashboard-i18n";
import { DASHBOARD_STYLES } from "./dashboard-styles";

export interface DashboardLinks {
  sourceGuidePath?: string;
  sitePath?: string;
}

interface DashboardData {
  capabilities: Capability[];
  resources: ReturnType<CapabilityRegistry["listResources"]>;
  upstreams: ReturnType<UpstreamMcpGateway["listUpstreams"]>;
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
  const body = provenanceRows(capability, copy)
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td><code>${escapeHtml(String(value))}</code></td></tr>`)
    .join("");

  if (!body) return "";

  const origin = capability.origin;
  const skipped =
    origin?.skippedAssets && origin.skippedAssets.length > 0
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

function renderDrawerTemplates(registry: CapabilityRegistry, copy: DashboardCopy): string {
  return registry
    .listCapabilities()
    .map((capability) => {
      const capabilityAnchor = `capability-${anchorId(capability.id)}`;
      const kind = skillKind(capability);
      const originChip = capability.origin
        ? `<span class="chip info plain">${escapeHtml(copy.imported)}</span>`
        : `<span class="chip ok plain">${escapeHtml(copy.local)}</span>`;
      const kindChip = `<span class="chip ${chipClassForKind(kind)} plain">${escapeHtml(kind)}</span>`;
      const fileRows = capability.files
        .map((file) => {
          const size = file.binary ? `${file.bytes} B` : String(file.lines);
          const type = file.binary ? copy.binary : file.type;
          return `<tr>
            <td class="mono wrap">${escapeHtml(file.uri)}</td>
            <td><span class="chip ${chipClassForFile(file)} plain">${escapeHtml(type)}</span></td>
            <td class="num-c">${escapeHtml(size)}</td>
          </tr>`;
        })
        .join("");

      return `<template id="drawer-${escapeAttribute(capabilityAnchor)}" data-drawer-template>
        <div class="d-top">
          <span class="d-id">${escapeHtml(capability.id)}</span>
          <button class="d-close" type="button" aria-label="${escapeAttribute(copy.close)}"><i class="ph ph-x" aria-hidden="true"></i></button>
        </div>
        <div class="d-title">${escapeHtml(capability.name)}</div>
        <div class="d-chips">${originChip}${kindChip}</div>
        <p class="d-desc">${escapeHtml(capability.description || copy.noDescription)}</p>
        <div class="d-sec">
          <div class="cs-h"><i class="ph ph-files" aria-hidden="true"></i>${escapeHtml(copy.filesTitle)} · ${capability.files.length}</div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${escapeHtml(copy.uri)}</th><th>Type</th><th>${escapeHtml(copy.lines)}</th></tr></thead><tbody>${fileRows}</tbody></table></div>
        </div>
        ${renderDrawerProvenance(capability, copy)}
        ${renderDrawerReferences(capability, copy)}
      </template>`;
    })
    .join("");
}

function renderDrawerProvenance(capability: Capability, copy: DashboardCopy): string {
  const rows = provenanceRows(capability, copy).filter(([, value]) => Boolean(value));
  if (rows.length === 0) return "";

  const cells = rows
    .map(([label, value]) => `<div><div class="k">${escapeHtml(label)}</div><div class="vv">${escapeHtml(String(value))}</div></div>`)
    .join("");
  const skipped =
    capability.origin?.skippedAssets && capability.origin.skippedAssets.length > 0
      ? `<div class="note-inline"><i class="ph ph-warning" aria-hidden="true"></i>${escapeHtml(copy.skippedAssets(capability.origin.skippedAssets.length))}</div>`
      : "";

  return `<div class="d-sec">
    <div class="cs-h"><i class="ph ph-seal-check" aria-hidden="true"></i>${escapeHtml(copy.provenanceTitle)}</div>
    <div class="prov">${cells}</div>
    ${skipped}
  </div>`;
}

function renderDrawerReferences(capability: Capability, copy: DashboardCopy): string {
  const referenceFiles = capability.files.filter((file) => file.type === "reference");
  if (referenceFiles.length === 0) return "";

  const links = referenceFiles.flatMap(extractReferenceLinks);
  const files = referenceFiles
    .map((file) => `<tr><td class="mono wrap">${escapeHtml(file.uri)}</td><td class="num-c">${file.lines}</td></tr>`)
    .join("");
  const linkRows =
    links.length > 0
      ? links
          .map(
            (link) =>
              `<tr><td><a href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.title)}</a></td><td class="mono wrap">${escapeHtml(link.sourcePath)}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="2">${escapeHtml(copy.noReferenceLinks)}</td></tr>`;

  return `<div class="d-sec">
    <div class="cs-h"><i class="ph ph-link" aria-hidden="true"></i>${escapeHtml(copy.referencesTitle)}</div>
    <div class="tbl-wrap ref-files"><table class="tbl"><thead><tr><th>${escapeHtml(copy.uri)}</th><th>${escapeHtml(copy.lines)}</th></tr></thead><tbody>${files}</tbody></table></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${escapeHtml(copy.source)}</th><th>${escapeHtml(copy.file)}</th></tr></thead><tbody>${linkRows}</tbody></table></div>
  </div>`;
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

function renderSidebar(data: DashboardData, copy: DashboardCopy, language: DashboardLanguage, links: DashboardLinks): string {
  const sourceGuidePath =
    links.sourceGuidePath ||
    (language === "fr"
      ? "https://github.com/ronael/mcpimp/blob/main/site/fr/docs/sources.html"
      : "https://github.com/ronael/mcpimp/blob/main/site/docs/sources.html");
  const sitePath = links.sitePath || (language === "fr" ? "/fr/" : "/");
  const sourceGuideExternal = sourceGuidePath.startsWith("http://") || sourceGuidePath.startsWith("https://");
  const sourceGuideTarget = sourceGuideExternal ? ` target="_blank" rel="noreferrer"` : "";

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
      <a href="${escapeAttribute(sourceGuidePath)}"${sourceGuideTarget}><i class="ph ph-book-open" aria-hidden="true"></i>${escapeHtml(copy.sourceGuide)}</a>
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


export function renderDashboard(registry: CapabilityRegistry, language: DashboardLanguage = "en", links: DashboardLinks = {}): string {
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
  ${renderSidebar(data, copy, language, links)}

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
      <div class="cap-details" inert aria-hidden="true">
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
      <section class="panel" style="padding:0px;">
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
  ${renderDrawerTemplates(registry, copy)}
  ${renderDashboardScript(copy, capabilities.length)}
</body>
</html>`;
}
