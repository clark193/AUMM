import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { ApplicationReviewAdmin } from "@/components/ApplicationReviewAdmin";
import { BoardAdmin } from "@/components/BoardAdmin";
import { MemberAdmin } from "@/components/MemberAdmin";
import { NewsAdmin } from "@/components/NewsAdmin";
import { PasswordResetAdmin } from "@/components/PasswordResetAdmin";
import { AssemblyAdmin } from "@/components/AssemblyAdmin";
import { DocumentAdmin } from "@/components/DocumentAdmin";
import { OperationalAdmin } from "@/components/OperationalAdmin";
import { AdminManagement } from "@/components/AdminManagement";
import { AuditLogAdmin } from "@/components/AuditLogAdmin";
import { AdminSettingsPage } from "@/components/AdminSettingsPage";
import { SponsorAdmin } from "@/components/SponsorAdmin";
import { AdminCardContent } from "@/components/AdminCardContent";
import { operationalModules } from "@/lib/adminModuleConfig";

type Module = { title: string; description: string; headers: string[]; rows?: string[][] };
const modules: Record<string, Module> = {
  recrutamento: { title: "Novo associado", description: "Cadastro manual de novos associados.", headers: [] },
  associados: { title: "Cadastros e associados", description: "Análise de inscrições, autorização e situação dos associados.", headers: ["Nome", "Número", "E-mail", "Cidade", "Status"] },
  filiacoes: { title: "Solicitações de Filiação", description: "Análise, conferência estatutária e decisão sobre pedidos de filiação.", headers: [] },
  assembleias: { title: "Assembleias eletrônicas", description: "Convocação, quórum, pautas, votação, resultados e atas.", headers: [] },
  cargos: { title: "Cargos", description: "Cadastre as funções institucionais disponíveis para os administradores e suas carteirinhas.", headers: ["Cargo", "Descrição", "Ordem", "Status"] },
  diretoria: { title: "Diretoria", description: "Gestão dos nomes e fotos exibidos no mural público.", headers: [] },
  noticias: { title: "Notícias", description: "Criação, revisão e publicação de notícias.", headers: ["Título", "Categoria", "Data", "Status"] },
  comunicados: { title: "Comunicados", description: "Mensagens internas destinadas aos associados.", headers: ["Assunto", "Público", "Data", "Status"] },
  eventos: { title: "Eventos", description: "Agenda, locais e inscrições.", headers: ["Evento", "Data", "Local", "Status"] },
  beneficios: { title: "Benefícios", description: "Vantagens oferecidas aos associados ativos.", headers: ["Benefício", "Parceiro", "Validade", "Status"] },
  parceiros: { title: "Parceiros", description: "Empresas e profissionais parceiros da associação.", headers: ["Parceiro", "Categoria", "Contato", "Status"] },
  patrocinadores: { title: "Rede AUMM", description: "Apoios, patrocínios e parceiros de benefícios.", headers: [] },
  realizacoes: { title: "O que já fizemos", description: "Ações, conquistas e projetos realizados pela associação.", headers: ["Título", "Texto", "Data", "Status"] },
  solicitacoes: { title: "Solicitações", description: "Protocolos abertos pelos associados.", headers: ["Protocolo", "Associado", "Assunto", "Atualização", "Status"] },
  "recuperacao-senha": { title: "Recuperação de senha", description: "Pedidos recebidos para atendimento pelo WhatsApp.", headers: [] },
  transparencia: { title: "Transparência financeira", description: "Receitas e despesas publicadas para prestação de contas.", headers: ["Data", "Descrição", "Categoria", "Valor"] },
  financeiro: { title: "Financeiro", description: "Receitas e despesas da associação.", headers: ["Data", "Descrição", "Categoria", "Valor"] },
  documentos: { title: "Documentos administrativos", description: "Biblioteca interna de documentos reservados à administração.", headers: ["Documento", "Tipo", "Acesso", "Atualização"] },
  administradores: { title: "Administradores", description: "Matriz dos níveis de acesso.", headers: ["Perfil", "Nível", "Permissão"], rows: [["Presidência", "Nível 1", "Acesso completo"], ["Diretoria", "Nível 2", "Gestão ampla"], ["Coordenação", "Nível 3", "Associados, solicitações e documentos"], ["Comunicação", "Nível 4", "Notícias, comunicados, eventos e benefícios"], ["Recrutador", "Nível 5", "Dashboard visual e cadastro de novos associados"]] },
  logs: { title: "Logs de auditoria", description: "Registro protegido de ações administrativas.", headers: ["Data/hora", "Administrador", "Ação", "Recurso"] },
  configuracoes: { title: "Configurações", description: "Dados institucionais e preferências do sistema.", headers: ["Seção", "Atualização", "Responsável"] },
  carteirinha: { title: "Minha carteirinha", description: "Credencial administrativa vinculada ao cargo.", headers: [] },
};

const moduleAccess: Record<string, readonly number[]> = {
  recrutamento: [1, 2, 3, 5], associados: [1, 2, 3], filiacoes: [1], assembleias: [1], cargos: [1, 2], diretoria: [1, 2], noticias: [1, 2, 4], comunicados: [1, 2, 4], eventos: [1, 2, 4], beneficios: [1, 2, 4], parceiros: [1, 2, 4], patrocinadores: [1, 2, 4], realizacoes: [1, 2, 4], solicitacoes: [1, 2, 3], "recuperacao-senha": [1, 3], transparencia: [1, 2], financeiro: [1, 2], documentos: [1, 2, 3], administradores: [1], logs: [1], configuracoes: [1, 2, 3, 4, 5], carteirinha: [1, 2, 3, 4, 5],
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
  if (module === "associados") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Associados da AUMM</h2><p>Pesquise quem já faz parte, consulte números e atualize a situação dos associados.</p></div></div><MemberAdmin /></AdminShell>;
  if (module === "filiacoes") return <AdminShell title={item.title} allowedLevels={allowedLevels} requiredPermissions={["canManageMembershipRequests"]}><ApplicationReviewAdmin /></AdminShell>;
  if (module === "assembleias") return <AdminShell title={item.title} allowedLevels={allowedLevels} requiredPermissions={["canManageAssemblies","canPublishAssembly","canPresideAssembly","canModerateAssembly","canCertifyResults","canFinalizeMinutes"]}><AssemblyAdmin /></AdminShell>;
  if (module === "diretoria") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Diretoria da AUMM</h2><p>As alterações feitas aqui aparecem no mural da página inicial.</p></div></div><BoardAdmin /></AdminShell>;
  if (module === "noticias") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Notícias da AUMM</h2><p>Crie publicações e escolha quais destaques vão rodar no topo da página inicial.</p></div></div><NewsAdmin /></AdminShell>;
  if (module === "recuperacao-senha") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Recuperação de senha</h2><p>Responda pelo WhatsApp somente após confirmar a identidade do solicitante.</p></div></div><PasswordResetAdmin /></AdminShell>;
  if (module === "documentos") return <AdminShell title={item.title} allowedLevels={allowedLevels} requiredPermissions={["canManageDocuments","canPublishDocuments","canArchiveDocuments"]}><div className="dash-welcome"><div><h2>Documentos da administração</h2><p>Organize arquivos internos e restritos da equipe administrativa.</p></div></div><DocumentAdmin /></AdminShell>;
  if (module === "patrocinadores") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Apoio, patrocínio e parceiros</h2><p>Cadastre marcas clicáveis e escolha onde cada uma será exibida.</p></div></div><SponsorAdmin /></AdminShell>;
  if (module === "carteirinha") return <AdminShell title={item.title} allowedLevels={allowedLevels}><AdminCardContent /></AdminShell>;
  if (module in operationalModules) return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>{item.title}</h2><p>{item.description}</p></div></div><OperationalAdmin module={module} /></AdminShell>;
  if (module === "administradores") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Administradores</h2><p>Crie contas, defina níveis e revogue acessos administrativos.</p></div></div><AdminManagement /></AdminShell>;
  if (module === "logs") return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>Logs de auditoria</h2><p>Consulte as alterações realizadas no painel.</p></div></div><AuditLogAdmin /></AdminShell>;
  if (module === "configuracoes") return <AdminShell title={item.title} allowedLevels={allowedLevels}><AdminSettingsPage /></AdminShell>;
  return <AdminShell title={item.title} allowedLevels={allowedLevels}><div className="dash-welcome"><div><h2>{item.title}</h2><p>{item.description}</p></div></div><section className="panel">{item.rows?.length ? <div className="table-wrap"><table><thead><tr>{item.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{item.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === 0 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}</tbody></table></div> : <div className="empty-state">Nenhum registro cadastrado.</div>}</section></AdminShell>;
}
