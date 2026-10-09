"use client";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Notice
      tone="error"
      title="Something went wrong"
      actions={<Button onClick={reset}>Try again</Button>}
    >
      The page couldn't load. This is usually temporary.
    </Notice>
  );
}
