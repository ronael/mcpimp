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
