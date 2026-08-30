/**
 * Minimal YAML frontmatter reader.
 *
 * Shared by the registry and the ingestion layer so an imported `SKILL.md` is
 * parsed exactly like a local one. Deliberately not a YAML parser: it reads flat
 * `key: value` pairs plus inline (`[a, b]`) and block (`- a`) sequences, which is
 * all the SKILL.md convention uses. Anything else is ignored rather than throwing,
 * because upstream content is untrusted and must never break a scan.
 */

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  tags: string[];
  /** Every scalar key found, for provenance and future use. */
  fields: Record<string, string>;
}

const LIST_KEYS = new Set(["tags", "keywords", "topics"]);

function stripQuotes(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseInlineList(value: string): string[] {
  const inner = value.trim().replace(/^\[|\]$/g, "");
  return inner
    .split(",")
    .map((item) => stripQuotes(item))
    .filter((item) => item.length > 0);
}

function extractFrontmatterBlock(markdown: string): string | undefined {
  if (!markdown.startsWith("---")) return undefined;

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return undefined;

  return markdown.slice(3, end).trim();
}

export function parseFrontmatter(markdown: string): SkillFrontmatter {
  const result: SkillFrontmatter = { tags: [], fields: {} };
  const block = extractFrontmatterBlock(markdown);
  if (!block) return result;

  let currentListKey: string | undefined;

  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");

    if (currentListKey && /^\s*-\s+/.test(line)) {
      const item = stripQuotes(line.replace(/^\s*-\s+/, ""));
      if (item) result.tags.push(item);
      continue;
    }

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = stripQuotes(line.slice(separator + 1));
    currentListKey = undefined;

    if (LIST_KEYS.has(key)) {
      if (value.startsWith("[")) {
        result.tags.push(...parseInlineList(value));
      } else if (value) {
        result.tags.push(...value.split(",").map((item) => stripQuotes(item)).filter(Boolean));
      } else {
        currentListKey = key;
      }
      continue;
    }

    if (!value) continue;
    result.fields[key] = value;
    if (key === "name") result.name = value;
    if (key === "description") result.description = value;
  }

  result.tags = [...new Set(result.tags)];
  return result;
}

/** Markdown ATX headings, used as a mid-weight search field. */
export function extractHeadings(markdown: string): string[] {
  return [...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].trim());
}

export interface MarkdownSection {
  heading: string;
  level: number;
  text: string;
}

/** False only for a leading title that structurally wraps every later heading. */
export function isMarkdownEntrypoint(sections: MarkdownSection[], index: number): boolean {
  return !(index === 0
    && sections.length > 1
    && sections.slice(1).every((section) => section.level > sections[0].level));
}

/** Complete ATX-heading sections, including nested subsections until a peer or parent starts. */
export function extractMarkdownSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split(/\r?\n/);
  const headings = lines.flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return [];
    return [{
      index,
      level: match[1].length,
      heading: match[2].replace(/\s+#+\s*$/, "").trim(),
    }];
  });

  return headings.map((heading, index) => {
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    return {
      heading: heading.heading,
      level: heading.level,
      text: lines.slice(heading.index, next?.index ?? lines.length).join("\n").trim(),
    };
  });
}
