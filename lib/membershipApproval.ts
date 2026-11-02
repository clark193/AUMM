// Keep the applicant's personal data when approval creates the member profile.
export function approvedMemberDetails<T>({ fullName, birthDate, whatsapp, category }: { fullName?: string; birthDate?: T; whatsapp?: string; category?: string }) {
  return {
    fullName: fullName?.trim() || "Associado",
    phone: whatsapp || "",
    whatsapp: whatsapp || "",
    ...(birthDate !== undefined ? { birthDate } : {}),
    category: category || "",
  };
}
