# MCPIMP — roadmap produit

Dernier cadrage produit : 26 août 2026

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
| Découverte | Liste, métadonnées, chargement progressif et recherche classée FR/EN |
| Ingestion | GitHub et catalogues web, provenance, hashes, licences et overrides |
| MCP | HTTP streamable, SSE legacy, tools, resources et proxy des tools upstream |
| Sécurité d’ingestion | Validation des chemins et hôtes, plafonds, contenu inerte, secrets via environnement |
| Observabilité locale | Activité en mémoire, NDJSON persistant, expurgation et drawer de détail |
| Interface | Landing et documentation statiques, dashboard dynamique, en anglais et français |
| Qualité | Tests unitaires et d’intégration, typecheck et snapshot de build |

## Phase active et prochaine séquence

La **phase 1 — stabiliser la v1** est active. L’ordre d’exécution recommandé est :

| Ordre | Travail | Pourquoi maintenant |
|---|---|---|
| 1 | Socle CI de P1.6 | Protéger tous les changements suivants par tests, typecheck et build |
| 2 | Récupération et contexte minimal P1.1 | Mesurer la sélection d'une capability et le coût du contexte avant d'agrandir le catalogue |
| 3 | Cycle de vie P1.3 | Corriger les erreurs de démarrage et d’arrêt déjà rencontrées en usage réel |
| 4 | Compatibilité P1.2 | Formaliser les comportements observés avec Codex, Claude et les autres clients |
| 5 | Exactitude de sync P1.5 | Éviter qu’une suppression ou collision amont reste silencieuse |
| 6 | Observabilité P1.4 | Borner les logs et rendre les incidents filtrables après stabilisation du protocole |
| 7 | Validation visuelle et déploiement P1.6 | Fermer la v1 sur les deux surfaces publiques |

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
  étape particulière. Ne pas figer un schéma avant validation sur au moins deux
  capabilities réelles.
- Examiner le comportement par défaut de `load-capability`, qui peut actuellement
  charger une capability complète, sans casser les clients existants.
- Signaler les recherches sans résultat ou à faible confiance afin d’orienter
  l’amélioration des métadonnées et synonymes, sans télémétrie distante par
  défaut.
- Mesurer latence et consommation mémoire avec 10, 100 et 1 000 capabilities
  avant d’introduire un index persistant.

Critère de sortie : le benchmark est reproductible en CI, les requêtes critiques
respectent leur top 3, les fichiers recommandés et le budget de contexte sont
contrôlés, chaque changement produit un rapport avant/après, et un résultat
inattendu peut être expliqué sans lire manuellement tout le catalogue.

### P1.2 — compatibilité MCP réelle

- Construire une matrice de compatibilité pour Codex, Claude Code, Claude
  Desktop, Cursor et Kimi.
- Vérifier les séquences `initialize`, notifications, tools et resources sur
  HTTP streamable et SSE.
- Examiner les méthodes sondées par les clients, par exemple
  `resources/templates/list` ou `server/discover`, et répondre proprement sans
  inventer une extension non standard.
- Ajouter des tests de contrat pour les notifications sans réponse, les erreurs
  JSON-RPC, les annulations et les méthodes optionnelles supportées.

Critère de sortie : aucun client supporté ne se déconnecte ou ne boucle à cause
d’une réponse MCPIMP invalide ; les écarts connus sont documentés.

### P1.3 — cycle de vie du serveur local

- Transformer `EADDRINUSE` en message actionnable indiquant le PID et la commande
  de diagnostic, sans stack trace brute.
- Gérer proprement `SIGINT` et `SIGTERM`, notamment la fermeture et le flush du
  journal.
- Ajouter une commande `doctor` ou équivalente pour vérifier port, catalogue,
  variables upstream et permissions d’écriture.
- Décider si le rechargement du catalogue sans redémarrage est nécessaire après
  mesure de l’usage réel.

Critère de sortie : démarrage, arrêt et diagnostic sont compréhensibles sans
inspection manuelle des processus.

### P1.4 — observabilité exploitable

- Ajouter rotation et rétention configurables au fichier NDJSON.
- Ajouter filtres par client, méthode, tool, statut et période dans le dashboard.
- Permettre l’export explicite d’une sélection en JSON ou NDJSON.
- Corréler les appels HTTP, SSE et upstream sans journaliser les payloads
  sensibles.
- Définir clairement le comportement de `/activity` sur Cloudflare ; ne pas
  présenter un historique éphémère comme un audit persistant.

Critère de sortie : le journal reste borné, filtrable et fidèle à son niveau de
persistance sur chaque runtime.

### P1.5 — exactitude de la synchronisation

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

- Ajouter une CI dédiée qui exécute tests, typecheck et build sur chaque pull
  request et push vers `main`.
- Terminer le contrôle visuel responsive desktop/mobile prévu par le plan
  frontend.
- Valider le Worker Cloudflare et GitHub Pages après déploiement, avec smoke
  tests sur les routes publiques attendues.
- Documenter une procédure de release et de rollback minimale.

Critère de sortie : un changement ne peut pas être publié si le protocole, le
snapshot ou le site ne passent pas leurs contrôles automatisés.

## Phase 2 — opérer le catalogue sans friction

Objectif : administrer MCPIMP depuis ses interfaces plutôt qu’en recoupant CLI,
fichiers et logs.

### P2.1 — santé des sources et upstreams

- Afficher dernière synchronisation, révision disponible, erreurs et mises à
  jour en attente par source.
- Mesurer latence et disponibilité des upstreams avec timeouts explicites.
- Isoler l’échec d’un upstream pendant `tools/list` afin qu’un serveur externe
  indisponible ne masque pas les tools locaux.
- Mettre en cache prudemment les listes de tools upstream avec invalidation
  observable.

### P2.2 — workflow de mise à jour

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
- Sonde MCP `resources/templates/list` prise en charge avec une liste vide ; les
  sondes non standard comme `server/discover` restent explicitement refusées.
- Codes d'erreur JSON-RPC différenciés pour les méthodes inconnues, paramètres
  invalides, ressources absentes et erreurs internes.
- Heartbeat MCP `ping` pris en charge avec une réponse vide immédiate.
- Dashboard bilingue, connexion des agents et documentation des sources.
- Journal d’activité local expurgé avec API, persistance NDJSON et drawer de
  détail.
