import type { Capability, CapabilityFile } from "../registry/types";
import type { DashboardCopy } from "./dashboard-i18n";

export interface ReferenceLink {
  title: string;
  url: string;
  sourcePath: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

export function anchorId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "section";
}

function titleBefore(text: string, index: number): string | undefined {
  const before = text.slice(0, index);
  const headings = [...before.matchAll(/^#{2,3}\s+(.+)$/gm)];
  return headings.at(-1)?.[1]?.trim();
}

function titleFromListLabel(value: string): string | undefined {
  const label = value
    .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
    .trim()
    .replace(/[:：]\s*$/, "")
    .trim();

  if (!label || label.startsWith("#") || /^https?:\/\//.test(label)) return undefined;
  return label;
}

function titleNearBareUrl(text: string, index: number): string | undefined {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const beforeUrl = text.slice(lineStart, index);
  const inlineLabel = titleFromListLabel(beforeUrl);
  if (inlineLabel) return inlineLabel;

  const previous = text
    .slice(0, lineStart)
    .split("\n")
    .reverse()
    .find((line) => line.trim());

  return previous ? titleFromListLabel(previous) : undefined;
}

function uniqueLinks(links: ReferenceLink[]): ReferenceLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.sourcePath}:${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function textWithoutCode(markdown: string): string {
  return markdown
    .replaceAll(/```[\s\S]*?```/g, "")
    .replaceAll(/`[^`\n]*`/g, "");
}

function cleanDetectedUrl(value: string): string | undefined {
  const url = value.replace(/[.,;:!?]+$/, "");
  if (/[`"'<>]/.test(url)) return undefined;
  if (url.includes("&lt;") || url.includes("&gt;") || url.includes("&quot;")) return undefined;
  if (url.includes("...") || url.includes("…")) return undefined;
  return url;
}

export function extractReferenceLinks(file: CapabilityFile): ReferenceLink[] {
  const links: ReferenceLink[] = [];
  const text = file.text ? textWithoutCode(file.text) : undefined;
  if (!text) return links;

  const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s<>"'`]+)\)/g;
  const bareUrlPattern = /https?:\/\/[^\s<>"'`)]+/g;

  for (const match of text.matchAll(markdownLinkPattern)) {
    const url = cleanDetectedUrl(match[2]);
    if (!url) continue;

    links.push({
      title: match[1].trim(),
      url,
      sourcePath: file.path,
    });
  }

  for (const match of text.matchAll(bareUrlPattern)) {
    const url = cleanDetectedUrl(match[0]);
    if (!url) continue;
    if (links.some((link) => link.url === url)) continue;

    links.push({
      title: titleNearBareUrl(text, match.index ?? 0) || titleBefore(text, match.index ?? 0) || url,
      url,
      sourcePath: file.path,
    });
  }

  return uniqueLinks(links);
}

export function provenanceRows(capability: Capability, copy: DashboardCopy): [string, string | undefined][] {
  const origin = capability.origin;
  if (!origin) return [];

  const location = [origin.repository, origin.path].filter(Boolean).join("/") || origin.url || origin.sourceId;
  return [
    [copy.provenanceRows.source, `${origin.type} · ${location}`],
    [copy.provenanceRows.ref, origin.ref],
    [copy.provenanceRows.commit, origin.commit || origin.revision?.value],
    [copy.provenanceRows.contentHash, origin.contentHash],
    [copy.provenanceRows.discoveredVia, origin.discoverySource ? `${origin.discoverySource.type} · ${origin.discoverySource.url}` : undefined],
    [copy.provenanceRows.license, [origin.license?.spdxId, origin.license?.url].filter(Boolean).join(" · ") || undefined],
    [copy.provenanceRows.skillKind, [origin.skillKind, ...(origin.skillTraits || [])].filter(Boolean).join(", ") || undefined],
    [copy.provenanceRows.updatePolicy, origin.update],
    [copy.provenanceRows.lastSync, origin.lastSyncedAt],
  ];
}

export function chipClassForKind(kind: string): string {
  if (kind === "portable") return "ok";
  if (kind === "resource-dependent") return "info";
  if (kind === "executable") return "warn";
  if (kind === "platform-specific") return "err";
  return "plain";
}

export function chipClassForFile(file: CapabilityFile): string {
  if (file.binary) return "warn";
  if (file.type === "skill") return "ok";
  if (file.type === "reference") return "vio";
  if (file.type === "script") return "warn";
  if (file.type === "bundle" || file.type === "data") return "info";
  return "plain";
}

export function skillKind(capability: Capability): string {
  if (capability.origin?.skillKind) return capability.origin.skillKind;
  if (capability.files.some((file) => file.type === "script")) return "executable";
  if (capability.files.some((file) => file.type === "asset" || file.type === "data")) return "resource-dependent";
  return "portable";
}

export function lastSync(capability: Capability, copy: DashboardCopy): string {
  return capability.origin?.lastSyncedAt || copy.never;
}

export function percent(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}
