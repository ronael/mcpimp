# Motion Inspiration Links

References utiles pour enrichir la motion d'une interface web. Ces ressources ne
sont pas des sources MCPIMP importables par `sources:sync`; elles guident des
decisions de design et d'implementation.

## CSS Motion Studies

- Transitions.dev: https://transitions.dev/ — collection de transitions UI
  pretes a adapter pour web apps : card resize, number pop-in, notification
  badge, text state swap, menu dropdown, modal open/close et transitions de
  panneaux. A utiliser pour calibrer timing, easing, sequence et relation entre
  etats, sans copier une recette sous licence ou pro sans verifier les droits.
- yui540 Motions: https://yui540.com/ — portfolio de motion design web realise
  en CSS animation, SVG, HTML, TypeScript, JavaScript, React, Next.js et outils
  de design. A utiliser comme reference externe pour le timing, les ruptures de
  rythme, la typographie animee, les transitions de composition et les
  interactions visuelles. Ne pas scraper, entrainer dessus, copier, reproduire
  ou reutiliser les videos, images, textes ou animations du site.
- yui540/css-animations: https://github.com/yui540/css-animations — depot MIT
  public pour une partie des animations CSS publiees par l'auteur. Peut servir
  de reference technique ou de base reutilisable si la licence MIT est respectee.
- yui540/reanimated-css-animations:
  https://github.com/yui540/reanimated-css-animations — port Reanimated MIT de
  certaines animations CSS. Utile pour comprendre la traduction de principes CSS
  vers des timelines React Native/Reanimated.

## Reusable Motion Libraries

- Kinetics: https://kinetics.colorion.co/ — interactions basees sur des ressorts
  avec variantes CSS, React et prompt. Le contenu est annonce sous licence MIT.
  Conserver un mouvement interruptible, verifier les etats clavier et fournir
  une variante reduced motion avant de reutiliser un exemple.
- Animated Buttons: https://animatedbuttons.colorion.co/ — interactions de
  boutons en CSS autonome, sous licence MIT, avec prompts correspondants. Utile
  pour harmoniser hover, press et focus ; ne pas choisir un effet qui masque le
  libelle, affaiblit le focus ou depend uniquement du pointeur.
- Motion Primitives: https://motion-primitives.com/ — composants React bases sur
  Motion et Tailwind CSS, distribuables par copie ou CLI et publies sous licence
  MIT. Le projet se presente encore comme beta : verifier l'API actuelle, les
  dependances et l'accessibilite du composant retenu avant integration.
  Depot: https://github.com/ibelick/motion-primitives.

## Usage Pattern

- Pour une landing page, commencer par definir le role du mouvement : orienter
  l'oeil, confirmer une action, reveler une structure, donner un tempo de marque
  ou rendre une transition comprehensible.
- Remplacer les presets fades generiques par une sequence precise : entree du
  contenu principal, retard court sur les details, accent sur l'objet cle, puis
  etat stable lisible.
- Preferer `transform` et `opacity` pour la performance, limiter `filter`,
  `clip-path` et les grandes ombres animees, et eviter les animations de
  dimensions qui provoquent du reflow.
- Toujours prevoir une version `prefers-reduced-motion` qui conserve la
  hierarchie et l'information sans supprimer le contenu.
