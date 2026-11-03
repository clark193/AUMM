export function newsPath(id: string) { return `/noticias/${encodeURIComponent(id)}/`; }

type ShareBrowser = { share?: (data: { title: string; url: string }) => Promise<void>; clipboard?: { writeText: (text: string) => Promise<void> } };
export async function shareNews(title: string, url: string, browser: ShareBrowser): Promise<"shared" | "copied" | "cancelled"> {
  if (browser.share) {
    try { await browser.share({ title, url }); return "shared"; }
    catch (error) { if ((error as { name?: string }).name === "AbortError") return "cancelled"; }
  }
  if (!browser.clipboard) throw new Error("Compartilhamento indisponível neste navegador.");
  await browser.clipboard.writeText(url);
  return "copied";
}
