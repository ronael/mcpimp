import { extractMarkdownSections, isMarkdownEntrypoint, type MarkdownSection } from "./frontmatter";
import { tokenize } from "./search";
import { expandTerm } from "./synonyms";

const DEFAULT_LIMIT = 5;
const HEADING_WEIGHT = 3;
const BODY_WEIGHT = 1;
const EXPANSION_WEIGHT = 0.4;
const SECTION_ALIAS_WEIGHT = 0.7;
const MIN_SECTION_CHARACTERS_FOR_SIZE_PENALTY = 240;

// Narrow morphology and bilingual aliases observed in section-level queries.
// They stay local so broad capability discovery keeps its calibrated ranking.
const SECTION_ALIASES = new Map<string, string[]>([
  ["convertir", ["conversion", "convert", "converting"]],
  ["public", ["audience", "target", "icp"]],
  ["cible", ["audience", "target", "icp"]],
  ["visuelle", ["visual", "visuel", "imagery"]],
  ["restructurer", ["reconstruction", "refactor", "refonte", "rebuild"]],
]);

export interface RankedMarkdownSection extends MarkdownSection {
  /** Relative lexical relevance, only comparable within this outline. */
  score: number;
  /** Literal query terms covered directly or through a synonym. */
  matchedTerms: string[];
}

/**
 * Rank bounded Markdown sections for an intention. Coverage rewards useful
 * context, while a square-root size penalty prevents broad parent sections from
 * winning by accumulation alone.
 */
export function rankMarkdownSections(
  markdown: string,
  query: string,
  limit = DEFAULT_LIMIT,
): RankedMarkdownSection[] {
  const sections = extractMarkdownSections(markdown)
    .filter((_section, index, all) => isMarkdownEntrypoint(all, index));
  const literals = [...new Set(tokenize(query))];
  const boundedLimit = Math.max(1, Math.floor(limit));

  if (literals.length === 0) {
    return sections.slice(0, boundedLimit).map((section) => ({
      ...section,
      score: 0,
      matchedTerms: [],
    }));
  }

  const ranked = sections.map((section, index) => {
    const headingTerms = new Set(tokenize(section.heading));
    const bodyTerms = new Set(tokenize(section.text));
    const matchedTerms: string[] = [];
    let lexicalScore = 0;

    for (const literal of literals) {
      const candidates = [
        { term: literal, weight: 1 },
        ...expandTerm(literal).map((term) => ({ term, weight: EXPANSION_WEIGHT })),
        ...(SECTION_ALIASES.get(literal) || [])
          .map((term) => ({ term, weight: SECTION_ALIAS_WEIGHT })),
      ];
      let bestWeight = 0;

      for (const candidate of candidates) {
        if (headingTerms.has(candidate.term)) {
          bestWeight = Math.max(bestWeight, HEADING_WEIGHT * candidate.weight);
        } else if (bodyTerms.has(candidate.term)) {
          bestWeight = Math.max(bestWeight, BODY_WEIGHT * candidate.weight);
        }
      }

      if (bestWeight > 0) {
        lexicalScore += bestWeight;
        matchedTerms.push(literal);
      }
    }

    const coverage = matchedTerms.length / literals.length;
    const sizePenalty = Math.sqrt(
      Math.max(section.text.length, MIN_SECTION_CHARACTERS_FOR_SIZE_PENALTY)
        / MIN_SECTION_CHARACTERS_FOR_SIZE_PENALTY,
    );
    const score = lexicalScore === 0
      ? 0
      : lexicalScore * (0.5 + coverage * coverage) / sizePenalty;

    return {
      ...section,
      score: Number(score.toFixed(4)),
      matchedTerms,
      index,
    };
  });

  const matches = ranked
    .filter((section) => section.score > 0)
    .sort((left, right) => right.score - left.score
      || left.text.length - right.text.length
      || left.index - right.index)
    .slice(0, boundedLimit)
    .map(({ index: _index, ...section }) => section);

  if (matches.length > 0) return matches;

  return sections.slice(0, boundedLimit).map((section) => ({
    ...section,
    score: 0,
    matchedTerms: [],
  }));
}
