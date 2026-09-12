import React from 'react';
import { parseHint } from '../lib/hint-markdown';

/**
 * Renders an AI hint's markdown: `backticks` become monospace chips (matching
 * the column chips in the LeftPanel schema cards) and ```sql fences become a
 * dark block matching the Monaco editor students type in.
 *
 * Everything is rendered as React elements, never dangerouslySetInnerHTML —
 * hint_text is LLM-authored, so React's escaping is what keeps it inert.
 */
export default function HintText({ text }) {
  const blocks = parseHint(text);

  return (
    // A <div>, not a <p>: a <pre> is invalid inside <p>, and the browser would
    // auto-close the paragraph and break the layout. whitespace-pre-wrap keeps
    // the paragraph breaks the rule-based hint templates rely on.
    <div className="text-[15px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
      {blocks.map((block, i) =>
        block.type === 'code' ? (
          <pre
            key={i}
            className="bg-[#0d1117] text-slate-100 rounded-xl p-4 my-3 overflow-x-auto whitespace-pre font-mono text-[12px] leading-relaxed"
          >
            {block.value}
          </pre>
        ) : (
          <span key={i}>
            {block.parts.map((part, j) =>
              part.bold ? (
                <strong
                  key={j}
                  className="font-mono font-semibold text-[13px] text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
                >
                  {part.value}
                </strong>
              ) : (
                <React.Fragment key={j}>{part.value}</React.Fragment>
              )
            )}
          </span>
        )
      )}
    </div>
  );
}
