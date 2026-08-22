# Agent Tools Reference

Outils externes utiles aux agents. Non importables : ni `sources:sync`, ni
copie dans le registry. La source de l'installation et de l'usage est toujours
le dépôt officiel.

## Navigateurs autonomes

- BetterWright: https://github.com/BetterWright/betterwright — navigateur
  Playwright persistant, piloté par l'agent, avec politique réseau, coffre de
  credentials chiffré, captures de preuve et résolution de CAPTCHA. S'utilise
  comme skill, MCP ou CLI (`npm install -g betterwright`). Utile pour logging,
  formulaires, réservation, achats ou lecture d'une page qu'une API ne donne
  pas.

## Discipline de code pour agents

- Ponytail: https://ponytail.dev/ — ruleset/plugin qui pousse un agent de code
  vers la solution correcte la plus petite : YAGNI, réutilisation du code
  existant, standard library, APIs natives, puis dépendances déjà installées.
  Dépôt: https://github.com/DietrichGebert/ponytail. Pertinent comme plugin
  Codex/Claude/OpenCode/etc., comme skills (`ponytail`, `ponytail-review`,
  `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`) et comme
  serveur MCP (`ponytail-mcp`) si l'agent doit charger ces règles depuis MCP.
