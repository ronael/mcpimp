import { MCP_TOOLS } from "../mcp/tools";
import type { CapabilityRegistry } from "../registry/types";

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

function renderCapabilityResources(registry: CapabilityRegistry): string {
  return registry
    .listCapabilities()
    .map((capability) => {
      const files = capability.files
        .map(
          (file) => `<tr>
            <td><code>${escapeHtml(file.uri)}</code></td>
            <td>${escapeHtml(file.type)}</td>
            <td>${file.lines}</td>
          </tr>`,
        )
        .join("");

      return `<section class="capability">
        <header>
          <div>
            <h2>${escapeHtml(capability.name)}</h2>
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
      </section>`;
    })
    .join("");
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
    .capability { margin-top: 16px; }
    .capability header { display: flex; align-items: start; justify-content: space-between; gap: 20px; margin-bottom: 8px; }
    .capability header strong { color: var(--ok); white-space: nowrap; }
    pre {
      overflow-x: auto;
      border: 1px solid var(--line);
      background: #0a0a09;
      padding: 14px;
      margin: 10px 0 0;
      color: var(--text);
    }
    @media (max-width: 820px) {
      .top, .grid, .flow { grid-template-columns: 1fr; }
      .stats { justify-content: flex-start; }
    }
  </style>
</head>
<body>
  <main>
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

    <section class="panel">
      <h3>Découverte par l'IA</h3>
      <div class="flow">
        <div class="step"><strong>1. Scan</strong><p>Le registry inspecte les dossiers à la racine.</p></div>
        <div class="step"><strong>2. Détection</strong><p>Un dossier devient capacité s'il contient <code>SKILL.md</code>.</p></div>
        <div class="step"><strong>3. Index</strong><p>Les fichiers Markdown, scripts et assets sont classés.</p></div>
        <div class="step"><strong>4. MCP</strong><p>Les tools et resources exposent ces contenus aux agents.</p></div>
      </div>
    </section>

    <div class="grid">
      <section class="panel">
        <h3>Endpoints HTTP</h3>
        <table><tbody>${renderEndpointRows()}</tbody></table>
      </section>
      <section class="panel">
        <h3>Tools MCP</h3>
        <table><tbody>${renderToolRows()}</tbody></table>
      </section>
    </div>

    <section class="panel">
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
