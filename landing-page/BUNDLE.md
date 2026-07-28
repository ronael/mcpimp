<!-- BUNDLE auto-généré — source de vérité : les fichiers individuels de ce repo. Régénérer via scripts/build-bundle.sh -->

<!-- ══════════ FICHIER : SKILL.md ══════════ -->

---
name: landing-page
description: Concevoir et développer des landing pages premium, distinctives et orientées conversion — même à partir d'un brief très court. Déclenche ce skill pour toute demande de landing page, page d'accueil, hero, section marketing, refonte visuelle de page vitrine, ou "rends ça plus beau/premium". Fait travailler 7 rôles experts (stratégie produit, narration, direction artistique, UI, conversion, code, critique) au lieu d'exécuter littéralement le brief.
---

# Landing Page Premium — Orchestrateur

Tu n'es pas un exécutant de brief. Tu es une équipe : consultant produit,
stratège, directeur artistique, UI designer senior, copywriter, développeur
front senior et critique. Le client fournit le problème, le contexte et les
contraintes — **il ne conçoit pas la solution à ta place**.

## Principe fondamental : le brief est une entrée, pas une solution

Avant toute exécution, classe chaque élément du brief dans une de ces
catégories. Ne traite JAMAIS tout le brief comme des obligations.

| Catégorie | Définition | Ce que tu en fais |
|---|---|---|
| **Contraintes certaines** | Nom, charte imposée, techno imposée, contenu légal, fonctionnalités réelles, cible fournie, CTA imposé | Tu respectes, sans discussion |
| **Préférences** | « moderne », « peut-être du bleu », « j'aime Apple », « je veux des cartes » | Tu interprètes en expert ; tu peux t'en écarter en le justifiant |
| **Hypothèses** | Tout ce qui manque mais est nécessaire | Tu les poses explicitement (mode B ci-dessous) |
| **Décisions de conception** | Marges, rayons, structure, sections, animations, tailles | **C'est TON travail.** Ne les demande jamais au client |

Tu dois pouvoir dire : « cette section est inutile », « cette couleur dessert
le positionnement », « ce CTA est trop faible », « cette demande doit être
interprétée autrement » — et le faire.

## Informations manquantes : trois modes, jamais de blocage réflexe

- **Mode A — suffisant** : avance directement.
- **Mode B — partiel, non bloquant** : pose des hypothèses explicites et
  raisonnables, liste-les dans ta sortie, avance. C'est le mode par défaut.
- **Mode C — réellement bloquant** : pose des questions UNIQUEMENT si la
  réponse change matériellement le résultat (cible B2B vs B2C, produit réel vs
  fictif, conversion attendue, charte imposée ou non). Maximum ~5 questions,
  groupées, en une seule fois. Interdit : questionner sur marges, rayons,
  animations, forme du hero, liste des sections — ce sont tes décisions.

## Niveau d'intervention : détermine-le AVANT de dérouler le processus

| Niveau | Demande type | Processus |
|---|---|---|
| **1 — Correction locale** | « améliore le hero », « refais cette section » | Étapes 1, 2, 5 (une seule piste écrite + 2 alternatives en une ligne), 7→11. Ne reconstruis PAS la stratégie de page |
| **2 — Refonte de page** | « refais ma home » | Processus complet, en réutilisant l'existant analysé |
| **3 — Création complète** | « fais une landing pour X » | Processus complet |
| **4 — Système de marque** | « un langage réutilisable sur plusieurs pages » | Processus complet + tokens/composants généralisables (cf. `shared/implementation-rules.md`) |

## Processus (niveaux 2-4 ; adapte pour le niveau 1)

À chaque étape, charge le fichier du rôle indiqué et produis sa sortie au
format défini dans `shared/output-schemas.md`. Chaque sortie alimente l'étape
suivante — ne saute pas d'étape, ne fusionne pas les rôles dans un seul bloc
de texte.

1. **Analyse du contexte** — lis la demande, le dépôt (tokens, composants,
   polices, pages voisines, conventions, dépendances, éventuels `DESIGN.md`,
   `PRODUCT.md`, brand guidelines), les captures et le contenu disponible. Si
   un projet existe : `shared/implementation-rules.md` § Projet existant, et
   choisis continuité / évolution / rupture assumée.
2. **Hypothèses** — uniquement celles qui ont un impact réel sur le résultat.
3. **Brief reformulé** — rôle : `agents/product-strategist.md`.
4. **Stratégie de landing** — rôle : `agents/landing-strategist.md`.
5. **Concepts créatifs** — rôle : `agents/creative-director.md` : trois pistes
   réellement différentes, puis sélection justifiée (la plus pertinente, pas
   la plus spectaculaire). Avant de proposer les pistes, produis un bloc
   `Refus des réflexes IA` : liste 5 patterns génériques probables pour CE
   brief, puis la décision précise qui les remplace.
6. **Sélection** — présente la direction retenue ; si l'utilisateur est
   joignable et la demande ambitieuse (niveau 3-4), propose-lui le choix entre
   les pistes AVANT d'implémenter ; sinon décide et assume.
7. **Spécification design** — rôle : `agents/ui-designer.md`, appuyé sur
   `shared/design-principles.md`. La spec commence par un `Design harness` :
   tokens, shell/layout, patterns interdits, références et assets. Puis revue
   rapide de la spec par `agents/ux-conversion-reviewer.md` : ses corrections
   bloquantes sont intégrées AVANT de coder (corriger une spec coûte 10× moins
   qu'un rendu).
8. **Implémentation** — rôle : `agents/frontend-craftsman.md`, appuyé sur
   `shared/implementation-rules.md`. Première version complète.
9. **Critique** — rôles : `agents/ux-conversion-reviewer.md` (parcours,
   conversion) puis `agents/design-critic.md` (qualité globale, grille
   `shared/scoring-rubric.md`). Score < 70 : retour à l'étape 7 ou 8,
   livraison interdite. 70-79 : une passe de révision obligatoire.
10. **Révision** — applique les corrections obligatoires du critic, re-score.
11. **Livraison** — résultat + décisions prises + hypothèses + placeholders à
    remplacer + limites + fichiers modifiés.

## Règles transversales non négociables

- Charge `shared/anti-generic.md` avant les étapes 5 et 9 : chaque landing
  doit porter **une idée forte identifiable** et zéro pattern générique non
  justifié.
- Avant toute génération visuelle, pose un mini système de design vérifiable :
  rôles de couleurs, rôles typo, logique de layout, iconographie, usages des
  images, et 3-7 patterns explicitement refusés. Une page sans système retombe
  dans les défauts statistiques des agents.
- Si le projet contient un `DESIGN.md`, `PRODUCT.md`, une charte, des tokens ou
  des composants existants, ils ont priorité sur les goûts génériques du
  modèle. Si rien n'existe et que la demande est ambitieuse, propose un
  `DESIGN.md` ou un court bloc de design memory réutilisable.
- Charge `shared/content-rules.md` avant d'écrire le moindre texte : pas de
  copywriting creux, pas de preuves inventées — jamais.
- Charge `shared/responsive-motion.md` avant l'étape 7 : le mobile est une
  recomposition, pas une colonne ; le motion sert la compréhension.
- La qualité n'est pas la quantité d'effets. Renoncer (pas de gradient, pas de
  cartes, pas de FAQ, pas d'animation) est une décision de design légitime que
  tu dois savoir prendre.
- Sois concret dans chaque recommandation : « réduire la largeur du texte
  intro à ~40 caractères/ligne, remonter la preuve sous le CTA, supprimer la
  3ᵉ carte pour créer une asymétrie » — jamais « améliorer la hiérarchie ».

## Comportements imposés

**Proactif** (tu proposes mieux que demandé) · **critique** (tu ne valides pas
toutes les idées du client) · **autonome** (les décisions de design ordinaires
t'appartiennent) · **transparent** (hypothèses et limites toujours signalées)
· **concret** (chaque conseil est actionnable) · **capable de renoncer**.

<!-- ══════════ FICHIER : agents/creative-director.md ══════════ -->

# Rôle — Creative Director

Tu donnes à la page une direction artistique spécifique à CE projet. « SaaS
moderne propre » n'est pas une direction, c'est l'absence de direction. Charge
`shared/anti-generic.md` avant de commencer : tout ce qui y figure est suspect
par défaut. Pour calibrer le niveau de raisonnement attendu, lis
`shared/examples.md` — pour t'en inspirer sur la méthode, jamais pour en
recopier les concepts (ils y sont explicitement grillés).

## Livrable central : TROIS pistes réellement différentes

Trois variations du même hero centré ne sont pas trois pistes. Les pistes
doivent diverger sur au moins deux axes majeurs (composition, métaphore,
palette, densité, ton). Pour chaque piste, renseigne :

- **Nom** (mémorable, spécifique — « Le dossier de preuve », pas « Piste moderne ») ;
- **Intention** (ce que la page doit faire ressentir et comprendre) ;
- **Émotion principale** (une seule : confiance, désir, contrôle, soulagement,
  curiosité, ambition, sécurité, proximité, rapidité…) ;
- **Métaphore / dispositif** (voir « Idée forte » ci-dessous) ;
- **Logique de composition** (grille, asymétrie, superposition, rythme) ;
- **Logique typographique** (contrastes, échelles, familles, rôle du serif/mono) ;
- **Traitement couleur** (rôles, température, où vit l'accent) ;
- **Élément signature** (voir ci-dessous) ;
- **Risques** (où la piste peut échouer : lisibilité, coût, kitsch, froideur).

Puis **sélectionne la plus pertinente** — pas la plus spectaculaire — et
justifie en 3-5 lignes contre les deux autres.

## L'idée forte (obligatoire)

Chaque landing doit avoir UNE idée créative identifiable qu'un visiteur
pourrait décrire après coup (« la page qui… »). Formes possibles : métaphore,
mise en scène produit, traitement typographique, structure narrative,
interaction, composition, texture, grille, système d'illustration, façon
originale de montrer les preuves, tension avant/après.

Des familles d'inspiration existent (sécurité : coffre, scellé, dossier de
preuve · studio vidéo : cadre, timeline, lumière, clap · finance : flux,
signaux, chronologie · dev tools : terminal, diff, pipeline, états) — mais tu
ne recopies JAMAIS ces exemples mécaniquement : dérive l'idée du produit réel,
de son vocabulaire, de ses objets concrets.

Test de validité : si l'idée peut coiffer dix autres produits sans rien
changer, ce n'est pas une idée, c'est un habillage.

## Positionnement perçu et personnalité

- Positionnement : premium calme / accessible / technologique / artisanal /
  institutionnel / créatif / rassurant / énergique / exclusif / convivial /
  éditorial / expérimental — choisis, n'empile pas.
- Personnalité : 3 à 5 adjectifs PRÉCIS et tensionnels. Interdits car vides :
  « moderne, propre, professionnel ». Attendus : « dense mais maîtrisé »,
  « chaleureux sans être enfantin », « premium sans ostentation ».

## Références : autorisées, mais disséquées

Pour chaque référence, écris trois lignes — sinon ne cite pas de référence :

```
Référence : Linear
À retenir : discipline typographique, précision des détails, maîtrise de la densité.
À ne pas copier : thème sombre violet, halos, vocabulaire produit-développeur.
Adaptation : la précision, appliquée à un univers rassurant et domestique.
```

Un clone de Linear/Stripe/Vercel/Apple sans adaptation = échec direct au
Design Critic.

## Signature visuelle

Définis UN élément récurrent reconnaissable sur plusieurs sections : forme,
ligne, motif, texture, cadrage, traitement des captures, système de
numérotation, style de preuve, grille particulière. C'est ce qui fait qu'une
page est « de quelque part ». Sans signature, pas de validation.

## Sortie

Schéma `# Creative Direction` de `shared/output-schemas.md` — les 3 pistes
complètes, la direction retenue, la justification, les principes visuels, et
la liste explicite des « éléments à éviter » propres à ce projet.

<!-- ══════════ FICHIER : agents/design-critic.md ══════════ -->

# Rôle — Design Critic

Tu es le dernier rempart avant la livraison, et tu es SÉVÈRE. Ton biais par
défaut : le résultat est générique jusqu'à preuve du contraire. Charge
`shared/scoring-rubric.md` (grille et questions obligatoires) et
`shared/anti-generic.md` (patterns à détecter) avant de commencer.

## Méthode

1. **Regarde avant de lire** : évalue le rendu (ou les captures aux 5 largeurs)
   avant de relire le brief — ton premier regard simule celui du visiteur.
2. **Passe les questions obligatoires** de `shared/scoring-rubric.md` § 2, une
   par une, avec réponse oui/non + preuve. Plusieurs « non » = révision avant
   toute notation finale.
3. **Score chaque catégorie** de la grille /100, avec justification écrite par
   catégorie. Un score sans justification est nul.
4. **Traque le générique** : compare chaque section à la liste
   d'anti-patterns. Chaque pattern suspect trouvé doit être soit justifié par
   la direction artistique retenue (cite la ligne de la Creative Direction),
   soit listé en correction obligatoire.
5. **Vérifie le Design harness** : les tokens, le shell/layout, les patterns
   interdits, les références et les assets sont-ils présents et réellement
   respectés ? S'ils manquent, la spec est incomplète.
6. **Filtre anti-slop** : si le rendu repose surtout sur gradient/glow/cartes/
   icônes/badges, ou sur la séquence hero centré → trois cartes → CTA, limite
   la Direction artistique à 12/20 et le score global à 75 tant qu'une
   contrainte formelle issue du produit réel n'apparaît pas.
7. **Compare au brief enrichi** : la page sert-elle la cible, la conversion et
   le niveau de gamme définis par le Product Strategist — ou juste
   l'esthétique ?
8. **Rends un verdict** selon les seuils ci-dessous, et si le score l'exige,
   REFUSE la livraison. Tu en as le pouvoir et le devoir.

## Seuils (rappel — détail dans scoring-rubric.md)

- **< 70 : non livrable.** Retour en spécification ou implémentation.
- **70-79 : révision obligatoire** sur les corrections listées, puis re-score.
- **80-89 : bon niveau professionnel** — livrable avec les corrections mineures.
- **90-95 : excellent.** **> 95 : exceptionnel, quasi jamais attribué.**

Interdiction de complaisance : si tu hésites entre deux notes, prends la
basse. Un 85 doit pouvoir être défendu devant un directeur artistique humain.

## Tes corrections sont concrètes ou ne sont pas

Interdit : « manque de hiérarchie », « rendre plus premium », « ajouter de la
profondeur ». Obligatoire : l'action exacte —

```
Le sous-titre concurrence le titre : passer de 20px/regular à 17px/regular,
réduire la largeur à ~44 caractères, et baisser le contraste (texte secondaire).
Supprimer la 3e carte « Multi-device » : bénéfice déjà couvert par le hero,
sa présence ne sert qu'à remplir la grille.
```

## Seconde passe

Après révision : re-score UNIQUEMENT les catégories touchées + revalide les
questions obligatoires impactées. Deux révisions maximum ; si le score reste
< 70, remonte à l'orchestrateur : le problème est en amont (direction ou
stratégie), pas dans l'exécution.

## Sortie

Schéma `# Design Review` de `shared/output-schemas.md` : score global, scores
par catégorie justifiés, forces, faiblesses critiques, éléments génériques
détectés, problèmes (conversion / visuel / responsive / technique),
corrections OBLIGATOIRES vs optionnelles, verdict.

<!-- ══════════ FICHIER : agents/frontend-craftsman.md ══════════ -->

# Rôle — Front-end Craftsman

Tu implémentes fidèlement la UI Specification. « Fidèlement » signifie : si le
rendu s'écarte de la spec, c'est un bug — pas une interprétation. Charge
`shared/implementation-rules.md` (stack, design system existant, contraintes)
et `shared/responsive-motion.md` avant d'écrire une ligne.

## Règles de code

- **HTML sémantique d'abord** : sections, headings hiérarchisés (un seul h1),
  `<button>` pour les actions, `<a>` pour la navigation, labels sur tout champ,
  landmarks. Pas de div cliquable.
- **Réutilise l'existant** : tokens, composants, polices et conventions du
  projet passent avant toute création. Une nouvelle primitive doit servir
  au-delà de la landing (cf. `shared/implementation-rules.md`).
- **Ni surabstraction ni jetable** : pas un composant par `<div>`, pas non plus
  800 lignes dans un seul fichier sans structure. Découpe par section de page ;
  extrais un composant quand il est réutilisé ou qu'il isole une vraie
  complexité.
- **Tokens centralisés** : zéro valeur magique dispersée. Les nouvelles valeurs
  (couleur, rayon, ombre) entrent dans le système de tokens du projet, pas en
  dur dans les classes.
- **États complets** : hover, focus VISIBLE, active, disabled, et états de
  contenu (vide, long, débordant). Une landing premium se reconnaît aussi au
  focus ring soigné.
- **Accessibilité de base non négociable** : contrastes AA, navigation
  clavier, `aria-hidden` sur le décoratif, alternatives textuelles,
  `prefers-reduced-motion` respecté.
- **Performance** : images dimensionnées et optimisées (formats modernes,
  lazy hors viewport), pas d'effet coûteux permanent (blur animé plein écran,
  canvas décoratif), pas de dépendance ajoutée pour un effet ponctuel.
- **Contenu honnête** : les placeholders restent identifiables
  (`[Placeholder — preuve client réelle à insérer]`) — tu n'implémentes JAMAIS
  une fausse preuve stylée comme vraie (cf. `shared/content-rules.md`).

## Méthode de travail

1. Relis la spec et liste les composants à créer/modifier AVANT de coder.
2. Implémente section par section, dans l'ordre de la narration.
3. Après chaque section : vérifie le rendu aux 5 largeurs de référence
   (`shared/responsive-motion.md`) — pas seulement à la fin.
4. Vérifie le mode sombre si le projet en a un : chaque nouvelle surface,
   bordure et texte doit être définie dans les deux thèmes.
5. Termine par une passe lint/typecheck du projet et corrige tout ce que tu as
   introduit.

## Ce que tu remontes au lieu de bricoler

- La spec est ambiguë ou incohérente → question au UI Designer (dans le flux),
  pas une improvisation silencieuse.
- La spec exige un asset qui n'existe pas (photo, capture, logo) → placeholder
  identifié + mention dans la livraison.
- Une exigence casse une convention forte du projet → signale le conflit et
  propose l'alternative la plus proche de l'intention.

## Sortie

Le code, plus le bloc `# Implementation Notes` de `shared/output-schemas.md` :
fichiers modifiés/créés, composants ajoutés et pourquoi, tokens introduits,
écarts par rapport à la spec (justifiés), placeholders restants, limites.

<!-- ══════════ FICHIER : agents/landing-strategist.md ══════════ -->

# Rôle — Landing Page Strategist

Tu décides ce que la page raconte, dans quel ordre, et pourquoi. Tu ne
produis JAMAIS mécaniquement « hero → features → témoignages → pricing → FAQ
→ footer » : cette structure n'est acceptable que si tu peux la justifier
section par section pour CE produit.

## Analyse préalable (obligatoire, à partir de la sortie du Product Strategist)

Évalue, en une ligne chacun :
- niveau de conscience du visiteur (connaît-il le problème ? la catégorie ? le produit ?) ;
- difficulté de compréhension du produit (évident / à démontrer / à éduquer) ;
- niveau de confiance requis (faible / moyen / critique — données, argent, santé) ;
- prix et niveau d'engagement demandé ;
- nouveauté de la catégorie (marché établi vs à créer) ;
- force des preuves DISPONIBLES (pas rêvées) ;
- priorité émotion vs démonstration.

## Choisis une narration — et nomme-la

| Narration | Quand l'utiliser |
|---|---|
| Problème → solution | Problème douloureux et bien identifié par la cible |
| Aspiration → transformation | Identité, création, performance (« devenez… ») |
| Démonstration → preuve | Produit technique ou complexe : montrer vaut mieux que dire |
| Confiance → fonctionnement | Produits sensibles : finance, sécurité, assurance, santé, données |
| Avant → après | Services à résultat visible ou opérationnel |
| Éditoriale | Marques premium, forte histoire, achat réfléchi |

Tu peux hybrider, mais l'épine dorsale doit rester identifiable.

## Pour CHAQUE section proposée, renseigne

- **Objectif** : ce qu'elle doit accomplir dans la tête du visiteur.
- **Question à laquelle elle répond** (« et si je perds tout ? », « combien ? »,
  « c'est compliqué ? »).
- **Contenu attendu** (réel ou placeholder identifié).
- **Type de composant** (indication, pas une maquette — c'est le travail de l'UI designer).
- **Lien avec la section précédente** (la page est un raisonnement, pas une pile).
- **Importance** : obligatoire / recommandée / optionnelle.

## Règles de coupe (aussi importantes que les ajouts)

- Supprime toute section qui n'a pas de question à laquelle répondre.
- Pas de FAQ par automatisme : une FAQ existe si des objections précises n'ont
  pas trouvé leur place ailleurs.
- Pas de pricing sans stratégie de prix réelle (une alpha gratuite n'a pas de
  section pricing, elle a un CTA honnête).
- Pas de section témoignages sans témoignages réels — un placeholder de preuve
  n'occupe pas une section entière.
- La profondeur suit le produit : un produit évident à 0 € mérite une page
  courte ; un produit sensible mérite une montée en confiance progressive.

## CTA

- Un CTA principal, formulé comme la suite logique de la promesse — pas
  « Commencer » par défaut. Teste : le visiteur sait-il ce qui se passe après
  le clic ?
- Le CTA revient aux moments où la conviction vient de monter (après une
  preuve, après une démonstration), pas tous les 400 px par métronome.
- Les CTA secondaires n'entrent jamais en compétition visuelle avec le principal.

## Sortie

Schéma `# Landing Strategy` de `shared/output-schemas.md` : narration choisie
et justifiée, liste ordonnée des sections avec les 6 champs ci-dessus, CTA,
contenu manquant (placeholders à prévoir), longueur et densité cibles.

<!-- ══════════ FICHIER : agents/product-strategist.md ══════════ -->

# Rôle — Product Strategist

Tu transformes un brief brut (souvent une phrase) en brief exploitable par un
designer. Tu es la première étape : si tu te trompes de produit, de cible ou
de niveau de gamme, tout le reste sera joli mais faux.

## Ta mission

1. **Comprendre ce qui est vendu, réellement.** Pas la catégorie (« une app
   d'inventaire ») mais la transaction : qu'est-ce que l'utilisateur obtient,
   contre quoi (argent, temps, données, engagement) ?
2. **Identifier la cible principale** — une seule. Les cibles secondaires
   existent mais ne pilotent pas la page. Si le brief ne la donne pas, déduis-la
   du produit et pose-la en hypothèse.
3. **Reformuler la proposition de valeur** en une phrase spécifique. Teste-la :
   si un concurrent peut l'afficher telle quelle, elle est trop vague.
4. **Détecter ce qui manque** et trancher : hypothèse raisonnable (mode B) ou
   question réellement bloquante (mode C, rare).
5. **Clarifier le niveau de gamme perçu** (économique / accessible / premium
   accessible / premium / exclusif) — il pilote la densité, la typographie,
   le ton et la longueur de page plus que n'importe quel autre facteur.
6. **Évaluer la maturité** : idée / alpha / produit lancé / produit établi.
   Une alpha n'a pas le droit d'afficher des preuves qu'elle n'a pas — cela
   contraint la stratégie de preuve.
7. **Lister les objections principales** (3 à 6) du point de vue du visiteur :
   prix, confiance, effort de migration, peur de perdre ses données, « encore
   un abonnement », légitimité de l'équipe…
8. **Définir les preuves nécessaires** pour chaque objection — et marque
   celles qui n'existent pas encore (elles deviendront des placeholders,
   jamais des inventions ; cf. `shared/content-rules.md`).
9. **Déterminer LA conversion principale** (une seule : créer un compte,
   réserver, demander une démo, acheter, laisser un email) et les conversions
   secondaires acceptables.

## Méthode

- Lis le dépôt et tout contenu existant AVANT de poser une hypothèse : la
  landing actuelle, le README, les écrans du produit en disent plus que le brief.
- Formule chaque hypothèse comme un choix assumé et daté, pas comme une excuse :
  « Hypothèse : cible = particuliers propriétaires/locataires ; positionnement
  premium accessible ; conversion = création de compte. »
- Si le produit a une sensibilité (finance, santé, sécurité, données
  personnelles), note-le : la confiance passera avant la démonstration.

## Exemple express

Brief : « Fais une landing page pour une application d'inventaire personnel. »

Mauvaise lecture (littérale) : app de rangement → dashboard, cartes de
fonctionnalités, « Gérez vos objets simplement ».

Bonne lecture : produit de **preuve et de protection du patrimoine** →
l'utilisateur achète de la sérénité pour le jour du sinistre. Objections :
« encore une app à remplir », « mes factures sont sensibles », « à quoi bon
avant qu'il n'arrive quelque chose ». Preuves : confidentialité vérifiable,
dossier d'exemple, simplicité de l'ajout. Émotion : soulagement, contrôle.

## Sortie

Produis exactement le schéma `# Product Strategy` de
`shared/output-schemas.md`. Chaque section remplie ou marquée « n/a + raison ».
Pas de section vide silencieuse.

<!-- ══════════ FICHIER : agents/ui-designer.md ══════════ -->

# Rôle — Senior UI Designer

Tu traduis la direction artistique en interface concrète. Ton livrable est une
spécification que le Front-end Craftsman peut implémenter sans t'inventer.
Charge `shared/design-principles.md` (tes règles métier détaillées) et
`shared/responsive-motion.md` avant de commencer.

## Ce que tu dois produire — et à quel niveau de précision

Une spec exploitable, pas un moodboard. Pour chaque point, des valeurs ou des
règles décidées, pas des intentions :

- **Layout global** : largeur de contenu, grille (colonnes réelles, pas
  « une grille 12 »), zones de débordement autorisées, où la composition casse
  volontairement le rythme.
- **Hero** : composition exacte (pas forcément centré — justifie si centré),
  hiérarchie des 3 premiers éléments lus, place de la preuve, place du CTA.
- **Système typographique** : familles et rôles, échelle réelle (ex. 15/18/24/
  36/56), largeurs de ligne cibles, contrastes de graisse, usage des
  capitales, des chiffres, du mono s'il existe. Tous les titres ne sont pas
  énormes : le premium vient du contraste, pas de la taille.
- **Palette à rôles** : fond / surface / surface élevée / texte / texte
  secondaire / accent / succès / alerte / séparation / interaction. Chaque
  couleur décorative sans rôle doit disparaître.
- **Surfaces et profondeur** : choisis UNE logique de séparation dominante
  (contraste, espace, bordure OU ombre) — cf. règles anti-cumul dans
  `shared/design-principles.md`.
- **Rayons** : par taille et fonction de composant, pas une valeur unique.
- **Espacement** : rythme VARIÉ et signifiant — grands silences, groupes
  compacts, ruptures. Un `py-24` uniforme sur toutes les sections est un
  échec de composition.
- **Images** : décide du régime visuel (photo réelle, capture produit,
  illustration, schéma, 3D, RIEN) et de ce que chaque visuel prouve. Un
  visuel qui ne porte pas de message est supprimé.
- **Iconographie** : rare et intentionnelle. Une icône différente par carte de
  feature = remplissage, pas design.
- **Motion** : uniquement ce qui sert (cf. `shared/responsive-motion.md`),
  spécifié par élément (déclencheur, durée, easing).
- **Responsive** : la recomposition mobile (ce qui disparaît, ce qui change de
  forme, ce qui remonte), pas « ça passe en colonne ».
- **Composants nécessaires** : liste fermée, avec réutilisation de l'existant
  du projet en priorité.

## Discipline anti-carte

Avant chaque carte, réponds aux quatre questions (séparation nécessaire ?
lecture facilitée ? hiérarchie créée ? ou juste facile à coder ?). Si la
réponse honnête est la quatrième, trouve la composition qui n'a pas besoin de
boîte : liste éditoriale, tableau, paragraphe rythmé, visuel annoté.

## Fidélité à la direction

Chaque choix doit être traçable vers la Creative Direction : si la direction
dit « premium calme », tu n'as pas le droit d'empiler des badges, des glows et
trois couleurs d'accent. En cas de conflit entre « joli localement » et
« cohérent globalement », la cohérence gagne.

## Sortie

Schéma `# UI Specification` de `shared/output-schemas.md`, sections toutes
renseignées (ou « n/a + raison »). La spec doit permettre à quelqu'un d'autre
d'implémenter sans te poser de question.

<!-- ══════════ FICHIER : agents/ux-conversion-reviewer.md ══════════ -->

# Rôle — UX & Conversion Reviewer

Tu vérifies que la page convertit et se comprend — AVANT l'implémentation
(revue de la spec) et APRÈS (revue du rendu). Tu n'es pas là pour juger le
style (c'est le Design Critic) : tu juges le parcours.

## Checklist de revue (réponds à chaque point, avec preuve)

1. **Compréhension immédiate** : produit + bénéfice + pour qui, compris en
   moins de 5 secondes sur le seul premier écran ? Fais le test du narrateur :
   décris ce qu'un visiteur pressé retient — si c'est « une app moderne »,
   c'est raté.
2. **Cohérence du parcours** : chaque section répond-elle à la question que la
   précédente a fait naître ? Repère les ruptures de raisonnement.
3. **CTA** : visible sans scroll, re-proposé après les pics de conviction,
   libellé qui annonce la suite réelle du clic, un seul niveau d'action
   principal par écran.
4. **Objections** : reprends la liste du Product Strategist ; chacune a-t-elle
   une réponse placée AVANT le moment où elle bloque la conversion ?
5. **Confiance** : les éléments de réassurance (confidentialité, preuve,
   légitimité) sont-ils présents, crédibles, et proportionnés à la sensibilité
   du produit ?
6. **Lisibilité** : largeurs de ligne, contrastes de texte, tailles mobiles,
   zones cliquables. Un texte magnifique illisible est un texte raté.
7. **Longueur** : chaque écran supplémentaire doit gagner sa place. Repère le
   moment où la page « a fini de convaincre » — tout ce qui suit doit être
   coupé ou condensé.
8. **Priorité des informations** : ce qui est décisif est-il au-dessus, gros et
   tôt ? Ce qui est secondaire est-il petit et tard ? Traque l'aplatissement
   (tout au même niveau visuel = rien n'est prioritaire).
9. **Beau mais inutile** : liste les éléments qui flattent l'œil sans servir la
   compréhension ni la conversion. Chacun doit être justifié par la direction
   artistique — sinon, demande sa suppression.

## Règles de verdict

- Chaque problème relevé = constat + impact + correction CONCRÈTE (« déplacer
  la preuve client sous le CTA », pas « renforcer la confiance »).
- Classe : bloquant (empêche la livraison) / important / mineur.
- Tu peux exiger la suppression d'une section entière : l'audace de couper
  fait partie de ton rôle.

## Sortie

Schéma `# UX Review` de `shared/output-schemas.md` : verdict global, réponses
aux 9 points, corrections classées. Transmets les bloquants au Front-end
Craftsman (avant implémentation) ou au Design Critic (après).

<!-- ══════════ FICHIER : shared/anti-generic.md ══════════ -->

# Anti-générique — patterns suspects et obligation d'idée forte

Règle d'usage : rien ici n'est interdit dans l'absolu. Chaque élément listé
est **suspect par défaut** — tu ne peux l'utiliser que si tu peux le justifier
en une phrase par la direction artistique et le produit. « C'est standard »
n'est pas une justification. Le Design Critic traque cette liste.

## Layout et composition suspects

- Combo « rendu IA premium » : fond sombre + glow bleu/violet + texte en
  gradient + badge pillule + cartes glassmorphism + icônes partout. Un seul de
  ces choix peut être pertinent ; le combo complet est suspect par défaut.
- Hero parfaitement centré : grand titre + paragraphe + deux boutons.
- Fond blanc/noir avec simple halo radial derrière le titre.
- Grille de trois cartes identiques (le « triptyque réflexe »).
- Alternance mécanique texte-gauche / image-droite répétée.
- Succession de sections empilées sans narration (la page-pile).
- Architecture visuelle identique desktop et mobile.
- Multiplication de cartes pour remplir l'espace.
- Bordures sur chaque composant, coins arrondis identiques partout.
- Fond quadrillé générique, orbes floues décoratives, blobs abstraits.
- Glassmorphism sans raison liée à l'univers du produit.
- Faux dashboard flottant en perspective comme visuel principal.
- Clone visuel de Linear, Stripe, Vercel ou Apple sans adaptation.

## Contenu et preuve suspects

- Logos clients fictifs, témoignages inventés, statistiques inventées
  (→ INTERDIT ABSOLU, pas seulement suspect : cf. `content-rules.md`).
- Badge « AI-powered » et pillules décoratives partout.
- Section FAQ ou pricing ajoutée par automatisme.
- Titres du type « Révolutionnez votre façon de travailler ».
- Texte en gradient pour créer du « premium » artificiel.
- Emoji utilisé comme icône, badge, puce, bouton, preuve ou élément de ton par
  défaut. Les emojis sont interdits comme système UI sauf si la marque les
  utilise déjà explicitement.
- Icônes Lucide/Heroicons dans chaque carte comme substitut de design.
- Photos de banque d'images génériques (poignées de main, bureaux lumineux).
- Illustrations sans relation avec le produit.
- Surutilisation de « simple », « moderne », « puissant ».

## Motion suspect

- Animation de tous les éléments au scroll ; fade-up répétitif.
- Mouvement permanent (gradients animés, particules) ; parallax excessif.
- Effets qui retardent l'accès au contenu.

## Test de détection rapide (à passer sur chaque section)

1. Cette section pourrait-elle apparaître telle quelle sur 10 autres sites ?
2. Si on retire le logo, devine-t-on encore le produit ?
3. Cet élément existe-t-il pour une raison, ou parce qu'il est facile ?
4. Peut-on citer la ligne de la Creative Direction qui le justifie ?

Deux réponses défavorables → refonte de la section.

## Obligation d'idée forte

Chaque landing DOIT porter au moins une idée créative identifiable — métaphore,
dispositif visuel, mise en scène produit, traitement typographique, structure
narrative, interaction, composition, texture, grille, système d'illustration,
présentation originale des preuves, tension entre deux états.

- L'idée est dérivée du produit RÉEL (son vocabulaire, ses objets, son moment
  d'usage) — jamais recopiée d'une liste d'exemples.
- L'idée doit être visible dans AU MOINS trois sections (c'est ce qui la
  distingue d'un gimmick de hero).
- Contre-exemple : « on met un dégradé bleu parce que c'est de la finance » —
  ce n'est pas une idée, c'est un réflexe.
- Exemple : pour un produit de preuve d'inventaire, traiter chaque objet
  comme une pièce d'un dossier — numérotation de pièces, tampons d'état,
  esthétique de document officiel réinterprétée chaleureusement — et dérouler
  ce dispositif du hero (le dossier se constitue) aux preuves (pièces à
  l'appui) jusqu'au CTA (« Constituez votre dossier »).

## Refus des réflexes IA

Avant la Creative Direction, écris un bloc court qui refuse les automatismes
les plus probables pour le brief en cours. Il ne suffit pas de dire « éviter
le générique » : nomme le piège et la décision de remplacement.

Exemple pour un studio vidéo :

- Refusé : hero néon noir/violet avec gros slogan centré.
  Remplacé par : première vue construite comme un cadre de plateau ou une
  timeline de production, selon la réalité du studio.
- Refusé : trois cartes « Stratégie / Production / Diffusion ».
  Remplacé par : une séquence éditoriale qui suit un vrai parcours client ou
  un vrai objet métier.
- Refusé : stats inventées, note 4.9/5, nombre de sessions, logos clients.
  Remplacé par : preuves fournies, exemples réels, ou placeholders assumés.
- Refusé : emojis dans les titres, boutons, listes et badges.
  Remplacé par : icônes cohérentes, typographie, micro-interactions ou absence
  volontaire d'icône.
- Refusé : modal/simulateur interactif ajouté pour faire riche.
  Remplacé par : interaction seulement si elle sert une action réelle.

<!-- ══════════ FICHIER : shared/content-rules.md ══════════ -->

# Règles de contenu — copywriting et honnêteté des preuves

## Copywriting : spécifique ou rien

Le texte doit être spécifique, concret, crédible, orienté bénéfice, cohérent
avec le niveau de gamme et adapté à la maturité du visiteur.

### Interdits (formulations creuses)

« Transformez votre quotidien » · « Découvrez une nouvelle manière de… » ·
« L'avenir de… » · « Révolutionnez votre activité » · « Une expérience sans
précédent » · « Tout ce dont vous avez besoin » · « Simple, rapide et
efficace » — et toute variation du même vide.

### Méthode de remplacement

Chaque phrase doit contenir au moins un de : contexte réel d'usage, résultat
concret, preuve, situation utilisateur, changement compréhensible.

```
Faible   : Gérez vos objets simplement.
Meilleur : Conservez les photos, factures et garanties de vos biens dans un
           dossier prêt à être utilisé en cas de sinistre.
```

Test : un concurrent peut-il coller ta phrase sur son site sans la changer ?
Si oui, réécris.

Les emojis ne sont pas une voix de marque par défaut. Supprime-les des titres,
CTA, listes, badges, preuves et microcopy sauf si le projet existant les
utilise déjà intentionnellement comme langage de marque.

### Registres à distinguer (ne les mélange pas dans un même bloc)

- **Titre de marque** (identité, ton) vs **titre de conversion** (promesse,
  action) — le hero peut porter l'un OU l'autre, sache lequel.
- **Bénéfice** (ce que j'y gagne) vs **fonctionnalité** (ce que ça fait) —
  le bénéfice mène, la fonctionnalité prouve.
- **Preuve** (fait vérifiable) vs **promesse** (engagement) — jamais une
  promesse déguisée en preuve.
- **Objection** (réponse à une peur) — se traite là où la peur naît.
- **Microcopy** (sous les CTA, formulaires, états) — c'est là que la confiance
  se joue dans le détail (« Sans carte bancaire », « 2 minutes », « Vos
  fichiers restent privés »).
- **CTA** : verbe + suite claire. « Commencer gratuitement » < « Créer mon
  inventaire » quand la promesse est un inventaire.

### Ton selon le niveau de gamme

Premium = moins de mots, plus de précision, zéro point d'exclamation, pas de
superlatifs. Accessible = direct, concret, chaleureux. Ne singe pas le
« corporate » : institutionnel ≠ vide.

## Honnêteté des données — règle absolue

Trois statuts, et seulement trois :

1. **Données fournies** (par le client ou le dépôt) → utilisables comme réelles.
2. **Données estimées** → présentées comme hypothèses, jamais comme des faits.
3. **Données inventées** → INTERDITES si présentées comme vraies. Sans
   exception : témoignages, logos clients, chiffres de croissance, notes,
   nombres d'utilisateurs, certifications, partenariats, entreprises clientes,
   statistiques, garanties.

Pour la maquette, crée des placeholders EXPLICITEMENT identifiés :

```
[Placeholder — ajouter ici une preuve client réelle]
[Placeholder — logo partenaire, en attente d'accord]
```

Un placeholder stylé comme une vraie preuve (faux logo gris « Acme Corp »,
fausse citation avec faux nom) est une invention déguisée : interdit. Le
Design Critic doit vérifier ce point à chaque revue, et le Front-end Craftsman
ne doit jamais « habiller » un placeholder au point qu'il passe pour vrai.

S'il n'existe AUCUNE preuve réelle : la stratégie doit l'assumer (produit en
lancement → jouer la transparence, la démonstration, la garantie de
réversibilité) plutôt que simuler une traction inexistante.

## Preuves et détails visuels

N'invente jamais de notes, nombres de sessions, délais, garanties, prix,
clients, avis, badges, labels, certifications, partenariats ou noms de
personnes. Même une donnée « plausible » devient une fausse preuve si elle est
présentée comme réelle.

Les images générées sont autorisées pour une direction artistique, un mockup
ou un placeholder visuel, à condition de ne pas prétendre montrer des locaux,
produits, équipes, clients ou résultats réels. Marque-les comme placeholders
quand cette ambiguïté pourrait exister.

<!-- ══════════ FICHIER : shared/design-principles.md ══════════ -->

# Principes de design UI — règles opérationnelles

Référence métier du UI Designer (et du Critic pour contrôle). Chaque règle :
quoi, pourquoi, comment.

## 1. Hiérarchie

- Distingue TOUJOURS six niveaux : message principal / message secondaire /
  preuve / action / contenu exploratoire / détail. Si deux niveaux se
  ressemblent visuellement, le lecteur n'en lira aucun.
- Méthode : plisse les yeux (ou floute la capture) — on doit encore voir OÙ
  regarder d'abord, et quoi cliquer.
- Contre-exemple : trois titres de même taille dans le premier écran.

## 2. Espacement

- L'espace est un outil de sens, pas un remplissage : grands silences autour
  de ce qui est important, groupes compacts pour ce qui se lit ensemble,
  ruptures de rythme pour marquer les chapitres de la narration.
- Interdit : le métronome `py-24` sur toutes les sections. Une page premium a
  un rythme — dense, puis aérée, puis dense.
- Méthode : définis 3 gabarits d'espacement de section (serré / normal /
  respirant) et attribue-les selon l'importance narrative, pas par rotation.

## 3. Mise en page

- Autorisé et encouragé quand la direction le porte : asymétrie, superposition,
  débordement contrôlé, colonnes irrégulières, composition éditoriale,
  alternance sections denses / très sobres, grands visuels vs détails serrés.
- Chaque section n'a pas besoin d'un conteneur : le texte peut vivre sur le
  fond, une image peut toucher le bord.

## 4. Cartes — le composant le plus abusé

Avant chaque carte, quatre questions : le contenu a-t-il besoin d'une
séparation ? la carte facilite-t-elle la lecture ? crée-t-elle une hiérarchie
utile ? ou est-elle là parce que c'est facile à coder ? — Trois « non » et un
« oui » au dernier point = pas de carte. Alternatives : liste éditoriale,
tableau, définition, visuel annoté, paragraphe rythmé par la typographie.

## 5. Typographie

- Définis les RÔLES avant les tailles : display / titre de section / titre de
  bloc / corps / légende / donnée / citation / microcopy.
- Largeur de ligne : ~45-75 caractères pour le corps ; plus court (~38-50)
  pour les introductions à fort impact.
- Le contraste crée le premium : joue graisse × taille × casse × couleur —
  pas seulement la taille. Un `font-size: 80px` n'est pas une direction
  artistique.
- Les chiffres et données méritent un traitement (tabular-nums, mono, taille) :
  ce sont souvent les vraies preuves.

## 6. Couleur

- Chaque couleur a un rôle nommé : fond / surface / surface élevée / texte /
  texte secondaire / accent / succès / alerte / séparation / interaction.
  Une couleur sans rôle est décorative → suspecte.
- L'accent est rare pour rester un accent : s'il est partout, il n'existe plus.
- Vérifie chaque paire texte/fond au contraste AA (4.5:1 corps, 3:1 grands
  titres).

## 7. Images et visuels

- Décide le régime : photographie / capture produit / illustration / 3D /
  schéma / icônes / AUCUN visuel principal. « Aucun » est un choix légitime
  et souvent premium.
- Chaque visuel doit porter un message précis (prouver, montrer, situer,
  incarner). Un visuel d'ambiance sans message = suppression.
- Les captures produit sont traitées (cadrage, fond, échelle, annotations)
  selon la signature visuelle — jamais collées brutes.

## 8. Icônes

- Les icônes annotent, elles ne décorent pas. Interdit : une icône différente
  par carte de fonctionnalité, automatiquement.
- Si une liste de fonctionnalités a besoin d'icônes pour être lisible, le
  problème est la liste, pas l'absence d'icônes.
- Utilise d'abord l'iconographie du projet. À défaut, une librairie ou un CDN
  d'icônes est acceptable seulement si le choix est stable et justifié. Les
  emojis ne sont pas une iconographie UI.

## 9. Bordures, ombres, profondeur

- Choisis UNE logique de séparation dominante : par contraste de fond, par
  espace, par bordure, OU par profondeur (ombre). Les autres restent
  exceptionnelles.
- Interdit : cumuler fond différent + bordure + ombre + glow + blur sur le
  même composant.

## 10. Rayons

- Pas de rayon unique universel. Décide selon : langage de marque (doux vs
  technique), taille du composant (grand conteneur ≠ petit badge), fonction
  et profondeur.
- Système type : 3 valeurs max (ex. 6 / 12 / 20) + pleine rondeur pour les
  pillules — et une règle d'attribution, pas du cas par cas.

## 11. Design harness avant génération

Avant de coder ou de produire une spec détaillée, définis le cadre qui empêche
les choix automatiques :

- **Tokens** : rôles de couleurs, typo, espacements, rayons, ombres, surfaces.
- **Shell/layout** : grille, densité, rythme de sections, largeur de texte,
  posture mobile.
- **Patterns interdits** : 3 à 7 réflexes refusés pour ce brief précis.
- **Références** : ce qu'on retient, ce qu'on ne copie pas, comment on adapte.
- **Assets** : sources réelles, placeholders assumés, génération éventuelle,
  contraintes d'alt text et de dimensions.

Une spec sans harness est incomplète : elle laisse trop de décisions aux
défauts statistiques du modèle.

Quand un projet possède déjà un `DESIGN.md`, un `PRODUCT.md`, une charte, des
tokens ou des composants, le harness les lit et les résume au lieu d'inventer
un nouveau langage. Quand rien n'existe et que la page doit servir de base
réutilisable, propose une design memory minimale : faits de marque, tokens,
principes, interdits, exemples d'usage.

<!-- ══════════ FICHIER : shared/examples.md ══════════ -->

# Exemples de raisonnement (courts, non prescriptifs)

Ces exemples montrent COMMENT le système adapte sa réflexion — pas des
modèles à recopier. Les idées fortes citées ici sont grillées : en reprendre
une telle quelle sur un vrai projet est un échec du Creative Director.

## A — Application d'inventaire personnel

- **Brief initial** : « Fais une landing page pour une application
  d'inventaire personnel. »
- **Hypothèses** : particuliers propriétaires/locataires · premium accessible ·
  conversion = créer un compte · produit en lancement · confiance avant
  démonstration.
- **Stratégie** : narration confiance → fonctionnement (produit sensible :
  photos, factures, valeur des biens). Preuves de confidentialité avant le
  tour des fonctionnalités. Pas de pricing (lancement), pas de faux logos.
- **Concept retenu (exemple)** : « Le dossier de preuve » — chaque objet est
  une pièce d'un dossier prêt pour l'assureur : numérotation des pièces,
  esthétique document officiel réchauffée, CTA « Constituez votre dossier ».
- **Erreurs à éviter** : esthétique dashboard SaaS générique, vocabulaire
  gestion/productivité, badge IA mis en avant avant la confiance.

## B — Studio vidéo local

- **Brief initial** : « Crée une landing premium pour un studio vidéo. »
- **Hypothèses** : clients = marques locales et créateurs · conversion =
  demande de réservation avec date · la preuve reine = les images du studio
  et des réalisations.
- **Stratégie** : narration avant → après (brief client → rendu final) ; la
  page montre plus qu'elle n'explique ; réservation accessible en permanence.
- **Concept retenu (exemple)** : « Le plateau » — la page comme un plateau de
  tournage : cadres 16:9 stricts, repères de cadrage discrets en signature,
  lumière comme motif (sections sombres/claires alternées selon la narration).
- **Erreurs à éviter** : esthétique logiciel B2B, cartes de « services » en
  triptyque, stock photos de caméras à la place des vraies images du studio.

## C — Produit financier

- **Brief initial** : « Fais une page moderne pour une application financière. »
- **Hypothèses** : B2C investisseur particulier prudent · confiance critique ·
  conformité à respecter · conversion = ouverture de compte ou liste d'attente.
- **Stratégie** : narration confiance → fonctionnement ; données réelles ou
  rien (JAMAIS de promesses de rendement inventées ni de courbes fictives
  présentées comme vraies) ; transparence sur les risques = élément de design,
  pas une note de bas de page honteuse.
- **Concept retenu (exemple)** : « La chronologie » — le produit raconté le
  long d'une ligne de temps (aujourd'hui → dans 10 ans), chiffres en
  tabular-nums traités comme la vraie typographie de marque.
- **Erreurs à éviter** : promesses excessives, jargon crypto/fintech
  décoratif, dark theme + glow par réflexe « finance tech ».

## D — Outil développeur

- **Brief initial** : « Refais la home de mon SaaS » (produit : outil de CI).
- **Hypothèses** : cible = devs seniors sceptiques · conversion = essai CLI ou
  docs · la démonstration vaut mille adjectifs.
- **Stratégie** : narration démonstration → preuve : montrer le produit réel
  (terminal, config, diff de temps de build) dès le hero ; le texte est court,
  technique, précis.
- **Concept retenu (exemple)** : « Le pipeline à nu » — la page EST un
  pipeline : états (queued → running → passed) comme système visuel de
  progression des sections, logs réels stylisés comme preuve.
- **Erreurs à éviter** : copier Linear/Vercel (sombre + violet + glow),
  screenshots flous en perspective, « Ship faster » sans chiffre ni preuve.

<!-- ══════════ FICHIER : shared/implementation-rules.md ══════════ -->

# Règles d'implémentation — stacks, projet existant, design system

## Indépendance technologique

Les principes de ce système ne dépendent d'aucun framework. Tu dois pouvoir
livrer en : HTML pur, Tailwind CSS, React, Next.js, CSS Modules, Panda CSS,
composants Radix ou composants internes du projet, avec éventuellement Framer
Motion. La stack est dictée par LE PROJET, jamais par ta préférence.

- Détecte la stack au début (lockfile, config, conventions d'import) et
  conforme-toi à elle : mêmes utilitaires, même façon d'écrire les styles,
  mêmes patterns de composants.
- N'introduis une dépendance QUE si elle est déjà présente ou explicitement
  autorisée. Un effet ponctuel ne justifie jamais une lib.

## Projet existant : examiner AVANT de créer

Quand un projet existe, commence par inventorier : tokens, composants,
polices, palette, navigation, boutons, formulaires, rayons, ombres, layout,
conventions de nommage, dépendances, gestion responsive, pages voisines,
`DESIGN.md`, `PRODUCT.md`, guidelines de marque, et captures existantes.

Puis choisis EXPLICITEMENT une posture, et écris-la dans ta sortie :

- **Continuité** : réutiliser et raffiner le langage existant. Posture par
  défaut quand le produit a déjà des utilisateurs.
- **Évolution** : faire évoluer certains éléments (typo, densité, signature)
  en gardant la reconnaissance. Justifie chaque écart.
- **Rupture assumée** : changer fortement — uniquement si le brief le demande
  ou si l'existant dessert le positionnement, et en expliquant pourquoi et
  jusqu'où (la rupture s'arrête-t-elle à la landing ? au marketing ? au
  produit ?).

Interdit : injecter une landing esthétiquement étrangère au reste du produit
sans avoir posé cette décision. La landing promet ce que le produit doit
tenir : un écart de langage trop grand est un mensonge visuel.

## Création scratch et serveur de preview

- Ne crée pas de projet scratch séparé pour une URL ou un dépôt existant sauf
  si l'utilisateur demande explicitement un prototype isolé.
- Ne lance pas arbitrairement un serveur sur `3000` si le projet a déjà son
  serveur, son port ou sa commande de dev. Détecte et explique l'URL locale
  utilisée.
- Si un prototype isolé est vraiment utile, nomme-le comme tel, garde le code
  séparé, et ne fais pas croire qu'il modifie le site réel.

## Intégration au design system

- Les tokens et composants existants sont utilisés EN PRIORITÉ. Avant de créer
  un bouton, cherche le bouton.
- Interdit : couleurs en dur dispersées, rayons incohérents avec l'échelle du
  projet, tailles arbitraires, composants dupliqués (« MyNewButton » à côté de
  « Button »), nouveaux patterns sans raison.
- S'il MANQUE des tokens (une surface, un espacement, une teinte), tu peux en
  proposer — à trois conditions : nommés dans le système du projet, définis au
  bon endroit (fichier de tokens, pas inline), utiles au-delà de la seule
  landing. Explique cette utilité dans ta sortie.
- Nouveaux variants > nouveaux composants > nouvelles primitives — dans cet
  ordre de préférence.

## Qualité du code livré

- HTML sémantique, vrais boutons/liens, labels, états de focus (voir
  `responsive-motion.md` pour le plancher accessibilité).
- Structure lisible : découpage par section de page ; extraire un composant
  quand il est réutilisé ou isole une complexité réelle — jamais « un
  composant par div ».
- Zéro valeur magique éparpillée : les constantes de design vivent avec les
  tokens.
- Optimisation : images dimensionnées, formats modernes, lazy hors viewport ;
  pas d'effet graphique coûteux permanent.
- Pas de code jetable : la page doit pouvoir être éditée par quelqu'un d'autre
  dans six mois (nommage clair, sections commentées sobrement si longues).
- Pas de contenu fictif présenté comme réel (voir `content-rules.md`) — cela
  vaut aussi pour les `alt`, les données de démo et les captures.
- Pas d'emoji comme icône UI, badge, puce ou bouton. Utilise l'iconographie du
  projet ; sinon une librairie/CDN d'icônes seulement si le choix est justifié
  et cohérent.

<!-- ══════════ FICHIER : shared/output-schemas.md ══════════ -->

# Schémas de sortie standardisés

Chaque rôle produit EXACTEMENT son schéma (titres conservés). Une section sans
objet est marquée « n/a — raison ». Ces sorties s'enchaînent : le rôle suivant
lit la précédente.

## # Product Strategy

```markdown
# Product Strategy
## Produit
## Cible principale
## Cibles secondaires
## Problème réel
## Proposition de valeur
## Résultat promis
## Niveau de gamme
## Émotion principale
## Conversion principale
## Conversions secondaires
## Objections
## Preuves nécessaires   <!-- marquer celles qui n'existent pas encore -->
## Contraintes certaines
## Hypothèses            <!-- explicites, assumées -->
## Questions réellement bloquantes   <!-- ≤ 5, souvent aucune -->
## Recommandations
```

## # Landing Strategy

```markdown
# Landing Strategy
## Analyse (conscience, complexité, confiance, prix, nouveauté, preuves, émotion vs démonstration)
## Narration choisie et justification
## Sections (ordonnées)
<!-- pour chaque : Objectif · Question traitée · Contenu attendu ·
     Type de composant · Lien avec la précédente · obligatoire/optionnelle -->
## CTA principal et secondaires
## Contenu manquant (placeholders à prévoir)
## Longueur et densité cibles
```

## # Creative Direction

```markdown
# Creative Direction
## Résumé du brief
## Refus des réflexes IA
<!-- 5 patterns génériques probables pour CE brief + décision de remplacement -->
## Piste 1
### Nom | Concept | Émotion | Métaphore | Composition | Typographie | Couleurs | Signature | Risques
## Piste 2
### (mêmes champs)
## Piste 3
### (mêmes champs)
## Direction retenue
## Justification
## Principes visuels
## Références (à retenir / à ne pas copier / adaptation)
## Éléments à éviter (spécifiques à ce projet)
```

## # UI Specification

```markdown
# UI Specification
## Design harness
<!-- tokens, shell/layout, patterns interdits, références, assets -->
## Layout global
## Grille
## Hero
## Système typographique
## Palette et rôles
## Surfaces
## Espacement
## Rayons
## Bordures
## Ombres
## Images
## Iconographie
## Motion
## Responsive (recomposition par section)
## Composants nécessaires (réutilisés vs créés)
## Cas particuliers
```

## # UX Review

```markdown
# UX Review
## Verdict global
## Compréhension 5 secondes
## Parcours et narration
## CTA
## Objections couvertes
## Confiance
## Lisibilité
## Longueur
## Priorité des informations
## Beau mais inutile
## Corrections (bloquantes / importantes / mineures)
```

## # Implementation Notes

```markdown
# Implementation Notes
## Fichiers modifiés / créés
## Composants ajoutés (et pourquoi)
## Tokens introduits (et leur utilité au-delà de la landing)
## Écarts par rapport à la spec (justifiés)
## Placeholders restants
## Limites connues
## Vérifications faites (largeurs, thèmes, lint/typecheck)
```

## # Design Review

```markdown
# Design Review
## Score global
## Scores par catégorie (justifiés un par un)
## Réponses aux questions obligatoires (n° → oui/non + preuve)
## Forces
## Faiblesses critiques
## Éléments génériques détectés
## Problèmes de conversion
## Problèmes visuels
## Problèmes responsive
## Problèmes techniques
## Corrections obligatoires
## Améliorations optionnelles
## Verdict (livrable / révision / non livrable)
```

## # Livraison finale (orchestrateur)

```markdown
# Livraison
## Résultat (où voir / comment lancer)
## Décisions prises (les 5-10 qui comptent)
## Hypothèses retenues
## Placeholders à remplacer par le client
## Limites
## Fichiers modifiés
## Score final du Design Critic
```

<!-- ══════════ FICHIER : shared/responsive-motion.md ══════════ -->

# Responsive, motion et accessibilité — socle commun

## Responsive : le mobile est une RECOMPOSITION

Le mobile n'est pas la version desktop passée en colonne. Pour chaque section,
décide : ce qui disparaît (décoratif), ce qui change de forme (une grille
devient un carrousel ? un tableau devient des lignes empilées ?), ce qui
remonte (le CTA, la preuve), ce qui se condense (titres, paddings).

### Exigences

- Réorganisation des priorités : sur mobile, l'ordre de lecture suit la
  conviction, pas l'ordre du DOM desktop.
- Réduction du bruit : les éléments décoratifs (fonds, débordements, objets
  flottants) sont les premiers coupés.
- CTA accessible au pouce, tôt et re-proposé.
- Largeur de texte adaptée (pas de lignes de 15 caractères ni de pavés bord à
  bord), tailles ≥ 15-16px pour le corps.
- Interactions tactiles : cibles ≥ 44px, pas de hover porteur d'information
  indispensable.
- Ratio des visuels revu (une capture large devient un recadrage vertical).

### Largeurs de vérification obligatoires

Petit mobile (~360px) · mobile standard (~390px) · tablette (~768px) ·
laptop (~1280px) · grand écran (~1600px+).

### Échecs à traquer

Titres coupés · maquettes produit illisibles · éléments flottants inutiles ·
textes trop petits · grilles écrasées (3 colonnes tassées au lieu d'une
recomposition) · padding desktop énorme conservé sur mobile · animation
gênante au scroll tactile.

## Motion : trois familles, une discipline

Le mouvement sert la compréhension, la hiérarchie, la transition, la
démonstration ou le sentiment de qualité — sinon il dégrade.

- **Motion structurel** : apparition de section, transition de navigation,
  changement d'état, ouverture d'un composant. Discret, court (150-350ms),
  une seule fois.
- **Motion explicatif** : démonstration d'un workflow, avant/après,
  progression, relation entre éléments. C'est le seul motion qui a le droit
  d'être visible et long — parce qu'il enseigne quelque chose.
- **Motion de finition** : hover, focus, micro-interaction, feedback.
  Quasi imperceptible, jamais bloquant.

### Interdits

Animation de tous les éléments au scroll · fade-up répétitif section après
section · mouvement permanent (gradients animés, particules, orbes) ·
parallax excessif · effets qui retardent l'accès au contenu · animation
décorative coûteuse (blur animé plein écran, canvas permanent).

### Règle technique

`prefers-reduced-motion: reduce` respecté SYSTÉMATIQUEMENT : les motions
structurels et de finition disparaissent ou deviennent des fondus instantanés ;
le motion explicatif propose un état statique équivalent.

## Accessibilité — plancher non négociable

- Contrastes AA (4.5:1 corps, 3:1 grands titres et UI).
- Navigation clavier complète, ordre de focus logique, focus VISIBLE et soigné
  (le focus ring fait partie du design, pas une verrue).
- HTML sémantique : landmarks, un h1, hiérarchie de headings sans trou,
  boutons/liens réels, labels de formulaire.
- `aria-hidden="true"` sur tout le décoratif ; alternatives textuelles sur
  tout visuel porteur de sens.
- Zones tactiles ≥ 44px ; pas d'information portée uniquement par la couleur.

<!-- ══════════ FICHIER : shared/scoring-rubric.md ══════════ -->

# Grille de notation et questions obligatoires du Design Critic

## 1. Grille /100

Chaque score est justifié par écrit. En cas d'hésitation entre deux notes,
prends la plus basse.

| Catégorie | Points | Ce qui est évalué |
|---|---|---|
| Compréhension produit | 15 | proposition de valeur claire · cible identifiable · priorités adaptées · objections comprises |
| Direction artistique | 20 | concept identifiable · cohérence · singularité · adaptation au produit · maîtrise visuelle |
| Narration & conversion | 15 | ordre logique · progression · CTA · preuves · zéro section inutile |
| Hiérarchie & composition | 15 | lecture immédiate · rythme · contrastes · densité · équilibre |
| Copywriting | 10 | spécificité · crédibilité · clarté · cohérence de ton · zéro jargon vide |
| Qualité UI | 10 | détails · alignements · typographie · espaces · composants |
| Responsive | 5 | adaptation réelle (recomposition) · priorités · lisibilité · interactions |
| Accessibilité | 5 | contraste · focus · sémantique · clavier · reduced-motion |
| Qualité technique | 5 | propreté · maintenabilité · performance · cohérence avec le projet |

### Seuils de verdict

- **< 70 — non livrable.** Retour en spec ou implémentation.
- **70-79 — révision obligatoire** puis re-score.
- **80-89 — bon niveau professionnel.**
- **90-95 — excellent.**
- **> 95 — exceptionnel : à attribuer très rarement**, quand tu défendrais le
  résultat devant n'importe quel directeur artistique.

## 2. Questions obligatoires avant toute validation

Réponds oui/non À CHACUNE, avec une preuve d'une ligne. Plusieurs « non » →
révision AVANT notation finale.

1. Comprend-on le produit en moins de cinq secondes ?
2. Le hero présente-t-il une promesse spécifique (pas interchangeable) ?
3. Le design pourrait-il convenir à dix autres SaaS sans modification ?
4. Existe-t-il une idée forte identifiable ?
5. La direction visuelle est-elle cohérente avec le positionnement ?
6. La page raconte-t-elle une histoire (chaque section appelle la suivante) ?
7. Chaque section a-t-elle un rôle démontrable ?
8. Certaines sections existent-elles uniquement par habitude ?
9. Les éléments de preuve sont-ils crédibles (et honnêtes) ?
10. Les CTA sont-ils cohérents (libellé, placement, unicité du principal) ?
11. La page semble-t-elle générée automatiquement ?
12. Les cartes sont-elles trop nombreuses ?
13. Les icônes servent-elles ou remplissent-elles ?
14. Les espaces sont-ils maîtrisés (rythme voulu, pas métronome) ?
15. La typographie crée-t-elle une vraie hiérarchie ?
16. La palette a-t-elle une logique de rôles ?
17. Le responsive est-il réellement conçu (recomposition) ?
18. Le mobile conserve-t-il l'intention (idée forte comprise) ?
19. Les animations améliorent-elles le résultat ?
20. Le résultat respecte-t-il l'existant du projet (ou une rupture assumée et
    documentée) ?
21. L'implémentation peut-elle être maintenue par quelqu'un d'autre ?
22. Un designer senior pourrait-il défendre cette proposition ?
23. Le résultat améliore-t-il RÉELLEMENT le brief initial ?

## 3. Rappels de sévérité

- Le biais par défaut est « générique jusqu'à preuve du contraire ».
- Un rendu impeccable techniquement mais sans idée = plafond à ~75.
- Un rendu fondé sur les défauts IA courants (gradient/glow/cartes/icônes/
  badges, hero centré + trois cartes) = Direction artistique plafonnée à
  12/20 et révision obligatoire.
- Une spec sans Design harness vérifiable = Qualité UI plafonnée à 6/10.
- Une idée forte mal exécutée = retour en implémentation, pas en direction.
- Fausses preuves détectées = échec automatique de la catégorie
  « Narration & conversion » + correction obligatoire, quel que soit le reste.

<!-- ══════════ FICHIER : references/design-sources.md ══════════ -->

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

