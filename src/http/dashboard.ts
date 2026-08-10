import { MCP_TOOLS } from "../mcp/tools";
import { UpstreamMcpGateway } from "../mcp/upstream";
import type { Capability, CapabilityFile, CapabilityRegistry } from "../registry/types";

const ENDPOINTS = [
  { method: "GET", path: "/health", description: "Status JSON du serveur et nombre de capacités découvertes." },
  { method: "GET", path: "/sse", description: "Endpoint SSE utilisé par les clients MCP compatibles HTTP." },
  { method: "POST", path: "/message", description: "Endpoint JSON-RPC MCP pour tools et resources." },
  { method: "GET", path: "/dashboard", description: "Vue HTML de debug humain pour inspecter le registry." },
];

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

function renderReferenceSources(capability: Capability): string {
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
      : `<tr><td colspan="2">Aucun lien détecté dans les références.</td></tr>`;

  return `<div class="references">
    <h3>Sources & références</h3>
    <div class="reference-grid">
      <div>
        <h4>Fichiers</h4>
        <table>
          <thead><tr><th>URI</th><th>Lines</th></tr></thead>
          <tbody>${referenceRows}</tbody>
        </table>
      </div>
      <div>
        <h4>Liens détectés</h4>
        <table>
          <thead><tr><th>Source</th><th>Fichier</th></tr></thead>
          <tbody>${linkRows}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

function renderProvenance(capability: Capability): string {
  const origin = capability.origin;
  if (!origin) return "";

  const location = [origin.repository, origin.path].filter(Boolean).join("/") || origin.url || origin.sourceId;
  const rows: [string, string | undefined][] = [
    ["Source", `${origin.type} · ${location}`],
    ["Ref", origin.ref],
    ["Commit / revision", origin.commit || origin.revision?.value],
    ["Content hash", origin.contentHash],
    ["Découverte via", origin.discoverySource ? `${origin.discoverySource.type} · ${origin.discoverySource.url}` : undefined],
    ["Licence", [origin.license?.spdxId, origin.license?.url].filter(Boolean).join(" · ") || undefined],
    ["Type de skill", [origin.skillKind, ...(origin.skillTraits || [])].filter(Boolean).join(", ") || undefined],
    ["Politique d'update", origin.update],
    ["Dernière synchro", origin.lastSyncedAt],
  ];

  const body = rows
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td><code>${escapeHtml(String(value))}</code></td></tr>`)
    .join("");

  const skipped =
    origin.skippedAssets && origin.skippedAssets.length > 0
      ? `<p>${origin.skippedAssets.length} asset(s) binaire(s) référencé(s) mais non téléchargé(s).</p>`
      : "";

  return `<div class="references">
    <h3>Provenance</h3>
    <table><tbody>${body}</tbody></table>
    ${skipped}
  </div>`;
}

function renderCapabilityResources(registry: CapabilityRegistry): string {
  return registry
    .listCapabilities()
    .map((capability) => {
      const capabilityAnchor = `capability-${anchorId(capability.id)}`;
      const files = capability.files
        .map(
          (file) => `<tr>
            <td><code>${escapeHtml(file.uri)}</code></td>
            <td>${escapeHtml(file.type)}</td>
            <td>${file.binary ? `${file.bytes} B (binaire)` : file.lines}</td>
          </tr>`,
        )
        .join("");

      const badge = capability.origin ? `<span class="badge">importé</span>` : "";

      return `<section class="capability" id="${escapeAttribute(capabilityAnchor)}">
        <header>
          <div>
            <h2>${escapeHtml(capability.name)} ${badge}</h2>
            <p>${escapeHtml(capability.description || "No description")}</p>
          </div>
          <strong>${capability.files.length} files</strong>
        </header>
        <table>
          <thead>
            <tr><th>URI</th><th>Type</th><th>Lines</th></tr>
          </thead>
          <tbody>${files}</tbody>
        </table>
        ${renderProvenance(capability)}
        ${renderReferenceSources(capability)}
      </section>`;
    })
    .join("");
}

function renderDashboardNav(capabilities: Capability[]): string {
  const capabilityLinks = capabilities
    .map(
      (capability) =>
        `<a href="#capability-${escapeAttribute(anchorId(capability.id))}">${escapeHtml(capability.name)}</a>`,
    )
    .join("");

  return `<nav class="dashboard-nav" aria-label="Navigation du dashboard">
    <a href="#discovery">Découverte</a>
    <a href="#endpoints">Endpoints</a>
    <a href="#tools">Tools</a>
    <a href="#upstreams">Upstreams</a>
    <a href="#quick-test">Test rapide</a>
    ${capabilityLinks}
  </nav>`;
}

function renderEndpointRows(): string {
  return ENDPOINTS.map(
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

function renderUpstreamRows(registry: CapabilityRegistry): string {
  const gateway = new UpstreamMcpGateway(registry);
  const upstreams = gateway.listUpstreams();

  if (upstreams.length === 0) {
    return `<tr><td colspan="5">Aucun MCP upstream configuré.</td></tr>`;
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

export function renderDashboard(registry: CapabilityRegistry): string {
  const capabilities = registry.listCapabilities();
  const resources = registry.listResources();

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Capability Registry MCP</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #11110f;
      --panel: #1c1d1a;
      --panel-soft: #252720;
      --text: #f2f0e8;
      --muted: #b8b2a4;
      --line: #3a3d33;
      --accent: #8fd3ff;
      --ok: #a6e3a1;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 86px; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 15px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
    h1 { margin: 0; font-size: 32px; letter-spacing: 0; }
    h2 { margin: 0 0 4px; font-size: 18px; letter-spacing: 0; }
    h3 { margin: 0 0 12px; font-size: 15px; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); }
    code { color: var(--accent); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
    .dashboard-nav {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin: -32px -20px 24px;
      padding: 14px 20px;
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
    }
    .dashboard-nav a {
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      padding: 6px 10px;
      font-size: 13px;
      line-height: 1.2;
    }
    .dashboard-nav a:hover,
    .dashboard-nav a:focus-visible {
      border-color: var(--accent);
      color: var(--accent);
      text-decoration: none;
    }
    .top {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 24px;
      align-items: start;
      margin-bottom: 24px;
    }
    .stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .stat {
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 10px 12px;
      min-width: 120px;
    }
    .stat strong { display: block; font-size: 22px; color: var(--ok); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }
    .panel, .capability {
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 18px;
    }
    .flow {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }
    .step {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      padding: 12px;
      min-height: 92px;
    }
    .step strong { display: block; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border-top: 1px solid var(--line); padding: 9px 8px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .capability { margin-top: 16px; }
    .badge {
      border: 1px solid var(--line);
      color: var(--muted);
      font-size: 11px;
      font-weight: 500;
      padding: 2px 6px;
      vertical-align: middle;
    }
    .capability header { display: flex; align-items: start; justify-content: space-between; gap: 20px; margin-bottom: 8px; }
    .capability header strong { color: var(--ok); white-space: nowrap; }
    .references {
      border-top: 1px solid var(--line);
      margin-top: 16px;
      padding-top: 14px;
    }
    .references h4 {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
    }
    .reference-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
      gap: 16px;
    }
    pre {
      overflow-x: auto;
      border: 1px solid var(--line);
      background: #0a0a09;
      padding: 14px;
      margin: 10px 0 0;
      color: var(--text);
    }
    @media (max-width: 820px) {
      .top, .grid, .flow, .reference-grid { grid-template-columns: 1fr; }
      .stats { justify-content: flex-start; }
    }
  </style>
</head>
<body>
  <main>
    ${renderDashboardNav(capabilities)}

    <div class="top">
      <div>
        <h1>Capability Registry MCP</h1>
        <p>Le serveur scanne les dossiers racine qui contiennent un <code>SKILL.md</code>, indexe leurs fichiers, puis les expose aux agents via MCP.</p>
      </div>
      <div class="stats">
        <div class="stat"><strong>${capabilities.length}</strong>capacités</div>
        <div class="stat"><strong>${resources.length}</strong>ressources</div>
        <div class="stat"><strong>${MCP_TOOLS.length}</strong>tools MCP</div>
      </div>
    </div>

    <section class="panel" id="discovery">
      <h3>Découverte par l'IA</h3>
      <div class="flow">
        <div class="step"><strong>1. Scan</strong><p>Le registry inspecte les dossiers à la racine.</p></div>
        <div class="step"><strong>2. Détection</strong><p>Un dossier devient capacité s'il contient <code>SKILL.md</code>.</p></div>
        <div class="step"><strong>3. Index</strong><p>Les fichiers Markdown, scripts et assets sont classés.</p></div>
        <div class="step"><strong>4. MCP</strong><p>Les tools et resources exposent ces contenus aux agents.</p></div>
      </div>
    </section>

    <div class="grid">
      <section class="panel" id="endpoints">
        <h3>Endpoints HTTP</h3>
        <table><tbody>${renderEndpointRows()}</tbody></table>
      </section>
      <section class="panel" id="tools">
        <h3>Tools MCP</h3>
        <table><tbody>${renderToolRows()}</tbody></table>
      </section>
    </div>

    <section class="panel" id="upstreams">
      <h3>MCP upstream</h3>
      <table>
        <thead><tr><th>Capacité</th><th>Transport</th><th>Status</th><th>URL</th><th>Env manquantes</th></tr></thead>
        <tbody>${renderUpstreamRows(registry)}</tbody>
      </table>
    </section>

    <section class="panel" id="quick-test">
      <h3>Test rapide</h3>
      <pre><code>curl -sS http://localhost:3901/message \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list-capabilities","arguments":{}}}'</code></pre>
    </section>

    ${renderCapabilityResources(registry)}
  </main>
</body>
</html>`;
}
