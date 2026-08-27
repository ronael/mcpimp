export interface HeadingEvaluationCase {
  id: string;
  capabilityId: string;
  path: string;
  query: string;
  expectedHeading: string;
  expectedLinkedPaths?: string[];
}

/** Product expectations for query-aware progressive entrypoints. */
export const HEADING_EVALUATION_CORPUS: HeadingEvaluationCase[] = [
  {
    id: "frontend-architecture-workflow-fr",
    capabilityId: "frontend-architecture",
    path: "SKILL.md",
    query: "restructurer frontend TypeScript domaine pur ports adapters Zustand",
    expectedHeading: "Workflow",
    expectedLinkedPaths: ["references/src-architecture-blueprint.md"],
  },
  {
    id: "landing-intake-fr",
    capabilityId: "elaya-design-landing-page-design",
    path: "SKILL.md",
    query: "informations offre audience objections preuves assets avant de concevoir",
    expectedHeading: "A1. Intake",
  },
  {
    id: "landing-structure-fr",
    capabilityId: "elaya-design-landing-page-design",
    path: "SKILL.md",
    query: "structure page hero bénéfices preuve FAQ CTA",
    expectedHeading: "A2. Page structure",
  },
  {
    id: "landing-typography-fr",
    capabilityId: "elaya-design-landing-page-design",
    path: "SKILL.md",
    query: "règles typographie fonts tailles line height",
    expectedHeading: "Fonts",
  },
  {
    id: "component-resources-router-fr",
    capabilityId: "ui-component-resources",
    path: "SKILL.md",
    query: "références inspiration composants UI workflow",
    expectedHeading: "Workflow",
    expectedLinkedPaths: ["references/component-inspiration-links.md"],
  },
];
