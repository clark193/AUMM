# Publicação automática das notícias

O backend acompanha a coleção news e sincroniza páginas públicas na branch gh-pages de clark193/AUMM. Não executa um build Next no Render. As páginas automáticas são documentos HTML responsivos de leitura, com identidade AUMM, navegação pública, conteúdo, banner e compartilhamento; não dependem de artefatos RSC do Next.

## Ativação única

1. No GitHub, crie um fine-grained personal access token com acesso somente ao repositório clark193/AUMM e permissão Contents: Read and write. Metadata: Read é automática. Não dê permissões de administração, workflows ou outros repositórios. Defina validade e programe sua renovação.
2. No ambiente protegido do serviço Render aumm-notificacoes, adicione GITHUB_NEWS_TOKEN com esse token. Nunca coloque o valor em código, frontend, .env versionado, logs ou mensagens de chat. Não altere nem substitua as outras variáveis.
3. Implante a main com estas alterações. Não crie outro serviço nem altere o plano gratuito.
4. Confira /health: o cabeçalho X-AUMM-News-Publisher deve sair de not-configured. A primeira inicialização reconcilia todas as notícias já publicadas, mesmo que tenham sido criadas durante o repouso do serviço.
5. Confira a conclusão do deploy GitHub Pages e a página pública. submitted significa commit enviado, não publicação confirmada no domínio.

A conexão GitHub do chat não fornece automaticamente uma credencial permanente ao processo do Render. Sem GITHUB_NEWS_TOKEN a automação fica desativada e não altera o banco ou o GitHub. A credencial permite escrever no repositório selecionado; a restrição à gh-pages é implementada pelo código, não pelo escopo do token.

## Funcionamento e limites

- Após salvar, editar, despublicar ou excluir, o painel chama /wake autenticado para acordar o serviço. O conteúdo vem exclusivamente do Firestore, nunca do corpo da requisição.
- Um listener completo recebe criações, alterações e exclusões. O snapshot inicial recupera mudanças durante o repouso. Há agrupamento por três segundos e nova tentativa após falhas; sem mudanças não há consultas periódicas ao GitHub.
- Somente status published é projetado. Campos operacionais e privados não entram no HTML ou no índice público.
- O sincronizador prepara os banners em JPEG 1200x630, até 300 KB. Provedores padrão: i.postimg.cc, firebasestorage.googleapis.com e storage.googleapis.com. Outros hosts públicos podem ser incluídos pelo administrador em AUMM_NEWS_IMAGE_HOSTS, separados por vírgula; não libere hosts internos. Redirecionamentos de imagem não são seguidos.
- Um único commit associa HTML, imagens e news-publication-index.json. CNAME, .nojekyll, páginas institucionais e arquivos de origem ficam preservados. Não há force push: concorrência ou falha gera nova tentativa. Se uma imagem falhar, a versão pública anterior é preservada até o problema ser resolvido.
- Documentos removidos ou despublicados têm sua página e seus artefatos de notícia removidos da branch. O histórico público do GitHub continua existindo: notícias nunca devem conter dados privados.
- Durante a publicação, a lista do site oferece a leitura pelo Firebase, evitando 404. O botão só compartilha a página própria depois que ela responde normalmente. As páginas usam navegação HTTP completa para suportar documentos criados após o último build Next.
- Render Free pode dormir. O painel tenta acordá-lo, mas nenhuma garantia de disponibilidade imediata é oferecida. Se a rede falhar, o snapshot inicial recupera os registros no próximo início. A publicação GitHub Pages leva algum tempo; cache do WhatsApp é independente.
- A fila é o estado atual do Firestore e o índice da branch. Não há necessidade de manter o PC ligado, instalar agente local, contratar Functions ou habilitar cobrança.
- Estado privado sanitizado: externalPushState/newsPublisher. Logs não imprimem tokens, imagens, artigos ou dados de usuários.

## Validação

`npm --prefix APP-Mobile/backend run build`

`node --test APP-Mobile/tests/news-publishing.mjs`

Os testes usam HTTP e dados simulados: projeção pública, escape HTML, criação, edição, exclusão, idempotência, preservação dos demais arquivos, bloqueio de URLs internas, falha de imagem, concorrência e ausência de credencial. Não criam fixtures em produção.

Para confirmar ponta a ponta, use uma notícia real que o responsável queira publicar ou editar, acompanhe o commit e o deploy Pages, confira o HTML e o banner no domínio e teste o compartilhamento. Não declare a automação ativa antes dessa verificação.
