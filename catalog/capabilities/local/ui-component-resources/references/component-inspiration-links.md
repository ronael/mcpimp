# Component Inspiration Links

Liens utiles pour inspirer ou orienter la génération de composants UI. Ces
ressources ne sont pas des sources MCPIMP importables : elles ne déclenchent
aucun `sources:sync` et ne doivent pas être copiées aveuglément.

## Component Galleries

- Beautiful UI: https://beautifului.dev/ — composants et patterns pour
  interfaces AI-native : loading state, thinking trace, streaming text,
  approval card, tool chips, task rows, chat, prompt bar, diff table, search et
  flowchart. Utile pour concevoir des surfaces agentiques lisibles sans
  reprendre les exemples tels quels.
- beUI: https://beui.dev/ — composants React et Next.js animes avec Motion et
  Tailwind CSS, distribues via le registre shadcn. Utile pour les primitives de
  micro-interaction : modal morphing, toast stack, dock, tabs, command palette,
  bottom sheet, switch, tooltip, text animation et number animation.
- Rare UI: https://rareui.com/ — collection open source de composants React
  animes installables avec la CLI shadcn. Utile quand le brief demande un
  composant plus distinctif que les patterns SaaS standards, tout en gardant une
  base Tailwind/shadcn.
- Originkit: https://www.originkit.dev/ — bibliothèque gratuite de composants web
  animés (backgrounds, hero, sections, micro-interactions) à utiliser comme
  référence d'inspiration, jamais copiés tels quels.
- shadcn/ui: https://ui.shadcn.com/ — composants Radix UI et Tailwind CSS
  copiables dans le projet et personnalises localement. A privilegier comme
  reference de primitives accessibles et extensibles quand le projet utilise
  deja React, Tailwind ou le modele shadcn registry.
- coss ui: https://coss.com/ui — design system officiel de Cal.com construit
  sur Base UI, React et Tailwind CSS. Utile pour des primitives accessibles et
  des interfaces produit sobres. Le depot utilise plusieurs licences : verifier
  que le code consulte appartient bien a `apps/ui`, publie sous MIT, plutot que
  de supposer que tout le monorepo est permissif.
  Depot: https://github.com/cosscom/coss.
- ReUI: https://reui.io/components — registre shadcn pour React et Tailwind CSS
  avec composants de produit avances : Data Grid, Kanban, Gantt, filtres,
  calendriers, upload, timeline et stepper. Distinguer les composants publics
  des blocks, icones et templates Pro ; ne jamais indexer ni redistribuer un
  contenu payant. Le MCP officiel https://mcp.reui.io/ reste un upstream
  candidat a tester separement avant toute configuration dans MCPIMP.
- Component Gallery: https://component.gallery/ — comparaison de composants
  issus de systemes de design reels. Utile pour confronter noms, etats,
  accessibilite et conventions avant de concevoir un composant. Les exemples
  restent soumis aux licences de leurs systemes d'origine : utiliser la galerie
  comme index, pas comme source de code globale.

## Agent Briefing and Prompts

- VibePrompt: https://vibeprompts.dev/ — prompts et snippets Tailwind organises
  par sections UI, notamment dashboard, tarifs, authentification, onboarding et
  hero. Utiliser un prompt comme brief de composition a adapter au produit, pas
  comme instruction de confiance ni comme remplacement du design system local.

## Motion and Transitions

- Transitions.dev: https://transitions.dev/ — collection de transitions UI pour
  cartes, nombres, badges, textes, menus, modales et panneaux. Pour les details
  de timing/easing et les garde-fous de performance, charger aussi
  `motion-design-resources`.

## Brand and Logo Tools

- LogoCreator: https://github.com/Nutlope/logocreator — application open source
  de génération de logos IA et de brand kit, utile comme référence produit pour
  les flows de branding, exports, édition de logo et bring-your-own-key.
  Démo publique: https://www.logo-creator.io/. Ce n'est pas une source de
  skills importables.
