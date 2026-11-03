export const permissionOptions = [
 ['dashboard.read','Ver painel de gestão'],['members.create','Cadastrar associados'],['members.read','Consultar associados'],['members.write','Editar associados'],
 ['news.read','Consultar notícias'],['news.create','Publicar notícias'],['news.edit','Editar notícias'],['news.delete','Excluir notícias'],
 ['communications.read','Consultar comunicados'],['communications.write','Publicar e editar comunicados'],['content.manage','Gerenciar eventos, benefícios, parceiros e realizações'],
 ['board.manage','Gerenciar diretoria'],['roles.manage','Gerenciar catálogo de cargos'],['requests.read','Consultar solicitações'],['requests.write','Atender solicitações'],
 ['documents.read','Consultar documentos internos'],['documents.write','Gerenciar documentos'],['canManageMembershipRequests','Analisar filiações'],
 ['canManageAssemblies','Gerenciar assembleias'],['canPublishAssembly','Publicar assembleias'],['canPresideAssembly','Presidir assembleias'],['canModerateAssembly','Moderar assembleias'],['canCertifyResults','Certificar resultados'],['canFinalizeMinutes','Finalizar atas'],
 ['finance.read','Consultar financeiro'],['finance.write','Editar financeiro'],['transparency.write','Publicar transparência'],['passwordResets.read','Consultar recuperação de acesso'],['passwordResets.manage','Atender recuperação de acesso'],['audit.read','Consultar auditoria'],['settings.read','Consultar configurações'],['settings.write','Alterar configurações institucionais'],['notifications.write','Gerenciar notificações'],
] as const;
export const modulePermissions: Record<string, readonly string[]> = {
 '/admin':['dashboard.read'],'/admin/recrutamento':['members.create','members.write'],'/admin/associados':['members.read'], '/admin/filiacoes':['canManageMembershipRequests'], '/admin/cargos':['roles.manage'], '/admin/diretoria':['board.manage'], '/admin/noticias':['news.read','news.create','news.edit'], '/admin/comunicados':['communications.read','communications.write'], '/admin/eventos':['content.manage'], '/admin/beneficios':['content.manage'], '/admin/patrocinadores':['content.manage'], '/admin/realizacoes':['content.manage'], '/admin/emergencias':[], '/admin/solicitacoes':['requests.read','requests.write'], '/admin/documentos':['documents.read','documents.write'], '/admin/transparencia':['finance.read','finance.write','transparency.write'], '/admin/financeiro':['finance.read','finance.write'], '/admin/recuperacao-senha':['passwordResets.read','passwordResets.manage'], '/admin/logs':['audit.read'], '/admin/configuracoes':['settings.read','settings.write'], '/admin/assembleias':['canManageAssemblies','canPublishAssembly','canPresideAssembly','canModerateAssembly','canCertifyResults','canFinalizeMinutes'],
};
export function manualModuleAllowed(path: string, permissions: Record<string,boolean>) {
 return (modulePermissions[path.replace(/\/+$/, '')] || []).some(key=>permissions[key]===true);
}
