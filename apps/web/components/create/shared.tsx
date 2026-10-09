"use client";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { chips, counter, field, fieldLabel, hint, panel } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, type ReactNode, useState } from "react";
import { Bar } from "./Progress";

/** "From text" or "From a picture": the two ways in for the image and video products. */
export function ModeTabs({
  mode,
  onChange,
}: {
  mode: "text" | "image";
  onChange: (mode: "text" | "image") => void;
}) {
  return (
    <fieldset className={cn(chips, "m-0 border-0 p-0")}>
      <legend className="sr-only">What do you want to do?</legend>
      {(["text", "image"] as const).map((m) => (
        <Chip key={m} aria-pressed={mode === m} onClick={() => onChange(m)}>
          {m === "text" ? "From text" : "From a picture"}
        </Chip>
      ))}
    </fieldset>
  );
}

/** The prompt box shared by the image and video forms: label, text, hint, Enhance, counter and example chips. */
export function PromptField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hintText,
  max,
  examples,
  exampleLabel,
  enhance,
  onSubmit,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hintText: string;
  max: number;
  examples: string[];
  exampleLabel: (example: string) => string;
  enhance: ReactNode;
  onSubmit: () => void;
}) {
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit();
  }
  return (
    <div className={field}>
      <Label htmlFor={`${id}-prompt`} className={fieldLabel}>
        {label}
      </Label>
      <Textarea
        id={`${id}-prompt`}
        className="max-h-[28rem] min-h-28 text-base leading-normal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={3}
        aria-describedby={`${id}-hint`}
        aria-invalid={value.length > max}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn(hint, "min-w-0 grow basis-[12rem]")} id={`${id}-hint`}>
          {hintText}
        </span>
        {enhance}
        <span className={counter(value.length > max * 0.9)}>
          {value.length}/{max}
        </span>
      </div>
      <fieldset className={cn(chips, "m-0 border-0 p-0")}>
        <legend className="sr-only">Example ideas</legend>
        {examples.map((ex) => (
          <Chip key={ex} onClick={() => onChange(ex)}>
            {exampleLabel(ex)}
          </Chip>
        ))}
      </fieldset>
    </div>
  );
}

/** A line of progress for a job in the queue: what is happening, how far, and a bar that slides until there is a value. */
export function JobMeter({
  title,
  text,
  value,
  label,
}: {
  title: string;
  text: string;
  value?: number;
  label: string;
}) {
  return (
    <div className="grid gap-[0.6rem]">
      <div className="flex justify-between gap-4 text-[0.95rem] text-muted-foreground tabular-nums">
        <span>{title}</span>
        <span>{text}</span>
      </div>
      {/* The visible bar is decorative; a native <progress> carries the value for assistive tech. */}
      <progress
        className="sr-only"
        aria-label={label}
        max={100}
        value={value === undefined ? undefined : Math.round(value * 100)}
      />
      <Bar value={value} />
    </div>
  );
}

/** The card shown while a request is checked or made: a spinner and what the system is doing. */
export function WorkingCard({
  label,
  children,
  onCancel,
}: {
  label: string;
  children?: ReactNode;
  onCancel?: () => void;
}) {
  return (
    <section className={cn(panel, "@container")} aria-label="Progress">
      <div className="flex items-center gap-[0.8rem] font-semibold">
        <Spinner />
        <span>{label}</span>
      </div>
      {children}
      {onCancel ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** "That didn't work": the reason, Try again when it may help, and Start over. */
export function FailedNotice({
  message,
  retryable,
  onRetry,
  onReset,
}: {
  message: string;
  retryable: boolean;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <Notice
      tone="error"
      title="That didn't work"
      actions={
        <>
          {retryable ? (
            <Button type="button" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onReset}>
            Start over
          </Button>
        </>
      }
    >
      {message}
    </Notice>
  );
}

/** Delete with a second confirming click, then back to My creations. `noun` names the thing in the messages. */
export function DeleteControls({
  url,
  noun,
  label = "Delete",
}: {
  url: string;
  noun: string;
  label?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      router.push("/creations");
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <>
      {confirming ? (
        <>
          <Button type="button" variant="destructive" onClick={remove} disabled={busy}>
            {busy ? <Spinner /> : null}
            Yes, delete it
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirming(false)}
            disabled={busy}
          >
            Keep it
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
          {label}
        </Button>
      )}
      {failed ? (
        <div className="basis-full">
          <Notice tone="error" title={`Couldn't delete that ${noun}`}>
            Try again in a moment.
          </Notice>
        </div>
      ) : null}
    </>
  );
}
