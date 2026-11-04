"use client";
import { useEffect, useState, type ReactNode } from "react";
import { newsPath } from "@/lib/newsSharing";

export function PublishedNewsLink({ id, children }: { id: string; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false, published = false;
    async function check() {
      if (published) return;
      try {
        const response = await fetch(newsPath(id), { method: "HEAD", cache: "no-store", signal: controller.signal });
        if (!stopped) { published = response.ok; setReady(response.ok); }
      } catch { /* The live Firebase reader remains available while publication is pending. */ }
    }
    void check();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void check(); }, 60000);
    return () => { stopped = true; controller.abort(); clearInterval(timer); };
  }, [id]);
  // A full navigation also supports automatically generated pages without Next RSC artifacts.
  return <a className="read-more" href={ready ? newsPath(id) : `/noticias/publicacao/?id=${encodeURIComponent(id)}`}>{children}</a>;
}
