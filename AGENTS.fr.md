# MCPIMP — instructions pour l'agent

[English version](AGENTS.md)

Avant toute modification non triviale du projet, demande à MCPIMP de résoudre
les capabilities pertinentes à partir de la tâche complète et du contexte
projet disponible. Ne présume pas d'un identifiant avant le routage. Utilise
`resolve-capabilities` quand il est disponible ; sinon utilise
`search-capabilities`, sélectionne depuis sa shortlist et préfère les
capabilities spécifiques à la tâche aux généralistes. Ne charge que les
entrypoints retournés ou sélectionnés nécessaires avant d'écrire du code.

Si la capability n'est pas disponible dans le MCP (serveur non lancé, snapshot
obsolète, id inconnu), regarde directement les fichiers correspondants sur
disque (par exemple `catalog/capabilities/local/…` ou `catalog/capabilities/<namespace>/…`) pour retrouver les règles à appliquer.

## Réflexion produit pour les évolutions

Avant d'implémenter toute évolution produit (fonctionnalité, comportement,
parcours, interface, protocole ou modèle de données), rédige une brève
réflexion produit qui :

- reformule le problème utilisateur et le résultat attendu ;
- explique où la modification s'intègre dans MCPIMP et pourquoi ;
- identifie les implications pertinentes pour les parcours existants, les
  utilisateurs et les agents, la sécurité, les données, la compatibilité,
  l'exploitation, la documentation et la roadmap ;
- vérifie les hypothèses et les ambiguïtés, et ne demande une clarification que
  si elles peuvent modifier sensiblement la direction choisie ;
- confirme la cohérence avec la vision produit et la phase actuelle de la
  roadmap, puis met à jour la roadmap ou la documentation lorsque le périmètre
  ou le statut de l'évolution change.

Cette réflexion doit rester proportionnée à la modification : une ou deux
phrases suffisent pour une petite évolution localisée ; utilise une note
structurée pour une évolution plus large ou transverse. Une correction qui ne
fait que rétablir un comportement déjà spécifié demande seulement une courte
vérification de son impact produit, sans rouvrir les décisions déjà prises.
