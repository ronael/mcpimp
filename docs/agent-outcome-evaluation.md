# MCPIMP — pilote d'évaluation avec un agent

Le benchmark lexical mesure si MCPIMP retourne la bonne capability. Ce pilote
mesure une étape supplémentaire : un petit agent Codex sait-il interpréter la
shortlist, choisir une capability pertinente et charger un point d'entrée utile ?

## Protocole du 26 août 2026

- Codex CLI `0.149.1`, modèle `gpt-5.6-luna`, effort faible ;
- trois sessions éphémères indépendantes, une exécution par scénario ;
- répertoire vide, sandbox en lecture seule, sans web ni lecture du dépôt ;
- seuls `search-capabilities` puis `load-capability` sont autorisés ;
- attentes cachées à l'agent et sortie JSON contrainte ;
- serveur de la branche évaluée isolé sur un port distinct.

Le fichier de résultat versionné est
[`test/evaluation/codex-agent-outcome-pilot.json`](../test/evaluation/codex-agent-outcome-pilot.json).

## Résultat

| Scénario | Premier rang acceptable | Choix de l'agent | Rang choisi | Fichier | Résultat |
|---|---:|---|---:|---|---|
| Références de composants UI | 1 | `ui-component-resources` | 1 | `references/component-inspiration-links.md` | réussi |
| Architecture frontend | 1 | `frontend-architecture` | 1 | `SKILL.md` | réussi |
| Landing page premium | 2 | `elaya-design-landing-page-design` | 6 | `SKILL.md` | réussi |

Sur ce pilote : `Recall@3`, sélection agent et précision du fichier sont à
100 %. Le cas landing page montre que l'agent ne suit pas mécaniquement le rang
1 : il a préféré une capability acceptable plus spécialisée située au rang 6.

## Coût observé

| Mesure | Total |
|---|---:|
| Tokens rapportés par la CLI | 66 115 |
| Résultats de recherche MCPIMP | 22 109 caractères |
| Fichiers chargés | 23 118 caractères |

Le fichier landing page représente à lui seul 16 899 caractères chargés. La
qualité de sélection est donc encourageante, mais ce pilote confirme que le
prochain enjeu n'est pas uniquement le rang : MCPIMP doit aussi proposer un
entrypoint plus petit ou un chargement progressif pour les capabilities longues.

## Incrément suivant : chargement par heading

`capability-info(id, path)` expose désormais l'outline Markdown et la taille de
chaque section. `load-capability(id, path, heading)` charge un heading complet
avec ses sous-sections. Sur les deux cas réels utilisés pour valider ce contrat :

| Capability | Entrée | Fichier complet | Section | Réduction |
|---|---|---:|---:|---:|
| `elaya-design-landing-page-design` | `PART A — Strategy and structure` | 16 899 | 4 941 caractères | 70,8 % |
| `frontend-architecture` | `Workflow` | 3 870 | 1 514 caractères | 60,9 % |

Ce mécanisme ne choisit pas encore automatiquement le heading selon l'intention.
Il fournit au harness une primitive explicable et non destructive pour le faire.
Un titre racine qui enveloppe tout le document reste chargeable, mais il est
signalé par `entrypoint: false` dans l'outline afin qu'un agent ne le confonde pas
avec un point d'entrée progressif.

## Revalidation agent du 27 août 2026

Les deux scénarios qui chargeaient les plus longs fichiers ont été rejoués avec
Luna, dans les mêmes conditions d'isolation. L'agent devait cette fois appeler
`capability-info`, choisir un heading marqué `entrypoint: true`, puis le charger.
Le résultat brut est versionné dans
[`test/evaluation/codex-progressive-entrypoint-pilot.json`](../test/evaluation/codex-progressive-entrypoint-pilot.json).

Un premier passage exploratoire a révélé que Luna confondait le titre racine de
`frontend-architecture` avec une section progressive. Ce signal a conduit à
ajouter le marqueur `entrypoint` avant de rejouer les deux scénarios comparables.

| Scénario | Capability | Heading choisi | Qualité du contexte initial |
|---|---|---|---|
| Architecture frontend | `frontend-architecture` | `Référence principale` | route vers le blueprint détaillé, mais ne suffit pas encore à exécuter la tâche |
| Landing page premium | `elaya-design-landing-page-design` | `A1. Intake` | intake directement exploitable pour commencer |

| Mesure sur les deux scénarios | Chargement complet | Progressif | Évolution |
|---|---:|---:|---:|
| Contenu chargé | 20 769 caractères | 1 703 caractères | −91,8 % |
| Toutes les réponses MCP | 36 023 caractères | 25 659 caractères | −28,8 % |
| Tokens rapportés par la CLI | 45 804 | 62 758 | +37,0 % |

La primitive est donc validée pour borner le contenu chargé et les deux agents
conservent la bonne sélection de capability. Elle ne démontre pas encore une
économie globale de tokens : l'appel supplémentaire et surtout l'outline de
7 012 caractères de la landing page annulent une partie du gain.

## Incrément suivant : shortlist de headings

`capability-info(id, path, query)` classe désormais les sections selon
l'intention et n'en retourne que cinq par défaut. Le mode sans `query` conserve
l'outline complet pour compatibilité. Les scores et termes reconnus restent
disponibles avec `diagnostic: true`, sans alourdir la réponse normale.

Le corpus versionné couvre maintenant cinq intentions sur trois capabilities :
workflow d'architecture, intake, structure de landing page, typographie et
ressources de composants. Les cinq headings attendus arrivent au rang 1. Sur les
deux requêtes du pilote agent :

| Outline | Complet | Shortlist | Réduction |
|---|---:|---:|---:|
| Architecture frontend | 1 690 | 1 449 caractères | 14,3 % |
| Landing page | 7 012 | 2 931 caractères | 58,2 % |
| Total | 8 702 | 4 380 caractères | 49,7 % |

Ces chiffres mesurent le payload MCP, pas les tokens d'un nouveau run agent.

Les headings classés exposent aussi `linkedPaths` et `linkedFiles` lorsqu'ils
mentionnent un fichier existant dans la même capability. `linkedFiles` ajoute le
type MIME, les octets et les caractères du texte afin que le harness puisse
décider s'il inspecte encore le fichier avant de le charger. MCPIMP n'infère pas
que ces liens sont obligatoires et ne charge rien automatiquement.

## Pilote agent : routage vers les fichiers liés

Deux sessions Luna isolées ont d'abord suivi correctement `Workflow` vers le
blueprint d'architecture et vers les références de composants. Ce premier
passage a révélé que suivre un chemin sans connaître sa taille chargeait 53 711
caractères pour le blueprint.

Après ajout des métadonnées de taille, le protocole a été rejoué : un Markdown
de plus de 12 000 caractères est d'abord inspecté avec `capability-info`; un
petit fichier est chargé directement. Luna a alors choisi
`18. Ordre de reconstruction pour une IA` dans le blueprint et n'a chargé aucun
fichier supplémentaire.

| Mesure sur deux scénarios | Routage direct | Routage adaptatif | Évolution |
|---|---:|---:|---:|
| Toutes les réponses MCP | 74 304 | 24 074 caractères | −67,6 % |
| Contenu chargé | 58 053 | 5 473 caractères | −90,6 % |
| Tokens rapportés par la CLI | 66 276 | 58 186 | −12,2 % |

Le résultat brut est versionné dans
[`test/evaluation/codex-linked-path-routing-pilot.json`](../test/evaluation/codex-linked-path-routing-pilot.json).
La baisse des tokens CLI reste indicative avec une seule exécution. La décision
de seuil appartient encore au harness ; MCPIMP fournit les signaux et les
entrypoints, pas une politique d'orchestration.

## Limites

- Trois scénarios et une seule exécution par scénario ne permettent pas de
  conclure sur la stabilité statistique.
- Les tokens CLI incluent le démarrage de l'agent, les outils et le raisonnement ;
  ils ne mesurent pas seulement les payloads MCPIMP.
- La revalidation progressive utilise le pilote précédent comme baseline, pas
  une paire A/B simultanée ; les écarts de tokens incluent donc la variance du
  modèle et ne doivent pas être interprétés comme une mesure statistique.
- Ce pilote daté ne tourne pas en CI afin d'éviter coût, variance et dépendance
  réseau. Une automatisation ultérieure devra conserver les sorties brutes et
  exécuter plusieurs répétitions.
