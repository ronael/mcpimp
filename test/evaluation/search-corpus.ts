import type { SearchEvaluationCase } from "../../src/registry/evaluation";

/**
 * Versioned product expectations for capability discovery.
 *
 * Keep queries close to real user language. Add or change an expectation only
 * when the product intent changes, not merely to make a ranking patch pass.
 */
export const SEARCH_EVALUATION_CORPUS: SearchEvaluationCase[] = [
  {
    id: "accessibility-en",
    query: "accessibility keyboard navigation focus contrast forms",
    expectedCapabilityIds: ["ui-skills-fixing-accessibility"],
    expectedFiles: [{ capabilityId: "ui-skills-fixing-accessibility", path: "SKILL.md" }],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "motion-performance-en",
    query: "animation performance layout thrashing janky transitions",
    expectedCapabilityIds: ["ui-skills-fixing-motion-performance"],
    expectedFiles: [{ capabilityId: "ui-skills-fixing-motion-performance", path: "SKILL.md" }],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "frontend-architecture-fr",
    query: "architecture frontend TypeScript ports adapters Zustand domaine pur",
    expectedCapabilityIds: ["frontend-architecture"],
    expectedFiles: [
      { capabilityId: "frontend-architecture", path: "references/src-architecture-blueprint.md" },
      { capabilityId: "frontend-architecture", path: "SKILL.md" },
    ],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "component-resources-fr",
    query: "ressources composants UI animés agent shadcn approval cards",
    expectedCapabilityIds: ["ui-component-resources"],
    expectedFiles: [
      { capabilityId: "ui-component-resources", path: "references/component-inspiration-links.md" },
    ],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "motion-resources-fr",
    query: "ressources motion transitions modal easing animation interface",
    expectedCapabilityIds: ["motion-design-resources"],
    expectedFiles: [
      { capabilityId: "motion-design-resources", path: "references/motion-inspiration-links.md" },
    ],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "visual-resources-fr",
    query: "inspiration design visuel branding 3D illustration print ressources",
    expectedCapabilityIds: ["visual-design-resources"],
    expectedFiles: [
      { capabilityId: "visual-design-resources", path: "references/visual-inspiration-links.md" },
    ],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "agent-browser-tools-fr",
    query: "outil navigateur autonome pour agent alternative à Playwright",
    expectedCapabilityIds: ["agent-tools"],
    expectedFiles: [
      { capabilityId: "agent-tools", path: "SKILL.md" },
      { capabilityId: "agent-tools", path: "references/agent-tools.md" },
    ],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "nocodb-mcp-fr",
    query: "utiliser NocoDB tables records avec un serveur MCP personnel",
    expectedCapabilityIds: ["nocodb"],
    expectedFiles: [
      { capabilityId: "nocodb", path: "SKILL.md" },
      { capabilityId: "nocodb", path: "mcp.json" },
    ],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "code-review-simplification-en",
    query: "review code changes for over engineering unnecessary abstractions",
    expectedCapabilityIds: ["ponytail-review"],
    critical: false,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "requirements-grilling-en",
    query: "stress test requirements ask clarification questions decision tree",
    expectedCapabilityIds: ["matt-pocock-grilling"],
    critical: false,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "landing-page-fr",
    query: "concevoir une landing page premium conversion contenu public cible",
    expectedCapabilityIds: ["landing-page", "elaya-design-landing-page-design"],
    critical: false,
    contextBudgetCharacters: 12_000,
  },
  {
    id: "design-system-documentation-en",
    query: "document existing interface design system tokens DESIGN.md",
    expectedCapabilityIds: ["ui-skills-create-design-md"],
    expectedFiles: [{ capabilityId: "ui-skills-create-design-md", path: "SKILL.md" }],
    critical: true,
    contextBudgetCharacters: 12_000,
  },
];
