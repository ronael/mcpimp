export interface AgentRoutingScenario {
  id: string;
  task: string;
  expectedCapabilityId: string;
  nativeSkillRoot: string;
  nativeSkillName: string;
}

export const AGENT_ROUTING_ABC_CORPUS: AgentRoutingScenario[] = [
  {
    id: "component-resources",
    task: "Find concrete component galleries and shadcn examples for a complex product interface.",
    expectedCapabilityId: "ui-component-resources",
    nativeSkillRoot: "catalog/capabilities/local/ui-component-resources",
    nativeSkillName: "ui-component-resources",
  },
  {
    id: "frontend-architecture",
    task: "Design a React TypeScript architecture with a pure domain, use cases, ports, adapters and a composition root.",
    expectedCapabilityId: "frontend-architecture",
    nativeSkillRoot: "catalog/capabilities/local/frontend-architecture",
    nativeSkillName: "frontend-architecture",
  },
  {
    id: "accessibility-fix",
    task: "Fix keyboard navigation, focus visibility, form labels and contrast in an existing interface.",
    expectedCapabilityId: "ui-skills-fixing-accessibility",
    nativeSkillRoot: "catalog/capabilities/ui-skills/fixing-accessibility/upstream",
    nativeSkillName: "fixing-accessibility",
  },
];
