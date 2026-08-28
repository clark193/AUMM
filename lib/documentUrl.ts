export function validExternalDocumentUrl(value?: string) {
  const candidate = value?.trim();
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function validInternalDocumentPath(value?: string) {
  const candidate = value?.trim();
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return "";
  return candidate;
}
