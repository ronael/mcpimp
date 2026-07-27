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
  nocodb/                 # capacité proxy vers un MCP personnel
    SKILL.md
    mcp.json
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
| `list-upstreams` | Vérifie les MCP upstream configurés par capacité |

## Proxy MCP

Une capacité peut déclarer un MCP upstream avec un fichier `mcp.json`.

```json
{
  "type": "http",
  "url": "env:NOCO_MCP_URL",
  "headers": {
    "authorization": "Bearer env:NOCO_MCP_TOKEN"
  }
}
```

Le registry global appelle `tools/list` sur cet upstream et expose ses tools
avec un préfixe stable :

```txt
nocodb.list-tables
nocodb.get-records
nocodb.create-record
```

Pour tester la configuration sans appeler NocoDB :

```bash
curl -sS http://localhost:3901/message \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list-upstreams","arguments":{}}}'
```

Si une variable d'environnement manque, le status affiché sera
`missing-env`. Les tools upstream sont listés seulement quand l'URL et les
headers nécessaires sont résolus.

## Développement

```bash
pnpm install
pnpm run test
pnpm run typecheck
pnpm run build
pnpm run dev
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

Le Worker ne lit pas le filesystem au runtime. `pnpm run build` génère
`src/capability-snapshot.ts`, puis `worker.ts` sert ce snapshot statique.

```bash
pnpm run build
npx wrangler deploy
```

## Ajouter une capacité

1. Créer un dossier à la racine, par exemple `design-system/`.
2. Ajouter un `SKILL.md` avec un frontmatter `name:` et `description:`.
3. Ajouter au besoin `agents/`, `shared/`, `references/`, `assets/` ou
   `scripts/`.
4. Relancer `pnpm run build` avant un déploiement Cloudflare.

Les plugins Codex restent un format possible plus tard. Dans cette v1, l'unité
métier est la capacité : elle peut contenir un skill, des ressources, des
scripts, puis éventuellement un plugin ou un MCP dédié.
