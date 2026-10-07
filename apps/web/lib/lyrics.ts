export type Section = { tag: string | null; lines: string[] };

// A complete section tag on its own line, e.g. "[verse]". A half-written "[ver" (while lyrics
// stream in) is ordinary text until its bracket closes.
const TAG = /^\s*\[([^\]\n]{1,30})\]\s*$/;

/** Split lyrics into sections by their tag lines. Text before the first tag has `tag: null`. */
export function parseLyrics(text: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const m = TAG.exec(raw);
    if (m) {
      current = { tag: m[1].trim().toLowerCase(), lines: [] };
      sections.push(current);
    } else if (raw.trim() === "") {
      // blank lines only separate sections, which the tags already do
    } else {
      if (!current) {
        current = { tag: null, lines: [] };
        sections.push(current);
      }
      current.lines.push(raw.trimEnd());
    }
  }
  return sections;
}

/** A section's title for display: "pre-chorus" becomes "Pre-chorus". */
export function sectionTitle(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

const HAS_TAG = (tag: string) => new RegExp(`^\\s*\\[${tag}\\]\\s*$`, "im");

/** The same check the server makes, so the editor can warn before the user presses Approve. */
export function lyricProblems(text: string): string[] {
  const problems: string[] = [];
  if (!HAS_TAG("verse").test(text)) problems.push("Add a [verse] section tag on its own line.");
  if (!HAS_TAG("chorus").test(text)) problems.push("Add a [chorus] section tag on its own line.");
  const sung = text.split("\n").filter((l) => l.trim() && !/^\s*\[[^\]]+\]\s*$/.test(l));
  if (sung.length < 6) problems.push("Write at least 6 lines of lyrics.");
  if (text.length > 3000) problems.push("Keep the lyrics under 3000 characters.");
  return problems;
}
