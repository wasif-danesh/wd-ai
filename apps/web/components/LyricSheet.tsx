"use client";

import { parseLyrics, sectionTitle } from "@/lib/lyrics";
import { useEffect, useRef } from "react";

/**
 * Lyrics set out by section. While `streaming`, a caret follows the last line and the sheet keeps
 * the newest text in view.
 */
export function LyricSheet({
  text,
  streaming = false,
  label = "Lyrics",
}: {
  text: string;
  streaming?: boolean;
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll whenever the text grows
  useEffect(() => {
    if (streaming && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [text, streaming]);

  const sections = parseLyrics(text);
  if (sections.length === 0) {
    return (
      <section className="lyrics lyrics--empty" aria-label={label}>
        Waiting for the first line…
      </section>
    );
  }
  return (
    <section className="lyrics" ref={box} aria-label={label}>
      {sections.map((s, i) => (
        // Sections are positional and only ever appended while streaming, so the index is stable.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <div className="lyrics__section" data-tag={s.tag ?? undefined} key={i}>
          {s.tag ? <span className="lyrics__tag">{sectionTitle(s.tag)}</span> : null}
          {s.lines.map((line, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
            <p key={j}>
              {line}
              {streaming && i === sections.length - 1 && j === s.lines.length - 1 ? (
                <span className="caret" aria-hidden="true" />
              ) : null}
            </p>
          ))}
        </div>
      ))}
    </section>
  );
}
