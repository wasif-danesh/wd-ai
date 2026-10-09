"use client";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { useActionState } from "react";
import { type SafeguardsFormState, setSafeguards } from "../../app/(site)/admin/safeguards/actions";

export function SafeguardsForm({ enabled, forced }: { enabled: boolean; forced: boolean }) {
  const [state, action, pending] = useActionState<SafeguardsFormState, FormData>(setSafeguards, {
    status: "idle",
  });
  const on = state.status === "saved" ? state.enabled : enabled;
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <Notice tone={on ? "ok" : "warn"} title={on ? "Safeguards are on" : "Safeguards are off"}>
        {forced
          ? "This deployment forces the safeguards on. They cannot be turned off here."
          : on
            ? "Requests are moderated and quotas apply."
            : "Requests are not moderated and quotas do not apply. Do not leave this off on a site open to the public."}
      </Notice>
      {forced ? null : (
        <div>
          <input type="hidden" name="enabled" value={on ? "false" : "true"} />
          <Button type="submit" disabled={pending} variant={on ? "outline" : "default"}>
            {pending ? "Saving…" : on ? "Turn safeguards off" : "Turn safeguards on"}
          </Button>
        </div>
      )}
      {state.status === "error" ? (
        <Notice tone="error" title="Couldn't save">
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
