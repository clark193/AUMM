export const adminLevels = [
 {level:1,name:"Presidência / administrador máximo",description:"Acesso completo. Pode atribuir cargos e níveis, alterar senhas, remover cadastros, administrar acessos, finanças, conteúdo, documentos e assembleias."},
 {level:2,name:"Diretoria",description:"Gestão ampla de associados, emergências, conteúdo, eventos, finanças e documentos. Não atribui níveis, não remove perfis nem altera diretamente senhas de associados."},
 {level:3,name:"Coordenação",description:"Consulta e atualiza associados, acompanha emergências e solicitações, consulta documentos e atende recuperação de acesso por e-mail. Sem gestão financeira ou atribuição de níveis."},
 {level:4,name:"Comunicação",description:"Gerencia notícias, comunicados, eventos, benefícios e conteúdo. Não consulta dados privados de associados, emergências ou finanças."},
 {level:5,name:"Cadastro",description:"Acesso limitado ao dashboard e cadastro de novos associados. Não acessa a lista completa, senhas, emergências ou finanças."},
] as const;
export const adminLevelExplanation=(level:number)=>adminLevels.find(item=>item.level===level)?.description||"Sem acesso administrativo.";
