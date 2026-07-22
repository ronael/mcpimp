# Skill « landing-page » — landing pages premium pour agents IA

Un système de skills qui fait travailler un agent (Claude Code, Codex ou
similaire) comme une équipe — stratège produit, stratège de conversion,
directeur artistique, UI designer senior, reviewer UX, développeur front
senior et critique design — au lieu d'exécuter littéralement un brief.

Conçu pour fonctionner **même avec un brief d'une phrase** (« Fais une landing
pour mon app d'inventaire »), sur tout type de projet (SaaS, B2C, B2B, studio,
service local, finance, dev tools, e-commerce, portfolio, événement) et toute
stack (HTML, Tailwind, React, Next.js, CSS Modules, Panda, Radix…).

## Architecture

```
landing-page/
  SKILL.md                     ← orchestrateur : point d'entrée, processus en 11 étapes,
                                  niveaux d'intervention, modes de gestion du brief
  agents/                      ← les 7 rôles, un fichier chacun, responsabilités disjointes
    product-strategist.md        (brief brut → brief exploitable)
    landing-strategist.md        (narration, sections justifiées, CTA)
    creative-director.md         (3 pistes, idée forte, signature visuelle)
    ui-designer.md               (spécification UI implémentable)
    ux-conversion-reviewer.md    (parcours, objections, CTA, lisibilité)
    frontend-craftsman.md        (code propre, fidèle, accessible)
    design-critic.md             (notation sévère, droit de refus)
  shared/                      ← règles communes, chargées à la demande
    anti-generic.md              (patterns suspects + obligation d'idée forte)
    design-principles.md         (hiérarchie, espace, cartes, typo, couleur…)
    content-rules.md             (copywriting + honnêteté des preuves)
    responsive-motion.md         (recomposition mobile, motion, accessibilité)
    implementation-rules.md      (stacks, projet existant, design system)
    scoring-rubric.md            (grille /100 + 23 questions obligatoires)
    output-schemas.md            (formats de sortie chaînables entre rôles)
    examples.md                  (4 raisonnements complets, non prescriptifs)
```

Pourquoi un seul skill orchestré plutôt que 7 skills séparés : le déclenchement
reste simple (« landing page » suffit), la modularité vit dans les fichiers
(chargés étape par étape, jamais tous en même temps), et les sorties se
chaînent via des schémas stables.

## Installation

### Claude Code — global (tous les projets)

```bash
ln -s ~/Workspace_perso/skills/landing-page ~/.claude/skills/landing-page
```

### Claude Code — par projet

```bash
mkdir -p <projet>/.claude/skills
cp -R ~/Workspace_perso/skills/landing-page <projet>/.claude/skills/
```

### Codex (ou tout agent lisant AGENTS.md)

Ajouter dans `AGENTS.md` (projet) ou `~/.codex/AGENTS.md` (global) :

```markdown
## Landing pages
Pour toute demande de landing page, hero, section marketing ou refonte de
page vitrine : lis et applique `skills/landing-page/SKILL.md` (orchestrateur),
qui référence les rôles dans `agents/` et les règles dans `shared/`.
```

(Adapter le chemin selon l'emplacement du dossier dans le dépôt.)

## Utilisation

Aucune syntaxe spéciale : une demande naturelle suffit, le skill fait le reste.

```
Fais une landing page pour mon application d'inventaire personnel.
```

```
J'ai besoin d'un hero plus beau.        ← niveau 1 : correction locale
Refais la home de mon SaaS.             ← niveau 2 : refonte de page
Crée la landing de lancement de X.      ← niveau 3 : création complète
Définis un langage réutilisable.        ← niveau 4 : système de marque
```

Plus tu fournis de contraintes réelles (charte, contenu, cible, techno), moins
l'agent pose d'hypothèses — mais il n'exige jamais que tu décides les marges,
les sections ou les animations : c'est son métier.

## Workflow complet (exemple condensé)

Demande : « Fais une landing premium pour mon studio vidéo. »

1. **Analyse** : dépôt inspecté (aucune charte → mode B, hypothèses posées).
2. **Product Strategy** : cible = marques locales ; conversion = réservation ;
   preuve reine = réalisations ; gamme = premium accessible.
3. **Landing Strategy** : narration avant→après, 6 sections justifiées, pas de
   FAQ, pas de pricing (devis).
4. **Creative Direction** : 3 pistes (« Le plateau », « La lumière »,
   « Brief→Rendu ») → « Le plateau » retenue : cadres 16:9 stricts, repères de
   cadrage en signature, alternance sombre/clair.
5. **UI Spec** : grille, échelle typo 15/18/24/40/64, palette à rôles,
   recomposition mobile section par section.
6. **Implémentation** : Next + Tailwind (stack détectée), composants existants
   réutilisés, placeholders identifiés pour les vidéos clients.
7. **Design Critic** : 74/100 (hero trop verbeux, 3ᵉ section redondante) →
   révision → 86/100 → livraison avec décisions, hypothèses et placeholders.

## Philosophie

Le client fournit le problème, le contexte et les contraintes. L'agent expert
ne lui demande pas de concevoir la solution à sa place. Il vise une landing
adaptée au produit et à la cible, mémorable, crédible, visuellement maîtrisée,
techniquement propre, utile à la conversion — et différente des templates
générés automatiquement. Assez de structure pour garantir la qualité, assez de
liberté pour que chaque projet ait une direction différente.
