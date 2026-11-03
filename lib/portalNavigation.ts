import {manualModuleAllowed} from "./manualPermissions.ts";
import { Siren, Phone, Video, Gift, Home } from "lucide-react";
import {
  BarChart3,
  BadgeCheck,
  Bell,
  CalendarDays,
  FileText,
  ClipboardCheck,
  Handshake,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Newspaper,
  ScrollText,
  Settings,
  CreditCard,
  ShieldCheck,
  Tags,
  UsersRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { ActiveAdmin } from "./useActiveAdmin";

export type AdminLink = { href: string; label: string; icon: LucideIcon; levels: readonly number[] };
export const navGroups: { label: string; links: AdminLink[] }[] = [
  { label: "Visão geral", links: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, levels: [1, 2, 3, 4, 5] },
  ] },
  { label: "Pessoas", links: [
    { href: "/admin/recrutamento", label: "Cadastrar associado", icon: UsersRound, levels: [1, 2, 3, 5] },
    { href: "/admin/associados", label: "Lista de associados", icon: UsersRound, levels: [1, 2, 3] },
    { href: "/admin/filiacoes", label: "Filiações", icon: ClipboardCheck, levels: [1] },
    { href: "/admin/cargos", label: "Cargos", icon: Tags, levels: [1, 2] },
    { href: "/admin/diretoria", label: "Diretoria", icon: ShieldCheck, levels: [1, 2] },
  ] },
  { label: "Comunicação", links: [
    { href: "/admin/noticias", label: "Notícias", icon: Newspaper, levels: [1, 2, 4] },
    { href: "/admin/realizacoes", label: "O que já fizemos", icon: BadgeCheck, levels: [1, 2, 4] },
    { href: "/admin/comunicados", label: "Comunicados", icon: Bell, levels: [1, 2, 4] },
    { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, levels: [1, 2, 4] },
    { href: "/admin/beneficios", label: "Benefícios", icon: Handshake, levels: [1, 2, 4] },
    { href: "/admin/patrocinadores", label: "Apoio, patrocínio e parceiros", icon: Handshake, levels: [1, 2, 4] },
  ] },
  { label: "Atendimento e gestão", links: [
    { href: "/admin/emergencias", label: "Emergências", icon: Siren, levels: [1, 2, 3] },
    { href: "/admin/reunioes", label: "Reuniões da diretoria", icon: Video, levels: [1, 2, 3, 4, 5] },
    { href: "/admin/contatos-apoio", label: "Contatos de apoio", icon: Phone, levels: [1] },
    { href: "/admin/solicitacoes", label: "Solicitações", icon: MessageSquareText, levels: [1, 2, 3] },
    { href: "/admin/recuperacao-senha", label: "Recuperar senhas", icon: LockKeyhole, levels: [1, 3] },
    { href: "/admin/assembleias", label: "Assembleias", icon: Vote, levels: [1] },
    { href: "/admin/transparencia", label: "Transparência financeira", icon: BarChart3, levels: [1, 2] },
    { href: "/admin/documentos", label: "Documentos", icon: FileText, levels: [1, 2, 3] },
  ] },
  { label: "Sistema", links: [
    { href: "/admin/label-admin", label: "Label admin", icon: Settings, levels: [1] },
    { href: "/admin/carteirinha", label: "Credencial do cargo", icon: CreditCard, levels: [1, 2, 3, 4, 5] },
    { href: "/admin/logs", label: "Auditoria", icon: ScrollText, levels: [1] },
    { href: "/admin/configuracoes", label: "Configurações administrativas", icon: Settings, levels: [1, 2, 3, 4, 5] },
  ] },
];


export const memberLinks = [
  { href: "/associado", label: "Início", icon: Home },
  { href: "/associado/carteirinha", label: "Carteirinha", icon: CreditCard },
  { href: "/associado/assembleias", label: "Assembleias", icon: Vote },
  { href: "/associado/beneficios", label: "Benefícios", icon: Gift },
  { href: "/associado/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/associado/documentos", label: "Documentos", icon: FileText },
  { href: "/associado/transparencia", label: "Transparência financeira", icon: BarChart3 },
  { href: "/associado/configuracoes", label: "Configurações", icon: Settings },
] as const;

const additionalPermissions: Record<string, readonly string[]> = {
  "/admin/assembleias": ["canManageAssemblies", "canPublishAssembly", "canPresideAssembly", "canModerateAssembly", "canCertifyResults", "canFinalizeMinutes"],
  "/admin/filiacoes": ["canManageMembershipRequests"],
  "/admin/documentos": ["canManageDocuments", "canPublishDocuments", "canArchiveDocuments"],
};

export function getAdminNavGroups(role: ActiveAdmin | null) {
  if (!role?.active) return [];
  return navGroups.map(group => ({
    ...group,
    links: group.links.filter(link => Number(role.level)===0 ? manualModuleAllowed(link.href,role.permissions||{}) : link.levels.includes(Number(role.level))
      || additionalPermissions[link.href]?.some(permission => role.permissions?.[permission] === true)),
  })).filter(group => group.links.length > 0);
}
