# AUMM — conta unificada e revisão do aplicativo

## Alterações

- Um login para associados e administradores. O acesso administrativo ativo é identificado em tempo real. O site mantém a entrada pela Área do associado e apresenta as ferramentas da diretoria após a autenticação.
- No aplicativo, cadastro, recuperação de acesso e ferramentas administrativas usam componentes React locais na mesma interface. A navegação principal não abre `portal.html` nem incorpora o site em iframe. O iframe da página de demonstração serve somente para desenhar a moldura do telefone no navegador.
- Primeira abertura com entrar, associar-se e convidado; sessão persistente; modo escuro inicial e modo claro com preferência salva; cabeçalho fixo; Benefícios em aba própria; remoção do quadro “A força está na nossa união”; organização do perfil e nova apresentação dos eventos.
- Emergências na navegação administrativa: consultar posição registrada no acionamento, iniciar contato, marcar como atendido e cancelar, com histórico por situação. O contato com o associado e seu contato de confiança continua manual, pela diretoria.
- Cargo e nível independentes na lista de associados, com ícones de informação. Só nível 1 atribui o acesso. A alteração usa o UID existente, remove permissões especiais anteriores e invalida a credencial anterior. O formulário impede retirar o próprio acesso de nível 1.
- A carteirinha de administrador exibe o cargo da diretoria. Foto sincronizada entre os espaços de associado e administração. Contas administrativas antigas continuam acessíveis; contas com UIDs diferentes não são fundidas automaticamente.
- Contatos de apoio publicados pelo nível 1: nome, telefone, região, informações e WhatsApp opcional. Contatos publicados são visíveis também a convidados.
- Qualquer administrador ativo pode criar reuniões privadas da diretoria, com pauta, data/hora de Brasília, duração, local e link HTTPS. Organizador e nível 1 editam ou cancelam. O servidor prepara avisos de criação/alteração/cancelamento, 30 minutos antes e no início, com deduplicação e verificação de acesso atual.

## Validação

- TypeScript do site e aplicativo; build estático do site com 63 páginas; build web do aplicativo. Nenhuma execução de Gradle ou geração de APK nesta revisão.
- 38 testes de regras do aplicativo e conta unificada; 26 de regras administrativas e assembleias: aprovados.
- 20 testes unitários aprovados; um teste de integração REST nativo não executado nesta rodada. A compilação Java dos testes locais foi executada com JDK 21.
- 4 testes dos handlers de notificações e reuniões, sem FCM real; teste do endpoint de senha no emulador incluindo ex-administrador inativo: aprovados.
- Navegação visual, cadastro interno, convidado, temas persistentes, login salvo, perfil, administração por nível, emergência, mapa, contatos, reuniões, promoção/remoção no mesmo UID e emissão/compartilhamento da credencial administrativa: aprovados no navegador.
- Regressão de perfil, nome longo, datas de eventos, cadastro legado e upload administrativo de foto: aprovada.

## Prévia

Abrir `http://127.0.0.1:5175/preview-unificado.html` com o Vite e os emuladores Auth/Firestore locais ativos. Os botões superiores alternam primeira abertura, convidado, associado, presidência e diretoria. Todas as contas e registros são fictícios. A demonstração bloqueia links de contatos externos e não envia mensagens reais.

Preparação: `node APP-Mobile/tests/seed-unified-preview.mjs`. Este script usa exclusivamente os emuladores locais do projeto `demo-aumm-mobile`; substitui os dados desse banco de teste.

## Limites e pendências

- O usuário solicitou revisar a prévia antes do APK. O APK anterior não contém estas mudanças. Gerar o novo APK somente após a revisão.
- Não houve teste desta revisão em celular físico. Ainda validar câmera, permissões Android, notificações com tela bloqueada/app fechado, GPS prolongado e seletor de navegação no aparelho.
- O servidor Render gratuito entra em repouso após inatividade. Os lembretes foram implementados, mas o horário de entrega não é garantido quando o servidor dorme, o aparelho está sem rede ou o Android restringe notificações. A agenda permanece disponível no painel. Não foi instalado um ping permanente que consumiria as horas gratuitas compartilhadas com outro serviço.
- Fonte da limitação do Render: https://render.com/docs/free .
- A imagem que o usuário mencionou sobre o problema específico do perfil ainda não foi recebida; o layout foi revisado e testado com nome longo e foto.
- As regras completas para consulta estão em `FIREBASE-REGRAS-COMPLETAS.txt` e correspondem ao arquivo `firestore.rules`.

## Publicação

- Site publicado em https://aumm.com.br pelo GitHub Pages, release `a061970bf0e0de4e722daf3d1685c24193a2089d`, código do site `a2c69da754df424f31f76a628b6f28f3371b32aa`.
- Verificados HTTP 200 na página inicial, login, área do associado, lista de associados, Emergências, Reuniões, Contatos de apoio e acompanhamento público. Os 25 arquivos JavaScript usados nessas páginas coincidem por SHA-256 com a exportação local.
- Servidor Render atualizado: deploy `dep-dbcma6gm7kps73c74op0`, estado `live`, código `a2c69da754df424f31f76a628b6f28f3371b32aa`. Saúde HTTP 200; endpoint de senha sem autenticação retorna HTTP 401.
- Regras do Firestore publicadas no projeto `aumm-21dda`. A revisão final também permite remover o cadastro de um ex-administrador cujo acesso já está inativo; administradores ativos continuam protegidos. Os 38 testes foram repetidos e passaram após esse ajuste.
- Prévia disponível no navegador local pelo link acima. A revisão automática de aprovação bloqueou a abertura automática do navegador por política de execução.
- APK novo aguardando revisão do usuário; nenhuma atualização Android foi anunciada como concluída nesta entrega.
