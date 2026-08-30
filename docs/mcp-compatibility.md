# MCPIMP — matrice de compatibilité MCP

Cette matrice distingue les tests de contrat du dépôt des connexions réellement
observées. Un scénario automatisé prouve la stabilité d'une séquence HTTP ; il
ne remplace pas un test du binaire client contre un serveur redémarré.

## État au 26 août 2026

| Client | Transport | Trafic observé | Contrat automatisé | Validation live après correctifs |
|---|---|---|---|---|
| Codex `0.149.1` et `0.149.0-alpha.4.3` | Streamable HTTP direct | `initialize` en `2025-06-18`, `notifications/initialized`, `tools/list`, `resources/list`, `resources/templates/list`, `tools/call` | Oui | Validé avec `0.149.1` le 26 août |
| Codex via `mcp-remote 0.2.5` | Adaptateur HTTP | `initialize`, `notifications/initialized`, `tools/list` | Couvert par la séquence Codex | À refaire |
| Claude Code `2.1.241` / Desktop SDK `0.3.246` | Streamable HTTP | `server/discover`, `initialize`, `notifications/initialized`, `resources/list`, `tools/list` | Oui | À refaire |
| Client Rust `rmcp 3.1.0` | Streamable HTTP | `initialize` | Partiel | À refaire |
| Cursor | Non observé | — | Non | À planifier |
| Kimi | Non observé | — | Non | À planifier |

Le trafic observé provient du journal local MCPIMP. Il confirme les méthodes
sondées, pas à lui seul l'absence de déconnexion ou de retry côté client.

## Comportements verrouillés

- une notification valide reçoit un `202` vide ;
- `resources/templates/list` retourne une liste vide plutôt qu'une erreur ;
- `server/discover` reste non standard et retourne `-32601`, sans empêcher les
  requêtes standard suivantes ;
- `ping` retourne immédiatement `{}` ;
- les batches agrègent uniquement les réponses aux éléments possédant un ID ;
- paramètres invalides, ressource absente et panne interne ont des codes
  distincts ;
- chaque message traité produit sa propre ligne d'activité expurgée.

Les scénarios versionnés sont dans
[`src/http/__tests__/client-compatibility.test.ts`](../src/http/__tests__/client-compatibility.test.ts).
Le pilote de sélection réelle avec Codex est décrit dans
[`agent-outcome-evaluation.md`](agent-outcome-evaluation.md).

## Protocole de validation live

1. Redémarrer MCPIMP depuis la branche à valider.
2. Reconnecter un client sans réutiliser une ancienne session.
3. Vérifier dans `/activity` l'ordre des méthodes, les statuts et l'identité du
   client.
4. Confirmer côté client l'absence de déconnexion, boucle ou retry continu.
5. Reporter ici la version exacte et la date ; ne jamais remplacer une version
   observée par « latest ».
