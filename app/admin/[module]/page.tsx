import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { BoardAdmin } from "@/components/BoardAdmin";
import { MemberAdmin } from "@/components/MemberAdmin";
import { PasswordResetAdmin } from "@/components/PasswordResetAdmin";

type Module = { title: string; description: string; headers: string[]; rows?: string[][] };
const modules: Record<string, Module> = {
  recrutamento: { title: "Novo associado", description: "Cadastro manual de novos associados.", headers: [] },
  associados: { title: "Associados", description: "Cadastros, autorização e situação dos associados.", headers: ["Nome", "Número", "E-mail", "Cidade", "Status"] },
  cargos: { title: "Cargos", description: "Crie e organize cargos sem alterar o código.", headers: ["Cargo", "Descrição", "Ordem", "Status"] },
  diretoria: { title: "Diretoria", description: "Gestão dos nomes e fotos exibidos no mural público.", headers: [] },
  noticias: { title: "Notícias", description: "Criação, revisão e publicação de notícias.", headers: ["Título", "Categoria", "Data", "Status"] },
  comunicados: { title: "Comunicados", description: "Mensagens internas destinadas aos associados.", headers: ["Assunto", "Público", "Data", "Status"] },
  eventos: { title: "Eventos", description: "Agenda, locais e inscrições.", headers: ["Evento", "Data", "Local", "Status"] },
  beneficios: { title: "Benefícios", description: "Vantagens oferecidas aos associados ativos.", headers: ["Benefício", "Parceiro", "Validade", "Status"] },
  solicitacoes: { title: "Solicitações", description: "Protocolos abertos pelos associados.", headers: ["Protocolo", "Associado", "Assunto", "Atualização", "Status"] },
  "recuperacao-senha": { title: "Recuperação de senha", description: "Pedidos recebidos para atendimento pelo WhatsApp.", headers: [] },
  transparencia: { title: "Transparência", description: "Publicações, documentos e prestações de contas.", headers: ["Publicação", "Categoria", "Competência", "Status"] },
  financeiro: { title: "Financeiro", description: "Receitas e despesas da associação.", headers: ["Data", "Descrição", "Categoria", "Valor"] },
  documentos: { title: "Documentos", description: "Biblioteca de documentos institucionais.", headers: ["Documento", "Tipo", "Acesso", "Atualização"] },
  administradores: { title: "Administradores", description: "Matriz dos níveis de acesso.", headers: ["Perfil", "Nível", "Permissão"], rows: [["Presidência", "Nível 1", "Acesso completo"], ["Diretoria", "Nível 2", "Gestão ampla"], ["Coordenação", "Nível 3", "Associados, solicitações e documentos"], ["Comunicação", "Nível 4", "Notícias, comunicados, eventos e benefícios"], ["Recrutador", "Nível 5", "Dashboard visual e cadastro de novos associados"]] },
  logs: { title: "Logs de auditoria", description: "Registro protegido de ações administrativas.", headers: ["Data/hora", "Administrador", "Ação", "Recurso"] },
  configuracoes: { title: "Configurações", description: "Dados institucionais e preferências do sistema.", headers: ["Seção", "Atualização", "Responsável"] },
};

const moduleAccess: Record<string, readonly number[]> = {
  recrutamento: [5], associados: [1, 2, 3], cargos: [1, 2], diretoria: [1, 2], noticias: [1, 2, 4], comunicados: [1, 2, 4], eventos: [1, 2, 4], beneficios: [1, 2, 4], solicitacoes: [1, 2, 3], "recuperacao-senha": [1, 2, 3], transparencia: [1, 2], financeiro: [1, 2], documentos: [1, 2, 3], administradores: [1], logs: [1], configuracoes: [1],
};

export function generateStaticParams() { return Object.keys(modules).map(module => ({ module })); }
export const dynamicParams = false;

type Props = { params: Promise<{ module: string }> };
export default async function ModulePage({ params }: Props) {
  const { module } = await params;
  const item = modules[module];
  if (!item) notFound();
  const allowedLevels = moduleAccess[module] || [1];
  if (module === "recrutamento") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Novo associado</h2><p>Cadastre um associado e decida se o acesso será ativado imediatamente.</p></div></div><MemberAdmin registrationOnly /></AdminShell>;
  if (module === "associados") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Cadastro de associados</h2><p>Cadastre manualmente e escolha se o login será autorizado na mesma hora.</p></div></div><MemberAdmin /></AdminShell>;
  if (module === "diretoria") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Diretoria da AUMM</h2><p>As alterações feitas aqui aparecem no mural da página inicial.</p></div></div><BoardAdmin /></AdminShell>;
  if (module === "recuperacao-senha") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Recuperação de senha</h2><p>Responda pelo WhatsApp somente após confirmar a identidade do solicitante.</p></div></div><PasswordResetAdmin /></AdminShell>;
  return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>{item.title}</h2><p>{item.description}</p></div></div><section className="panel">{item.rows?.length ? <div className="table-wrap"><table><thead><tr>{item.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{item.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === 0 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}</tbody></table></div> : <div className="empty-state">Nenhum registro cadastrado.</div>}</section></AdminShell>;
}
