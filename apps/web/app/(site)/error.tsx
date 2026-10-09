"use client";

import { Notice } from "@/components/Notice";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Notice
      tone="error"
      title="Something went wrong"
      actions={
        <button type="button" className="btn btn--primary" onClick={reset}>
          Try again
        </button>
      }
    >
      The page couldn't load. This is usually temporary.
    </Notice>
  );
}
