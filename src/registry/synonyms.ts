/**
 * Lightweight query expansion for `search-capabilities`.
 *
 * This is deliberately not a semantic index. It bridges the two gaps that break
 * lexical search in this registry today:
 *
 * 1. capabilities are written in French while agents often query in English;
 * 2. design vocabulary is highly synonymous ("photographic" / "imagery" /
 *    "visual", "luxury" / "premium", "motion" / "animation").
 *
 * Expanded terms are scored below literal terms (see `EXPANSION_WEIGHT` in
 * `search.ts`). When real semantic matching is needed, replace this module with
 * an embedding lookup behind the same `expandTerm()` signature.
 *
 * Entries must be single tokens as produced by `tokenize()`: lowercase, ASCII,
 * alphanumeric. Multi-word concepts are covered by their individual tokens.
 */

const SYNONYM_GROUPS: string[][] = [
  ["accessibility", "accessibilite", "a11y", "wcag", "contrast", "contraste", "aria"],
  ["animation", "motion", "transition", "interaction"],
  ["brand", "marque", "branding", "identity", "identite", "charte"],
  ["color", "couleur", "palette", "teinte"],
  ["conversion", "cta", "funnel", "tunnel", "lead"],
  ["copy", "copywriting", "contenu", "content", "texte", "wording", "narration", "storytelling"],
  ["design", "conception", "craft"],
  ["token", "primitive", "variable"],
  ["ecommerce", "shop", "boutique", "commerce", "produit", "product", "checkout"],
  ["editorial", "editoriale", "magazine", "revue"],
  ["hospitality", "hotel", "hotellerie", "restaurant", "travel", "voyage", "resort"],
  ["landing", "homepage", "accueil", "vitrine", "hero"],
  ["layout", "grid", "grille", "composition", "spacing", "espacement"],
  ["luxury", "luxe", "premium", "upscale", "elegant", "raffine"],
  ["performance", "perf", "speed", "vitesse", "lighthouse"],
  ["photography", "photographic", "photo", "imagery", "image", "visual", "visuel"],
  ["responsive", "mobile", "breakpoint", "adaptatif"],
  ["typography", "typographie", "typo", "font", "police", "typeface"],
  ["ui", "interface", "frontend", "front"],
  ["ux", "usability", "utilisabilite", "parcours", "journey"],
  ["component", "composant", "pattern", "module"],
  ["system", "systeme", "framework"],
];

const EXPANSIONS = new Map<string, string[]>();

for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    const related = group.filter((candidate) => candidate !== term);
    EXPANSIONS.set(term, [...(EXPANSIONS.get(term) || []), ...related]);
  }
}

/** Returns related terms for a normalized token, excluding the token itself. */
export function expandTerm(term: string): string[] {
  return EXPANSIONS.get(term) || [];
}
