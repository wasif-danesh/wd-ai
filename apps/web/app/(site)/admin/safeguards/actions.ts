"use server";

import { apiSend } from "@/lib/api";
import { revalidatePath } from "next/cache";

export type SafeguardsFormState =
  | { status: "idle" }
  | { status: "saved"; enabled: boolean }
  | { status: "error"; message: string };

/** The one button on the page: set the safeguards to the value in the form (`enabled`). */
export async function setSafeguards(
  _previous: SafeguardsFormState,
  form: FormData,
): Promise<SafeguardsFormState> {
  const enabled = form.get("enabled") === "true";
  const { status, data } = await apiSend("PUT", "/admin/safeguards", { enabled });
  if (status === 200) {
    revalidatePath("/admin", "layout");
    return { status: "saved", enabled };
  }
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (status === 401) return { status: "error", message: "Your session ended. Sign in again." };
  if (status === 403) return { status: "error", message: "Only admins can change this." };
  return {
    status: "error",
    message: typeof detail === "string" ? detail : `The server answered ${status}.`,
  };
}
