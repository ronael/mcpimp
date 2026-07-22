# Anti-générique — patterns suspects et obligation d'idée forte

Règle d'usage : rien ici n'est interdit dans l'absolu. Chaque élément listé
est **suspect par défaut** — tu ne peux l'utiliser que si tu peux le justifier
en une phrase par la direction artistique et le produit. « C'est standard »
n'est pas une justification. Le Design Critic traque cette liste.

## Layout et composition suspects

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
