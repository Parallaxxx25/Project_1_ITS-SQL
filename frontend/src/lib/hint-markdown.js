/**
 * Minimal markdown for AI hint text.
 *
 * The tutor service deliberately emits two constructs and no others: ```sql
 * fences for query snippets (backend/tools/hint_generator.py instructs the LLM
 * to, and the rule-based templates hard-code them) and inline `backticks`
 * around identifiers. Two rules is not worth react-markdown + remark, so this
 * parses exactly those and leaves everything else as literal text.
 *
 * Pure — no React import — so it can be tested with `node --test`.
 */

// Fences are consumed first, so a backtick *inside* a code block is never
// mistaken for an inline span. `[ \t]*\n?` after the optional language label
// matters: the LLM emits both the well-formed multi-line fence and the whole
// thing inline on one line ("...you would write: ```sql SELECT 1; ``` How...").
const FENCE = /```(?:sql)?[ \t]*\n?([\s\S]*?)```/gi;
const INLINE = /`([^`\n]+)`/g;

/**
 * @param {string} text
 * @returns {Array<{type:'code', value:string} | {type:'text', parts:Array<{bold:boolean, value:string}>}>}
 */
export function parseHint(text) {
  if (!text) return [];

  const blocks = [];
  let last = 0;
  let match;

  // Module-level regexes are stateful under /g — reset before each walk.
  FENCE.lastIndex = 0;
  while ((match = FENCE.exec(text)) !== null) {
    pushText(blocks, text.slice(last, match.index));
    const code = match[1].trim();
    if (code) blocks.push({ type: 'code', value: code });
    last = match.index + match[0].length;
  }
  pushText(blocks, text.slice(last));

  return blocks;
}

/** Append one prose segment, split into plain and inline-code parts. */
function pushText(blocks, raw) {
  // Drop only the newlines that sat against the fence we just lifted out, so
  // the block doesn't leave a double gap. Interior newlines are the templates'
  // paragraph breaks and must survive.
  const value = raw.replace(/^[ \t]*\n+/, '').replace(/\n+[ \t]*$/, '');
  if (!value) return;

  const parts = [];
  let last = 0;
  let match;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(value)) !== null) {
    if (match.index > last) parts.push({ bold: false, value: value.slice(last, match.index) });
    parts.push({ bold: true, value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < value.length) parts.push({ bold: false, value: value.slice(last) });

  blocks.push({ type: 'text', parts });
}
