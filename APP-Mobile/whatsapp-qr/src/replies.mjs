const site = 'https://aumm.com.br';
const footer = `\n\nO site e o portal funcionam sem este bot: ${site}/\nMENU para voltar; SAIR para pausar.`;
const menu = `Atendimento automático AUMM — informações e atalhos.\nNão envie CPF, senha ou documentos.\n1. Conhecer a AUMM\n2. Como se associar\n3. Ler notícias publicadas\n4. Benefícios e informações públicas\n5. Acessar o portal\n6. Atendimento humano\nDigite uma opção. Se o bot estiver indisponível, acesse ${site}/contato/.`;

export async function reply(choice, db) {
  switch (choice) {
    case '1': return `A Associação União Maior Motoboys (AUMM) é uma organização sem fins lucrativos, formada por motofretistas e entregadores(as) de bicicleta, com atuação em todo o território brasileiro.\n${site}/quem-somos/${footer}`;
    case '2': return `A solicitação de filiação é feita no site e analisada pela associação. O bot não recebe cadastro nem aprova filiação.\n${site}/associe-se/\nEstatuto: ${site}/estatuto/${footer}`;
    case '3': {
      try {
        const news = await db.collection('news').where('status', '==', 'published').limit(5).get();
        const items = news.docs.map(doc => `${String(doc.data().title || 'Notícia').replace(/[\r\n]/g, ' ').slice(0, 160)}\n${site}/noticias/${encodeURIComponent(doc.id)}/`);
        return `${items.join('\n\n') || 'Consulte as notícias publicadas no site.'}\nTodas as notícias: ${site}/noticias/${footer}`;
      } catch { return `Consulte as notícias diretamente no site: ${site}/noticias/${footer}`; }
    }
    case '4': return `Informações públicas: ${site}/beneficios/\nCondições restritas aos associados ficam no portal autenticado. Este bot não consulta nem valida dados pessoais.${footer}`;
    case '5': return `Entre pelo navegador: ${site}/associado/\nUse as opções da tela de entrada para orientação de recuperação. O bot não faz login, troca senha ou consulta cadastro. Não envie suas credenciais aqui.${footer}`;
    case '6': return `Atendimento automático pausado para você tratar o assunto com a equipe. Use os canais publicados em ${site}/contato/.\nEste bot não confirma prazo nem abertura de protocolo. Solicitações formais devem seguir os canais do site/portal.${footer}`;
    case 'sair': case 'parar': return `Atendimento automático pausado. Para retomar, envie MENU.\nOs canais da associação continuam em ${site}/contato/.`;
    default: return menu;
  }
}
