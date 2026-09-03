/**
 * Parse a community's `communityRules` free-text blob into renderable blocks.
 *
 * ## Why this exists rather than `react-markdown`
 *
 * The field is a single free-text column and admins write light Markdown into
 * it — real production content looks like:
 *
 *     ### Community Guidelines
 *
 *     1. **Be respectful**
 *        Treat all members with respect. Harassment is not permitted.
 *
 * The previous renderer split on `\n` and made every non-blank line a ticked
 * bullet, which printed the literal `###` and `**`, turned the document title
 * into a rule, and split each rule's explanation into a rule of its own. That
 * was survivable in a small right-rail card; it is not once the content owns a
 * whole tab.
 *
 * A full Markdown library is the wrong trade here: it is a new dependency for
 * one field, and it arrives with an HTML-injection surface that then has to be
 * sanitised. This handles the subset that actually appears and emits React
 * elements only — nothing is ever passed to `dangerouslySetInnerHTML`, so
 * hostile input can produce ugly text but never markup.
 *
 * Anything it does not recognise falls through as a paragraph, so an admin who
 * writes plain prose or an unknown syntax still gets readable output rather
 * than a mangled one. That fallback is the point: the parser must never make
 * content *less* legible than showing it verbatim would.
 */

export type RuleBlock =
  | { kind: 'heading'; text: string }
  /** A numbered or bulleted rule. `body` is its indented continuation, joined. */
  | { kind: 'item'; marker: string | null; title: string; body: string | null }
  | { kind: 'paragraph'; text: string };

/** `### Title` → the title. Returns null when the line is not a heading. */
function readHeading(line: string): string | null {
  const m = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line);
  return m ? m[1]!.trim() : null;
}

/** `1. text` / `- text` / `* text` → [marker, text]. Null when not a list item. */
function readItem(line: string): [string | null, string] | null {
  const ordered = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/.exec(line);
  if (ordered) return [ordered[1]!, ordered[2]!.trim()];
  const bullet = /^\s{0,3}[-*•]\s+(.*)$/.exec(line);
  if (bullet) return [null, bullet[1]!.trim()];
  return null;
}

/** Is this line an indented continuation of the item above it? */
function isContinuation(line: string): boolean {
  return /^\s{2,}\S/.test(line) && readItem(line) === null && readHeading(line) === null;
}

export function parseRules(raw: string | null | undefined): RuleBlock[] {
  const lines = (raw ?? '').split(/\r?\n/);
  const blocks: RuleBlock[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (!line.trim()) continue;

    const heading = readHeading(line);
    if (heading) {
      blocks.push({ kind: 'heading', text: heading });
      continue;
    }

    const item = readItem(line);
    if (item) {
      // Absorb the indented lines beneath it — they explain THIS rule and must
      // not become rules of their own.
      const body: string[] = [];
      while (i + 1 < lines.length && isContinuation(lines[i + 1]!)) {
        i += 1;
        body.push(lines[i]!.trim());
      }
      blocks.push({
        kind: 'item',
        marker: item[0],
        title: item[1],
        body: body.length ? body.join(' ') : null,
      });
      continue;
    }

    blocks.push({ kind: 'paragraph', text: line.trim() });
  }

  return blocks;
}

/** One run of inline text: bold or plain. */
export interface InlineRun {
  text: string;
  bold: boolean;
}

/**
 * Split `**bold**` runs out of a line.
 *
 * Deliberately only bold: it is the only inline marker that shows up in the
 * real content, and each additional one is another chance to mangle a line
 * that a reader would rather have seen verbatim. An unmatched `**` is left
 * alone for the same reason.
 */
export function inlineRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), bold: false });
    runs.push({ text: m[1]!, bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), bold: false });
  return runs.length ? runs : [{ text, bold: false }];
}
