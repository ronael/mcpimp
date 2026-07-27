import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function parseEnvLine(line: string): [string, string] | undefined {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;

  const separator = trimmed.indexOf("=");
  if (separator === -1) return undefined;

  const key = trimmed.slice(0, separator).trim();
  const value = trimmed
    .slice(separator + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!key) return undefined;
  return [key, value];
}

export async function loadDotenv(path = resolve(".env")) {
  const content = await readFile(path, "utf-8").catch(() => "");
  if (!content) return;

  for (const line of content.split("\n")) {
    const entry = parseEnvLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    process.env[key] ||= value;
  }
}
