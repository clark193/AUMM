import { legalWhatsapp } from "./legalContent.ts";
export type DeletionScope = "account" | "data";
export function deletionMessage(input: { name: string; email: string; scope: DeletionScope; details: string }) {
  const email = input.email.trim(), name = input.name.trim(), details = input.details.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Informe o e-mail usado no cadastro AUMM.");
  if (name.length > 120 || details.length > 800) throw new Error("Revise o tamanho das informações fornecidas.");
  if (input.scope !== "account" && input.scope !== "data") throw new Error("Escolha o tipo de solicitação.");
  if (input.scope === "data" && !details) throw new Error("Informe quais dados deseja excluir.");
  return ["ATENDIMENTO HUMANO — PRIVACIDADE AUMM", input.scope === "account" ? "Solicito a exclusão da minha conta do aplicativo AUMM e dos dados pessoais associados." : "Solicito a exclusão dos dados indicados abaixo, mantendo minha conta quando possível.", name ? `Nome para atendimento: ${name}` : "", `E-mail cadastrado: ${email}`, details ? `Informações adicionais: ${details}` : "", "Por favor, confirmem o recebimento, a verificação de titularidade, o prazo previsto e eventual retenção justificada."].filter(Boolean).join("\n\n");
}
export function deletionWhatsappUrl(input: Parameters<typeof deletionMessage>[0]) { return `https://wa.me/${legalWhatsapp}?text=${encodeURIComponent(deletionMessage(input))}`; }
