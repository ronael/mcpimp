import type { RoutingEvaluationCase } from "../../src/registry/routing-evaluation";

/** Versioned business expectations for deterministic capability composition. */
export const ROUTING_EVALUATION_CORPUS: RoutingEvaluationCase[] = [
  {
    id: "structural-landing",
    task: "Create an anti-generic landing page with strong visual structure and varied sections",
    taskMode: "create",
    expectedPrimaryId: "hallmark",
    forbiddenCapabilityIds: ["taste-skill", "ui-ux-pro-max"],
    critical: true,
  },
  {
    id: "conversion-landing",
    task: "Design a conversion landing page around the product, audience and primary action",
    taskMode: "create",
    expectedPrimaryId: "elaya-design-landing-page-design",
    forbiddenCapabilityIds: ["hallmark", "taste-skill"],
    critical: true,
  },
  {
    id: "existing-ui-polish",
    task: "Polish an existing generic interface while preserving its product structure",
    taskMode: "redesign",
    expectedPrimaryId: "ui-skills-improve-ui",
    forbiddenCapabilityIds: ["hallmark", "taste-skill"],
    critical: true,
  },
  {
    id: "accessibility-fix",
    task: "Fix keyboard navigation, focus visibility, form labels and contrast",
    taskMode: "fix",
    expectedPrimaryId: "ui-skills-fixing-accessibility",
    critical: true,
  },
  {
    id: "motion-performance-fix",
    task: "Fix janky animation performance and layout thrashing in transitions",
    taskMode: "fix",
    expectedPrimaryId: "ui-skills-fixing-motion-performance",
    critical: true,
  },
  {
    id: "component-resources",
    task: "Find component galleries, shadcn examples and UI references",
    taskMode: "research",
    expectedPrimaryId: "ui-component-resources",
    forbiddenCapabilityIds: ["taste-skill", "ui-ux-pro-max"],
    critical: true,
  },
  {
    id: "code-review",
    task: "Review code changes for overengineering and unnecessary abstractions",
    taskMode: "review",
    expectedPrimaryId: "ponytail-review",
    critical: true,
  },
  {
    id: "nocodb-integration",
    task: "Integrate NocoDB tables and records through its MCP server",
    taskMode: "integrate",
    expectedPrimaryId: "nocodb",
    critical: true,
  },
];
