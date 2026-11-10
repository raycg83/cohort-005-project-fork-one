// The verdict's list of the findings the review left. A finding inside the
// diff gets one line here, because its inline comment carries the
// explanation. A finding outside the diff cannot be an inline comment, so it
// is listed here in full.

export type Finding = {
  path: string;
  line: number;
  rule: string;
  body: string;
};

export const LEFT_HEADING = "## Left for you";

// A rule is a phrase, so it goes on one line. A body may hold a code block,
// so its lines are kept and indented to stay inside the list item.
const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
const indented = (text: string) => text.replace(/\n/g, "\n  ");

export function leftFindings(inline: Finding[], outside: Finding[]): string {
  if (inline.length === 0 && outside.length === 0) return "";
  const lines = [LEFT_HEADING, ""];
  if (inline.length > 0) {
    lines.push("Each one is explained in its inline comment.", "");
    for (const { path, line, rule } of inline) {
      lines.push(`- \`${path}:${line}\`: ${oneLine(rule)}`);
    }
    lines.push("");
  }
  if (outside.length > 0) {
    lines.push("Outside the diff, so not inline:", "");
    for (const { path, line, rule, body } of outside) {
      lines.push(
        `- \`${path}:${line}\`: **${oneLine(rule)}.** ${indented(body)}`
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

// Puts the list before "Rules this review wanted", which is the retro's, or
// at the end when the verdict has no such section.
export function insertLeftFindings(verdict: string, section: string): string {
  if (!section) return verdict;
  const rules = verdict.search(/^## Rules this review wanted/m);
  if (rules === -1) return `${verdict.trimEnd()}\n\n${section}`;
  return `${verdict.slice(0, rules)}${section}\n${verdict.slice(rules)}`;
}
