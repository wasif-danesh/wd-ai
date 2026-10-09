"use client";

import type { LanguageChoice, VoiceCatalog, VoiceChoice } from "@wd/contracts";
import { type FormEvent, type KeyboardEvent, useId, useState } from "react";

export const MAX_TEXT = 2000;
const GENDERS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
] as const;

const EXAMPLES: Record<string, string> = {
  "en-US": "Welcome to our shop. We are open from nine to five, Monday to Saturday.",
  "en-GB": "Good evening, and welcome to tonight's programme.",
  bn: "আমাদের দোকানে আপনাকে স্বাগতম। আমরা সোমবার থেকে শনিবার পর্যন্ত খোলা থাকি।",
  es: "Bienvenidos a nuestra tienda. Estamos abiertos de lunes a sábado.",
  fr: "Bienvenue dans notre boutique. Nous sommes ouverts du lundi au samedi.",
  hi: "हमारी दुकान में आपका स्वागत है। हम सोमवार से शनिवार तक खुले हैं।",
  it: "Benvenuti nel nostro negozio. Siamo aperti dal lunedì al sabato.",
  "pt-BR": "Bem-vindos à nossa loja. Abrimos de segunda a sábado.",
};

export type SpeechFormValue = {
  text: string;
  language: string;
  gender: string;
  voice?: string;
};

/** The voices a language has for one gender (an empty list is a gap, shown as such). */
function voicesOf(lang: LanguageChoice | undefined, gender: string): VoiceChoice[] {
  return (lang?.genders as Record<string, VoiceChoice[]> | undefined)?.[gender] ?? [];
}

export function SpeechForm({
  catalog,
  onSubmit,
  initial,
  busy = false,
}: {
  catalog: VoiceCatalog;
  onSubmit: (value: SpeechFormValue) => void;
  initial?: Partial<SpeechFormValue>;
  busy?: boolean;
}) {
  const id = useId();
  const [language, setLanguage] = useState(initial?.language ?? catalog.languages[0]?.id ?? "");
  const [gender, setGender] = useState(initial?.gender ?? "female");
  const [voice, setVoice] = useState<string | undefined>(initial?.voice);
  const [text, setText] = useState(initial?.text ?? "");

  const lang = catalog.languages.find((l) => l.id === language);
  const options = voicesOf(lang, gender);
  const chosen = options.find((v) => v.id === voice) ?? options.find((v) => v.default);
  const trimmed = text.trim();
  const valid = trimmed.length > 0 && text.length <= MAX_TEXT && options.length > 0;

  function pickLanguage(next: string) {
    const l = catalog.languages.find((x) => x.id === next);
    setLanguage(next);
    setVoice(undefined);
    // keep the gender if the new language has it; otherwise move to the one it has
    if (voicesOf(l, gender).length === 0) {
      const other = GENDERS.find((g) => voicesOf(l, g.id).length > 0);
      if (other) setGender(other.id);
    }
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || busy) return;
    onSubmit({ text: trimmed, language, gender, ...(voice ? { voice } : {}) });
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  }

  return (
    <form className="card panel" onSubmit={submit}>
      <div className="field">
        <label htmlFor={`${id}-text`}>What should it say?</label>
        <textarea
          id={`${id}-text`}
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={EXAMPLES[language] ?? EXAMPLES["en-US"]}
          rows={5}
          lang={lang?.id}
          aria-describedby={`${id}-hint`}
          aria-invalid={text.length > MAX_TEXT}
        />
        <div className="row">
          <span className="field__hint grow" id={`${id}-hint`}>
            Write it in the language you chose. Press Ctrl or ⌘ + Enter to start.
          </span>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setText(EXAMPLES[language] ?? EXAMPLES["en-US"] ?? "")}
          >
            Use an example
          </button>
          <span className="counter" data-near={text.length > MAX_TEXT * 0.9 || undefined}>
            {text.length}/{MAX_TEXT}
          </span>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${id}-language`}>Language</label>
        <select
          id={`${id}-language`}
          className="input"
          value={language}
          onChange={(e) => pickLanguage(e.target.value)}
        >
          {catalog.languages.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name === l.english ? l.name : `${l.name} · ${l.english}`}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0 }}>
        <legend className="field__label">Voice</legend>
        <div className="chips">
          {GENDERS.map((g) => {
            const count = voicesOf(lang, g.id).length;
            return (
              <button
                type="button"
                className="chip"
                key={g.id}
                aria-pressed={gender === g.id}
                disabled={count === 0}
                onClick={() => {
                  setGender(g.id);
                  setVoice(undefined);
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
        {options.length === 0 ? (
          <output className="field__hint">
            There is no {gender} voice for {lang?.english ?? "this language"} yet.
          </output>
        ) : null}
        {options.length > 1 ? (
          <div className="field">
            <label htmlFor={`${id}-voice`} className="sr-only">
              Which voice
            </label>
            <select
              id={`${id}-voice`}
              className="input"
              value={chosen?.id}
              onChange={(e) => setVoice(e.target.value)}
            >
              {options.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {chosen?.quality === "limited" ? (
          <output className="field__hint">
            Voices for this language are still limited and may sound less natural.
          </output>
        ) : null}
      </fieldset>

      <div className="actions">
        <button type="submit" className="btn btn--primary btn--lg" disabled={!valid || busy}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null}
          Create speech
        </button>
        <span className="muted">Takes a few seconds.</span>
      </div>
    </form>
  );
}
