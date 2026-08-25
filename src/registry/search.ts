/**
 * Lexical ranking for `search-capabilities`.
 *
 * Replaces the previous exact-substring scan, which returned every file
 * containing the raw query in arbitrary order and could not handle multi-word
 * queries at all. The index is built on the fly from the capabilities already in
 * memory: no persistence, no extra dependency.
 *
 * Scoring, in order of impact:
 *  - per-field weights (capability name/description/tags rank above body text);
 *  - IDF, so a term shared by every capability barely moves the score;
 *  - query coverage, so a document matching 3 of 3 terms outranks one matching 1;
 *  - a phrase bonus when the whole query appears verbatim.
 *
 * Terms are expanded through `synonyms.ts` at a reduced weight. Swapping that
 * module for an embedding lookup is the intended upgrade path to real semantic
 * search; nothing else here needs to change.
 */

import { extractHeadings } from "./frontmatter";
import { expandTerm } from "./synonyms";
import type {
  Capability,
  CapabilityFile,
  CapabilitySearchOptions,
  CapabilitySearchResult,
} from "./types";

const EXPANSION_WEIGHT = 0.4;
const PHRASE_BONUS = 1.6;
const DEFAULT_LIMIT = 20;
const DEFAULT_MAX_PER_CAPABILITY = 3;
const SNIPPET_MAX_LENGTH = 240;

const FIELD_WEIGHTS = {
  capabilityName: 6,
  capabilityDescription: 4,
  tags: 5,
  namespaceSlug: 3,
  path: 3,
  headings: 2.5,
  body: 1,
} as const;

const RESOURCE_QUERY_TERMS = new Set(["catalogue", "gallery", "gallerie", "inspiration", "lien", "link", "reference", "resource", "ressource"]);
const RESOURCE_CAPABILITY_TERMS = new Set(["inspiration", "lien", "link", "reference", "resource", "ressource"]);

const RESOURCE_DOMAINS = [
  {
    queryTerms: new Set(["ai", "agent", "anime", "animated", "component", "composant", "gallery", "interface", "shadcn", "ui"]),
    capabilityTerms: new Set(["ai", "agent", "component", "composant", "gallery", "interface", "shadcn", "ui"]),
  },
  {
    queryTerms: new Set(["animation", "badge", "card", "easing", "modal", "motion", "number", "resize", "timing", "transition"]),
    capabilityTerms: new Set(["animation", "easing", "motion", "timing", "transition"]),
  },
  {
    queryTerms: new Set(["3d", "brand", "branding", "illustration", "print", "visual", "web"]),
    capabilityTerms: new Set(["3d", "brand", "branding", "illustration", "print", "visual", "web"]),
  },
] as const;

/**
 * Not every file is equally worth surfacing. A `BUNDLE.md` concatenates the whole
 * capability, so it matches almost any query without being the useful answer; data
 * and scripts match incidentally. Prose that states intent ranks first.
 */
const FILE_TYPE_WEIGHTS: Record<CapabilityFile["type"], number> = {
  skill: 1.4,
  reference: 1.1,
  shared: 1.1,
  agent: 1,
  readme: 0.9,
  other: 0.8,
  asset: 0.8,
  data: 0.6,
  script: 0.5,
  bundle: 0.35,
};

/**
 * Procedural documents remain searchable, but should not outrank domain
 * guidance just because a query contains words like "landing" or "conversion".
 * They are useful after a capability has been selected, not as creative input.
 */
const FILE_PATH_MULTIPLIERS: Record<string, number> = {
  "shared/output-schemas.md": 0.2,
  "shared/examples.md": 0.35,
  "shared/anti-generic.md": 0.55,
  "shared/scoring-rubric.md": 0.55,
  "BUNDLE.md": 0.2,
};

/** Licence notices carry provenance text that would otherwise pollute every result. */
const NOTICE_PATTERN = /^(LICEN[CS]E|NOTICE|COPYING)(\.[a-z]+)?$/i;

const STOPWORDS = new Set([
  // English
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "how",
  "in", "into", "is", "it", "its", "of", "on", "or", "that", "the", "then",
  "this", "to", "was", "what", "when", "which", "with", "you", "your",
  // French
  "au", "aux", "avec", "ce", "ces", "dans", "de", "des", "du", "elle", "en",
  "est", "et", "eux", "il", "je", "la", "le", "les", "leur", "lui", "ma",
  "mais", "me", "mes", "mon", "ne", "nos", "notre", "nous", "on", "ou", "par",
  "pas", "pour", "qu", "que", "qui", "sa", "se", "ses", "son", "sur", "ta",
  "te", "tes", "toi", "ton", "tu", "un", "une", "vos", "votre", "vous",
]);

/** Lowercase, strip accents, split on non-alphanumerics, drop stopwords. */
export function tokenize(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token))
    .map(singularize);
}

/** Crude but symmetric stemming: applied to both the query and the documents. */
function singularize(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("es") && !token.endsWith("ses")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface IndexedDocument {
  capability: Capability;
  file: CapabilityFile;
  /** Term -> accumulated field-weighted frequency. */
  weights: Map<string, number>;
  /** Terms found in file-level fields only (path, headings, body). */
  fileTerms: Set<string>;
  normalizedText: string;
  /**
   * The one file that represents this capability when only its metadata matches.
   * Undefined only when the capability has no indexable text file at all.
   */
  representative?: CapabilityFile;
}

interface QueryIntent {
  terms: Set<string>;
  wantsResource: boolean;
}

function addField(target: Map<string, number>, value: string, weight: number, collect?: Set<string>): void {
  for (const token of tokenize(value)) {
    target.set(token, (target.get(token) || 0) + weight);
    collect?.add(token);
  }
}

function indexFile(capability: Capability, file: CapabilityFile): IndexedDocument {
  const weights = new Map<string, number>();
  const fileTerms = new Set<string>();

  addField(weights, `${capability.id} ${capability.name}`, FIELD_WEIGHTS.capabilityName);
  addField(weights, `${capability.namespace} ${capability.slug}`, FIELD_WEIGHTS.namespaceSlug);
  addField(weights, capability.description, FIELD_WEIGHTS.capabilityDescription);
  addField(weights, (capability.tags || []).join(" "), FIELD_WEIGHTS.tags);

  addField(weights, file.path, FIELD_WEIGHTS.path, fileTerms);

  const text = file.text || "";
  if (file.mimeType === "text/markdown") {
    addField(weights, extractHeadings(text).join(" "), FIELD_WEIGHTS.headings, fileTerms);
  }
  addField(weights, text, FIELD_WEIGHTS.body, fileTerms);

  return { capability, file, weights, fileTerms, normalizedText: normalizeText(text) };
}

/**
 * The single file that stands for a capability when only its metadata matches:
 * SKILL.md when present, else mcp.json, else the highest-relevance indexed file.
 *
 * This keeps capabilities without a SKILL.md (today: MCP-only) discoverable by
 * id/namespace/slug/name/description/tags while still surfacing a metadata match
 * once, instead of repeating it on every file the capability happens to contain.
 */
function representativeFileFor(capability: Capability, indexed: CapabilityFile[]): CapabilityFile | undefined {
  const skill = indexed.find((file) => file.path === "SKILL.md");
  if (skill) return skill;
  const mcp = indexed.find((file) => file.path === "mcp.json");
  if (mcp) return mcp;
  return indexed.reduce<CapabilityFile | undefined>(
    (best, file) => (!best || fileRelevanceWeight(file) > fileRelevanceWeight(best) ? file : best),
    undefined,
  );
}

interface QueryTerm {
  term: string;
  /** 1 for a literal query token, lower for a synonym expansion. */
  weight: number;
  /** The literal query token this term stands for, used for coverage. */
  root: string;
}

function buildQueryTerms(query: string): QueryTerm[] {
  const literals = [...new Set(tokenize(query))];
  const terms = new Map<string, QueryTerm>();

  for (const literal of literals) {
    terms.set(literal, { term: literal, weight: 1, root: literal });
  }

  for (const literal of literals) {
    for (const expansion of expandTerm(literal).map(singularize)) {
      if (terms.has(expansion)) continue;
      terms.set(expansion, { term: expansion, weight: EXPANSION_WEIGHT, root: literal });
    }
  }

  return [...terms.values()];
}

function documentFrequency(documents: IndexedDocument[], term: string): number {
  return documents.reduce((count, document) => (document.weights.has(term) ? count + 1 : count), 0);
}

function buildSnippet(document: IndexedDocument, matched: Set<string>): string {
  const text = document.file.text;
  if (!text) return `${document.file.bytes} bytes, binary (${document.file.mimeType})`;

  let best = "";
  let bestScore = 0;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length < 3) continue;

    const tokens = new Set(tokenize(trimmed));
    let score = 0;
    for (const term of matched) {
      if (tokens.has(term)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = trimmed;
    }
  }

  if (!best) best = text.split("\n").find((line) => line.trim().length > 0)?.trim() || "";
  return best.length > SNIPPET_MAX_LENGTH ? `${best.slice(0, SNIPPET_MAX_LENGTH - 1)}…` : best;
}

function fileRelevanceWeight(file: CapabilityFile): number {
  return (FILE_TYPE_WEIGHTS[file.type] ?? 1) * (FILE_PATH_MULTIPLIERS[file.path] ?? 1);
}

function capabilityMetadataTerms(capability: Capability): Set<string> {
  return new Set(tokenize([capability.id, capability.name, capability.description, ...(capability.tags || [])].join(" ")));
}

function hasAny(source: Set<string>, candidates: ReadonlySet<string>): boolean {
  for (const candidate of candidates) {
    if (source.has(candidate)) return true;
  }
  return false;
}

function detectQueryIntent(queryTerms: QueryTerm[]): QueryIntent {
  const terms = new Set(queryTerms.filter((term) => term.weight === 1).map((term) => term.root));
  return {
    terms,
    wantsResource: hasAny(terms, RESOURCE_QUERY_TERMS),
  };
}

function resourceIntentWeight(document: IndexedDocument, intent: QueryIntent): number {
  if (!intent.wantsResource) return 1;

  const metadataTerms = capabilityMetadataTerms(document.capability);
  let weight = 1;

  if (hasAny(metadataTerms, RESOURCE_CAPABILITY_TERMS)) weight *= 2;
  if (document.file.type === "reference") weight *= 1.3;

  for (const domain of RESOURCE_DOMAINS) {
    if (hasAny(intent.terms, domain.queryTerms) && hasAny(metadataTerms, domain.capabilityTerms)) {
      weight *= 1.35;
    }
  }

  return weight;
}

export function searchCapabilities(
  capabilities: Capability[],
  query: string,
  options: CapabilitySearchOptions = {},
): CapabilitySearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryTerms = buildQueryTerms(trimmed);
  if (queryTerms.length === 0) return [];

  const scope = options.capabilityId
    ? capabilities.filter((capability) => capability.id === options.capabilityId)
    : capabilities;

  const documents = scope.flatMap((capability) => {
    const indexed = capability.files
      .filter((file) => typeof file.text === "string" && !NOTICE_PATTERN.test(file.path))
      .map((file) => indexFile(capability, file));
    const representative = representativeFileFor(
      capability,
      indexed.map((document) => document.file),
    );
    return indexed.map((document) => ({ ...document, representative }));
  });

  if (documents.length === 0) return [];

  const total = documents.length;
  const idf = new Map<string, number>();
  for (const { term } of queryTerms) {
    const frequency = documentFrequency(documents, term);
    idf.set(term, frequency === 0 ? 0 : Math.log(1 + (total - frequency + 0.5) / (frequency + 0.5)));
  }

  const roots = new Set(queryTerms.filter((term) => term.weight === 1).map((term) => term.root));
  const phrase = normalizeText(trimmed);
  const intent = detectQueryIntent(queryTerms);

  const scored = documents
    .map((document) => {
      let score = 0;
      const matched = new Set<string>();
      const matchedRoots = new Set<string>();
      let matchedInFile = false;

      for (const { term, weight, root } of queryTerms) {
        const fieldWeight = document.weights.get(term);
        if (!fieldWeight) continue;

        score += Math.log(1 + fieldWeight) * (idf.get(term) || 0) * weight;
        matched.add(term);
        matchedRoots.add(root);
        if (document.fileTerms.has(term)) matchedInFile = true;
      }

      if (score === 0) return undefined;

      // A capability-level match alone should surface the capability once, via
      // its representative file (SKILL.md, else mcp.json, else the most relevant
      // indexed file) instead of every file it happens to contain. This keeps
      // MCP-only capabilities, which have no SKILL.md, discoverable by metadata.
      if (!matchedInFile && document.file !== document.representative) return undefined;

      const coverage = roots.size === 0 ? 1 : matchedRoots.size / roots.size;
      score *= coverage * coverage;
      score *= fileRelevanceWeight(document.file);
      score *= resourceIntentWeight(document, intent);

      if (document.normalizedText.includes(phrase)) score *= PHRASE_BONUS;

      return {
        capabilityId: document.capability.id,
        capabilityName: document.capability.name,
        capabilityDescription: document.capability.description,
        path: document.file.path,
        uri: document.file.uri,
        title: document.file.path.split("/").at(-1) || document.file.path,
        snippet: buildSnippet(document, matched),
        score: Number(score.toFixed(4)),
        matchedTerms: [...matchedRoots].sort(),
      } satisfies CapabilitySearchResult;
    })
    .filter((result): result is CapabilitySearchResult => result !== undefined)
    .sort((a, b) => b.score - a.score || a.capabilityId.localeCompare(b.capabilityId) || a.path.localeCompare(b.path));

  const maxPerCapability = options.maxPerCapability ?? DEFAULT_MAX_PER_CAPABILITY;
  const perCapability = new Map<string, number>();
  const capped: CapabilitySearchResult[] = [];

  for (const result of scored) {
    const seen = perCapability.get(result.capabilityId) || 0;
    if (seen >= maxPerCapability) continue;
    perCapability.set(result.capabilityId, seen + 1);
    capped.push(result);
  }

  return capped.slice(0, options.limit ?? DEFAULT_LIMIT);
}
