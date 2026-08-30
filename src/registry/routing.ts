import { extractMarkdownSections, isMarkdownEntrypoint } from "./frontmatter";
import { tokenize } from "./search";
import { rankMarkdownSections } from "./section-search";
import type {
  Capability,
  CapabilityRegistry,
  CapabilityRoutingCard,
  CapabilityTaskMode,
} from "./types";

export interface ResolveCapabilitiesInput {
  task: string;
  taskMode?: CapabilityTaskMode;
  projectContext?: unknown;
  profile?: string;
  maxCapabilities?: number;
  maxCharacters?: number;
}

export interface ResolvedEntrypoint {
  path: string;
  heading?: string;
  characters: number;
}

export interface ResolvedCapability {
  id: string;
  reasonCodes: string[];
  entrypoints: ResolvedEntrypoint[];
}

export interface CapabilityResolution {
  primary: ResolvedCapability | null;
  supporting: ResolvedCapability[];
  conflicts: Array<{ ids: [string, string]; reason: "routing-conflict" }>;
  budget: { unit: "characters"; maximum: number; estimated: number };
  confidence: "high" | "medium" | "low" | "insufficient";
}

interface Candidate {
  capability: Capability;
  path: string;
  score: number;
  reasonCodes: string[];
}

const RESOURCE_INTENT_TERMS = new Set([
  "catalog", "catalogue", "examples", "gallery", "galleries", "reference", "references",
  "resource", "resources", "ressource", "ressources",
]);

function hasResourceIntent(queryTerms: Set<string>): boolean {
  return [...queryTerms].some((term) => RESOURCE_INTENT_TERMS.has(term));
}

function contextText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(contextText).join(" ");
  if (value !== null && typeof value === "object") return Object.values(value).map(contextText).join(" ");
  return value === undefined || value === null ? "" : String(value);
}

function phraseCoverage(queryTerms: Set<string>, phrase: string): number {
  const terms = [...new Set(tokenize(phrase))];
  if (terms.length === 0) return 0;
  return terms.filter((term) => queryTerms.has(term)).length / terms.length;
}

function strongestCoverage(queryTerms: Set<string>, phrases: string[]): number {
  return phrases.reduce((best, phrase) => Math.max(best, phraseCoverage(queryTerms, phrase)), 0);
}

function routesConflict(left: Capability, right: Capability): boolean {
  return left.routing?.conflictsWith.includes(right.id) === true
    || right.routing?.conflictsWith.includes(left.id) === true;
}

function scoreRouting(card: CapabilityRoutingCard | undefined, queryTerms: Set<string>, mode?: CapabilityTaskMode) {
  if (!card) return { adjustment: 0, reasonCodes: [] as string[] };
  const reasonCodes: string[] = [];
  let adjustment = card.role === "specialist" ? 1 : card.role === "generalist" ? -0.5 : 0;
  const useCoverage = strongestCoverage(queryTerms, card.useWhen);
  const avoidCoverage = strongestCoverage(queryTerms, card.avoidWhen);
  if (useCoverage >= 0.5) {
    adjustment += 8 * useCoverage;
    reasonCodes.push("routing-use-when");
  }
  if (avoidCoverage >= 0.5) {
    adjustment -= 10 * avoidCoverage;
    reasonCodes.push("routing-avoid-when");
  }
  if (mode) {
    if (card.taskModes.includes(mode)) {
      adjustment += 2;
      reasonCodes.push("task-mode-match");
    } else {
      adjustment -= 3;
      reasonCodes.push("task-mode-mismatch");
    }
  }
  return { adjustment, reasonCodes };
}

function entrypointFor(capability: Capability, path: string, query: string, remaining: number): ResolvedEntrypoint[] {
  const file = capability.files.find((candidate) => candidate.path === path)
    || capability.files.find((candidate) => candidate.path === "SKILL.md")
    || capability.files.find((candidate) => typeof candidate.text === "string");
  if (!file || typeof file.text !== "string") return [];
  if (file.mimeType === "text/markdown") {
    const ranked = rankMarkdownSections(file.text, query, 5)
      .filter((section) => section.text.length <= remaining);
    const section = ranked[0];
    if (section) return [{ path: file.path, heading: section.heading, characters: section.text.length }];
    const sections = extractMarkdownSections(file.text);
    const bounded = sections.find((section, index) => isMarkdownEntrypoint(sections, index) && section.text.length <= remaining);
    if (bounded) return [{ path: file.path, heading: bounded.heading, characters: bounded.text.length }];
  }
  return file.text.length <= remaining ? [{ path: file.path, characters: file.text.length }] : [];
}

export function resolveCapabilities(registry: CapabilityRegistry, input: ResolveCapabilitiesInput): CapabilityResolution {
  const task = input.task.trim();
  if (!task) throw new Error("resolve-capabilities requires a non-empty task");
  const maximum = Math.max(1_000, Math.min(50_000, Math.floor(input.maxCharacters || 8_000)));
  const maxCapabilities = Math.max(1, Math.min(3, Math.floor(input.maxCapabilities || 3)));
  const query = [task, contextText(input.projectContext), input.profile || ""].filter(Boolean).join(" ");
  const queryTerms = new Set(tokenize(query));
  const resourceIntent = hasResourceIntent(queryTerms);
  const hits = registry.search(query, { limit: 12, diagnostic: true });
  const maximumLexicalScore = Math.max(1, ...hits.map((hit) => hit.score));
  const hitsByCapability = new Map(hits.map((hit) => [hit.capabilityId, hit]));
  const candidateCapabilities = new Map<string, Capability>();
  for (const hit of hits) {
    const capability = registry.getCapability(hit.capabilityId);
    if (capability) candidateCapabilities.set(capability.id, capability);
  }
  for (const capability of registry.listCapabilities()) {
    if (capability.routing && strongestCoverage(queryTerms, capability.routing.useWhen) >= 0.5) {
      candidateCapabilities.set(capability.id, capability);
    }
  }
  const candidates: Candidate[] = [...candidateCapabilities.values()].map((capability) => {
    const hit = hitsByCapability.get(capability.id);
    const routing = scoreRouting(capability.routing, queryTerms, input.taskMode);
    const path = hit?.path
      || capability.files.find((file) => file.path === "SKILL.md")?.path
      || capability.files.find((file) => typeof file.text === "string")?.path
      || "";
    return {
      capability,
      path,
      score: ((hit?.score || 0) / maximumLexicalScore) * 10 + routing.adjustment,
      reasonCodes: [...(hit ? ["lexical-match"] : []), ...routing.reasonCodes],
    };
  }).sort((left, right) => right.score - left.score || left.capability.id.localeCompare(right.capability.id));

  if (candidates.length === 0) {
    return {
      primary: null,
      supporting: [],
      conflicts: [],
      budget: { unit: "characters", maximum, estimated: 0 },
      confidence: "insufficient",
    };
  }

  const primaryCandidate = candidates[0];
  const selected: Candidate[] = [primaryCandidate];
  const conflicts: CapabilityResolution["conflicts"] = [];
  const complements = new Set(primaryCandidate.capability.routing?.complements || []);
  const remaining = candidates.slice(1).sort((left, right) => {
    const leftBonus = complements.has(left.capability.id) ? 4 : 0;
    const rightBonus = complements.has(right.capability.id) ? 4 : 0;
    return (right.score + rightBonus) - (left.score + leftBonus);
  });
  for (const candidate of remaining) {
    const conflict = selected.find((chosen) => routesConflict(chosen.capability, candidate.capability));
    if (conflict) {
      conflicts.push({
        ids: [conflict.capability.id, candidate.capability.id].sort() as [string, string],
        reason: "routing-conflict",
      });
      continue;
    }
    if (selected.length >= maxCapabilities) continue;
    const explicitComplement = complements.has(candidate.capability.id);
    if (resourceIntent && candidate.capability.routing?.role === "generalist" && !explicitComplement) {
      continue;
    }
    if (!explicitComplement && candidate.capability.routing
      && !candidate.reasonCodes.includes("routing-use-when")) {
      continue;
    }
    const minimumSupportingScore = Math.max(2, primaryCandidate.score * (explicitComplement ? 0.25 : 0.8));
    if (candidate.score < minimumSupportingScore) continue;
    selected.push(candidate);
  }

  let estimated = 0;
  const project = (candidate: Candidate): ResolvedCapability => {
    const entrypoints = entrypointFor(candidate.capability, candidate.path, query, maximum - estimated);
    estimated += entrypoints.reduce((sum, entrypoint) => sum + entrypoint.characters, 0);
    return {
      id: candidate.capability.id,
      reasonCodes: [...new Set([
        ...candidate.reasonCodes,
        ...(complements.has(candidate.capability.id) ? ["primary-complement"] : []),
      ])],
      entrypoints,
    };
  };
  const primary = project(selected[0]);
  const supporting = selected.slice(1).map(project);
  const routed = primaryCandidate.reasonCodes.includes("routing-use-when")
    || primaryCandidate.reasonCodes.includes("task-mode-match");
  const margin = candidates.length > 1 ? primaryCandidate.score - candidates[1].score : primaryCandidate.score;

  return {
    primary,
    supporting,
    conflicts: [...new Map(conflicts.map((conflict) => [conflict.ids.join("::"), conflict])).values()],
    budget: { unit: "characters", maximum, estimated },
    confidence: routed && margin >= 2 ? "high" : routed ? "medium" : "low",
  };
}
