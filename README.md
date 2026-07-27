# Personal Capability Registry MCP

Registry personnel de capacités pour agents IA. Le serveur MCP vit à la racine
du dépôt et expose les dossiers de capacités, comme `landing-page/`, via des
outils et ressources MCP.

## Modèle

Une capacité est un dossier qui contient au minimum un `SKILL.md`.

```txt
skills/
  package.json
  src/                    # serveur, adapter MCP, registry
  scripts/                # build du snapshot Cloudflare
  worker.ts               # entrypoint Cloudflare
  landing-page/           # première capacité réelle
    SKILL.md
    agents/
    shared/
    BUNDLE.md
```

La v1 découvre automatiquement les dossiers racine qui contiennent un
`SKILL.md`. Les fichiers sont exposés avec des URI stables :

```txt
skill://landing-page/SKILL.md
skill://landing-page/agents/ui-designer.md
skill://landing-page/shared/content-rules.md
```

## Outils MCP

| Outil | Rôle |
|---|---|
| `list-capabilities` | Liste les capacités disponibles |
| `capability-info` | Donne les métadonnées et fichiers d'une capacité |
| `load-capability` | Charge tout ou partie d'une capacité |
| `search-capabilities` | Recherche dans les fichiers indexés |

## Développement

```bash
npm install
npm run test
npm run typecheck
npm run build
npm run dev
```

Le serveur local écoute par défaut sur `http://localhost:3901`.

```json
{
  "mcpServers": {
    "capabilities": {
      "url": "http://localhost:3901/sse"
    }
  }
}
```

## Cloudflare

Le Worker ne lit pas le filesystem au runtime. `npm run build` génère
`src/capability-snapshot.ts`, puis `worker.ts` sert ce snapshot statique.

```bash
npm run build
npx wrangler deploy
```

## Ajouter une capacité

1. Créer un dossier à la racine, par exemple `design-system/`.
2. Ajouter un `SKILL.md` avec un frontmatter `name:` et `description:`.
3. Ajouter au besoin `agents/`, `shared/`, `references/`, `assets/` ou
   `scripts/`.
4. Relancer `npm run build` avant un déploiement Cloudflare.

Les plugins Codex restent un format possible plus tard. Dans cette v1, l'unité
métier est la capacité : elle peut contenir un skill, des ressources, des
scripts, puis éventuellement un plugin ou un MCP dédié.
