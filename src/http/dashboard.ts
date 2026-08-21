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

      return `<section class="capability" id="${escapeAttribute(capabilityAnchor)}">
        <header>
          <div>
            <h2>${escapeHtml(capability.name)} ${badge}</h2>
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

function renderDashboardNav(capabilities: Capability[], copy: DashboardCopy): string {
  const capabilityLinks = capabilities
    .map(
      (capability) =>
        `<a href="#capability-${escapeAttribute(anchorId(capability.id))}">${escapeHtml(capability.name)}</a>`,
    )
    .join("");

  return `<nav class="dashboard-nav" aria-label="${escapeAttribute(copy.navLabel)}">
    <a href="#discovery">${escapeHtml(copy.nav.discovery)}</a>
    <a href="#endpoints">${escapeHtml(copy.nav.endpoints)}</a>
    <a href="#tools">${escapeHtml(copy.nav.tools)}</a>
    <a href="#upstreams">${escapeHtml(copy.nav.upstreams)}</a>
    <a href="#quick-test">${escapeHtml(copy.nav.quickTest)}</a>
    ${capabilityLinks}
  </nav>`;
}

function renderEndpointRows(copy: DashboardCopy): string {
  return copy.endpoints.map(
    (endpoint) => `<tr>
      <td><code>${endpoint.method}</code></td>
      <td><code>${endpoint.path}</code></td>
      <td>${endpoint.description}</td>
    </tr>`,
  ).join("");
}

function renderToolRows(): string {
  return MCP_TOOLS.map(
    (tool) => `<tr>
      <td><code>${tool.name}</code></td>
      <td>${tool.description}</td>
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
        <td><code>${escapeHtml(upstream.capabilityId)}</code></td>
        <td>${escapeHtml(upstream.transport)}</td>
        <td>${escapeHtml(upstream.status)}</td>
        <td><code>${escapeHtml(upstream.url)}</code></td>
        <td>${upstream.missingEnv.map((name) => `<code>${escapeHtml(name)}</code>`).join(", ") || "n/a"}</td>
      </tr>`,
    )
    .join("");
}

export function renderDashboard(registry: CapabilityRegistry, language: DashboardLanguage = "en"): string {
  const capabilities = registry.listCapabilities();
  const resources = registry.listResources();
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
  <style>
${DASHBOARD_STYLES}
  </style>
</head>
<body>
  <main>
    ${renderDashboardNav(capabilities, copy)}

    <div class="top">
      <div>
        <h1>${escapeHtml(copy.title)}</h1>
        <p>${copy.intro}</p>
      </div>
      <div class="stats">
        <div class="stat"><strong>${capabilities.length}</strong>${escapeHtml(copy.stats.capabilities)}</div>
        <div class="stat"><strong>${resources.length}</strong>${escapeHtml(copy.stats.resources)}</div>
        <div class="stat"><strong>${MCP_TOOLS.length}</strong>${escapeHtml(copy.stats.tools)}</div>
      </div>
    </div>

    <section class="panel" id="discovery">
      <h3>${escapeHtml(copy.discoveryTitle)}</h3>
      <div class="flow">
        ${copy.discoverySteps.map((step) => `<div class="step"><strong>${escapeHtml(step.title)}</strong><p>${step.body}</p></div>`).join("")}
      </div>
    </section>

    <div class="grid">
      <section class="panel" id="endpoints">
        <h3>${escapeHtml(copy.endpointsTitle)}</h3>
        <table><tbody>${renderEndpointRows(copy)}</tbody></table>
      </section>
      <section class="panel" id="tools">
        <h3>${escapeHtml(copy.toolsTitle)}</h3>
        <table><tbody>${renderToolRows()}</tbody></table>
      </section>
    </div>

    <section class="panel" id="upstreams">
      <h3>${escapeHtml(copy.upstreamTitle)}</h3>
      <table>
        <thead><tr><th>${escapeHtml(copy.upstreamHeaders.capability)}</th><th>${escapeHtml(copy.upstreamHeaders.transport)}</th><th>${escapeHtml(copy.upstreamHeaders.status)}</th><th>${escapeHtml(copy.upstreamHeaders.url)}</th><th>${escapeHtml(copy.upstreamHeaders.missingEnv)}</th></tr></thead>
        <tbody>${renderUpstreamRows(registry, copy)}</tbody>
      </table>
    </section>

    <section class="panel" id="quick-test">
      <h3>${escapeHtml(copy.quickTestTitle)}</h3>
      <pre><code>curl -sS http://localhost:3901/message \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list-capabilities","arguments":{}}}'</code></pre>
    </section>

    ${renderCapabilityResources(registry, copy)}
  </main>
</body>
</html>`;
}
