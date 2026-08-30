# Design System Links

References pour construire des fondations coherentes et auditer leur adoption.
Elles ne sont pas importees par `sources:sync` et ne doivent pas etre scrapees
ou republiees dans MCPIMP.

## Planning and Governance

- Design Systems Checklist: https://designsystemchecklist.com/ — checklist de
  mise en place couvrant cadrage, parties prenantes, tokens, composants,
  documentation, handoff et audits reguliers. Utiliser la liste pour verifier
  les oublis ; adapter les priorites a la maturite et au produit.
- DesignSystems.one: https://www.designsystems.one/ — galerie de systemes de
  production, fondations et outils pour tokens lisibles par les agents. Utile
  pour comparer conventions, stacks et niveaux de maturite. Les fichiers ou
  tokens generes doivent etre verifies avant integration et ne valent pas
  validation automatique du design system source.

## Tokens, Type and Spacing

- Utopia: https://utopia.fyi/ — methode et generateurs de typographie fluide et
  d'espacements CSS par interpolation entre petits et grands viewports. Utile
  pour construire une echelle responsive systematique sans multiplier les
  breakpoints ; verifier les bornes avec le contenu reel.
- Open Props: https://open-props.style/ — variables CSS et exports de design
  tokens pour couleurs, tailles, espacements, rayons, ombres, easings et
  animations, publies sous licence MIT. Reutiliser seulement les ensembles
  necessaires et les mapper vers des noms semantiques locaux au lieu de melanger
  directement plusieurs systemes de tokens.

## Interaction Quality

- Web Interface Guidelines: https://interfaces.rauno.me/ — checklist de details
  d'interaction et d'implementation : feedback, focus, clavier, touch targets,
  transitions et finition. Utiliser ces recommandations comme grille d'audit,
  puis les confronter a l'accessibilite, aux conventions de plateforme et aux
  besoins reels du produit.

## Usage Pattern

- Commencer par inventorier les decisions existantes avant de generer une
  nouvelle palette ou echelle.
- Nommer les tokens par role produit (`action-primary`, `surface-raised`) plutot
  que par apparence brute (`blue-500`, `shadow-3`) quand ils deviennent publics.
- Tester la typographie fluide et les espacements avec les contenus les plus
  longs, en mobile et desktop.
- Auditer les composants et interactions contre les memes fondations pour
  eviter que chaque ecran introduise ses propres styles.
