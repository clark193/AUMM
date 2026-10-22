import { AdminModuleContent } from "@/components/AdminModuleContent";
export const dynamicParams = false;
export function generateStaticParams() { return ["emergencias","reunioes","contatos-apoio","recrutamento","associados","filiacoes","assembleias","cargos","diretoria","noticias","comunicados","eventos","beneficios","parceiros","patrocinadores","realizacoes","solicitacoes","recuperacao-senha","transparencia","financeiro","documentos","administradores","logs","configuracoes","carteirinha"].map(module => ({ module })); }
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <AdminModuleContent module={module} />;
}