import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { AGENT_ROUTING_ABC_CORPUS } from "../test/evaluation/agent-routing-abc-corpus";

const CONDITIONS = ["native", "mcp", "mcp-adapter"] as const;
const ENDPOINT = process.env.MCPIMP_URL || "http://127.0.0.1:3901/message";

interface AgentDecision {
  selectedCapabilityId: string;
  selectionReason: string;
  guidanceLoaded: boolean;
}

async function runCodex(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("codex", args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timeout = setTimeout(() => child.kill("SIGTERM"), 300_000);
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", rejectRun);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      const output = { stdout: Buffer.concat(stdout).toString("utf-8"), stderr: Buffer.concat(stderr).toString("utf-8") };
      if (code === 0) resolveRun(output);
      else rejectRun(new Error(`codex exited with ${code ?? signal}: ${output.stderr || output.stdout}`));
    });
  });
}

async function prepareWorkspace(root: string, condition: typeof CONDITIONS[number], scenario: typeof AGENT_ROUTING_ABC_CORPUS[number]) {
  await mkdir(root, { recursive: true });
  if (condition === "native") {
    const target = join(root, ".agents/skills", scenario.nativeSkillName);
    await mkdir(dirname(target), { recursive: true });
    await cp(resolve(scenario.nativeSkillRoot), target, { recursive: true });
  }
  if (condition === "mcp-adapter") {
    await mkdir(join(root, ".agents/skills"), { recursive: true });
    await cp(resolve("adapters/codex/mcpimp-router"), join(root, ".agents/skills/mcpimp-router"), { recursive: true });
  }
}

function completedMcpTools(output: string): string[] {
  return output.split("\n").flatMap((line) => {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const item = event.item;
      if (event.type !== "item.completed" || item === null || typeof item !== "object" || Array.isArray(item)) return [];
      const record = item as Record<string, unknown>;
      if (record.type !== "mcp_tool_call" || record.server !== "mcpimp") return [];
      const tool = record.tool || record.name;
      return typeof tool === "string" ? [tool] : [];
    } catch {
      return [];
    }
  });
}

function completedMcpResourceReads(output: string): number {
  return output.split("\n").filter((line) => {
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      if (event.type !== "item.completed" || event.item === null || typeof event.item !== "object") return false;
      const serialized = JSON.stringify(event.item);
      return serialized.includes("mcpimp") && serialized.includes("skill://");
    } catch {
      return false;
    }
  }).length;
}

async function runOne(
  base: string,
  condition: typeof CONDITIONS[number],
  scenario: typeof AGENT_ROUTING_ABC_CORPUS[number],
) {
  const workspace = join(base, condition, scenario.id);
  const decisionPath = join(workspace, "decision.json");
  await prepareWorkspace(workspace, condition, scenario);
  const prompt = [
    "Analyze the task and prepare the correct approach, but do not implement or modify files.",
    "Inspect and load any applicable guidance mechanism available in this isolated workspace before deciding.",
    "Return the domain capability that informed the approach, never a router or adapter. Use MCPIMP's stable id when available; for a direct native skill, use its skill name.",
    `Task: ${scenario.task}`,
  ].join("\n");
  const args = [
    "exec", "--ephemeral", "--ignore-user-config", "--ignore-rules", "--skip-git-repo-check",
    "--disable", "plugins", "--disable", "apps", "--disable", "remote_plugin", "--disable", "recommended_plugins",
    "--approve-for-me", "--cd", workspace,
    "--model", "gpt-5.6-luna", "--config", 'model_reasoning_effort="low"',
    "--output-schema", resolve("test/evaluation/agent-routing-output.schema.json"),
    "--output-last-message", decisionPath, "--json",
  ];
  if (condition !== "native") {
    args.push("--config", `mcp_servers.mcpimp.url="${ENDPOINT}"`);
  }
  args.push(prompt);

  const startedAt = Date.now();
  const { stdout, stderr } = await runCodex(args);
  const decision = JSON.parse(await readFile(decisionPath, "utf-8")) as AgentDecision;
  const mcpTools = completedMcpTools(stdout);
  const resourceReadCalls = completedMcpResourceReads(stdout);
  const acceptedIds = condition === "native"
    ? [scenario.nativeSkillName, scenario.expectedCapabilityId]
    : [scenario.expectedCapabilityId];
  return {
    scenario: scenario.id,
    condition,
    selectedCapabilityId: decision.selectedCapabilityId,
    selectionReason: decision.selectionReason,
    guidanceLoaded: decision.guidanceLoaded,
    passed: acceptedIds.includes(decision.selectedCapabilityId),
    resolveCalls: mcpTools.filter((tool) => tool === "resolve-capabilities").length,
    loadCalls: mcpTools.filter((tool) => tool === "load-capability").length,
    resourceReadCalls,
    durationMs: Date.now() - startedAt,
    stderr: stderr.split("\n")
      .filter((line) => line && !line.includes("state db discrepancy") && !line.includes("shell snapshot"))
      .join("\n") || undefined,
  };
}

const root = await mkdtemp(join(tmpdir(), "mcpimp-agent-routing-"));
try {
  const results: Awaited<ReturnType<typeof runOne>>[] = [];
  for (const scenario of AGENT_ROUTING_ABC_CORPUS) {
    for (const condition of CONDITIONS) {
      results.push(await runOne(root, condition, scenario));
    }
  }
  const report = {
    date: new Date().toISOString(),
    runner: { client: "codex", model: "gpt-5.6-luna", reasoningEffort: "low", runsPerScenario: 1 },
    conditions: {
      native: "direct native skill",
      mcp: "MCPIMP configured without a project adapter; host baseline skills remain",
      "mcp-adapter": "MCPIMP plus native router adapter",
    },
    summary: Object.fromEntries(CONDITIONS.map((condition) => {
      const selected = results.filter((result) => result.condition === condition);
      return [condition, {
        runs: selected.length,
        selectionAccuracy: selected.filter((result) => result.passed).length / selected.length,
        resolveCallRuns: selected.filter((result) => result.resolveCalls > 0).length,
        loadCallRuns: selected.filter((result) => result.loadCalls > 0).length,
        resourceReadRuns: selected.filter((result) => result.resourceReadCalls > 0).length,
        guidanceLoadRuns: selected.filter((result) => result.loadCalls > 0 || result.resourceReadCalls > 0).length,
      }];
    })),
    results,
  };
  const outputPath = resolve("test/evaluation/codex-agent-routing-abc-pilot.json");
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${basename(outputPath)}`);
  console.table(results.map(({ scenario, condition, selectedCapabilityId, passed, resolveCalls, loadCalls }) => ({
    scenario, condition, selectedCapabilityId, passed, resolveCalls, loadCalls,
  })));
} finally {
  await rm(root, { recursive: true, force: true });
}
