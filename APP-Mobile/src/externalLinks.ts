export function externalLinkTarget(value: string): "browser" | "application" {
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error("Link indisponível.");
  if (/^https:\/\//i.test(value)) {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) throw new Error("Link indisponível.");
    return "browser";
  }
  // Abre o discador, nunca efetua uma ligação automaticamente.
  if (/^tel:\+?[0-9]{3,15}$/i.test(value)) return "application";
  if (/^mailto:[^?\s@]+@[^?\s@]+\.[^?\s@]+$/i.test(value)) return "application";
  const geo = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:\?q=[^#\s]+)?$/i.exec(value);
  if (geo && Math.abs(Number(geo[1])) <= 90 && Math.abs(Number(geo[2])) <= 180) return "application";
  throw new Error("Link indisponível.");
}
