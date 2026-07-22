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
