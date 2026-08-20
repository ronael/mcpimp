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