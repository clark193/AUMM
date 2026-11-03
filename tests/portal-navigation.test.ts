import assert from "node:assert/strict";
import test from "node:test";
import { getAdminNavGroups, memberLinks } from "../lib/portalNavigation.ts";
import type { ActiveAdmin } from "../lib/useActiveAdmin.ts";

const memberPaths = ["/associado", "/associado/carteirinha", "/associado/assembleias", "/associado/beneficios", "/associado/eventos", "/associado/documentos", "/associado/transparencia", "/associado/configuracoes"];
function adminPaths(role: ActiveAdmin | null) {
  return getAdminNavGroups(role).flatMap(group => group.links.map(link => link.href));
}

test("all five roles keep every member option and add only their permitted tools", () => {
  const expected: Record<number, string[]> = {
    1: ["/admin", "/admin/recrutamento", "/admin/associados", "/admin/filiacoes", "/admin/cargos", "/admin/diretoria", "/admin/noticias", "/admin/realizacoes", "/admin/comunicados", "/admin/eventos", "/admin/beneficios", "/admin/patrocinadores", "/admin/emergencias", "/admin/reunioes", "/admin/contatos-apoio", "/admin/solicitacoes", "/admin/recuperacao-senha", "/admin/assembleias", "/admin/transparencia", "/admin/documentos", "/admin/label-admin", "/admin/carteirinha", "/admin/logs", "/admin/configuracoes"],
    2: ["/admin", "/admin/recrutamento", "/admin/associados", "/admin/cargos", "/admin/diretoria", "/admin/noticias", "/admin/realizacoes", "/admin/comunicados", "/admin/eventos", "/admin/beneficios", "/admin/patrocinadores", "/admin/emergencias", "/admin/reunioes", "/admin/solicitacoes", "/admin/transparencia", "/admin/documentos", "/admin/carteirinha", "/admin/configuracoes"],
    3: ["/admin", "/admin/recrutamento", "/admin/associados", "/admin/emergencias", "/admin/reunioes", "/admin/solicitacoes", "/admin/recuperacao-senha", "/admin/documentos", "/admin/carteirinha", "/admin/configuracoes"],
    4: ["/admin", "/admin/noticias", "/admin/realizacoes", "/admin/comunicados", "/admin/eventos", "/admin/beneficios", "/admin/patrocinadores", "/admin/reunioes", "/admin/carteirinha", "/admin/configuracoes"],
    5: ["/admin", "/admin/recrutamento", "/admin/reunioes", "/admin/carteirinha", "/admin/configuracoes"],
  };
  for (const level of [1, 2, 3, 4, 5]) {
    assert.deepEqual(memberLinks.map(link => link.href), memberPaths);
    assert.deepEqual(adminPaths({ active: true, level }), expected[level]);
    assert.deepEqual(adminPaths({ active: true, level: String(level) }), expected[level]);
  }
});

test("members without a role and revoked roles have no administrative menu", () => {
  assert.deepEqual(adminPaths(null), []);
  assert.deepEqual(adminPaths({ active: false, level: 1, permissions: { canManageAssemblies: true } }), []);
  assert.deepEqual(memberLinks.map(link => link.href), memberPaths);
});

test("specific grants add their own module without exposing unrelated tools", () => {
  const permissions = {
    canPublishAssembly: true,
    canManageMembershipRequests: true,
    canPublishDocuments: true,
  };
  const paths = adminPaths({ active: true, level: 5, permissions });
  for (const path of ["/admin/assembleias", "/admin/filiacoes", "/admin/documentos"]) assert(paths.includes(path));
  for (const path of ["/admin/associados", "/admin/noticias", "/admin/transparencia", "/admin/logs"]) assert(!paths.includes(path));
  assert(!adminPaths({ active: true, level: 5, permissions: { canPublishAssembly: false } }).includes("/admin/assembleias"));
  assert(!adminPaths({ active: true, level: 5 }).includes("/admin/assembleias"));
});

 test("manual roles override predefined access and never grant Label admin",()=>{
 const manual={active:true,level:0,permissions:{"news.read":true,"news.create":true}};
 assert.deepEqual(adminPaths(manual),["/admin/noticias"]);
 assert.deepEqual(adminPaths({...manual,permissions:{}}),[]);
 assert(!adminPaths(manual).includes("/admin/label-admin"));
 });
