export type DashboardLanguage = "en" | "fr";

export interface DashboardCopy {
  htmlLang: string;
  navLabel: string;
  nav: {
    overview: string;
    connect: string;
    capabilities: string;
    discovery: string;
    endpoints: string;
    tools: string;
    upstreams: string;
    activity: string;
    quickTest: string;
  };
  linksLabel: string;
  agentGuide: string;
  sourceGuide: string;
  backToSite: string;
  searchPlaceholder: string;
  localStatus: string;
  localNote: string;
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
    upstreams: string;
    imported: (count: number) => string;
    binaries: (count: number) => string;
    jsonRpc: string;
    upstreamAlerts: (count: number) => string;
  };
  overviewKicker: string;
  overviewTitle: string;
  capabilitiesKicker: string;
  capabilitiesTitle: string;
  capabilitiesIntro: string;
  capabilitiesSearchPlaceholder: string;
  allOrigins: string;
  localOrigin: string;
  importedOrigin: string;
  allTypes: string;
  sortName: string;
  sortFiles: string;
  sortSync: string;
  resultCount: (visible: number, total: number) => string;
  noResults: string;
  distributionTitle: string;
  distributionMeta: string;
  local: string;
  quickTestMeta: string;
  upstreamKicker: string;
  upstreamIntro: string;
  toolsKicker: string;
  toolsIntro: string;
  activityKicker: string;
  activityTitle: string;
  activityIntro: string;
  activityLive: string;
  activityLoading: string;
  activityEmpty: string;
  activityError: string;
  activityHeaders: {
    time: string;
    client: string;
    action: string;
    transport: string;
    status: string;
    duration: string;
    details: string;
  };
  activityDetailLabels: {
    requestId: string;
    sessionId: string;
    parameters: string;
    result: string;
    error: string;
  };
  capabilityHeaders: {
    capability: string;
    description: string;
    type: string;
    files: string;
    sync: string;
  };
  details: string;
  close: string;
  never: string;
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
  connectKicker: string;
  connectTitle: string;
  connectIntro: string;
  connectStartTitle: string;
  connectStartBody: string;
  connectCodexBody: string;
  connectClaudeBody: string;
  connectJsonTitle: string;
  connectJsonBody: string;
  connectVerifyTitle: string;
  connectVerifyBody: string;
  connectFallback: string;
}

export const DASHBOARD_COPY: Record<DashboardLanguage, DashboardCopy> = {
  en: {
    htmlLang: "en",
    navLabel: "Dashboard navigation",
    nav: {
      overview: "Overview",
      connect: "Connect an agent",
      capabilities: "Capabilities",
      discovery: "Discovery",
      endpoints: "Endpoints",
      tools: "Tools",
      upstreams: "Upstreams",
      activity: "Activity",
      quickTest: "Quick test",
    },
    linksLabel: "Links",
    agentGuide: "Agent setup guide",
    sourceGuide: "Source guide",
    backToSite: "Back to site",
    searchPlaceholder: "Search a capability...",
    localStatus: "localhost:3901 · online",
    localNote: "Local debug dashboard. No data leaves your machine.",
    endpoints: [
      { method: "GET", path: "/health", description: "Server status JSON and discovered capability count." },
      { method: "GET", path: "/sse", description: "SSE endpoint used by MCP clients compatible with HTTP." },
      { method: "POST", path: "/message", description: "JSON RPC MCP endpoint for tools and resources." },
      { method: "GET", path: "/activity", description: "Recent MCP activity without arguments, secrets, or response contents." },
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
      upstreams: "upstreams",
      imported: (count) => `${count} imported`,
      binaries: (count) => `${count} binaries`,
      jsonRpc: "JSON-RPC /message",
      upstreamAlerts: (count) => `${count} alert${count > 1 ? "s" : ""}`,
    },
    overviewKicker: "Registry · server status",
    overviewTitle: "Overview",
    capabilitiesKicker: "Registry · content",
    capabilitiesTitle: "Capabilities",
    capabilitiesIntro: "Search, filter by origin and type, then open a capability anchor for files, provenance, and references.",
    capabilitiesSearchPlaceholder: "Name, id, description...",
    allOrigins: "All",
    localOrigin: "Local",
    importedOrigin: "Imported",
    allTypes: "All types",
    sortName: "Sort · name A-Z",
    sortFiles: "Sort · file count",
    sortSync: "Sort · latest sync",
    resultCount: (visible, total) => `${visible} / ${total} visible`,
    noResults: "No capability matches these filters.",
    distributionTitle: "Distribution",
    distributionMeta: "origin · type",
    local: "local",
    quickTestMeta: "tools/call · list-capabilities",
    upstreamKicker: "Upstream MCP",
    upstreamIntro: "External MCP servers proxied by MCPIMP. Secrets are referenced through <code>env:</code> and never stored in <code>mcp.json</code>.",
    toolsKicker: "MCP + HTTP surface",
    toolsIntro: "What agents can call through <code>POST /message</code>, plus server HTTP routes.",
    activityKicker: "Local observability",
    activityTitle: "Agent activity",
    activityIntro: "Registry tool parameters are recorded after automatic redaction. Upstream calls retain field names and types only. Authorization headers and response contents are never recorded.",
    activityLive: "live · refreshes every 3 seconds",
    activityLoading: "Loading recent activity…",
    activityEmpty: "No agent has contacted this server since it started.",
    activityError: "Activity could not be loaded. The server may be restarting.",
    activityHeaders: {
      time: "Time",
      client: "Client",
      action: "Action",
      transport: "Transport",
      status: "Status",
      duration: "Duration",
      details: "Details",
    },
    activityDetailLabels: {
      requestId: "JSON RPC id",
      sessionId: "SSE session",
      parameters: "Sanitized parameters",
      result: "Result summary",
      error: "Error",
    },
    capabilityHeaders: {
      capability: "Capability",
      description: "Description",
      type: "Type",
      files: "Files",
      sync: "Sync",
    },
    details: "Details",
    close: "Close",
    never: "never",
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
    connectKicker: "Client setup · two minutes",
    connectTitle: "Connect MCPIMP to an agent",
    connectIntro: "Start MCPIMP, add its streamable HTTP endpoint to your client, then verify that the five registry tools are visible.",
    connectStartTitle: "1. Start the registry",
    connectStartBody: "Keep this process running while your agent uses MCPIMP.",
    connectCodexBody: "Adds MCPIMP to the Codex user configuration.",
    connectClaudeBody: "Adds MCPIMP to the Claude Code user configuration.",
    connectJsonTitle: "Other MCP clients",
    connectJsonBody: "Use this JSON shape in clients such as Cursor or any client that accepts an MCP server file.",
    connectVerifyTitle: "2. Verify the connection",
    connectVerifyBody: "Restart the client if it was already open, then list its MCP servers. The server should expose list-capabilities, search-capabilities, capability-info, load-capability, and list-upstreams.",
    connectFallback: "Older client? Replace /message with the legacy SSE endpoint /sse.",
  },
  fr: {
    htmlLang: "fr",
    navLabel: "Navigation du dashboard",
    nav: {
      overview: "Vue d'ensemble",
      connect: "Connecter un agent",
      capabilities: "Capabilities",
      discovery: "Découverte",
      endpoints: "Endpoints",
      tools: "Tools",
      upstreams: "Upstreams",
      activity: "Activité",
      quickTest: "Test rapide",
    },
    linksLabel: "Liens",
    agentGuide: "Guide de connexion",
    sourceGuide: "Guide des sources",
    backToSite: "Retour au site",
    searchPlaceholder: "Rechercher une capacité...",
    localStatus: "localhost:3901 · en ligne",
    localNote: "Dashboard de debug local. Aucune donnée ne quitte ta machine.",
    endpoints: [
      { method: "GET", path: "/health", description: "Status JSON du serveur et nombre de capacités découvertes." },
      { method: "GET", path: "/sse", description: "Endpoint SSE utilisé par les clients MCP compatibles HTTP." },
      { method: "POST", path: "/message", description: "Endpoint JSON RPC MCP pour tools et resources." },
      { method: "GET", path: "/activity", description: "Activité MCP récente sans arguments, secrets ni contenu des réponses." },
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
      upstreams: "upstreams",
      imported: (count) => `dont ${count} importées`,
      binaries: (count) => `${count} binaires`,
      jsonRpc: "JSON-RPC /message",
      upstreamAlerts: (count) => `${count} en alerte`,
    },
    overviewKicker: "Registry · état du serveur",
    overviewTitle: "Vue d'ensemble",
    capabilitiesKicker: "Registry · contenu",
    capabilitiesTitle: "Capabilities",
    capabilitiesIntro: "Recherche, filtres par origine et par type, puis ouverture d'une ancre de capacité pour les fichiers, la provenance et les références.",
    capabilitiesSearchPlaceholder: "Nom, id, description...",
    allOrigins: "Toutes",
    localOrigin: "Locales",
    importedOrigin: "Importées",
    allTypes: "Tous types",
    sortName: "Tri · nom A-Z",
    sortFiles: "Tri · nb de fichiers",
    sortSync: "Tri · synchro récente",
    resultCount: (visible, total) => `${visible} / ${total} visibles`,
    noResults: "Aucune capacité ne correspond à ces filtres.",
    distributionTitle: "Répartition",
    distributionMeta: "origine · type",
    local: "locale",
    quickTestMeta: "tools/call · list-capabilities",
    upstreamKicker: "MCP amont",
    upstreamIntro: "Serveurs MCP externes proxifiés par MCPIMP. Les secrets sont référencés via <code>env:</code>, jamais écrits dans <code>mcp.json</code>.",
    toolsKicker: "Surface MCP + HTTP",
    toolsIntro: "Ce que les agents peuvent appeler via <code>POST /message</code>, et les routes HTTP du serveur.",
    activityKicker: "Observabilité locale",
    activityTitle: "Activité des agents",
    activityIntro: "Les paramètres des tools du registry sont enregistrés après expurgation automatique. Pour les appels upstream, seuls les noms et types des champs sont conservés. Les headers d’autorisation et contenus des réponses ne sont jamais enregistrés.",
    activityLive: "direct · actualisation toutes les 3 secondes",
    activityLoading: "Chargement de l’activité récente…",
    activityEmpty: "Aucun agent n’a contacté ce serveur depuis son démarrage.",
    activityError: "Impossible de charger l’activité. Le serveur redémarre peut être.",
    activityHeaders: {
      time: "Heure",
      client: "Client",
      action: "Action",
      transport: "Transport",
      status: "Statut",
      duration: "Durée",
      details: "Détails",
    },
    activityDetailLabels: {
      requestId: "ID JSON RPC",
      sessionId: "Session SSE",
      parameters: "Paramètres expurgés",
      result: "Résumé du résultat",
      error: "Erreur",
    },
    capabilityHeaders: {
      capability: "Capacité",
      description: "Description",
      type: "Type",
      files: "Fichiers",
      sync: "Synchro",
    },
    details: "Détails",
    close: "Fermer",
    never: "jamais",
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
    connectKicker: "Configuration client · deux minutes",
    connectTitle: "Connecter MCPIMP à un agent",
    connectIntro: "Lance MCPIMP, ajoute son endpoint HTTP streamable dans ton client, puis vérifie que les cinq tools du registry sont visibles.",
    connectStartTitle: "1. Lancer le registry",
    connectStartBody: "Garde ce processus actif pendant que ton agent utilise MCPIMP.",
    connectCodexBody: "Ajoute MCPIMP à la configuration utilisateur de Codex.",
    connectClaudeBody: "Ajoute MCPIMP à la configuration utilisateur de Claude Code.",
    connectJsonTitle: "Autres clients MCP",
    connectJsonBody: "Utilise cette forme JSON dans Cursor ou dans tout client qui accepte un fichier de serveurs MCP.",
    connectVerifyTitle: "2. Vérifier la connexion",
    connectVerifyBody: "Redémarre le client s'il était déjà ouvert, puis liste ses serveurs MCP. Le serveur doit exposer list-capabilities, search-capabilities, capability-info, load-capability et list-upstreams.",
    connectFallback: "Client ancien ? Remplace /message par l'endpoint SSE legacy /sse.",
  },
};
