---
name: frontend-architecture
description: Concevoir, auditer ou refactorer une architecture frontend TypeScript/React/Next.js propre par features, avec domaine pur, ports/adapters, use cases, stores Zustand, composition root, configuration typée, états d'opération séparés, tests d'architecture, ESLint et SonarJS. À utiliser pour créer ou reconstruire un dossier src robuste, vérifier les frontières SOLID/clean architecture, ou guider une IA qui doit implémenter une feature sans mélanger UI, métier et infrastructure.
---

# Frontend Architecture

Cette capacité guide la conception ou la reconstruction d'une architecture
frontend `src/` inspirée d'un modèle clean architecture pragmatique :

```text
UI -> store -> use case -> port <- adapter
```

Elle s'applique quand la demande concerne :

- une application TypeScript avec React ou Next.js ;
- une architecture par features ;
- des frontières domaine / application / infrastructure / UI ;
- l'injection de dépendances, composition root, ports et adapters ;
- Zustand ou un store client équivalent ;
- la configuration par environnement ou par feature ;
- les états async détaillés par opération ;
- des tests d'architecture, ESLint, SonarJS ou typecheck strict.

## Référence principale

Pour toute tâche d'architecture, lis d'abord :

`references/src-architecture-blueprint.md`

Ce fichier est la source détaillée. Le présent `SKILL.md` sert seulement de
routeur et de rappel des invariants.

## Workflow

1. **Identifier le contexte**
   - Projet neuf, audit, refactor ou ajout de feature.
   - Framework, mode de rendu, backend séparé ou non.
   - Features métier réelles et dépendances externes.

2. **Charger le blueprint**
   - Lis `references/src-architecture-blueprint.md`.
   - Pour un audit, focalise-toi sur les invariants, anti-patterns et critères
     d'acceptation.
   - Pour une implémentation, suis l'ordre de reconstruction et la checklist
     d'ajout de feature.

3. **Décider avant de coder**
   - Liste les features métier.
   - Définis la matrice des adapters par environnement.
   - Identifie les ports, use cases, stores et adapters nécessaires.
   - Note les hypothèses réversibles au lieu de les enfouir dans le code.

4. **Implémenter par incréments**
   - Socle d'abord : config typée, container, erreurs, frontières.
   - Une feature pilote de bout en bout ensuite.
   - Généralisation seulement après deux usages réels.

5. **Vérifier les frontières**
   - Domaine sans React, Next.js, Zustand, HTTP, env, DB.
   - UI sans `fetch`, container, adapter ou use case direct.
   - Use cases dépendants de ports, jamais d'adapters concrets.
   - Adapters propriétaires du mapping externe.
   - Composition root seule responsable du choix des adapters.

6. **Tester et contrôler**
   - TypeScript strict.
   - ESLint standard + règles d'architecture.
   - SonarJS exécutable en CLI si disponible.
   - Tests ciblés puis suite complète selon le périmètre.

## Sortie attendue

Pour un audit :

- violations classées par gravité ;
- fichier/ligne quand disponible ;
- invariant violé ;
- correction proposée ;
- tests ou règles à ajouter.

Pour une création/refonte :

- arborescence cible ;
- matrice adapters/environnements ;
- liste des ports et use cases ;
- stratégie de stores et opérations ;
- plan d'implémentation incrémental ;
- commandes de vérification.

## Rappels non négociables

- Une convention écrite sans test ou règle lint finit par être contournée.
- Un adapter memory doit respecter le vrai contrat, pas devenir un mock
  permissif.
- L'absence d'information reste une absence : ne remplace pas une inconnue par
  `0`, une date du jour ou une catégorie arbitraire.
- Un unique `status: "loading"` par feature est insuffisant pour une UI fiable.
- Le core partagé doit avoir une raison sémantique stable, pas seulement deux
  imports similaires.
