// Cadastros antigos/importados podem conter texto, Date ou Timestamp serializado.
export function memberDate(value: unknown): Date | null {
  try {
    if (!value) return null;
    let date: Date;
    if (value instanceof Date) date = value;
    else if (typeof (value as { toDate?: unknown }).toDate === "function") date = (value as { toDate(): Date }).toDate();
    else if (typeof value === "object" && ("seconds" in value || "_seconds" in value)) date = new Date(Number((value as { seconds?: number; _seconds?: number }).seconds ?? (value as { _seconds?: number })._seconds) * 1000);
    else if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) { const [d,m,y] = value.split("/").map(Number); date = new Date(Date.UTC(y,m-1,d)); }
    else if (typeof value === "string" || typeof value === "number") date = new Date(value);
    else return null;
    return Number.isFinite(date.getTime()) ? date : null;
  } catch { return null; }
}
export function displayMemberDate(value: unknown, withTime = false) {
  const date = memberDate(value);
  if (!date) return "—";
  return withTime ? date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
