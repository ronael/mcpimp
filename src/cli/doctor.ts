import { resolve } from "node:path";
import { loadDotenv } from "../env/load-dotenv";
import { formatDoctorReport, runDoctor } from "./doctor-core";

await loadDotenv();

const root = resolve(process.env.MCPIMP_ROOT || process.cwd());
const port = Number(process.env.PORT || 3901);
const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"));
const supported = new Set(["--json", "--preflight"]);
const unknown = [...args].filter((arg) => !supported.has(arg));

if (unknown.length > 0) {
  console.error(`Unknown doctor option(s): ${unknown.join(", ")}`);
  process.exitCode = 2;
} else {
  const report = await runDoctor(root, port, {
    mode: args.has("--preflight") ? "preflight" : "runtime",
    endpoint: process.env.MCPIMP_URL || `http://localhost:${port}/message`,
  });
  console.log(args.has("--json") ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
  process.exitCode = report.exitCode;
}
