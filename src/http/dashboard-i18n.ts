export type DashboardLanguage = "en" | "fr";

export interface DashboardCopy {
  htmlLang: string;
  navLabel: string;
  nav: {
    discovery: string;
    endpoints: string;
    tools: string;
    upstreams: string;
    quickTest: string;
  };
  endpoints: Array<{ method: string; path: string; description: string }>;
  noReferenceLinks: string;
  referencesTitle: string;
  filesTitle: string;
  linksTitle: string;
  uri: string;
  lines: string;
  source: string;
  file: string;
  provenanceTitle: string;
  provenanceRows: {
    source: string;
    ref: string;
    commit: string;
    contentHash: string;
    discoveredVia: string;
    license: string;
    skillKind: string;
    updatePolicy: string;
    lastSync: string;
  };
  skippedAssets: (count: number) => string;
  binary: string;
  imported: string;
  noDescription: string;
  filesCount: string;
  title: string;
  intro: string;
  stats: {
    capabilities: string;
    resources: string;
    tools: string;
  };
  discoveryTitle: string;
  discoverySteps: Array<{ title: string; body: string }>;
  endpointsTitle: string;
  toolsTitle: string;
  upstreamTitle: string;
  upstreamHeaders: {
    capability: string;
    transport: string;
    status: string;
    url: string;
    missingEnv: string;
  };
  noUpstreams: string;
  quickTestTitle: string;
}

export const DASHBOARD_COPY: Record<DashboardLanguage, DashboardCopy> = {
  en: {
    htmlLang: "en",
    navLabel: "Dashboard navigation",
    nav: {
      discovery: "Discovery",
      endpoints: "Endpoints",
      tools: "Tools",
      upstreams: "Upstreams",
      quickTest: "Quick test",
    },
    endpoints: [
      { method: "GET", path: "/health", description: "Server status JSON and discovered capability count." },
      { method: "GET", path: "/sse", description: "SSE endpoint used by MCP clients compatible with HTTP." },
      { method: "POST", path: "/message", description: "JSON RPC MCP endpoint for tools and resources." },
      { method: "GET", path: "/dashboard", description: "Human debug HTML view for inspecting the registry." },
      { method: "GET", path: "/fr/dashboard", description: "French version of the dashboard." },
    ],
    noReferenceLinks: "No links detected in references.",
    referencesTitle: "Sources and references",
    filesTitle: "Files",
    linksTitle: "Detected links",
    uri: "URI",
    lines: "Lines",
    source: "Source",
    file: "File",
    provenanceTitle: "Provenance",
    provenanceRows: {
      source: "Source",
      ref: "Ref",
      commit: "Commit / revision",
      contentHash: "Content hash",
      discoveredVia: "Discovered via",
      license: "License",
      skillKind: "Skill type",
      updatePolicy: "Update policy",
      lastSync: "Last sync",
    },
    skippedAssets: (count) => `${count} referenced binary asset(s) were not downloaded.`,
    binary: "binary",
    imported: "imported",
    noDescription: "No description",
    filesCount: "files",
    title: "Capability Registry MCP",
    intro:
      "The server scans <code>catalog/capabilities/&lt;namespace&gt;/&lt;slug&gt;/</code>, detects components (<code>SKILL.md</code>, <code>mcp.json</code>, etc.), indexes files, then exposes them to agents through MCP.",
    stats: {
      capabilities: "capabilities",
      resources: "resources",
      tools: "MCP tools",
    },
    discoveryTitle: "AI discovery",
    discoverySteps: [
      { title: "1. Scan", body: "The registry inspects folders at the catalog root." },
      { title: "2. Detect", body: "A folder becomes a capability when it contains a supported component such as <code>SKILL.md</code> or <code>mcp.json</code>." },
      { title: "3. Index", body: "Markdown files, scripts, assets, and MCP configs are classified." },
      { title: "4. MCP", body: "Tools and resources expose these contents to agents." },
    ],
    endpointsTitle: "HTTP endpoints",
    toolsTitle: "MCP tools",
    upstreamTitle: "MCP upstreams",
    upstreamHeaders: {
      capability: "Capability",
      transport: "Transport",
      status: "Status",
      url: "URL",
      missingEnv: "Missing env",
    },
    noUpstreams: "No upstream MCP configured.",
    quickTestTitle: "Quick test",
  },
  fr: {
    htmlLang: "fr",
    navLabel: "Navigation du dashboard",
    nav: {
      discovery: "Découverte",
      endpoints: "Endpoints",
      tools: "Tools",
      upstreams: "Upstreams",
      quickTest: "Test rapide",
    },
    endpoints: [
      { method: "GET", path: "/health", description: "Status JSON du serveur et nombre de capacités découvertes." },
      { method: "GET", path: "/sse", description: "Endpoint SSE utilisé par les clients MCP compatibles HTTP." },
      { method: "POST", path: "/message", description: "Endpoint JSON RPC MCP pour tools et resources." },
      { method: "GET", path: "/dashboard", description: "Vue HTML de debug humain pour inspecter le registry." },
      { method: "GET", path: "/fr/dashboard", description: "Version française du dashboard." },
    ],
    noReferenceLinks: "Aucun lien détecté dans les références.",
    referencesTitle: "Sources & références",
    filesTitle: "Fichiers",
    linksTitle: "Liens détectés",
    uri: "URI",
    lines: "Lines",
    source: "Source",
    file: "Fichier",
    provenanceTitle: "Provenance",
    provenanceRows: {
      source: "Source",
      ref: "Ref",
      commit: "Commit / revision",
      contentHash: "Content hash",
      discoveredVia: "Découverte via",
      license: "Licence",
      skillKind: "Type de skill",
      updatePolicy: "Politique d'update",
      lastSync: "Dernière synchro",
    },
    skippedAssets: (count) => `${count} asset(s) binaire(s) référencé(s) mais non téléchargé(s).`,
    binary: "binaire",
    imported: "importé",
    noDescription: "No description",
    filesCount: "files",
    title: "Capability Registry MCP",
    intro:
      "Le serveur scanne <code>catalog/capabilities/&lt;namespace&gt;/&lt;slug&gt;/</code>, détecte les composants (<code>SKILL.md</code>, <code>mcp.json</code>, etc.), indexe les fichiers, puis les expose aux agents via MCP.",
    stats: {
      capabilities: "capacités",
      resources: "ressources",
      tools: "tools MCP",
    },
    discoveryTitle: "Découverte par l'IA",
    discoverySteps: [
      { title: "1. Scan", body: "Le registry inspecte les dossiers à la racine." },
      { title: "2. Détection", body: "Un dossier devient capacité s'il contient un composant supporté (<code>SKILL.md</code>, <code>mcp.json</code>)." },
      { title: "3. Index", body: "Les fichiers Markdown, scripts, assets et configs MCP sont classés." },
      { title: "4. MCP", body: "Les tools et resources exposent ces contenus aux agents." },
    ],
    endpointsTitle: "Endpoints HTTP",
    toolsTitle: "Tools MCP",
    upstreamTitle: "MCP upstream",
    upstreamHeaders: {
      capability: "Capacité",
      transport: "Transport",
      status: "Status",
      url: "URL",
      missingEnv: "Env manquantes",
    },
    noUpstreams: "Aucun MCP upstream configuré.",
    quickTestTitle: "Test rapide",
  },
};
