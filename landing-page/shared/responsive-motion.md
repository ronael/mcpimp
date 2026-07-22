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
