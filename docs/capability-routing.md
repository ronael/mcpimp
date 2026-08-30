# Routage des capabilities

MCPIMP sépare désormais deux décisions :

1. `search-capabilities` retrouve des documents pertinents ;
2. `resolve-capabilities` compose une décision métier compacte à partir de la tâche complète.

Le routeur retourne une capability principale, au plus deux supports non
conflictuels, des codes de raison, des points d'entrée Markdown bornés et une
estimation du budget de contexte. Il ne charge pas les instructions et
n'exécute aucun contenu.

## Carte locale `ROUTING.json`

Une capability peut déclarer à sa racine une carte optionnelle :

```json
{
  "schemaVersion": 1,
  "role": "specialist",
  "taskModes": ["create", "redesign"],
  "useWhen": ["conversion-focused landing page"],
  "avoidWhen": ["single component only"],
  "conflictsWith": ["another-capability"],
  "complements": ["accessibility-capability"]
}
```

Rôles acceptés : `orchestrator`, `specialist`, `generalist`, `resource` et
`connector`. Modes acceptés : `create`, `redesign`, `audit`, `fix`, `review`,
`research` et `integrate`.

La carte appartient à MCPIMP : elle reste à la racine, n'est pas exposée comme
ressource chargeable, n'entre pas dans le `contentHash` amont et n'est pas
écrasée par `sources:sync`. Les références inconnues et les auto-références
sont refusées lors du scan.

## Contrat de résolution

Entrée minimale : `task`. `taskMode`, `projectContext`, `profile`,
`maxCapabilities` et `maxCharacters` sont optionnels. La sortie contient :

- `primary` et `supporting`, sans texte de guidance matérialisé ;
- `reviewStatus` sur chaque sélection, sans effet sur son score ;
- `conflicts`, pour expliquer les associations rejetées ;
- `entrypoints`, avec chemin, heading et taille estimée ;
- `budget`, exprimé en caractères ;
- `confidence`, parmi `high`, `medium`, `low` et `insufficient`.

La recherche lexicale reste le socle. Une correspondance complète avec
`useWhen` dépasse volontairement le plafond lexical normalisé, afin qu'un long
document générique ne batte pas une intention métier explicite. Les cartes
corrigent les ambiguïtés métier sans imposer une carte à chaque capability. Un généraliste n'est pas
ajouté comme support d'une recherche de ressources sans complément explicite.

## Évaluation

`pnpm evaluate:routing` exécute le corpus versionné de
`test/evaluation/routing-corpus.ts`. La CI vérifie la capability principale,
les supports autorisés, les exclusions, les conflits, le budget et la présence
d'un point d'entrée. Une modification du ranking ne doit pas contourner ces
attentes en élargissant arbitrairement les résultats acceptés.

Le corpus contient désormais 18 cas métier, dont des variantes sans
`taskMode`, et passe intégralement. Le pilote A/B/C avec un vrai agent est
reproductible via `pnpm evaluate:agent-routing`; sa sortie datée reste versionnée
pour ne pas confondre comportement agentique variable et contrat déterministe.

## Revue locale indépendante

`REVIEW.json` atteste une révision importée exacte avec
`reviewedContentHash`, `reviewedAt` et `reviewedBy`. Le registry calcule quatre
états : `local`, `unreviewed`, `reviewed` et `review-required`. Un changement de
`SOURCE.json.contentHash` invalide la revue sans modifier le ranking, les cartes
ou l'identité de la capability.

## Limites volontaires

La confiance éditoriale et la sécurité du contenu ne sont jamais déduites du
routage. Le bootstrap repose sur `instructions` dans `initialize` pour MCP 2025
et dans `server/discover` pour MCP 2026-07-28. Une revue autorise l'usage comme
guidance locale pour ce hash, jamais l'exécution de scripts ni la priorité sur
les instructions utilisateur ou projet.
