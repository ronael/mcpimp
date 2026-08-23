# Agent Tools Reference

Outils externes utiles aux agents. Non importables : ni `sources:sync`, ni
copie dans le registry. La source de l'installation et de l'usage est toujours
le dépôt officiel.

## Routage

- **Capability / skill importable** : uniquement si le dépôt expose un
  `SKILL.md` ou un format de skill compatible et maintenable dans
  `catalog/capabilities/`.
- **MCP upstream** : si le dépôt fournit un serveur MCP à lancer ou proxifier
  via `mcp.json`.
- **Outil agent externe** : CLI, app, orchestrateur, catalogue d'agents ou
  système spécialisé à utiliser depuis son dépôt officiel, sans copie dans le
  registry.
- **Référence à auditer** : dépôt intéressant mais volumineux, instable ou
  trop spécifique pour l'ajouter comme capability par défaut.

## Navigateurs autonomes

- BetterWright: https://github.com/BetterWright/betterwright — navigateur
  Playwright persistant, piloté par l'agent, avec politique réseau, coffre de
  credentials chiffré, captures de preuve et résolution de CAPTCHA. S'utilise
  comme skill, MCP ou CLI (`npm install -g betterwright`). Utile pour logging,
  formulaires, réservation, achats ou lecture d'une page qu'une API ne donne
  pas. À comparer à Playwright quand le besoin est une **capacité agentique** :
  inspection d'URL, session navigateur persistante, preuve visuelle, navigation
  web outillée, credentials, CAPTCHA ou pages nécessitant une présence humaine.
  Pour une dépendance runtime embarquée dans un produit, Playwright reste souvent
  plus direct ; BetterWright doit alors être explicitement évalué comme outil
  externe, pas supposé importable via `catalog/sources`.

## Mémoire et contexte de codebase

- Graft: https://github.com/NanoNets/Graft — CLI qui construit un graphe local
  du code et câble des agents de codage via leurs fichiers d'instructions. À
  classer comme **outil agent externe** par défaut. Peut être utile dans un
  projet consommateur via `npx @nanonets/graft init`, mais MCPIMP ne doit pas
  copier son dossier `graft/` dans `catalog/capabilities/`.
- Codebase Memory MCP: https://github.com/DeusData/codebase-memory-mcp — serveur
  MCP local d'intelligence de codebase, avec index persistant et outils de
  recherche/trace. À classer comme **MCP upstream candidat** : si retenu, créer
  une capability locale dédiée avec `SKILL.md` + `mcp.json`, plutôt que l'ajouter
  comme simple skill.

## Catalogues d'agents et orchestration

- Agency Agents: https://github.com/msitarzewski/agency-agents — catalogue
  d'agents spécialisés avec installateurs multi-outils. À classer comme
  **catalogue d'agents externe** ou source d'inspiration. Importer les centaines
  d'agents comme capabilities MCPIMP demanderait une sélection et une
  normalisation, pas un ajout brut.
- Orca: https://github.com/stablyai/orca — orchestrateur/app pour lancer et
  suivre plusieurs agents de codage en parallèle, notamment avec worktrees. À
  classer comme **outil agent externe**. Ne devient une capability MCPIMP que si
  l'on écrit un skill local expliquant quand et comment appeler `orca-cli`.

## Recherche web et plateformes

- Agent-Reach: https://github.com/Panniantong/Agent-Reach — couche d'accès à des
  plateformes comme X, Reddit, YouTube, GitHub et autres via backends/CLI/MCP.
  À classer comme **outil agent externe** et **skill candidat** si son format
  d'installation skill est choisi explicitement. À auditer avant adoption car
  les plateformes changent vite et certaines routes peuvent dépendre d'états de
  login ou d'outils tiers.

## Production vidéo agentique

- OpenMontage: https://github.com/calesthio/OpenMontage — système agentique de
  production vidéo avec pipelines, outils et skills. À classer comme
  **référence à auditer** ou outil externe spécialisé. Son périmètre et sa
  licence AGPLv3 impliquent une revue avant toute intégration dans un projet ou
  une distribution.

## Discipline de code pour agents

- Ponytail: https://ponytail.dev/ — ruleset/plugin qui pousse un agent de code
  vers la solution correcte la plus petite : YAGNI, réutilisation du code
  existant, standard library, APIs natives, puis dépendances déjà installées.
  Dépôt: https://github.com/DietrichGebert/ponytail. Pertinent comme plugin
  Codex/Claude/OpenCode/etc., comme skills (`ponytail`, `ponytail-review`,
  `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`) et comme
  serveur MCP (`ponytail-mcp`) si l'agent doit charger ces règles depuis MCP.
