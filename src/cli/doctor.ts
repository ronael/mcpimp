import { resolve } from "node:path";
import { loadDotenv } from "../env/load-dotenv";
import { formatDoctorReport, runDoctor } from "./doctor-core";

await loadDotenv();

const root = resolve(process.env.MCPIMP_ROOT || process.cwd());
const port = Number(process.env.PORT || 3901);
const report = await runDoctor(root, port);

console.log(formatDoctorReport(report));
process.exitCode = report.exitCode;
