export type AdminField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "date" | "number" | "url" | "select" | "checkbox";
  required?: boolean;
  full?: boolean;
  options?: readonly { value: string; label: string }[];
  placeholder?: string;
};

export type AdminModuleConfig = {
  collection: string;
  singular: string;
  titleField: string;
  searchFields: readonly string[];
  fields: readonly AdminField[];
  canCreate?: boolean;
  canDelete?: boolean;
};

const statusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativo" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
] as const;

const publicContentStatusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Ativo e visível no site" },
  { value: "archived", label: "Arquivado" },
] as const;

const financialStatusOptions = [
  { value: "draft", label: "Rascunho (não visível)" },
  { value: "published", label: "Publicado e visível" },
  { value: "archived", label: "Arquivado" },
] as const;

export const operationalModules: Record<string, AdminModuleConfig> = {
  cargos: {
    collection: "roles",
    singular: "cargo",
    titleField: "name",
    searchFields: ["name", "description"],
    fields: [
      { key: "name", label: "Nome do cargo", required: true },
      { key: "description", label: "Descrição", type: "textarea", required: true, full: true },
      { key: "order", label: "Ordem de exibição", type: "number", required: true },
      { key: "active", label: "Cargo ativo", type: "checkbox" },
    ],
  },
  comunicados: {
    collection: "communications",
    singular: "comunicado",
    titleField: "subject",
    searchFields: ["subject", "body", "audience"],
    fields: [
      { key: "subject", label: "Assunto", required: true, full: true },
      { key: "body", label: "Mensagem", type: "textarea", required: true, full: true },
      { key: "audience", label: "Público", type: "select", required: true, options: [
        { value: "all", label: "Todos os associados" },
        { value: "members", label: "Associados ativos" },
        { value: "admin", label: "Somente administração" },
      ] },
      { key: "status", label: "Status", type: "select", required: true, options: statusOptions },
    ],
  },
  realizacoes: {
    collection: "accomplishments",
    singular: "realização",
    titleField: "title",
    searchFields: ["title", "description", "actionDate"],
    fields: [
      { key: "title", label: "Título da ação ou conquista", required: true, full: true },
      { key: "description", label: "Texto da publicação", type: "textarea", required: true, full: true },
      { key: "imageUrl", label: "Link público da imagem", type: "url", required: true, placeholder: "https://...", full: true },
      { key: "actionDate", label: "Data da realização", type: "date", required: true },
      { key: "url", label: "Link externo opcional", type: "url", placeholder: "https://..." },
      { key: "status", label: "Status", type: "select", required: true, options: publicContentStatusOptions },
    ],
  },
  parceiros: {
    collection: "partners",
    singular: "parceiro",
    titleField: "name",
    searchFields: ["name", "category", "description"],
    fields: [
      { key: "name", label: "Nome do parceiro", required: true },
      { key: "category", label: "Categoria", required: true },
      { key: "description", label: "Descrição e condições", type: "textarea", required: true, full: true },
      { key: "website", label: "Site ou rede social", type: "url", placeholder: "https://..." },
      { key: "phone", label: "Telefone/WhatsApp" },
      { key: "status", label: "Status", type: "select", required: true, options: publicContentStatusOptions },
    ],
  },
  eventos: {
    collection: "events",
    singular: "evento",
    titleField: "title",
    searchFields: ["title", "description", "location"],
    fields: [
      { key: "title", label: "Nome do evento", required: true, full: true },
      { key: "description", label: "Descrição", type: "textarea", required: true, full: true },
      { key: "eventDate", label: "Data", type: "date", required: true },
      { key: "location", label: "Local", required: true },
      { key: "url", label: "Link de inscrição ou detalhes", type: "url", placeholder: "https://...", full: true },
      { key: "status", label: "Status", type: "select", required: true, options: publicContentStatusOptions },
    ],
  },
  beneficios: {
    collection: "benefits",
    singular: "benefício",
    titleField: "title",
    searchFields: ["title", "partner", "description"],
    fields: [
      { key: "title", label: "Benefício", required: true },
      { key: "partner", label: "Parceiro", required: true },
      { key: "description", label: "Descrição e regras", type: "textarea", required: true, full: true },
      { key: "validityDate", label: "Validade", type: "date" },
      { key: "url", label: "Link para utilizar", type: "url", placeholder: "https://..." },
      { key: "status", label: "Status", type: "select", required: true, options: publicContentStatusOptions },
    ],
  },
  solicitacoes: {
    collection: "requests",
    singular: "solicitação",
    titleField: "subject",
    searchFields: ["protocol", "ownerName", "subject", "status"],
    canCreate: false,
    fields: [
      { key: "protocol", label: "Protocolo", required: true },
      { key: "ownerName", label: "Associado", required: true },
      { key: "subject", label: "Assunto", required: true, full: true },
      { key: "memberMessage", label: "Mensagem do associado", type: "textarea", full: true },
      { key: "adminReply", label: "Resposta administrativa", type: "textarea", full: true },
      { key: "status", label: "Status", type: "select", required: true, options: [
        { value: "pending", label: "Pendente" },
        { value: "in_progress", label: "Em atendimento" },
        { value: "resolved", label: "Resolvida" },
        { value: "archived", label: "Arquivada" },
      ] },
    ],
  },
  transparencia: {
    collection: "financialEntries",
    singular: "lançamento",
    titleField: "description",
    searchFields: ["description", "category", "type"],
    fields: [
      { key: "date", label: "Data", type: "date", required: true },
      { key: "description", label: "Descrição", required: true, full: true },
      { key: "category", label: "Categoria", required: true },
      { key: "type", label: "Tipo", type: "select", required: true, options: [
        { value: "income", label: "Receita" },
        { value: "expense", label: "Despesa" },
      ] },
      { key: "amount", label: "Valor (R$)", type: "number", required: true },
      { key: "visibility", label: "Visibilidade", type: "select", required: true, options: [
        { value: "admin", label: "Somente administração" },
        { value: "members", label: "Associados" },
        { value: "public", label: "Público" },
      ] },
      { key: "status", label: "Status", type: "select", required: true, options: financialStatusOptions },
    ],
  },
  financeiro: {
    collection: "financialEntries",
    singular: "lançamento",
    titleField: "description",
    searchFields: ["description", "category", "type"],
    fields: [
      { key: "date", label: "Data", type: "date", required: true },
      { key: "description", label: "Descrição", required: true, full: true },
      { key: "category", label: "Categoria", required: true },
      { key: "type", label: "Tipo", type: "select", required: true, options: [
        { value: "income", label: "Receita" },
        { value: "expense", label: "Despesa" },
      ] },
      { key: "amount", label: "Valor (R$)", type: "number", required: true },
      { key: "visibility", label: "Visibilidade", type: "select", required: true, options: [
        { value: "admin", label: "Somente administração" },
        { value: "members", label: "Associados" },
        { value: "public", label: "Público" },
      ] },
      { key: "status", label: "Status", type: "select", required: true, options: financialStatusOptions },
    ],
  },
};
