# MCPIMP — plan de refactorisation front-end

## Objectif

Refactoriser les pages HTML existantes sans modifier leur rendu visuel, en :

- faisant de l’anglais la langue par défaut et en conservant des équivalents français ;
- extrayant une direction artistique (DA) commune en CSS ;
- homogénéisant la structure HTML et les styles ;
- portant la DA de la maquette `site/dashboard.html` vers le dashboard dynamique `src/http/dashboard.ts` ;
- préservant une compatibilité totale avec le déploiement Cloudflare.

## Contraintes

- Ne pas modifier le rendu visuel pendant la refactorisation.
- Conserver les fichiers, chemins, identifiants HTML et comportements JavaScript existants, sauf changement explicitement validé.
- Conserver `src/http/dashboard.ts` comme source de vérité du dashboard dynamique ; `site/dashboard.html` sert de référence visuelle et structurelle.
- Ne pas introduire Vite + React pendant cette refactorisation, sauf validation explicite ultérieure.

## État actuel

- `site/index.html` est la landing principale et devient la version anglaise par défaut.
- `site/fr/index.html` contient une copie française de la landing.
- `site/docs/sources.html` est une page de documentation statique.
- `site/dashboard.html` est une maquette HTML avec des données d’exemple.
- `src/http/dashboard.ts` produit le dashboard dynamique servi par `GET /dashboard`.
- GitHub Pages publie actuellement le dossier `site/` tel quel.
- Le Worker Cloudflare sert l’API MCP, notamment `/health`, `/message`, `/sse` et `/dashboard`.

## Architecture cible

```txt
site/
  index.html                    # landing EN, version par défaut
  fr/
    index.html                  # landing FR
  docs/
    sources.html                # documentation EN
  fr/docs/
    sources.html                # documentation FR
  dashboard.html                # maquette visuelle uniquement
  assets/
    css/
      tokens.css                # couleurs, fontes, easing, dimensions
      base.css                  # reset, body, focus, liens, code
      pages/
        landing.css
        sources.css
        dashboard.css
        legacy.css
    js/
      landing.js
      sources.js
      dashboard-mock.js
      legacy.js

src/http/
  dashboard.ts                  # rendu dynamique SSR
  dashboard-i18n.ts             # textes EN / FR du dashboard
  dashboard-styles.ts           # CSS compilée ou générée pour le Worker
```

La CSS source doit rester partagée. Pour le dashboard rendu par le Worker, la CSS nécessaire sera générée ou importée au build sous forme de chaîne TypeScript, afin qu’il ne dépende pas du filesystem au runtime.

## Lots et validations

### Lot 0 — cadrage

Livrables :

- architecture ci-dessus ;
- stratégie EN/FR ;
- décision de garder le dashboard dynamique côté serveur ;
- décision de ne pas migrer vers React immédiatement.

Statut : terminé et validé.

### Lot 1 — fondations de DA CSS

Objectif : extraire les tokens et styles de base sans modifier le rendu.

Livrables :

- `site/assets/css/tokens.css` ;
- `site/assets/css/base.css` ;
- `site/index.html` charge ces fichiers ;
- les règles correspondantes sont retirées du style inline à l’identique.

Critères de validation :

- même rendu de landing ;
- `git diff --check` propre ;
- aucun changement de HTML, d’ID ou de JavaScript.

Statut : terminé.

Notes de validation :

- `site/assets/css/tokens.css` et `site/assets/css/base.css` sont chargés par les pages concernées ;
- les styles spécifiques restants ont été déplacés dans `site/assets/css/pages/…` ;
- `git diff --check` est propre.

### Lot 2 — landing EN par défaut et FR

Objectif : livrer deux versions complètes de la landing avec la même DA.

Livrables :

- `site/index.html` en anglais ;
- `site/fr/index.html` en français ;
- métadonnées, titres, textes, démos et FAQ traduits ;
- sélecteur de langue avec liens relatifs corrects ;
- même structure DOM, IDs, animations et scripts.

Décision de contenu : l’anglais doit être une traduction éditorialisée complète, pas une traduction mot à mot ni une version raccourcie.

Statut : terminé.

Notes de validation :

- `site/index.html` est la landing anglaise par défaut ;
- `site/fr/index.html` est la landing française ;
- les liens de langue EN / FR sont présents ;
- `site/assets/js/landing.js` choisit ses chaînes via `document.documentElement.lang` ;
- les ancres et chemins relatifs locaux ont été validés par script.

### Lot 3 — documentation statique

Objectif : appliquer le même modèle à `site/docs/sources.html` et aux autres pages statiques pertinentes.

Livrables :

- version EN à l’URL existante ;
- version FR sous `site/fr/docs/sources.html` ;
- CSS partagée ;
- navigation localisée et liens relatifs corrects.

Statut : terminé.

Notes de validation :

- `site/docs/sources.html` est la version anglaise par défaut ;
- `site/fr/docs/sources.html` conserve la version française ;
- `site/assets/css/pages/sources.css` et `site/assets/js/sources.js` sont partagés ;
- les liens de langue et les ancres locales ont été validés par script.

### Lot 4 — dashboard dynamique

Objectif : utiliser la maquette `site/dashboard.html` comme référence de DA pour `src/http/dashboard.ts`.

Livrables :

- `GET /dashboard` comme dashboard EN dynamique par défaut ;
- `GET /fr/dashboard` comme dashboard FR ;
- données réelles du `CapabilityRegistry`, jamais des valeurs d’exemple ;
- CSS partagée intégrée au build Worker ;
- conservation des routes API MCP existantes.

À ne pas faire : remplacer `dashboard.ts` par la page statique. Une page GitHub Pages ne peut pas être le dashboard de production sans gérer séparément l’URL d’API, le CORS, le chargement et les erreurs.

Statut : terminé.

Notes de validation :

- `GET /dashboard` rend le dashboard dynamique anglais par défaut ;
- `GET /fr/dashboard` rend la variante française ;
- les textes sont centralisés dans `src/http/dashboard-i18n.ts` ;
- les styles embarqués Worker sont centralisés dans `src/http/dashboard-styles.ts` ;
- les tests serveur couvrent les deux routes.

### Lot 5 — harmonisation et déploiement

Objectif : supprimer les répétitions restantes, valider le rendu et préparer le déploiement.

Livrables :

- extraction CSS restante vers les feuilles par page ;
- traitement explicite de `site/_legacy_index.html` ;
- contrôle responsive et accessibilité ;
- validation GitHub Pages et Cloudflare ;
- mise à jour de la documentation technique.

Statut : en cours.

Terminé :

- extraction de `site/index.html` et `site/fr/index.html` vers `site/assets/css/pages/landing.css` et `site/assets/js/landing.js` ;
- extraction de `site/docs/sources.html` et `site/fr/docs/sources.html` vers `site/assets/css/pages/sources.css` et `site/assets/js/sources.js` ;
- extraction de la maquette `site/dashboard.html` vers `site/assets/css/pages/dashboard.css` et `site/assets/js/dashboard-mock.js` ;
- traitement explicite de `site/_legacy_index.html` avec `noindex`, canonical, `site/assets/css/pages/legacy.css` et `site/assets/js/legacy.js` ;
- validation des chemins locaux, des ancres, de la syntaxe JavaScript et du build TypeScript.

Reste :

- contrôle visuel responsive desktop/mobile dans un navigateur ;
- validation finale GitHub Pages / Cloudflare après déploiement.

## Décision Vite + React

### Recommandation

Ne pas migrer maintenant vers Vite + React.

La landing et la documentation sont statiques, et le dashboard est déjà dynamique côté serveur TypeScript. La refactorisation CSS et EN/FR apporte le bénéfice immédiat avec moins de risque de régression visuelle.

### Réévaluation ultérieure

Évaluer Vite, sans nécessairement React, si la gestion des assets, la compilation CSS ou la duplication HTML devient difficile.

React devient pertinent si le dashboard évolue vers une interface client complexe avec état, filtrage, navigation et données en direct. Il implique alors un build `dist/`, un routage SPA, des tests supplémentaires et une configuration de déploiement distincte.

### Compatibilité Cloudflare

Cloudflare Workers Static Assets peut servir un build statique et un Worker dans le même déploiement. Si Vite est adopté plus tard :

- GitHub Pages publie `dist/` avec un `base` adapté au sous-chemin du dépôt ;
- Cloudflare utilise le build avec une base `/` et garde les routes Worker ;
- les routes `/health`, `/message`, `/sse` et `/dashboard` doivent être explicitement préservées ;
- les chemins EN/FR, les assets et les accès directs aux pages doivent être testés sur les deux plateformes.

## Critères de fin

- Anglais par défaut et français complet pour chaque page concernée.
- Aucun changement visuel involontaire.
- Une seule source de vérité pour les tokens et styles partagés.
- Dashboard dynamique alimenté par le registry réel et visuellement aligné avec la DA.
- Build, tests et déploiement Cloudflare fonctionnels.
