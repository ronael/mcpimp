---
name: nocodb
description: Utiliser un MCP NocoDB personnel via le registry global, sans reconfigurer chaque client IA.
---

# NocoDB

Cette capacité sert de point d'entrée pour ton MCP NocoDB personnel.

Le serveur global lit `mcp.json`, résout les variables d'environnement, puis
expose les tools du MCP upstream avec le préfixe `nocodb.`.

## Variables attendues

- `NOCO_MCP_URL` : endpoint HTTP JSON-RPC du MCP NocoDB.
- `NOCO_MCP_TOKEN` : token optionnel si ton MCP NocoDB attend un bearer token.

## Utilisation

Une fois configuré, les tools upstream apparaissent dans `tools/list` sous une
forme namespacée, par exemple :

```txt
nocodb.list-tables
nocodb.get-records
nocodb.create-record
```

Le tool local `list-upstreams` permet de vérifier si les variables d'env sont
présentes avant d'appeler NocoDB.
