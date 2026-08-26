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

## Limites

- Trois scénarios et une seule exécution par scénario ne permettent pas de
  conclure sur la stabilité statistique.
- Les tokens CLI incluent le démarrage de l'agent, les outils et le raisonnement ;
  ils ne mesurent pas seulement les payloads MCPIMP.
- Ce pilote daté ne tourne pas en CI afin d'éviter coût, variance et dépendance
  réseau. Une automatisation ultérieure devra conserver les sorties brutes et
  exécuter plusieurs répétitions.
