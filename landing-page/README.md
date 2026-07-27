# landing-page

Capacité de conception et développement de landing pages premium pour agents
IA. Elle fonctionne comme un skill orchestré : un seul point d'entrée
déclenche plusieurs rôles experts et des règles partagées.

## Contenu

```txt
landing-page/
  SKILL.md
  agents/
    product-strategist.md
    landing-strategist.md
    creative-director.md
    ui-designer.md
    ux-conversion-reviewer.md
    frontend-craftsman.md
    design-critic.md
  shared/
    anti-generic.md
    content-rules.md
    design-principles.md
    implementation-rules.md
    output-schemas.md
    responsive-motion.md
    scoring-rubric.md
    examples.md
  references/
    design-sources.md
  BUNDLE.md
```

## Utilisation directe

Pour Claude Code, Codex ou tout agent capable de lire des fichiers, pointer
vers `landing-page/SKILL.md`. L'orchestrateur indique quels rôles et règles
charger à chaque étape.

## Utilisation MCP

Le serveur MCP n'est pas dans ce dossier. Il vit à la racine du dépôt et expose
cette capacité sous les URI :

```txt
skill://landing-page/SKILL.md
skill://landing-page/BUNDLE.md
skill://landing-page/agents/...
skill://landing-page/shared/...
```

Depuis la racine :

```bash
npm run dev
```

## Bundle

`BUNDLE.md` est une version mono-fichier du skill pour les environnements qui
ne savent pas charger plusieurs fichiers progressivement.

```bash
./scripts/build-bundle.sh
```

## Sources et veille

Les sources externes et pistes de veille vivent dans
`references/design-sources.md`. Ce dossier sert à ajouter de nouvelles idées
ou checklists sans les transformer automatiquement en règles obligatoires.
