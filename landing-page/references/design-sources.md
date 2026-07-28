# Sources et veille design

Ce fichier documente les sources qui ont inspiré les règles de la capacité.
Il sert de bibliothèque de veille : on peut y ajouter de nouvelles références
sans transformer chaque idée en règle obligatoire.

## Comment ajouter une source

Ajoute une entrée avec :

- **Titre**
- **URL**
- **Date de consultation**
- **Statut qualité** : `validée`, `à auditer`, `rejetée`.
- **Idée utile**
- **Traduction dans la capacité** : fichier ou règle concernée, si applicable

Une bonne source n'est pas une vérité à copier. Elle doit aider l'agent à
prendre de meilleures décisions, refuser un automatisme, vérifier un rendu ou
formaliser une mémoire design.

Critères de validation :

- qualité visuelle constatable, pas seulement promesse marketing ;
- exemples réels ou système suffisamment inspectable ;
- rationale ou méthode explicite, pas juste galerie de jolies images ;
- cohérence avec l'objectif : améliorer le jugement de l'agent, pas ajouter
  des effets faciles ;
- aucun site ne devient une règle par sa seule présence ici.

Si une source est utile conceptuellement mais faible visuellement, elle va en
watchlist critique ou en sources rejetées, jamais dans les sources validées.

## Sources validées

### Anti-AI UI Guide - Tundra AI Labs

- **URL** : https://tundraailabs.com/ui-guide
- **Date de consultation** : 2026-07-27
- **Statut qualité** : validée.
- **Idée utile** : les interfaces générées ont souvent des signatures
  reconnaissables : hero standard, feature tiles, badges, gradients, glow,
  emojis, fausses preuves, faux screenshots et scaffolding visible.
- **Traduction dans la capacité** :
  `shared/anti-generic.md`, `shared/content-rules.md`,
  `shared/scoring-rubric.md`.

### Fixing Visual AI Slop - Front-End Design Standards and Skills for AI Coding Agents

- **URL** : https://trilogyai.substack.com/p/fixing-visual-ai-slop
- **Date de consultation** : 2026-07-27
- **Statut qualité** : validée pour méthode, pas comme référence visuelle.
- **Idée utile** : les skills donnent de meilleurs réflexes aux agents, mais
  une mémoire design stable (`DESIGN.md`, tokens, rationale) évite la dérive
  entre sessions.
- **Traduction dans la capacité** :
  `SKILL.md`, `shared/design-principles.md`,
  `shared/implementation-rules.md`.

### How to Stop AI-Generated UI Looking Templated - Agent's Design

- **URL** : https://agent-design.com/blog/stop-ai-ui-looking-templated
- **Date de consultation** : 2026-07-27
- **Statut qualité** : validée pour méthode.
- **Idée utile** : verrouiller des tokens, un shell/layout, des contraintes de
  composants et des anti-patterns avant de générer réduit fortement les pages
  interchangeables.
- **Traduction dans la capacité** :
  `SKILL.md`, `shared/output-schemas.md`, `shared/design-principles.md`.

### Design Review Checklist for AI Generated UI in 2026 - Vibe Coder

- **URL** : https://blog.vibecoder.me/design-review-checklist-ai-generated-ui
- **Date de consultation** : 2026-07-27
- **Statut qualité** : validée pour checklist.
- **Idée utile** : une checklist de revue courte rend les défauts IA
  auditables : tokens, spacing, typo, contraste, états, responsive,
  accessibilité, cohérence et performance.
- **Traduction dans la capacité** :
  `agents/design-critic.md`, `shared/scoring-rubric.md`,
  `shared/responsive-motion.md`.

### What Are Agent Skills? SKILL.md Guide - Agent's Design

- **URL** : https://agent-design.com/blog/what-are-agent-skills-skill-md-guide
- **Date de consultation** : 2026-07-27
- **Statut qualité** : validée pour structure de skill.
- **Idée utile** : un skill est un paquet de procédure, références et
  contraintes que l'agent charge progressivement selon le besoin.
- **Traduction dans la capacité** :
  structure `SKILL.md` + `agents/` + `shared/` + `references/`.

### Introducing SGDS Agent Skills - Singapore Government Design System

- **URL** : https://www.designsystem.tech.gov.sg/stories/introducing-sgds-agent-skills
- **Date de consultation** : 2026-07-27
- **Statut qualité** : validée pour approche design system institutionnelle.
- **Idée utile** : un design system peut être encodé en skills pour transmettre
  composants, règles d'accessibilité, UX writing et comportements attendus aux
  agents.
- **Traduction dans la capacité** :
  orientation long terme pour ajouter des sources plus spécialisées :
  accessibilité, design systems, brand systems, UX writing.

### Neuform Community Featured

- **URL** : https://neuform.ai/community/featured
- **Date de consultation** : 2026-07-28
- **Statut qualité** : à auditer visuellement avant usage comme inspiration.
- **Idée utile** : galerie de templates/remix AI HTML orientée systèmes
  réutilisables, previews, sources `DESIGN.md`, directions de page et profils
  créateurs. À utiliser comme source de veille pour étudier comment une
  direction visuelle devient un système transmissible à un agent.
- **Traduction dans la capacité** :
  source d'inspiration pour `shared/design-principles.md` et les futures
  références `DESIGN.md`, pas comme collection de layouts à copier.

### DESIGN.md

- **URL** : https://designmd.ai/
- **Date de consultation** : 2026-07-28
- **Statut qualité** : à auditer par système choisi.
- **Idée utile** : bibliothèque de systèmes `DESIGN.md` pour agents de code,
  avec tags, exemples featured/trending et usage simple : télécharger un
  `DESIGN.md`, le placer à la racine du projet, demander à l'agent de
  l'appliquer.
- **Traduction dans la capacité** :
  renforce l'idée de design memory stable avant génération et la future piste
  `references/design-memory-template.md`.

### getdesign.md

- **URL** : https://getdesign.md/
- **Date de consultation** : 2026-07-28
- **Statut qualité** : validée pour analyse/rationale, à auditer visuellement
  référence par référence.
- **Idée utile** : analyses de design systems de marques réelles pour donner à
  l'agent couleurs, typographie, spacing, composants et surtout le raisonnement
  derrière la direction.
- **Traduction dans la capacité** :
  bonne source pour apprendre à transformer une référence existante en langage
  transmissible sans cloner visuellement la marque.

### DESIGN.md by 02UI

- **URL** : https://designmd.info/
- **Date de consultation** : 2026-07-28
- **Statut qualité** : validée pour rationale designer-first ; bibliothèque
  encore petite.
- **Idée utile** : fichiers `DESIGN.md` designer-first, ouverts, avec rationale
  explicite. Rappel important : des tokens sans raison ne suffisent pas à
  guider un agent.
- **Traduction dans la capacité** :
  à utiliser pour enrichir les règles de justification dans le Design harness.

### Landing.Gallery

- **URL** : https://www.landing.gallery/
- **Date de consultation** : 2026-07-28
- **Statut qualité** : validée comme galerie de sites réels, à filtrer par
  direction pertinente.
- **Idée utile** : galerie curatée de vraies landing pages avec screenshots,
  types de pages, technologies et tags. Utile pour étudier des pages livrées,
  pas seulement des concepts.
- **Traduction dans la capacité** :
  source d'audit comparatif pour les références visuelles et la structure des
  sections, sans copier les pages.

### Land-book

- **URL** : https://land-book.com/
- **Date de consultation** : 2026-07-28
- **Statut qualité** : validée comme galerie de sites réels, à filtrer par
  qualité et contexte.
- **Idée utile** : galerie quotidienne de sites et sections, avec catégories,
  motion, headlines, boards et filtres. Intéressant pour comparer plusieurs
  traitements d'une même section avant de figer un layout.
- **Traduction dans la capacité** :
  utile pour nourrir les alternatives de Creative Direction et éviter la
  première solution automatique.

## Sources rejetées ou à ne pas utiliser comme goût

### VibeUI

- **URL** : https://www.vibeui.org/
- **Date de consultation** : 2026-07-28
- **Statut qualité** : rejetée comme source d'inspiration visuelle.
- **Raison** : l'idée d'une recherche sémantique de styles pour agents est
  intéressante comme produit, mais la qualité visuelle observée ne doit pas
  orienter le goût de la capacité.
- **Conséquence** : ne pas utiliser cette source pour générer des règles,
  palettes, composants ou exemples de direction artistique. À garder seulement
  comme contre-exemple de distinction entre promesse agent-friendly et qualité
  design réelle.

## Pistes à explorer ensuite

- Ajouter un `references/examples-reviewed.md` avec de vrais exemples de pages
  analysées : ce qui marche, ce qui échoue, ce qu'on reprend.
- Ajouter un `references/design-memory-template.md` pour aider l'agent à créer
  un `DESIGN.md` minimal dans un projet client.
- Ajouter une source dédiée à l'UX writing, pour compléter les règles de
  contenu et éviter le texte générique.
- Étudier `https://godly.design/sites/` / Recent Design comme galerie plus
  craft et interaction, avant de l'ajouter officiellement.
