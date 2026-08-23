---
name: agent-tools
description: Retrouver des outils externes utiles aux agents (BetterWright, alternatives Playwright, navigateur autonome, CLI, intégrations) avec le lien vers le projet, sans les traiter comme des skills importables.
---

# Agent Tools

Utilise cette capacité quand la demande concerne un **outil externe** utile aux
agents (navigateur automatisé, alternative à Playwright, inspection URL, CLI,
service, API) plutôt qu'un skill ou un composant.

Cette capacité n'est pas une source d'import. Les outils listés ici servent de
repères humains et agentiques : ils restent **hors du registry** (souvent un
binaire, un serveur local ou un comptable tiers) et ne sont ni copiés ni
synchronisés dans `catalog/capabilities/`.

## Workflow

1. Lis `references/agent-tools.md`.
2. Identifie si l'outil est déjà disponible (installé) ou absent (à découvrir).
3. Ne recommande un outil que si le besoin correspond réellement au périmètre
   annoncé dans la référence — pas par effet de nouveauté.
4. Si l'outil est retenu, donne l'installation et l'usage fourni par la source
   officielle, jamais une recette inventée.
