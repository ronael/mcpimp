# MCPIMP — roadmap produit

Dernier cadrage produit : 30 août 2026

## Rôle de ce document

Cette roadmap est la source de vérité pour l’évolution de MCPIMP. Elle décrit
des résultats attendus et leur ordre, pas des dates promises. Une phase ne
commence que lorsque les critères de sortie de la précédente sont remplis.

Le [plan de refactorisation frontend](refactor-plan.md) reste un sous-plan
historique. Ses derniers contrôles sont repris ici dans la phase de
stabilisation.

## Vision

MCPIMP doit permettre à un agent de retrouver, charger et utiliser le bon
savoir au bon moment, depuis un catalogue local traçable, sans exécuter du
contenu importé ni exposer de secrets.

MCPIMP est une **couche d'intelligence et de distribution de capabilities**. Il
aide un agent ou son harness à choisir une capability, à comprendre comment la
consommer et à charger le minimum de contexte utile. Il ne planifie pas les
tâches, ne pilote pas les sessions et ne remplace ni Codex, ni Claude Code, ni
un orchestrateur ou moteur de workflow.

Le produit évolue selon six axes :

1. **Pertinence** — la bonne capability et le bon fichier apparaissent en tête
   pour une intention exprimée naturellement, en français comme en anglais.
2. **Fiabilité** — un serveur MCP conforme, prévisible et testable avec les
   clients réellement utilisés.
3. **Opérations** — comprendre l’état du catalogue, des sources, des upstreams
   et de l’activité sans lire les fichiers à la main.
4. **Gouvernance** — contrôler qui peut appeler quoi avant d’envisager un mode
   hébergé ou partagé.
5. **Écosystème** — accueillir plus de composants et de sources sans diluer le
   modèle de capability.
6. **Exploitabilité agentique** — une capability ne doit pas seulement être
   trouvable : un agent doit pouvoir déterminer quand l'utiliser, quel contexte
   charger et comment en vérifier l'usage, sans transformer MCPIMP en
   orchestrateur.

## Principes de décision

- Le mode local reste le chemin principal tant que l’authentification et les
  permissions ne sont pas prêtes.
- Le contenu importé reste une donnée non fiable. Les scripts sont indexés,
  jamais exécutés implicitement.
- La recherche lexicale demeure le socle déterministe. Une recherche hybride
  ne sera ajoutée qu’après mesure de sa valeur sur un jeu de requêtes réel.
- Une nouvelle abstraction ou dépendance doit répondre à au moins deux cas
  concrets.
- La découverte est capability-first et le chargement reste progressif : une
  réponse plus volumineuse n'est pas une meilleure réponse si elle consomme du
  contexte inutilement.
- Les informations de consommation venues d'une source externe restent des
  données non fiables. Elles peuvent informer un harness, jamais autoriser
  implicitement un outil, un script ou une action.
- MCPIMP décrit, classe et distribue des capabilities ; le harness appelant
  conserve la responsabilité de planifier, exécuter, réessayer et arbitrer.
- Le dashboard expose l’état réel du serveur. Les maquettes statiques ne sont
  jamais une seconde source de vérité.
- Chaque évolution de protocole, d’ingestion ou de sécurité arrive avec des
  tests de non-régression.

## Socle livré

| Domaine | État disponible |
|---|---|
| Registry | Scan filesystem local et snapshot Cloudflare, IDs et URIs stables |
| Capabilities | Skills, ressources associées et configurations MCP upstream |
| Découverte | Liste, métadonnées, chargement progressif, recherche classée FR/EN et résolution capability-centric bornée |
| Ingestion | GitHub et catalogues web, provenance, hashes, licences et overrides |
| MCP | HTTP streamable, SSE legacy, tools, resources et proxy des tools upstream |
| Sécurité d’ingestion | Validation des chemins et hôtes, plafonds, contenu inerte, secrets via environnement |
| Opérations locales | Doctor en lecture seule, erreurs de port actionnables et arrêt avec flush du journal |
| Observabilité locale | Activité en mémoire, NDJSON persistant, expurgation et drawer de détail |
| Interface | Landing et documentation statiques, dashboard dynamique, en anglais et français |
| Qualité | Tests unitaires et d’intégration, typecheck et snapshot de build |

## Phase active et prochaine séquence

La **phase 1 — stabiliser la v1** est active. L’ordre d’exécution recommandé est :

| Ordre | Travail | Pourquoi maintenant |
|---|---|---|
| 1 | Socle CI de P1.6 | Protéger tous les changements suivants par tests, typecheck et build |
| 2 | Récupération et contexte minimal P1.1 | Mesurer la sélection d'une capability et le coût du contexte avant d'agrandir le catalogue |
| 3 | Compatibilité P1.2 | Formaliser les comportements observés avec Codex, Claude et les autres clients |
| 4 | Exactitude de sync P1.5 | Éviter qu’une suppression ou collision amont reste silencieuse |
| 5 | Observabilité P1.4 | Borner les logs et rendre les incidents filtrables après stabilisation du protocole |
| 6 | Validation visuelle et déploiement P1.6 | Fermer la v1 sur les deux surfaces publiques |

Ce séquencement peut changer pour une correction de sécurité ou de perte de
données, mais pas simplement pour ajouter une fonctionnalité plus visible.

## Phase 1 — stabiliser la v1

Objectif : rendre le serveur local fiable au quotidien et fermer les limites
déjà observées. Cette phase est prioritaire sur l’ajout de nouvelles familles
de contenu.

### P1.1 — récupération pertinente et contexte minimal

Le moteur possède déjà une base lexicale pondérée : champs, IDF, couverture de
requête, bonus de phrase, synonymes FR/EN, types de fichiers et intentions de
ressources. Le prochain travail doit mesurer la boucle complète de découverte :
retrouver la bonne capability, recommander le bon point d'entrée, puis charger
le minimum de contexte utile. Améliorer les poids de ranking n'est qu'un moyen.

Le premier routeur déterministe est livré : `resolve-capabilities` sélectionne
une principale et au plus deux supports, applique les cartes locales
`ROUTING.json`, exclut les conflits et retourne des points d'entrée sous budget.
Son corpus métier versionné est exécuté en CI ; il complète le benchmark de
recherche sans le remplacer.

Le corpus couvre maintenant 18 tâches, y compris l'absence de `taskMode`, et
un pilote réel A/B/C compare skill natif, MCP seul et MCP avec adaptateur. Les
cartes métier exactes priment sur le plafond lexical sans mêler confiance et
ranking.

- Constituer un corpus versionné de tâches et requêtes réelles : recherche
  exacte, formulation vague, intention de ressource, requête multilingue, faute
  courante et recherche limitée à une capability.
- Associer à chaque cas une capability principale attendue, des alternatives
  acceptables, les fichiers nécessaires, les résultats indésirables et un budget
  de contexte raisonnable.
- Calculer au minimum `Success@1`, `Recall@3` et le rang réciproque moyen, puis
  conserver le résultat de référence dans les tests ou artefacts de CI.
- Exiger que toutes les requêtes critiques trouvent la capability attendue dans
  le top 3 et que les améliorations ne dégradent pas silencieusement les autres
  familles de requêtes.
- Mesurer aussi le volume retourné avant la sélection, le nombre de capabilities
  inspectées et la précision du fichier recommandé. Un bon rang accompagné d'un
  payload inutilement volumineux reste un échec partiel.
- Retourner d'abord une liste compacte regroupée par capability, avec la raison
  du classement et le meilleur fichier candidat, plutôt qu'une liste plate où
  une capability volumineuse peut occuper plusieurs positions.
- Rendre le score explicable en mode diagnostic : termes reconnus, poids des
  champs, couverture, bonus, pénalités de fichier et intention détectée.
- Calibrer poids, synonymes et intentions depuis le corpus complet, jamais à
  partir d’un seul exemple remonté.
- Évaluer un ranking en deux étapes — capabilities puis fichiers internes — pour
  éviter qu'une capability très volumineuse occupe artificiellement les
  résultats.
- Distinguer le point d'entrée principal, aujourd'hui généralement `SKILL.md`,
  du contexte recommandé pour une intention et des fichiers à charger à une
  étape particulière. Le shortlist de headings couvre maintenant trois
  capabilities et six intentions ; deux routeurs internes réels exposent leurs
  chemins, types et tailles sans les transformer en dépendances obligatoires.
- Examiner le comportement par défaut de `load-capability`, qui peut actuellement
  charger une capability complète, sans casser les clients existants.
- Signaler les recherches sans résultat ou à faible confiance afin d’orienter
  l’amélioration des métadonnées et synonymes, sans télémétrie distante par
  défaut.
- Mesurer latence et consommation mémoire avec 10, 100 et 1 000 capabilities
  avant d’introduire un index persistant.
- Étendre le corpus de routage à partir d'incidents réels et mesurer séparément
  la qualité variable du résultat agentique, sans affaiblir les assertions
  déterministes sur la sélection et le budget.

Critère de sortie : le benchmark est reproductible en CI, les requêtes critiques
respectent leur top 3, les fichiers recommandés et le budget de contexte sont
contrôlés, chaque changement produit un rapport avant/après, et un résultat
inattendu peut être expliqué sans lire manuellement tout le catalogue.

### P1.2 — compatibilité MCP réelle

- Construire une matrice de compatibilité pour Codex, Claude Code, Claude
  Desktop, Cursor et Kimi.
- Vérifier les séquences `initialize`, notifications, tools et resources sur
  HTTP streamable et SSE.
- Maintenir les méthodes sondées par les clients et le bootstrap standard
  `server/discover` de MCP 2026-07-28 sans casser les clients 2025.
- Ajouter des tests de contrat pour les notifications sans réponse, les erreurs
  JSON-RPC, les annulations et les méthodes optionnelles supportées.
- Exécuter une sonde de processus local réelle couvrant `/health`, `initialize`,
  `notifications/initialized` et `tools/list`, indépendamment du catalogue mis
  en cache par le client MCP.
- Conserver le bootstrap agent dans les `instructions` de `initialize` pour
  2025 et de `server/discover` pour 2026 ; poursuivre la validation avec des
  clients produit qui activent réellement le protocole 2026.

Critère de sortie : aucun client supporté ne se déconnecte ou ne boucle à cause
d’une réponse MCPIMP invalide ; les écarts connus sont documentés.

### P1.4 — observabilité exploitable

Livré : le fichier NDJSON local est borné par taille et nombre d’archives via
variables d’environnement. L’API et le dashboard partagent les filtres client,
méthode, tool, statut, transport et période, puis exportent exactement la
sélection en JSON ou NDJSON. Chaque événement possède un identifiant de
corrélation ; les tools upstream namespacés exposent uniquement leur capability
et leur nom de tool, en complément des paramètres déjà expurgés.

`/activity` annonce explicitement `process-memory+ndjson` sur le runtime local
et `process-memory` sur Cloudflare. Dans les deux cas, l’API ne retourne que la
fenêtre du processus courant ; le fichier local est une archive séparée et
l’historique Worker ne doit pas être assimilé à un audit persistant.

Critère de sortie atteint : le journal reste borné, filtrable et fidèle à son
niveau de persistance sur chaque runtime.

### P1.5 — exactitude de la synchronisation

Livré : le rapport compare désormais chaque découverte avec les manifests déjà
gérés. Les suppressions et renommages restent visibles sans suppression locale,
les dépôts déjà déclarés sont exclus des candidats de catalogue, et les
collisions `upstream/overrides` indiquent si les contenus sont identiques ou
divergents. Les régressions couvrent suppressions, renommages et changements de
namespace.

- Signaler une capability disparue de sa source au lieu de la faire disparaître
  silencieusement du rapport.
- Exclure des candidats de catalogue les dépôts déjà couverts par une autre
  source déclarée.
- Rendre visibles les collisions et divergences entre `upstream/` et
  `overrides/`, sans fusion automatique risquée.
- Ajouter des fixtures de régression pour suppressions, renommages et
  changements de namespace.

Critère de sortie : une synchronisation ne masque aucune suppression, collision
ou provenance ambiguë.

### P1.6 — qualité et déploiement

Livré : la CI exécute tests, évaluations de recherche/routage, typecheck et build
sur chaque pull request et push vers `main`. Le dashboard est contrôlé dans un
navigateur réel aux largeurs desktop et mobile, sans débordement global ni
erreur console. GitHub Pages est activé, son workflow teste les routes anglaises,
françaises et documentaires après chaque déploiement. Le Worker Cloudflare est
validé par dry-run, profil de démarrage et smoke tests de santé, activité et
handshake MCP. La procédure [`docs/release.md`](release.md) sépare clairement
les deux surfaces et décrit leur rollback.

Critère de sortie atteint : un changement ne peut pas être publié si le
protocole, le snapshot ou le site ne passent pas leurs contrôles automatisés.

## Phase 2 — opérer le catalogue sans friction

Objectif : administrer MCPIMP depuis ses interfaces plutôt qu’en recoupant CLI,
fichiers et logs.

### P2.1 — santé des sources et upstreams

P2.1 livré : chaque `sources:sync` persiste atomiquement le dernier contrôle
dans `logs/source-health.json`; `GET /sources` et le dashboard distinguent la
dernière vérification, la dernière synchronisation appliquée, les révisions
locale/disponible, les erreurs neutralisées et les changements en attente. Un
contrôle ciblé préserve l’état connu des autres sources. Côté upstream,
`tools/list` isole chaque serveur externe, applique un
timeout explicite de 5 secondes et conserve pendant 60 secondes la dernière
liste de tools valide. Un échec de rafraîchissement sert ce cache en état
`stale` sans masquer les tools locaux. L’endpoint `GET /upstreams` et le
dashboard exposent disponibilité, latence, dernière vérification, catégorie
d’erreur neutralisée, expiration et invalidation du cache.

Critère de sortie atteint : les sources et upstreams peuvent être diagnostiqués
depuis les interfaces locales sans recouper manuellement commandes, manifests
et logs.

### P2.2 — workflow de mise à jour

Premier socle livré : une file de revue compacte expose les imports
`unreviewed` ou `review-required`, et `pnpm capabilities:review` écrit une
attestation atomique liée au `contentHash` courant. Le dashboard reste en
lecture seule ; l'application et l'attestation restent des actions CLI locales
explicites.

- Fournir un aperçu lisible des ajouts, mises à jour, suppressions et conflits.
- Conserver l’application des changements comme action explicite et ciblée.
- Produire un historique machine-readable des synchronisations appliquées.
- Ajouter un lien direct du dashboard vers les fichiers et la provenance
  concernés.

### P2.3 — maintenance du catalogue

- Détecter IDs dupliqués, liens morts, références manquantes et métadonnées
  incomplètes.
- Proposer des commandes de validation sans modifier le catalogue.
- Documenter les conventions de qualité minimales pour une capability locale ou
  synchronisée.

### P2.4 — contrat de consommation agent et harness

Objectif : formaliser ce qu'un agent doit pouvoir apprendre d'une capability
sans interpréter arbitrairement tout son contenu et sans donner à MCPIMP un rôle
d'orchestrateur.

- Expérimenter d'abord sur les formats existants et plusieurs capabilities
  réelles avant d'ajouter un manifeste ou un schéma dédié.
- Exposer progressivement les conditions d'utilisation et de non-utilisation,
  les points d'entrée, le contexte conditionnel, les outils requis et les
  critères de validation lorsqu'ils peuvent être déterminés sans ambiguïté.
- Distinguer une dépendance obligatoire, une capability recommandée, un outil
  utilisé, un ordre suggéré et un moyen de validation ; ne pas les réduire à un
  graphe générique de `dependencies`.
- Identifier chaque information comme déclarée par l'upstream, déduite par
  MCPIMP ou validée localement. Seule une politique explicite peut autoriser
  l'usage d'un outil ou une action.
- Évaluer des réponses MCP structurées et compactes pour les harnesses, tout en
  conservant une représentation textuelle compatible avec les clients actuels.

Critère de sortie : au moins deux familles de capabilities peuvent indiquer à
un agent quoi charger et comment contrôler le résultat, avec provenance et sans
exécution implicite ; le contrat reste optionnel pour les contenus existants.

Critère de sortie de phase : l'état opérationnel complet est visible, chaque
mutation reste explicite, réversible ou accompagnée d'une procédure de reprise,
et un agent peut consommer progressivement les informations disponibles sans
dépendre d'un format propriétaire obligatoire.

## Phase 3 — gouvernance et mode partagé

Objectif : établir les frontières de confiance avant toute exposition au-delà
de la machine locale.

### P3.1 — identité et permissions

- Ne plus confondre `User-Agent` et identité fiable.
- Définir une identité de client authentifiée pour les déploiements non locaux.
- Ajouter des politiques par agent ou groupe : capabilities visibles, tools
  appelables et upstreams autorisés.
- Refuser par défaut les actions absentes de la politique en mode partagé.

### P3.2 — secrets et audit

- Séparer configuration publique et références de secrets.
- Évaluer un stockage chiffré adapté au runtime au lieu de reproduire un coffre
  maison.
- Définir intégrité, rétention, accès et suppression pour un journal d’audit
  hébergé.
- Ajouter des événements de décision de politique sans stocker les contenus
  métier.

### P3.3 — architecture hébergée

- Choisir explicitement le stockage Cloudflare nécessaire pour catalogue,
  sessions et audit avant de promettre une persistance.
- Séparer les espaces personnels ou équipes et leurs quotas.
- Versionner les APIs et prévoir les migrations de données.

Critère de sortie de phase : aucun mode partagé n’est activé sans identité,
autorisation, isolation des données et politique d’audit testées.

## Phase 4 — étendre l’écosystème

Objectif : enrichir le modèle seulement après stabilisation des opérations et
de la gouvernance.

### P4.1 — nouveaux composants

- Formaliser les composants `prompt`, documentation, exemples, données et
  bundles de validation sans remettre `SKILL.md` au centre de tous les cas.
- Définir leurs règles de détection, indexation, lecture et provenance.
- Étudier le packaging d’une capability pour installation ou partage contrôlé.

### P4.2 — nouvelles sources

- Prioriser les adapters à partir de besoins réels : Git direct, API générique,
  sitemap ou registre de packages.
- Conserver une validation d’hôte, de chemin, de taille et de licence par
  adapter.
- Ne pas exécuter de rendu navigateur pour un catalogue sans modèle de menace et
  limite de ressources explicites.

### P4.3 — recherche sémantique éventuelle

- Partir du corpus et des métriques établis en P1.1, sans créer un benchmark
  parallèle.
- Identifier les échecs qui ne peuvent réellement pas être corrigés par les
  métadonnées, synonymes ou intentions structurées.
- Comparer recherche hybride et ranking lexical sur qualité, latence, coût,
  confidentialité et fonctionnement hors ligne.
- Garder un mode lexical disponible, déterministe et sans dépendance réseau.

### P4.4 — collaboration

- Étudier catalogues fédérés, export/import et espaces d’équipe.
- Ajouter des relations typées entre capabilities seulement si des cas
  d'installation, de consommation ou de composition les nécessitent ; ne pas
  en déduire un workflow imposé.
- Évaluer un format de plugin Codex comme distribution possible, sans remplacer
  la capability comme unité métier.

### P4.5 — évaluations de résultat agentique

- Prolonger le corpus de P1.1 pour comparer une tâche sans MCPIMP et avec
  MCPIMP, sans créer un second benchmark incompatible.
- Mesurer taux de réussite, contexte consommé, appels d'outils et reprises sur
  plusieurs exécutions contrôlées.
- Séparer les effets du retrieval, du contenu de la capability, du modèle et du
  harness avant d'attribuer une amélioration à MCPIMP.
- Ne pas faire de ces évaluations variables un remplacement des tests
  déterministes du registry et du protocole.

Critère de sortie de phase : chaque extension respecte les mêmes garanties de
provenance, sécurité, compatibilité et réversibilité que le socle.

## Sujets exploratoires, sans engagement

- **Vite ou React** : seulement si la complexité d’état client rend le rendu SSR
  actuel coûteux à maintenir. Le nombre de vues seul ne suffit pas.
- **Embeddings ou vector store** : seulement si les mesures montrent un gain net
  face au classement lexical.
- **Exécution de scripts importés** : hors périmètre par défaut. Toute évolution
  demanderait un tool explicite, une sandbox et un modèle de permissions.
- **Marketplace public** : après identité, signature, modération, licences et
  politique de retrait.
- **Coffre de secrets propriétaire** : à éviter tant qu’un service du runtime ou
  du système peut remplir ce rôle.

## Ordre de décision

```text
Mesure et garde-fous CI
  → sélection de capability et contexte minimal
    → conformité et cycle de vie
      → observabilité et synchronisation fiables
        → opérations et contrat de consommation
          → identité et permissions
            → mode partagé
              → extension et composition de l'écosystème
                → évaluations de résultat agentique
```

Une demande peut être explorée avant sa phase, mais elle ne devient prioritaire
que si elle débloque la phase active ou corrige un risque de sécurité ou de
perte de données.

## Entretien de la roadmap

- Mettre à jour la date et le socle livré après chaque évolution importante.
- Déplacer un item terminé dans le journal ci-dessous au lieu de le laisser dans
  une phase active.
- Ajouter pour tout nouvel item : problème observé, résultat attendu, critère de
  sortie et dépendances.
- Revoir l’ordre à chaque fin de phase, sans conserver une priorité devenue
  artificielle.
- Ne pas utiliser la roadmap comme backlog exhaustif ; les tâches de détail
  appartiennent aux issues ou plans d’implémentation.

## Journal des jalons

### Août 2026 — socle v1

- Registry capability-centric et IDs namespacés.
- Ingestion GitHub et catalogues web avec provenance et overrides.
- Recherche classée avec signaux de ressources et synonymes FR/EN.
- Corpus versionné et benchmark de retrieval avec rang, fichier recommandé et
  budget de contexte.
- Shortlist globale capability-first : huit capabilities maximum et un meilleur
  fichier chacune, sans perte de pertinence mesurée sur la référence initiale.
- Diagnostic de ranking optionnel : termes et IDF, champs, couverture, poids de
  fichier, intention ressource et bonus de phrase, sans alourdir le mode normal.
- Normalisation commune des requêtes et vocabulaires d'intention : les pluriels
  FR/EN de ressources conservent leur bonus et les deux cas concernés passent au
  rang 1 dans le corpus.
- Saturation de la fréquence des termes dans le corps : les longs documents ne
  gagnent plus par répétition seule ; le corpus atteint 91,7 % de `Success@1`,
  100 % de `Recall@3` et 100 % de précision du fichier recommandé.
- Proxy MCP upstream et transports HTTP streamable/SSE.
- Sonde MCP `resources/templates/list` prise en charge avec une liste vide ;
  `server/discover`, les headers de routage et les résultats complets de MCP
  2026-07-28 sont couverts par contrat et par `doctor` sur processus réel.
- Codes d'erreur JSON-RPC différenciés pour les méthodes inconnues, paramètres
  invalides, ressources absentes et erreurs internes.
- Heartbeat MCP `ping` pris en charge avec une réponse vide immédiate.
- Notifications `notifications/cancelled` acceptées sans réponse ni faux incident
  dans le journal ; l'éventuelle raison libre n'est pas conservée.
- Batches JSON-RPC pris en charge sur Streamable HTTP, avec réponses agrégées
  pour les requêtes et `202` vide pour les lots de notifications uniquement.
- Matrice de compatibilité versionnée pour les séquences Codex et Claude
  observées ; Cursor, Kimi et les validations live restent explicitement à faire.
- Premier pilote agent outcome avec Codex Luna : trois sélections et trois
  fichiers corrects sur trois scénarios ; le coût de chargement des longues
  capabilities devient le prochain signal produit à traiter.
- Outline Markdown ciblé via `capability-info(id, path)` et chargement d'un
  heading complet via `load-capability` : réduction mesurée de 60,9 à 70,8 % sur
  deux capabilities réelles, sans troncature arbitraire ; les titres racines qui
  enveloppent un document sont distingués des entrypoints réellement progressifs.
- Revalidation avec deux agents Luna : sélection de capability conservée et
  contenu chargé réduit de 91,8 %, mais tokens CLI en hausse de 37,0 % ; le
  shortlist/ranking de headings selon la requête réduit ensuite les outlines de
  49,7 % sur ces deux cas, avec cinq attentes de heading au rang 1 dans le corpus
  versionné ; deux headings routeurs exposent uniquement des fichiers internes
  validés par le registry. Un pilote Luna de routage adaptatif réduit ensuite le
  contenu chargé de 90,6 % face au chargement direct des fichiers liés.
- Revue locale liée au `contentHash` avec états `local`, `unreviewed`,
  `reviewed` et `review-required`, conservée par sync et exposée sans influencer
  le ranking. Le pilote A/B/C charge le routeur dans 3/3 cas et a produit deux
  régressions métier supplémentaires sans `taskMode`.
- Dashboard bilingue, connexion des agents et documentation des sources.
- Journal d’activité local expurgé avec API, persistance NDJSON et drawer de
  détail.
- Cycle de vie local fiabilisé : `EADDRINUSE` indique le PID et les actions
  possibles sans stack brute, `SIGINT`/`SIGTERM` ferment le serveur et flushent
  le journal. `pnpm run doctor` distingue endpoint configuré, santé joignable,
  initialisation MCP 2025, découverte MCP 2026 et outils listés, retourne un code non nul sur panne et
  expose un diagnostic JSON sans secret ; `--preflight` conserve les contrôles
  avant démarrage. Un test lance le vrai processus local et vérifie toute la
  séquence MCP sur socket.
- Installation comme service persistant et redémarrage automatique reportés à
  une évolution opérationnelle séparée ; aucun gestionnaire de processus n’est
  ajouté à la phase 1.
