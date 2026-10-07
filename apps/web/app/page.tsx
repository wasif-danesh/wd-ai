"use client";

import { useState } from "react";
import { parseSse } from "../lib/sse";

export default function Home() {
  const [message, setMessage] = useState("Say hello in one sentence.");
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");

  async function run() {
    setReply("");
    setStatus("running");
    try {
      const res = await fetch("/api/products/hello/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: { message } }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      for await (const { event, data } of parseSse(res.body)) {
        if (event === "token" && "text" in data) setReply((r) => r + data.text);
        if (event === "error") return setStatus("error");
        if (event === "done") return setStatus("done");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "3rem auto", fontFamily: "system-ui" }}>
      <h1>wd-ai</h1>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        style={{ width: "100%" }}
      />
      <button type="button" onClick={run} disabled={status === "running"}>
        {status === "running" ? "Running…" : "Run"}
      </button>
      <p style={{ whiteSpace: "pre-wrap" }}>{reply}</p>
      {status === "error" && <p role="alert">Something went wrong.</p>}
    </main>
  );
}
