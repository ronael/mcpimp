# Sources et veille design

Ce fichier documente les sources qui ont inspiré les règles de la capacité.
Il sert de bibliothèque de veille : on peut y ajouter de nouvelles références
sans transformer chaque idée en règle obligatoire.

## Comment ajouter une source

Ajoute une entrée avec :

- **Titre**
- **URL**
- **Date de consultation**
- **Idée utile**
- **Traduction dans la capacité** : fichier ou règle concernée, si applicable

Une bonne source n'est pas une vérité à copier. Elle doit aider l'agent à
prendre de meilleures décisions, refuser un automatisme, vérifier un rendu ou
formaliser une mémoire design.

## Sources actuelles

### Anti-AI UI Guide - Tundra AI Labs

- **URL** : https://tundraailabs.com/ui-guide
- **Date de consultation** : 2026-07-27
- **Idée utile** : les interfaces générées ont souvent des signatures
  reconnaissables : hero standard, feature tiles, badges, gradients, glow,
  emojis, fausses preuves, faux screenshots et scaffolding visible.
- **Traduction dans la capacité** :
  `shared/anti-generic.md`, `shared/content-rules.md`,
  `shared/scoring-rubric.md`.

### Fixing Visual AI Slop - Front-End Design Standards and Skills for AI Coding Agents

- **URL** : https://trilogyai.substack.com/p/fixing-visual-ai-slop
- **Date de consultation** : 2026-07-27
- **Idée utile** : les skills donnent de meilleurs réflexes aux agents, mais
  une mémoire design stable (`DESIGN.md`, tokens, rationale) évite la dérive
  entre sessions.
- **Traduction dans la capacité** :
  `SKILL.md`, `shared/design-principles.md`,
  `shared/implementation-rules.md`.

### How to Stop AI-Generated UI Looking Templated - Agent's Design

- **URL** : https://agent-design.com/blog/stop-ai-ui-looking-templated
- **Date de consultation** : 2026-07-27
- **Idée utile** : verrouiller des tokens, un shell/layout, des contraintes de
  composants et des anti-patterns avant de générer réduit fortement les pages
  interchangeables.
- **Traduction dans la capacité** :
  `SKILL.md`, `shared/output-schemas.md`, `shared/design-principles.md`.

### Design Review Checklist for AI Generated UI in 2026 - Vibe Coder

- **URL** : https://blog.vibecoder.me/design-review-checklist-ai-generated-ui
- **Date de consultation** : 2026-07-27
- **Idée utile** : une checklist de revue courte rend les défauts IA
  auditables : tokens, spacing, typo, contraste, états, responsive,
  accessibilité, cohérence et performance.
- **Traduction dans la capacité** :
  `agents/design-critic.md`, `shared/scoring-rubric.md`,
  `shared/responsive-motion.md`.

### What Are Agent Skills? SKILL.md Guide - Agent's Design

- **URL** : https://agent-design.com/blog/what-are-agent-skills-skill-md-guide
- **Date de consultation** : 2026-07-27
- **Idée utile** : un skill est un paquet de procédure, références et
  contraintes que l'agent charge progressivement selon le besoin.
- **Traduction dans la capacité** :
  structure `SKILL.md` + `agents/` + `shared/` + `references/`.

### Introducing SGDS Agent Skills - Singapore Government Design System

- **URL** : https://www.designsystem.tech.gov.sg/stories/introducing-sgds-agent-skills
- **Date de consultation** : 2026-07-27
- **Idée utile** : un design system peut être encodé en skills pour transmettre
  composants, règles d'accessibilité, UX writing et comportements attendus aux
  agents.
- **Traduction dans la capacité** :
  orientation long terme pour ajouter des sources plus spécialisées :
  accessibilité, design systems, brand systems, UX writing.

### Neuform Community Featured

- **URL** : https://neuform.ai/community/featured
- **Date de consultation** : 2026-07-28
- **Idée utile** : galerie de templates/remix AI HTML orientée systèmes
  réutilisables, previews, sources `DESIGN.md`, directions de page et profils
  créateurs. À utiliser comme source de veille pour étudier comment une
  direction visuelle devient un système transmissible à un agent.
- **Traduction dans la capacité** :
  source d'inspiration pour `shared/design-principles.md` et les futures
  références `DESIGN.md`, pas comme collection de layouts à copier.

## Pistes à explorer ensuite

- Ajouter un `references/examples-reviewed.md` avec de vrais exemples de pages
  analysées : ce qui marche, ce qui échoue, ce qu'on reprend.
- Ajouter un `references/design-memory-template.md` pour aider l'agent à créer
  un `DESIGN.md` minimal dans un projet client.
- Ajouter une source dédiée à l'UX writing, pour compléter les règles de
  contenu et éviter le texte générique.
