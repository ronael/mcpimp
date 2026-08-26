# MCPIMP — évaluation de la recherche

Ce document décrit le benchmark versionné de P1.1. Il mesure si MCPIMP retrouve
la bonne capability, recommande un point d'entrée utile et limite le volume de
contexte retourné. Il ne mesure pas encore la réussite finale d'un agent.

## Exécution

```bash
pnpm evaluate:search
pnpm evaluate:search -- --json
```

Le runner utilise le catalogue réel et le corpus
[`test/evaluation/search-corpus.ts`](../test/evaluation/search-corpus.ts). La CI
échoue lorsqu'un cas critique ne retrouve aucune capability pertinente dans le
top 3 ou recommande un fichier explicitement jugé incorrect.

Le budget de contexte est d'abord une mesure diagnostique : son échec rend le
coût visible mais ne bloque pas encore la CI. Le durcir avant d'avoir rendu les
réponses capability-first obligerait à adapter les attentes au comportement
actuel plutôt qu'à améliorer le produit.

## Métriques

- `Success@1` : une capability pertinente est la première capability distincte.
- `Recall@3` : au moins une capability pertinente apparaît parmi les trois
  premières capabilities distinctes.
- `MRR` : moyenne de l'inverse du rang de la première capability pertinente.
- Précision du fichier : le premier fichier proposé pour la capability retenue
  est un point d'entrée acceptable dans le corpus.
- Volume : nombre de caractères du résultat JSON, utilisé comme approximation
  stable du contexte avant une future mesure en tokens.

Les rangs sont calculés par capability distincte, même si le moteur actuel
retourne encore une liste plate de fichiers.

## Référence initiale — 26 août 2026

Catalogue : 31 capabilities. Corpus : 12 cas, dont 9 critiques. Limite actuelle :
20 fichiers par requête. Budget diagnostique : 12 000 caractères par réponse.

| Mesure | Référence |
|---|---:|
| `Success@1` | 66,7 % |
| `Recall@3` | 91,7 % |
| MRR | 0,7986 |
| Précision du fichier recommandé | 100 % |
| Respect du budget de contexte | 0 % |
| Volume moyen | 17 287 caractères |
| Volume maximal | 19 081 caractères |

Les deux échecs les plus utiles à examiner dans le prochain incrément sont :

- les recherches de ressources UI et motion, où la capability attendue est au
  rang 2 ;
- la recherche générique de landing page, où les capabilities jugées pertinentes
  n'apparaissent qu'au rang 4.

Le signal le plus net est toutefois le volume : aucun cas ne respecte le budget.
Le prochain changement doit donc produire une réponse compacte regroupée par
capability avant de recalibrer les poids lexicaux.

## Règles d'évolution du corpus

- Partir de formulations utilisateur ou agent réelles, en français et en anglais.
- Documenter la raison produit d'un nouvel attendu.
- Autoriser plusieurs capabilities ou fichiers lorsqu'ils sont réellement
  interchangeables ; ne pas forcer un vainqueur arbitraire.
- Ne jamais modifier un attendu uniquement pour faire passer une modification
  du ranking.
- Conserver les anciens cas lorsqu'ils représentent encore un besoin supporté.
