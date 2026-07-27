# Blueprint autonome de l'architecture `src`

> **Objectif** : permettre à une IA ou à un développeur de reconstruire une
> architecture frontend équivalente sans avoir accès au projet Kubora
> d'origine.
>
> **Type de projet de référence** : application TypeScript avec React et
> Next.js App Router, état client Zustand, backend HTTP séparé et dépendances
> externes remplaçables.
>
> **Priorité** : les règles d'architecture de ce document priment sur les
> exemples de syntaxe. Les bibliothèques peuvent changer ; les frontières ne
> doivent pas changer implicitement.

Ce blueprint formalise l'architecture cible. Il conserve les principes éprouvés
de Kubora, mais ne reproduit pas ses accidents historiques : la configuration
est explicitement définie par feature, les dépendances sont regroupées par
feature et les overrides conservent la même instance de container.

## 1. Résultat attendu

L'application doit être organisée autour de features métier indépendantes :

```text
UI -> store -> use case -> port <- adapter
```

La flèche pointe vers ce qui est connu par la couche appelante :

- l'UI connaît le store ;
- le store connaît les use cases exposés par le container ;
- un use case connaît des interfaces, appelées ports ;
- un adapter implémente un port ;
- le domaine ne connaît ni React, ni Next.js, ni Zustand, ni HTTP, ni base de
  données.

Le choix des adapters est effectué uniquement dans la composition root. Il doit
être possible de configurer indépendamment :

- l'authentification en mémoire ou via HTTP ;
- le repository d'une feature A en mémoire ;
- le repository d'une feature B via HTTP ;
- le stockage de fichiers via un autre provider ;
- une horloge, un générateur d'identifiants ou un service externe ;
- des overrides de tests sans modifier le code métier.

## 2. Invariants non négociables

### INV-01 — Le domaine est pur

`domain/` contient les entités, value objects, DTO métier et règles pures.

Interdits dans le domaine :

- React, Next.js, Zustand ;
- `fetch`, `localStorage`, cookies ;
- variables d'environnement ;
- imports d'adapters ;
- accès à une base de données ;
- format spécifique d'une API externe.

Une règle métier doit pouvoir être testée avec Node.js sans DOM et sans réseau.

### INV-02 — L'inversion de dépendances est réelle

Un use case dépend d'un port défini du côté métier. L'adapter dépend de ce port
pour l'implémenter.

```text
use case -> Port
adapter  -> Port
```

Le use case ne dépend jamais de `HttpXRepository`, `PrismaXRepository` ou
`MemoryXRepository`.

### INV-03 — L'UI passe par le store

Une page ou un composant :

- lit l'état du store ;
- appelle une action du store ;
- n'appelle pas un use case directement ;
- n'accède pas au container ;
- ne fait pas de requête réseau ;
- ne choisit pas un adapter.

Cette règle évite la duplication de workflows, par exemple un formulaire qui
appellerait HTTP puis ferait lui-même un `setState` alors que le store possède
déjà une action `login`.

### INV-04 — Le store orchestre l'état, pas le métier

Le store :

- gère les données affichées, erreurs, invalidation locale et métriques
  d'exécution scindées par opération ;
- appelle un use case ;
- met à jour l'état à partir du résultat ;
- peut enchaîner deux intentions applicatives explicites ;
- ne réimplémente pas une validation métier ;
- ne transforme pas un DTO externe brut ;
- ne contient pas de `fetch`.

### INV-05 — Les adapters possèdent les détails externes

Un adapter HTTP possède :

- les URLs et méthodes HTTP ;
- la sérialisation des entrées ;
- le mapping API vers domaine ;
- les statuts HTTP et erreurs provider ;
- l'authentification technique des requêtes ;
- les éventuelles stratégies de retry autorisées.

Le domaine ne doit jamais recevoir un type généré par une API externe.

### INV-06 — La composition root est le seul lieu d'assemblage

La composition root :

- lit une configuration déjà validée ;
- construit les adapters ;
- partage les instances qui doivent l'être ;
- construit les use cases ;
- contrôle les durées de vie et la libération des ressources ;
- expose un container à l'application.

Les features peuvent fournir des builders, mais elles ne choisissent pas leur
configuration dans l'UI.

### INV-07 — Les features ne se contournent pas

Une feature ne doit pas importer le store ou l'adapter interne d'une autre
feature.

Pour collaborer, utiliser l'une de ces solutions :

1. un port injecté ;
2. un use case d'orchestration situé dans une couche applicative ;
3. un événement métier explicite ;
4. un petit shared kernel stable.

Un import direct d'un type d'une autre feature est acceptable uniquement si ce
type représente réellement un concept partagé et possède un propriétaire
clair.

### INV-08 — La configuration est validée et typée

Les chaînes venant de `process.env` sont inconnues jusqu'à validation.

- En production, une valeur inconnue doit provoquer une erreur au démarrage.
- En développement, un fallback est permis uniquement s'il est explicite.
- Aucun composant ne lit `process.env`.
- Les secrets ne doivent jamais être exposés dans des variables publiques.

### INV-09 — L'absence d'information reste une absence

Ne jamais remplacer silencieusement une donnée inconnue par :

- `0` ;
- la date du jour ;
- une chaîne arbitraire ;
- une catégorie métier fausse.

Les jours calendaires utilisent `YYYY-MM-DD` et sont validés par format puis
round-trip UTC afin de refuser les dates impossibles.

### INV-10 — Les frontières sont automatisées

Les règles essentielles doivent être protégées par ESLint, tests d'architecture
ou les deux. Une convention seulement écrite sera tôt ou tard contournée.

### INV-11 — L'état d'exécution est scindé par opération

Un unique état global `"idle" | "loading" | "error"` est insuffisant.

Chaque action applicative ou use case possède une clé stable, par exemple :

```text
inventory/listItems
inventory/getItem:item-42
inventory/addItem
auth/login
reminders/createReminder
```

Le registre d'opérations conserve au minimum :

- le type d'activité (`FETCHING`, `POSTING`, `UPDATING`, etc.) ;
- le nombre d'exécutions en cours ;
- le nombre total de tentatives, succès et erreurs ;
- la dernière issue ;
- les timestamps et la durée ;
- le contexte de déclenchement utile à l'UI ;
- un identifiant par exécution pour gérer la concurrence.

L'UI doit pouvoir distinguer :

- le premier chargement d'une donnée ;
- un rafraîchissement avec des données déjà visibles ;
- une nouvelle tentative après erreur ;
- deux actions concurrentes ;
- le chargement d'une ressource précise ;
- une navigation directe, un clic utilisateur ou un refresh automatique.

Ces métriques appartiennent à la couche application/UI. Elles ne doivent pas
entrer dans le domaine ni modifier le contrat métier du use case.

### INV-12 — La qualité statique est vérifiée en continu

Le lint standard ne suffit pas à couvrir la lisibilité, la complexité cognitive,
les expressions difficiles à maintenir et certains risques de sécurité.

Chaque incrément doit être contrôlé avec quatre niveaux complémentaires :

1. TypeScript strict ;
2. ESLint standard et règles d'architecture ;
3. SonarJS pour les code smells, la complexité et les règles de sécurité ;
4. tests ciblés puis suite complète selon le périmètre.

Une alerte visible seulement dans une extension d'IDE est insuffisante. Toute
règle utilisée par l'équipe doit être exécutable en ligne de commande afin
qu'un développeur, une IA et la CI disposent du même diagnostic.

## 3. Arborescence cible

```text
src/
  app/
    layout.tsx
    (public)/
    dashboard/
    lab/

  config/
    env.ts
    adapter-config.ts
    __tests__/

  core/
    di/
      container.ts
      types.ts
    errors/
    log/
    providers/
    http/
    utils/
      tests/

  design-system/
    foundations/
    primitives/
    components/
    integrations/
    providers/
    index.ts

  features/
    <feature>/
      domain/
      ports/
      usecases/
      adapters/
        memory/
        http/
      di/
        container.ts
      store/
      components/
      client/
      index.ts

  stores/
    loading.types.ts
    operations/
      operation.types.ts
      operation.store.ts
      operation.selectors.ts
    ui/

  hooks/
  app-config.ts
```

Tous les sous-dossiers d'une feature sont optionnels. Une feature pure de
calcul peut n'avoir que `domain/` et ses tests. Une feature sans adapter memory
ne doit pas contenir un dossier vide.

## 4. Responsabilité de chaque zone

### `src/app`

Responsabilités :

- routing ;
- layouts ;
- metadata ;
- assemblage de composants d'écran ;
- guards de navigation ;
- providers racine via `layout.tsx`.

Une page doit rester mince :

```tsx
export default function InventoryRoute() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <InventoryPage />
      </DashboardLayout>
    </AuthGuard>
  );
}
```

Une page ne porte ni logique métier, ni requête, ni configuration d'adapter.

### `src/config`

Responsabilités :

- lire les entrées brutes de l'environnement ;
- valider et normaliser ces entrées ;
- produire une configuration immuable et typée ;
- définir les profils d'exécution.

Ce dossier ne construit pas les adapters.

### `src/core`

Contient uniquement ce qui est transversal :

- composition root ;
- erreurs applicatives génériques ;
- logger ;
- providers de démarrage ;
- primitives HTTP utilisées par plusieurs adapters ;
- validation réellement générique ;
- utilitaires de test.

Ne pas placer dans `core/` un concept métier seulement parce que deux fichiers
l'utilisent. Le code partagé doit avoir une raison sémantique, pas seulement
une ressemblance.

### `src/design-system`

Le design system :

- ne dépend d'aucune feature ;
- ne connaît aucun store métier ;
- peut dépendre de bibliothèques UI ;
- expose une API publique stable ;
- reçoit les données et callbacks par props.

### `src/features`

Chaque feature possède son vocabulaire, ses contrats, ses workflows et ses
adapters. Une feature doit pouvoir être comprise sans parcourir toute
l'application.

### `src/stores`

Réservé aux états véritablement globaux comme :

- thème ;
- préférences d'interface ;
- registre global d'opérations ;
- état de navigation.

Les données métier restent dans `features/<feature>/store/`.

## 5. Anatomie d'une feature

Exemple générique `inventory`.

### Domaine

```ts
// features/inventory/domain/Item.ts
export type Item = {
  id: string;
  ownerId: string;
  name: string;
  purchaseDate: Date | null;
  priceCents: number | null;
  createdAt: Date;
  updatedAt: Date;
};
```

```ts
// features/inventory/domain/dto.ts
export type AddItemInput = {
  name: string;
  purchaseDateISO?: string;
  priceCents?: number | null;
};
```

```ts
// features/inventory/domain/rules.ts
export function validateAddItem(input: AddItemInput): void {
  if (!input.name.trim()) {
    throw new ValidationError("Le nom est requis", {
      name: "Le nom est requis.",
    });
  }
}
```

Le DTO d'entrée appartient au workflow métier. Le DTO JSON exact du backend
appartient à l'adapter HTTP.

### Ports

```ts
// features/inventory/ports/ItemRepository.ts
export interface ItemRepository {
  add(data: NewItem): Promise<Item>;
  list(ownerId: string, query?: ItemQuery): Promise<Item[]>;
  get(ownerId: string, id: string): Promise<Item | null>;
  update(ownerId: string, id: string, patch: ItemPatch): Promise<Item>;
  delete(ownerId: string, id: string): Promise<void>;
}
```

```ts
// features/inventory/ports/AuthContext.ts
export interface AuthContext {
  currentUserId(): Promise<string>;
}
```

```ts
// features/inventory/ports/Clock.ts
export interface Clock {
  now(): Date;
}
```

Un port doit exprimer ce dont le métier a besoin, pas reproduire l'API d'une
bibliothèque.

Mauvais :

```ts
interface ItemRepository {
  prisma(): PrismaClient;
}
```

Correct :

```ts
interface ItemRepository {
  list(ownerId: string, query?: ItemQuery): Promise<Item[]>;
}
```

### Use case

```ts
export class AddItem {
  constructor(
    private readonly repository: ItemRepository,
    private readonly auth: AuthContext,
    private readonly clock: Clock,
  ) {}

  async execute(input: AddItemInput): Promise<Item> {
    validateAddItem(input);

    const ownerId = await this.auth.currentUserId();
    const now = this.clock.now();

    return this.repository.add({
      ownerId,
      name: input.name.trim(),
      purchaseDate: input.purchaseDateISO
        ? parseISODate(input.purchaseDateISO)
        : null,
      priceCents: input.priceCents ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }
}
```

Le use case :

- possède une méthode publique unique, généralement `execute` ;
- valide les invariants ;
- récupère ses capacités via injection ;
- ne connaît pas le store ;
- ne traduit pas une réponse HTTP ;
- ne déclenche pas de toast.

### Adapter memory

```ts
export class MemoryItemRepository implements ItemRepository {
  private items = new Map<string, Item>();

  async add(data: NewItem): Promise<Item> {
    const item = { ...data, id: crypto.randomUUID() };
    this.items.set(item.id, structuredClone(item));
    return structuredClone(item);
  }

  // autres méthodes...
}
```

L'adapter memory doit respecter le même contrat que l'adapter réel :

- isolation par utilisateur ;
- tri ;
- erreurs ;
- nullabilité ;
- idempotence lorsque le port la promet.

Ce n'est pas un mock permissif.

### Adapter HTTP

```ts
type ApiItem = {
  id: string;
  userId: string;
  name: string;
  purchaseDate: string | null;
  priceCents: number | null;
  createdAt: string;
  updatedAt: string;
};

export class HttpItemRepository implements ItemRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly request: AuthenticatedRequest,
  ) {}

  async get(_ownerId: string, id: string): Promise<Item | null> {
    try {
      const result = await this.request<{ item: ApiItem }>(
        `${this.baseUrl}/items/${id}`,
      );
      return mapApiItem(result.item);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw mapExternalError(error);
    }
  }
}

function mapApiItem(item: ApiItem): Item {
  return {
    id: item.id,
    ownerId: item.userId,
    name: item.name,
    purchaseDate: item.purchaseDate
      ? parseISODate(item.purchaseDate)
      : null,
    priceCents: item.priceCents,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}
```

Même si le backend déduit l'utilisateur depuis le token, le port peut conserver
`ownerId` afin que l'adapter memory et les tests prouvent l'isolation.

### Store

Le store sépare deux familles d'état :

1. **état métier affichable** : objets, sélection, filtres, pagination ;
2. **état d'exécution** : opérations, tentatives, concurrence, durée et origine.

Ne pas placer un unique `status` sur toute la feature. `listItems`, `addItem` et
`deleteItem:item-42` peuvent s'exécuter indépendamment.

#### Clés d'opération

Les clés sont possédées par les features :

```ts
export const INVENTORY_OPERATIONS = {
  listItems: "inventory/listItems",
  addItem: "inventory/addItem",
  exportItems: "inventory/exportItems",
} as const;

export type InventoryOperationKey =
  | (typeof INVENTORY_OPERATIONS)[keyof typeof INVENTORY_OPERATIONS]
  | `inventory/getItem:${string}`
  | `inventory/updateItem:${string}`
  | `inventory/deleteItem:${string}`;

export const getItemOperation = (id: string): InventoryOperationKey =>
  `inventory/getItem:${id}`;
```

Une clé dynamique doit être construite par une fonction dédiée afin d'éviter
des conventions de chaînes divergentes.

#### Modèle d'une opération

```ts
export type OperationActivity =
  | "FETCHING"
  | "POSTING"
  | "UPDATING"
  | "DELETING"
  | "EXPORTING"
  | "RUNNING";

export type OperationOutcome = "NEVER" | "SUCCESS" | "ERROR";

export type OperationTrigger =
  | "ROUTE"
  | "USER"
  | "RETRY"
  | "REFRESH"
  | "PREFETCH"
  | "BACKGROUND";

export type OperationContext = {
  trigger: OperationTrigger;
  pathname?: string;
  resourceId?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  queryKey?: string;
};

export type OperationError = {
  code: string;
  message: string;
  status?: number;
};

export type OperationState = {
  activity: OperationActivity | null;
  outcome: OperationOutcome;

  inFlightCount: number;
  invocationCount: number;
  successCount: number;
  failureCount: number;

  latestExecutionId: string | null;
  activeExecutionIds: string[];

  firstStartedAt: number | null;
  lastStartedAt: number | null;
  lastSettledAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastDurationMs: number | null;

  context: OperationContext | null;
  lastError: OperationError | null;
};
```

Le statut visible est dérivé :

```ts
export type OperationStatus =
  | "NOT_INITIALIZED"
  | "IDLE"
  | OperationActivity
  | "ERROR";

export const getOperationStatus = (
  operation: OperationState | undefined,
): OperationStatus => {
  if (!operation || operation.invocationCount === 0) {
    return "NOT_INITIALIZED";
  }

  if (operation.inFlightCount > 0 && operation.activity) {
    return operation.activity;
  }

  return operation.outcome === "ERROR" ? "ERROR" : "IDLE";
};
```

`IDLE` ne signifie donc pas « jamais exécuté ». Il signifie « aucune exécution
en cours après au moins une tentative ».

#### Registre d'opérations

```ts
export type OperationKey =
  | InventoryOperationKey
  | AuthOperationKey
  | ReminderOperationKey
  | AdminOperationKey;

export type ExecutionToken = {
  key: OperationKey;
  executionId: string;
  startedAt: number;
};

export interface OperationTracker {
  begin(input: {
    key: OperationKey;
    activity: OperationActivity;
    context: OperationContext;
  }): ExecutionToken;

  succeed(token: ExecutionToken): void;
  fail(token: ExecutionToken, error: unknown): void;
  isLatest(token: ExecutionToken): boolean;
  reset(key?: OperationKey): void;
}
```

`begin()` incrémente `invocationCount` et `inFlightCount`. `succeed()` ou
`fail()` retire uniquement l'`executionId` concerné et recalcule
`inFlightCount`. Ce modèle évite qu'une première requête terminée passe
l'opération en `IDLE` alors qu'une deuxième est toujours active.

Conserver une liste bornée d'identifiants actifs, pas un historique infini de
toutes les exécutions.

Si deux appels utilisent des paramètres produisant des résultats différents :

- inclure une identité stable de ressource/query dans la clé ; ou
- appliquer explicitement une stratégie `latest execution wins`.

Le tracker ne doit pas laisser une réponse lente et ancienne remplacer une
réponse plus récente.

#### Sélecteurs utiles à l'UI

```ts
export const isBusy = (op?: OperationState) =>
  (op?.inFlightCount ?? 0) > 0;

export const isInitialLoading = (op?: OperationState) =>
  isBusy(op) && (op?.successCount ?? 0) === 0;

export const isRefreshing = (op?: OperationState) =>
  isBusy(op) && (op?.successCount ?? 0) > 0;

export const isRetrying = (op?: OperationState) =>
  isBusy(op) && (op?.failureCount ?? 0) > 0;

export const isFirstAttempt = (op?: OperationState) =>
  (op?.invocationCount ?? 0) === 1;

export const hasLoadedOnce = (op?: OperationState) =>
  (op?.successCount ?? 0) > 0;
```

Exemples d'usage :

- `isInitialLoading` : skeleton plein écran ;
- `isRefreshing` : conserver les données et afficher un indicateur discret ;
- `isRetrying` : texte « nouvelle tentative » ;
- `getItemOperation(id)` : spinner seulement sur la ligne concernée ;
- `invocationCount` : éviter de rejouer un onboarding de première visite ;
- `lastDurationMs` : détecter une opération lente et adapter le feedback.

#### Store métier avec tracker injecté

```ts
type InventoryState = {
  items: Item[];
  selected: Item | null;
  error: string | null;
};

type InventoryActions = {
  loadItems(context: OperationContext): Promise<void>;
};

export const createInventoryStore = (
  getUseCases: () => Pick<InventoryUseCases, "listItems">,
  operations: OperationTracker,
) =>
  create<InventoryState & InventoryActions>((set) => ({
    items: [],
    selected: null,
    error: null,

    loadItems: async (context) => {
      const token = operations.begin({
        key: INVENTORY_OPERATIONS.listItems,
        activity: "FETCHING",
        context,
      });

      set({ error: null });

      try {
        const items = await getUseCases().listItems.execute();
        if (operations.isLatest(token)) {
          set({ items });
        }
        operations.succeed(token);
      } catch (error) {
        operations.fail(token, error);
        set({ error: toUserMessage(error) });
        throw error;
      }
    },
  }));
```

Le tracker peut être un store Zustand global, mais il est injecté dans les
factories de stores pour rester remplaçable en test.

L'application crée le singleton :

```ts
export const useInventoryStore = createInventoryStore(
  () => getContainer().features.inventory.usecases,
  operationTracker,
);
```

#### Contexte de navigation

Le contexte doit être fourni au départ de l'action :

```ts
await loadItems({
  trigger: "ROUTE",
  pathname: window.location.pathname,
  queryKey: stableQueryFingerprint(filters),
});
```

Ne pas stocker aveuglément l'URL complète :

- retirer tokens, emails et paramètres sensibles ;
- préférer `pathname` à `href` ;
- normaliser les identifiants quand une route modèle suffit ;
- hasher une query si son contenu n'est pas utile à l'UI ;
- ne jamais envoyer automatiquement ce contexte à un outil analytics.

Le contexte opérationnel sert d'abord aux décisions d'interface et au debug.
Une télémétrie externe éventuelle est un adapter séparé, abonné à des événements
sanitisés.

#### Persistance

Les opérations en cours ne doivent pas être persistées telles quelles :

- après un reload, aucun appel précédent n'est réellement encore actif ;
- réhydrater `FETCHING` produirait un spinner bloqué ;
- les erreurs peuvent contenir des informations sensibles.

Par défaut, les métriques sont limitées à la session. Si certaines informations
doivent survivre, persister uniquement un résumé explicite comme
`lastSuccessAt` ou `hasCompletedOnboarding`, puis remettre
`inFlightCount` et `activeExecutionIds` à zéro lors de l'hydratation.

#### Trois niveaux à ne pas confondre

| Niveau | Finalité | Exemples |
| --- | --- | --- |
| état d'opération | décisions immédiates de l'UI | skeleton, refresh, bouton occupé |
| métriques techniques de session | debug et qualité perçue | durée, erreurs, nombre de retries |
| analytics produit | mesurer un funnel | premier objet, dixième objet, export |

Le registre d'opérations peut alimenter un adapter d'observabilité, mais ne doit
pas devenir automatiquement une collecte analytics. Chaque événement externe
doit avoir un schéma, une finalité et une politique de données explicites.

## 6. Configuration flexible par feature

### Pourquoi éviter un switch global

Une configuration unique comme `REPOSITORY_MODE=http` devient vite ambiguë :

- l'auth peut devoir être HTTP ;
- l'inventaire peut être memory pour une démo ;
- les rappels peuvent être HTTP ;
- un provider email peut être désactivé ;
- les fichiers peuvent utiliser R2.

Le mode doit être défini par feature et, si nécessaire, par port.

### Schéma recommandé

```ts
export type AppAdapterConfig = {
  auth: {
    service: "memory" | "http";
  };
  inventory: {
    repository: "memory" | "http";
    fileAssets: "memory" | "http";
    fileStorage: "memory" | "r2";
  };
  reminders: {
    repository: "memory" | "http";
  };
  aiImport: {
    repository: "memory" | "http";
  };
  profile: {
    repository: "memory" | "http";
  };
  admin: {
    repository: "disabled" | "http";
  };
};
```

Cette structure décrit les dépendances techniques, pas les feature flags.

```ts
export type FeatureFlags = {
  aiImportEnabled: boolean;
  adminEnabled: boolean;
};
```

Ne pas mélanger :

- **adapter mode** : comment une capacité est fournie ;
- **feature flag** : si une capacité produit est visible ou autorisée ;
- **plan/quota** : si l'utilisateur courant peut l'utiliser.

Pour un mode `disabled`, préférer un adapter explicite qui implémente le port et
throw une `FeatureUnavailableError`. Le feature flag empêche normalement
l'accès à l'UI, mais le container reste complet et typé. Éviter de propager des
ports optionnels et des vérifications `if (!repository)` dans tous les use
cases.

### Profils d'environnement

```ts
const PROFILES = {
  test: {
    auth: { service: "memory" },
    inventory: {
      repository: "memory",
      fileAssets: "memory",
      fileStorage: "memory",
    },
    reminders: { repository: "memory" },
    aiImport: { repository: "memory" },
    profile: { repository: "memory" },
    admin: { repository: "disabled" },
  },

  localIntegration: {
    auth: { service: "http" },
    inventory: {
      repository: "http",
      fileAssets: "http",
      fileStorage: "r2",
    },
    reminders: { repository: "http" },
    aiImport: { repository: "http" },
    profile: { repository: "http" },
    admin: { repository: "http" },
  },

  production: {
    auth: { service: "http" },
    inventory: {
      repository: "http",
      fileAssets: "http",
      fileStorage: "r2",
    },
    reminders: { repository: "http" },
    aiImport: { repository: "http" },
    profile: { repository: "http" },
    admin: { repository: "http" },
  },
} satisfies Record<string, AppAdapterConfig>;
```

Il reste possible de surcharger un port :

```ts
const config = mergeConfig(PROFILES.localIntegration, {
  aiImport: { repository: "memory" },
});
```

La fusion doit être profonde, validée et testée. Éviter un spread superficiel
qui effacerait les autres ports de la feature.

### Parsing des variables

```ts
function parseMode<T extends string>(
  name: string,
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback;
  if (allowed.includes(value as T)) return value as T;
  throw new Error(
    `${name}=${value} est invalide. Valeurs: ${allowed.join(", ")}`,
  );
}
```

Exemple de variables explicites :

```bash
NEXT_PUBLIC_AUTH_ADAPTER=http
NEXT_PUBLIC_INVENTORY_REPOSITORY=http
NEXT_PUBLIC_INVENTORY_FILE_ASSETS=http
NEXT_PUBLIC_INVENTORY_FILE_STORAGE=r2
NEXT_PUBLIC_REMINDERS_REPOSITORY=http
NEXT_PUBLIC_AI_IMPORT_REPOSITORY=http
NEXT_PUBLIC_PROFILE_REPOSITORY=http
NEXT_PUBLIC_ADMIN_REPOSITORY=http
BACKEND_URL=http://localhost:8788
```

Dans Kubora, les adapters navigateur utilisent `/api`. `BACKEND_URL` est
strictement serveur et réservé au proxy Next local ; en production, le Worker
front utilise un service binding Cloudflare. Une URL d'infrastructure ne doit
pas être exposée dans une variable `NEXT_PUBLIC_*`.

## 7. Builders de dépendances par feature

Chaque feature exporte un builder typé. Le builder reçoit sa configuration ; il
ne lit pas directement `process.env`.

```ts
export type AuthDependencies = {
  authService: AuthService;
};

export async function buildAuthDependencies(
  config: AppAdapterConfig["auth"],
  shared: BaseInfrastructure,
): Promise<AuthDependencies> {
  switch (config.service) {
    case "memory": {
      const { MemoryAuthService } = await import(
        "../adapters/memory/MemoryAuthService"
      );
      return { authService: new MemoryAuthService() };
    }

    case "http": {
      const { HttpAuthService } = await import(
        "../adapters/http/HttpAuthService"
      );
      return {
        authService: new HttpAuthService(
          shared.backendUrl,
          shared.publicRequest,
        ),
      };
    }
  }
}
```

Les imports dynamiques :

- évitent de charger tous les adapters dans le bundle initial ;
- rendent les dépendances optionnelles ;
- n'excusent pas une absence de typage ou de gestion d'erreur.

Exemple inventory avec dépendance cross-feature contrôlée :

```ts
export type InventoryDependencies = {
  itemRepository: ItemRepository;
  fileAssetRepository: FileAssetRepository;
  fileStorage: FileStorage;
  authContext: AuthContext;
  clock: Clock;
  idGenerator: IdGenerator;
};

export async function buildInventoryDependencies(
  config: AppAdapterConfig["inventory"],
  shared: RuntimeInfrastructure,
  auth: AuthDependencies,
): Promise<InventoryDependencies> {
  return {
    itemRepository: await buildItemRepository(
      config.repository,
      shared,
    ),
    fileAssetRepository: await buildFileAssetRepository(
      config.fileAssets,
      shared,
    ),
    fileStorage: await buildFileStorage(config.fileStorage, shared),
    authContext: new AuthServiceContext(auth.authService),
    clock: shared.clock,
    idGenerator: shared.idGenerator,
  };
}
```

`AuthServiceContext` adapte le port de la feature auth au besoin minimal
`currentUserId()` de l'inventaire. L'inventaire ne dépend pas de
`HttpAuthService`.

Le transport public et le transport authentifié sont deux capacités
différentes :

```ts
export type BaseInfrastructure = {
  backendUrl: string;
  publicRequest: PublicRequest;
  clock: Clock;
  idGenerator: IdGenerator;
};

export type RuntimeInfrastructure = BaseInfrastructure & {
  authenticatedRequest: AuthenticatedRequest;
};
```

Si `Clock` ou `IdGenerator` n'est utilisé que par une feature, il reste dans
les ports de cette feature et son builder le construit. Il rejoint
`BaseInfrastructure` uniquement lorsqu'il devient une capacité générique
partagée avec une sémantique stable.

Le transport public permet notamment `login` et `refresh`. Le transport
authentifié est construit après `AuthService`, car son traitement des `401`
peut appeler `authService.refresh()`. Cette séquence évite une dépendance
circulaire cachée.

## 8. Composition root

### Types groupés par feature

Préférer une structure imbriquée à une grande liste plate :

```ts
export type AppDependencies = {
  auth: AuthDependencies;
  inventory: InventoryDependencies;
  reminders: ReminderDependencies;
  aiImport: AiImportDependencies;
  profile: ProfileDependencies;
  admin: AdminDependencies;
};

export type AppUseCases = {
  auth: AuthUseCases;
  inventory: InventoryUseCases;
  reminders: ReminderUseCases;
  aiImport: AiImportUseCases;
  profile: ProfileUseCases;
  admin: AdminUseCases;
};
```

Avantages :

- le propriétaire d'une dépendance est visible ;
- moins de collisions de noms ;
- overrides ciblés ;
- suppression d'une feature plus simple ;
- autocomplétion plus lisible.

### Construction ordonnée

```ts
async function buildDefaultDependencies(
  config: AppConfig,
): Promise<AppDependencies> {
  const base = buildBaseInfrastructure(config);

  const auth = await buildAuthDependencies(
    config.adapters.auth,
    base,
  );

  const runtime: RuntimeInfrastructure = {
    ...base,
    authenticatedRequest: createAuthenticatedRequest({
      publicRequest: base.publicRequest,
      authService: auth.authService,
    }),
  };

  const [inventory, reminders, aiImport, profile, admin] =
    await Promise.all([
      buildInventoryDependencies(
        config.adapters.inventory,
        runtime,
        auth,
      ),
      buildReminderDependencies(
        config.adapters.reminders,
        runtime,
      ),
      buildAiImportDependencies(
        config.adapters.aiImport,
        runtime,
      ),
      buildProfileDependencies(
        config.adapters.profile,
        runtime,
      ),
      buildAdminDependencies(
        config.adapters.admin,
        runtime,
      ),
    ]);

  return {
    auth,
    inventory,
    reminders,
    aiImport,
    profile,
    admin,
  };
}
```

Construire d'abord les dépendances partagées nécessaires aux autres builders.
Paralléliser seulement les builders réellement indépendants.

Ordre recommandé :

```text
configuration validée
  -> infrastructure publique
    -> AuthService
      -> transport authentifié avec refresh
        -> adapters protégés des autres features
          -> use cases
```

### Construction des use cases

```ts
function buildUseCases(deps: AppDependencies): AppUseCases {
  return {
    auth: {
      login: new LoginUser(deps.auth.authService),
      refresh: new RefreshUser(deps.auth.authService),
      logout: new LogoutUser(deps.auth.authService),
    },
    inventory: {
      addItem: new AddItem(
        deps.inventory.itemRepository,
        deps.inventory.authContext,
        deps.inventory.clock,
      ),
      listItems: new ListItems(
        deps.inventory.itemRepository,
        deps.inventory.authContext,
      ),
    },
    // autres features...
  };
}
```

Les use cases peuvent être construits une seule fois si leurs dépendances sont
immuables. Si le container autorise des overrides après initialisation, il doit
reconstruire les use cases concernés ou les créer à la demande.

## 9. Container et durées de vie

### API attendue

```ts
export interface Container {
  readonly features: {
    auth: {
      readonly ports: Readonly<AuthDependencies>;
      readonly usecases: Readonly<AuthUseCases>;
    };
    inventory: {
      readonly ports: Readonly<InventoryDependencies>;
      readonly usecases: Readonly<InventoryUseCases>;
    };
    // ...
  };

  ready(): Promise<void>;
  override(overrides: DependencyOverrides): Promise<void>;
  reset(): Promise<void>;
  dispose(): Promise<void>;
}
```

Les overrides sont typés par feature sans rendre les méthodes internes des
ports optionnelles :

```ts
export type DependencyOverrides = {
  auth?: Partial<AuthDependencies>;
  inventory?: Partial<InventoryDependencies>;
  reminders?: Partial<ReminderDependencies>;
  aiImport?: Partial<AiImportDependencies>;
  profile?: Partial<ProfileDependencies>;
  admin?: Partial<AdminDependencies>;
};
```

### Singleton applicatif et containers isolés

```ts
let singleton: Container | null = null;

export function getContainer(): Container {
  singleton ??= createContainer(loadAppConfig());
  return singleton;
}

export function createContainer(
  config: AppConfig,
  overrides?: DependencyOverrides,
): Container {
  return new AppContainer(config, overrides);
}
```

- `getContainer()` sert à l'application.
- `createContainer()` crée une instance isolée pour les tests, Storybook ou un
  environnement embarqué.
- Un test ne doit pas modifier le singleton partagé par d'autres tests.

### Overrides

Un override reçoit des **instances conformes aux ports**, jamais des noms de
classe :

```ts
const container = createContainer(testConfig, {
  inventory: {
    itemRepository: new MemoryItemRepository(fixtures),
    clock: new FixedClock("2026-07-24T10:00:00Z"),
  },
});
```

L'override doit :

1. attendre l'initialisation ;
2. disposer l'ancienne instance si nécessaire ;
3. fusionner profondément les dépendances ;
4. reconstruire les use cases affectés ;
5. rester attaché au même container.

Ne pas retourner accidentellement un nouveau container par défaut après
`override()`.

Lors de la création initiale, un port déjà fourni dans `overrides` ne doit pas
faire construire son adapter par défaut. Sinon une connexion ou subscription
inutile peut être ouverte puis oubliée.

### Ressources jetables

```ts
export interface Disposable {
  dispose(): Promise<void> | void;
}
```

Le container appelle `dispose()` sur :

- connexions ;
- workers internes ;
- subscriptions ;
- timers ;
- clients qui détiennent des ressources.

Les appels doivent être idempotents.

### Scopes

Définir la durée de vie de chaque dépendance :

| Scope | Exemple | Règle |
| --- | --- | --- |
| application navigateur | repositories HTTP, auth service, stores | une instance par onglet |
| transient | use case sans état | nouvelle instance ou instance immuable |
| requête serveur | contexte utilisateur SSR | une instance par requête |
| test | fakes et adapters memory | une instance isolée par test |

Ne jamais utiliser un singleton de processus pour conserver l'utilisateur
courant dans un environnement serveur multi-utilisateurs. Un container global
est acceptable dans le navigateur ; côté serveur, les dépendances liées à
l'utilisateur doivent être request-scoped.

## 10. Initialisation React et Next.js

Le container peut nécessiter une initialisation asynchrone. Un provider racine
empêche les stores d'être utilisés trop tôt :

```tsx
"use client";

const ready = getContainer().ready();

export function AppProviders({ children }: PropsWithChildren) {
  const [state, setState] = useState<
    "loading" | "ready" | "error"
  >("loading");

  useEffect(() => {
    let active = true;

    ready.then(
      () => active && setState("ready"),
      () => active && setState("error"),
    );

    return () => {
      active = false;
    };
  }, []);

  if (state === "error") throw new Error("Container initialization failed");
  if (state !== "ready") return <AppBootScreen />;

  return children;
}
```

La promesse d'initialisation doit être créée une seule fois, pas à chaque
render.

Pour une application avec Server Components, décider explicitement :

- quelles dépendances peuvent exister côté serveur ;
- quelles dépendances sont strictement navigateur ;
- si deux composition roots sont nécessaires.

Ne jamais importer dans un Server Component un adapter qui utilise
`window`, `File`, `localStorage` ou un store client.

## 11. Authentification et transport HTTP

Le transport authentifié est une dépendance d'infrastructure partagée par les
adapters HTTP.

```ts
export type PublicRequest = <T>(
  url: string,
  init?: RequestInit,
) => Promise<T>;

export type AuthenticatedRequest = <T>(
  url: string,
  init?: RequestInit,
) => Promise<T>;
```

Responsabilités possibles :

- ajouter l'access token ;
- envoyer les cookies avec `credentials` ;
- détecter un `401` ;
- dédupliquer un refresh concurrent ;
- rejouer la requête une seule fois ;
- nettoyer la session si le refresh échoue.

Il ne doit être appelé que par les adapters HTTP. Une feature ne doit pas
importer ce transport depuis un composant.

Le store auth reste l'autorité de l'état UI :

```text
LoginForm
  -> authStore.login()
    -> LoginUser.execute()
      -> AuthService.login()
        -> HttpAuthService
```

Un composant ne doit jamais faire :

```ts
const response = await authenticatedRequest("/auth/login");
useAuthStore.setState(response);
```

Cette duplication contourne validation, mapping, erreurs et règles du store.

## 12. Erreurs

Définir des erreurs applicatives stables :

```ts
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super("VALIDATION_ERROR", 400, message);
  }
}
```

Règles :

- l'adapter traduit les erreurs externes ;
- le use case produit des erreurs métier ;
- le store conserve une erreur exploitable ;
- le composant choisit la présentation ;
- les statuts HTTP ne doivent pas être tous aplatis en `500`.

Ne pas utiliser le texte d'une erreur comme seul contrat. Préférer `code`,
`status` et champs structurés.

## 13. API publique des features

`features/<feature>/index.ts` expose seulement ce qui peut être utilisé depuis
l'extérieur :

```ts
export { InventoryPage } from "./components/InventoryPage";
export { useInventoryStore } from "./store/inventory.store";
export type { Item } from "./domain/Item";
```

Ne pas exporter par défaut :

- adapters ;
- builders DI ;
- helpers privés ;
- DTO externes HTTP ;
- implémentations memory.

À l'intérieur d'une feature, les imports relatifs sont acceptables. À
l'extérieur, préférer l'API publique lorsqu'elle est établie.

## 14. Frontières ESLint et qualité statique

### 14.1 Frontières d'architecture

Exemple minimal :

```js
{
  files: [
    "src/features/**/components/**/*.{ts,tsx}",
    "src/app/**/page.{ts,tsx}",
  ],
  rules: {
    "no-restricted-globals": [
      "error",
      {
        name: "fetch",
        message: "Passe par le store puis un adapter HTTP.",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@/core/di/container",
            message: "L'UI ne doit pas appeler le container.",
          },
          {
            name: "@/config/env",
            message: "L'UI ne choisit pas sa configuration.",
          },
        ],
        patterns: [
          {
            group: [
              "@/features/**/adapters/**",
              "@/features/**/di/**",
              "@/features/**/ports/**",
              "@/features/**/usecases/**",
              "@/core/http/authenticated-request",
            ],
            message: "Violation de couche : passe par le store.",
          },
        ],
      },
    ],
  },
}
```

Ajouter progressivement des contraintes :

- le domaine ne peut importer que le domaine et certains utilitaires purs ;
- les adapters ne sont importés que par les builders DI et leurs tests ;
- le design system ne peut importer aucune feature ;
- les features ne peuvent importer le store d'une autre feature.

### 14.2 Analyse SonarJS reproductible

Installer `eslint-plugin-sonarjs` et conserver une configuration dédiée qui
compose la configuration ESLint principale avec le preset SonarJS recommandé :

```js
import sonarjs from "eslint-plugin-sonarjs";
import eslintConfig from "./eslint.config.mjs";

const sonarConfig = [
  ...eslintConfig,
  sonarjs.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];

export default sonarConfig;
```

Exposer au minimum les commandes suivantes :

```json
{
  "scripts": {
    "type-check": "tsc --noEmit --incremental false",
    "lint": "eslint .",
    "lint:sonar": "eslint . --config eslint.sonar.config.mjs",
    "lint:sonar:report": "eslint . --config eslint.sonar.config.mjs --format json --output-file sonar-eslint-report.json"
  }
}
```

Le rapport JSON est un artefact de travail ou de CI et ne doit pas être
committé. La commande Sonar retourne normalement un code non nul lorsqu'elle
trouve des problèmes : le fichier de rapport reste néanmoins exploitable.

`projectService: true` est obligatoire pour les règles Sonar qui ont besoin du
type checker TypeScript, par exemple les props React en lecture seule, les API
dépréciées et certaines comparaisons impossibles. Sans cette option, ces règles
restent affichées comme actives dans la configuration ESLint mais ne remontent
aucun diagnostic. On obtient alors un rapport faussement vert, différent de
SonarQube for IDE.

Le preset local doit couvrir notamment :

- ternaires imbriqués ;
- complexité cognitive ;
- expressions régulières dangereuses ;
- exceptions ignorées ;
- duplication ou fonctions identiques ;
- secrets et mots de passe codés en dur ;
- usages pseudo-aléatoires sensibles ;
- commentaires `TODO` laissés sans suivi.

Les règles bruyantes dans les tests peuvent recevoir une exception ciblée,
documentée et limitée aux fichiers de test. Ne jamais désactiver globalement
une famille de règles uniquement pour obtenir un rapport vert.

Le preset SonarJS local typé rend la majorité des règles TypeScript
reproductibles, mais il ne remplace pas le moteur officiel SonarQube. Un IDE
connecté à un serveur Sonar peut utiliser un analyseur ou un quality profile
différent. Pour une parité stricte entre terminal, IDE et CI, utiliser
SonarScanner avec SonarQube Server, SonarQube Cloud ou Community Build, puis
connecter l'IDE au même projet et au même quality profile.

### 14.3 Boucle de vérification pendant le développement

Ne pas attendre la fin d'un lot. Après chaque groupe cohérent de fichiers :

```bash
pnpm type-check
pnpm exec eslint chemin/du/perimetre
pnpm exec eslint chemin/du/perimetre --config eslint.sonar.config.mjs
pnpm test -- --runInBand chemin/du/test
```

Avant de déclarer un lot terminé :

```bash
pnpm type-check
pnpm lint
pnpm lint:sonar
pnpm test
```

Ajouter le build lorsque le changement touche le bundling, le rendu serveur,
les routes, la configuration ou le déploiement.

Pour un projet neuf, la cible est zéro erreur sur ces commandes. Pour un projet
existant avec dette :

1. générer et conserver une baseline dans les artefacts de CI ;
2. classer les alertes réelles et les faux positifs ;
3. interdire toute nouvelle alerte dans les fichiers modifiés ;
4. réduire progressivement la baseline ;
5. ne jamais masquer une régression par une désactivation globale.

Une IA doit lire les diagnostics, corriger ceux introduits ou touchés par son
travail, puis relancer les commandes. Elle ne doit pas annoncer un résultat
propre sur la seule base de `pnpm lint`.

## 15. Tests

### Règles du domaine

- fonctions pures ;
- matrices de cas ;
- dates, nullabilité et limites ;
- aucun mock de framework.

### Use cases

Construire avec des adapters memory ou fakes :

```ts
const repository = new MemoryItemRepository();
const auth = new FixedAuthContext("user-1");
const clock = new FixedClock("2026-07-24T10:00:00Z");
const usecase = new AddItem(repository, auth, clock);
```

Tester :

- nominal ;
- validation ;
- isolation ;
- absence de valeur inventée ;
- erreurs ;
- idempotence et concurrence si promises par le contrat.

### Adapters

Tester :

- sérialisation ;
- mapping API/domaine ;
- `null` et champs absents ;
- erreurs 400/401/403/404/409/429/500 ;
- retry autorisé ;
- isolation et auth.

### Stores

Préférer une factory injectée. Vérifier :

- `NOT_INITIALIZED` avant la première tentative ;
- premier chargement différent d'un refresh ;
- compteurs tentative/succès/erreur ;
- plusieurs exécutions simultanées de la même opération ;
- décrément par `executionId`, sans faux `IDLE` ;
- stratégie contre les réponses obsolètes ;
- scope par ressource et query lorsque nécessaire ;
- contexte de route sanitizé ;
- durée et timestamps avec une horloge contrôlée ;
- remise à zéro des opérations actives à l'hydratation ;
- mise à jour locale ;
- rethrow lorsque l'UI doit traiter l'erreur ;
- reset ;
- absence de double appel ;
- workflow de refresh auth.

### Configuration et DI

Tester :

- chaque profil ;
- chaque valeur d'adapter autorisée ;
- échec sur valeur inconnue ;
- partage d'instances attendu ;
- override profond ;
- reset ;
- dispose ;
- containers isolés.

### Tests d'architecture

Ajouter un test ou ESLint qui échoue si :

- un composant importe un adapter ;
- une page utilise `fetch` ;
- le design system importe une feature ;
- le domaine importe React ou Next.js.

## 16. Ajouter une nouvelle feature

Checklist complète :

1. définir le vocabulaire dans `domain/` ;
2. écrire les invariants et tests du domaine ;
3. définir les ports minimaux ;
4. écrire les use cases ;
5. fournir un adapter memory fidèle si utile ;
6. fournir l'adapter réel ;
7. définir `<Feature>Dependencies` ;
8. définir `<Feature>UseCases` ;
9. créer le builder DI acceptant sa configuration ;
10. ajouter la feature dans `AppAdapterConfig` ;
11. ajouter ses profils test/local/prod ;
12. brancher dependencies et use cases dans la composition root ;
13. créer une factory de store ;
14. brancher les composants sur le store ;
15. exposer l'API publique minimale ;
16. ajouter les règles ESLint si une nouvelle frontière apparaît ;
17. tester config, DI, use cases, store et adapter ;
18. exécuter TypeScript, ESLint et SonarJS sur le périmètre modifié ;
19. vérifier qu'aucune nouvelle dette Sonar n'est introduite ;
20. documenter les variables d'environnement.

## 17. Anti-patterns à refuser

### Réseau dans l'UI

```ts
// Interdit
await fetch("/items");
```

### Container dans un composant

```ts
// Interdit
await getContainer().usecases.addItem.execute(input);
```

### Adapter dans un use case

```ts
// Interdit
class AddItem {
  private repository = new HttpItemRepository();
}
```

### Choix d'environnement dans le domaine

```ts
// Interdit
if (process.env.NODE_ENV === "test") return fakeItem;
```

### Store utilisé comme repository

```ts
// Interdit
class AddItem {
  execute() {
    useInventoryStore.setState(...);
  }
}
```

### Faux adapter memory

Un adapter memory qui ignore isolation, validation ou idempotence donne des
tests verts pour un comportement qui échouera en production.

### Fallback silencieux en production

```ts
// Dangereux
default:
  return new MemoryRepository();
```

En production, une configuration inconnue doit empêcher le démarrage.

### Service locator dans le domaine

Le domaine ne doit pas appeler `getContainer()`. L'injection doit être visible
dans le constructeur.

### Abstraction universelle prématurée

Ne pas créer un `BaseRepository<T>` générique qui efface le vocabulaire métier.
Les ports doivent rester spécifiques aux besoins de la feature.

## 18. Ordre de reconstruction pour une IA

### Phase A — Socle

1. créer l'arborescence ;
2. configurer TypeScript strict et l'alias `@/*` ;
3. créer erreurs, logger et validation pure ;
4. créer `AppAdapterConfig` et ses profils ;
5. créer le container vide et le provider d'initialisation ;
6. installer les frontières ESLint ;
7. installer l'analyse SonarJS exécutable en CLI et dans la CI.

### Phase B — Feature pilote

1. choisir une feature CRUD simple ;
2. construire domaine, ports, use cases ;
3. créer adapter memory ;
4. créer builder DI et store ;
5. créer une page mince ;
6. tester toutes les couches ;
7. seulement ensuite créer l'adapter HTTP.

### Phase C — Capacités transverses

1. authentification ;
2. transport HTTP authentifié ;
3. contexte utilisateur injecté ;
4. fichiers ;
5. notifications et observabilité.

### Phase D — Généralisation

1. ajouter les autres features une par une ;
2. ne généraliser qu'après deux usages réels ;
3. renforcer les règles d'architecture ;
4. documenter chaque choix d'adapter.

## 19. Critères d'acceptation de l'architecture

La reconstruction est conforme si :

- [ ] une feature métier est testable sans React ni réseau ;
- [ ] chaque use case reçoit ses dépendances dans son constructeur ;
- [ ] aucun composant/page n'utilise `fetch` ou le container ;
- [ ] chaque adapter peut être remplacé sans modifier le use case ;
- [ ] deux features peuvent utiliser des modes d'adapter différents ;
- [ ] un test peut injecter une horloge et un repository déterministes ;
- [ ] une valeur de configuration inconnue échoue avant le rendu ;
- [ ] l'initialisation asynchrone est attendue une seule fois ;
- [ ] les ressources jetables sont libérées ;
- [ ] les erreurs conservent code, statut et détails structurés ;
- [ ] les DTO externes ne traversent pas l'adapter ;
- [ ] le design system ne dépend d'aucune feature ;
- [ ] les stores ne contiennent pas de règles métier dupliquées ;
- [ ] chaque use case/action possède un état d'opération distinct ;
- [ ] l'UI distingue premier chargement, refresh et retry ;
- [ ] les appels concurrents ne produisent ni faux `IDLE` ni réponse obsolète ;
- [ ] les métriques de session sont séparées des analytics produit ;
- [ ] les règles ESLint rendent les violations principales impossibles ;
- [ ] les règles SonarJS sont exécutables hors de l'IDE ;
- [ ] aucune nouvelle alerte Sonar n'est introduite par les fichiers modifiés ;
- [ ] le type-check, ESLint, SonarJS et les tests ont été exécutés pendant le lot ;
- [ ] les profils test, local intégré et production sont couverts.

## 20. Prompt de démarrage pour une IA

Le texte suivant peut accompagner ce document :

```text
Construis l'architecture src de l'application en appliquant strictement le
blueprint joint.

Commence par proposer la liste des features métier et la matrice des adapters
par environnement. N'invente pas de logique métier absente du brief.

Implémente ensuite le socle et une seule feature pilote de bout en bout :
domaine, ports, use cases, adapters memory/http, builder DI, container, store,
page mince, règles ESLint et tests.

Les composants et pages ne doivent jamais appeler fetch, authenticatedFetch,
les use cases ou le container directement. Chaque feature doit pouvoir choisir
ses adapters indépendamment. Toute dépendance externe doit être derrière un
port et sélectionnée dans la composition root.

Modélise l'état asynchrone par opération/use case, avec compteurs d'exécution,
premier chargement, refresh, retry, concurrence, durée et contexte de route
sanitisé. N'utilise pas un unique status global pour une feature.

Avant de terminer, prouve avec des tests qu'un adapter peut être remplacé et
que deux features peuvent fonctionner avec des modes différents. Prouve aussi
que deux appels concurrents ne créent ni faux état idle ni écrasement par une
réponse obsolète.

Après chaque incrément cohérent, exécute le type-check, ESLint standard,
SonarJS et les tests ciblés. Avant de terminer, exécute les contrôles complets.
Ne considère jamais un simple `pnpm lint` comme une preuve suffisante et
n'introduis aucune nouvelle alerte par rapport à la baseline Sonar existante.
```

## 21. Décisions à demander avant de générer le code

Une IA doit obtenir ou fixer explicitement :

1. la liste des features métier ;
2. le framework d'interface et son mode de rendu ;
3. la présence d'un backend séparé ;
4. les environnements attendus ;
5. les adapters disponibles pour chaque feature ;
6. la stratégie d'authentification ;
7. les dépendances nécessitant une durée de vie ou un `dispose` ;
8. les données sensibles ;
9. les règles de date, monnaie et nullabilité ;
10. les besoins offline ;
11. la stratégie de tests ;
12. les contraintes de déploiement.

Si une réponse manque, l'IA doit choisir un défaut explicite et réversible,
jamais enfouir ce choix dans un composant ou un adapter.
