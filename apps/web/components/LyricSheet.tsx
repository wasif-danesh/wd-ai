"use client";

import { parseLyrics, sectionTitle } from "@/lib/lyrics";
import { cn } from "@/lib/utils";
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

  const sheet =
    "grid gap-[1.2rem] rounded-lg border bg-surface p-[clamp(1rem,2.5vw,1.6rem)] font-serif text-[1.12rem] leading-[1.7]";
  const sections = parseLyrics(text);
  if (sections.length === 0) {
    return (
      <section className={cn(sheet, "text-muted-foreground italic")} aria-label={label}>
        Waiting for the first line…
      </section>
    );
  }
  return (
    <section
      className={cn(sheet, "max-h-[34rem] overflow-y-auto [scrollbar-width:thin]")}
      ref={box}
      aria-label={label}
    >
      {sections.map((s, i) => {
        const chorus = s.tag === "chorus";
        return (
          <div
            className={cn("grid gap-[0.15rem]", chorus && "border-s-[3px] border-brand-2 ps-4")}
            data-tag={s.tag ?? undefined}
            // Sections are positional and only ever appended while streaming, so the index is stable.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above
            key={i}
          >
            {s.tag ? (
              <span
                className={cn(
                  "mb-1 justify-self-start rounded-full px-[0.6rem] py-[0.1rem] font-sans text-[0.72rem] font-bold tracking-[0.1em] uppercase",
                  chorus ? "bg-brand-2/15 text-brand-2" : "bg-accent text-primary",
                )}
              >
                {sectionTitle(s.tag)}
              </span>
            ) : null}
            {s.lines.map((line, j) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
              <p key={j}>
                {line}
                {streaming && i === sections.length - 1 && j === s.lines.length - 1 ? (
                  <span
                    data-caret
                    className="ms-[0.1em] inline-block h-[1.05em] w-[0.12em] animate-blink bg-primary align-text-bottom"
                    aria-hidden="true"
                  />
                ) : null}
              </p>
            ))}
          </div>
        );
      })}
    </section>
  );
}
