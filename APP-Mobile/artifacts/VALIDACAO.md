# Validação da entrega Android · 19/10/2026

- TypeScript do app, incluindo imports e parâmetros não utilizados: aprovado.
- TypeScript do backend de notificações, expiração e limpeza: aprovado.
- Domínio, notificações, placa e estados do apoio: 13 testes aprovados.
- Regras completas da raiz em Firestore local: 20 testes aprovados. Incluem privacidade da placa, confirmação exclusiva do solicitante, bloqueio após prazo/expiração, aceite concorrente, isolamento dos dois GPS, remetente e geração do chat, bloqueio após encerramento e proteção de tokens/avisos.
- Backend: dois testes de integração aprovados nos handlers reais, sem FCM externo. Destinatários, idempotência, filtros, supressão de aviso obsoleto, cancelamento por falta de confirmação e remoção física do chat encerrado.
- Dois usuários com Auth/Firestore emulados: pedido por convidado com placa, aceite por associado, confirmação, leitura privada, chat nos dois sentidos, GPS dos dois em movimento, alternância mapa/chat mantendo compartilhamento, pausa ao sair da tela, cartão acima do menu e encerramento remoto com exclusão dos quatro documentos privados. Aprovado.
- Notificações: notícia, chamado, envio, aceite solicitando confirmação, cancelamento, leitura, preferências e navegação. Aprovado.
- Duas prévias com moldura de celular: solicitante e associado; simulação do pedido, aceite, confirmação, posições e respostas de chat, sem GPS nem escrita remota. Aprovado.
- Interface em 320, 390 e 1440px: navegação, formulário, GPS, calculadora, checklist, acesso restrito e login. Aprovado.
- Prévia ativa em http://127.0.0.1:5174/preview-celular.html e http://127.0.0.1:5174/preview-celular.html?role=helper.
- Código e dados de demonstração ausentes do JavaScript de produção.
- Android: assembleDebug e bundleRelease aprovados; APK e AAB atualizados em artifacts/, com hashes SHA-256 conferidos.

As capturas 21–25 mostram o popup acima da navegação e os fluxos das duas prévias. A captura 18 mostra o chat entre usuários reais dos emuladores locais. As imagens de navegador não substituem teste em aparelhos físicos.

## Operação real

As regras da raiz e o backend atualizado ainda precisam ser publicados no Firebase real. Nenhum deploy ou alteração de faturamento foi realizado. O envio automático com app fechado, a rotina de expiração sem participantes online e a limpeza física do chat dependem do backend publicado. O fluxo local bloqueia confirmação após cinco minutos; as regras também bloqueiam a confirmação vencida e o acesso indevido.

Mensagens de chat atualizam dentro da tela de atendimento; não há push para cada mensagem. Dados do chat ficam inacessíveis ao encerrar, mas remoção física depende da função de limpeza ou de uma política TTL configurada. Cada pedido recebe um identificador novo de conversa.

O GPS exige ativação voluntária e tela de atendimento aberta. Alternar para Chat mantém o compartilhamento; sair da tela, abrir Waze/Maps ou entrar em segundo plano pausa. Não há rastreamento em segundo plano, histórico de trajetos ou ETA. O mapa informa idade do sinal e distância em linha reta.

O APK é de depuração; o AAB release é gerado sem assinatura. A publicação Google Play ainda exige assinatura e configuração da conta da associação, definição da exclusão de conta e testes físicos. Confira NOTIFICACOES.md e README.md para ativação do Firebase.
Atualização de chat e navegação: prévias aprovadas novamente, incluindo asserções de largura do campo, botão de envio com 44px, ausência de barras/alça de redimensionamento, digitação/envio em 320px, rolagem preservada e uma única ação de GPS. O seletor Android é implementado por plugin nativo e precisa ser validado em aparelho físico com os apps de mapa instalados; navegador não comprova o diálogo do Android.
A captura 25-preview-associado-chat.png foi atualizada com o campo do chat corrigido.

Atualização de cadastro/administração/compartilhamento:
- 13 testes de domínio/notificações e 3 de validação de filiação aprovados.
- 24 testes das regras completas aprovados, incluindo expiração/revogação/privacidade dos links e exclusão exclusiva de nível 1, sem autoelevação do nível 2.
- 9 testes existentes de administração no Firestore aprovados. Corrigido um erro preexistente no teste de escrita, que passava os dados como parte do caminho do documento.
- 4 testes do handler real de administração contra Auth/Firestore locais aprovados: níveis negados, senha temporária utilizável, nenhuma senha na auditoria, proteção de administradores, exclusão de login/perfil/links, encerramento de apoio e preservação institucional.
- UI de cadastro/painel no emulador aprovada em 390px: estatuto sem perder formulário, filiação real pendente, menu administrativo, senha/confirmar senha, exclusão por confirmação de nome e ocultação das ações ao nível 2. A chamada administrativa desta verificação visual foi interceptada; o handler real foi testado separadamente.
- UI de compartilhamento ao vivo aprovada no emulador: consentimento, movimento, documento público sem dados cadastrais e revogação imediata. Inclui amostra de GPS com data e renovação periódica quando parado.
- Prévia do tema vermelho/branco e login admin interno, página pública sem link e login do site compilado aprovados, sem erros JavaScript ou escrita remota.
- Capturas atuais: 26-cadastro-no-aplicativo.png, 27-admin-app-trocar-senha.png, 28-compartilhar-localizacao-ao-vivo.png, 29-app-vermelho-e-branco.png e 30-login-admin-no-celular.png.
- APK e AAB recompilados com portal.html dentro do pacote. Teste em aparelho físico continua necessário para permissões, GPS e seletor de aplicativos.
Estado da publicação em 19/10/2026:
- Site publicado no GitHub Pages, domínio https://aumm.com.br/, branch gh-pages, commit 97d4a057617c2aa763d9c90c26f6e67cd8e9f17b.
- Publicação confirmada pelo GitHub com status built e pelo arquivo público /versao.json apontando para o fonte aa71209e3ae67bdc9fe0b3bd340cba79ff4bed70. /acompanhar/ respondeu HTTP 200.
- Integridade SHA-256 do APK e AAB confirmada. APK contém portal.html e o novo bundle do aplicativo.
- Firebase: função administrativa e regras novas ainda não publicadas; aguardando login Google do usuário. O frontend publicado não substitui essa etapa. As afirmações anteriores de ausência de deploy referem-se à etapa anterior à publicação no GitHub; o Firebase permanece pendente.

## Atualização gratuita e emergência — 20/10/2026

- Recuperação de senha por e-mail e remoção do cadastro pelo nível 1 ativo, sem Cloud Functions. O Authentication permanece; os acessos de associado deixam de existir após remover o cadastro. Apoios, posições privadas, links ao vivo, foto e credenciais públicas vinculados são encerrados/removidos atomicamente. Perfis administrativos e a própria conta são protegidos.
- Contato de emergência privado, alerta de acidente com confirmação e GPS opcional, SMS preenchido no celular e fila em Solicitações no painel do site e do aplicativo. Status em tempo real entre associado e atendente. O SMS exige confirmação de envio no app de mensagens; sem envio automático nem confirmação de entrega. O painel exige um administrador conectado; sem push com app fechado ou garantia de plantão.
- Regras de produção publicadas com sucesso em aumm-21dda em 20/10/2026 (somente firestore:rules). Plano gratuito preservado. Cópia completa sincronizada em FIREBASE-REGRAS-COMPLETAS.txt.
- Testes: 30 de regras móveis/privacidade, 15 de lógica, 9 de regras administrativas e 3 de filiação aprovados. Integrações em navegador de 390px com Auth/Firestore locais: cadastro no app, recuperação real por e-mail no emulador, remoção com limpeza e login preservado; emergência com e sem GPS, cancelamento e atendimento administrativo em tempo real. A navegação externa de SMS foi substituída somente no teste para não abrir um aplicativo real; destinatário e conteúdo foram conferidos.
- Build estática do site aprovada com TypeScript. Paralelismo limitado a dois processos para evitar esgotamento de memória na exportação.
- Capturas: 27-admin-app-recuperar-senha.png, 31-emergencia-contato.png, 32-emergencia-em-andamento.png e 33-emergencia-painel-aumm.png.
- Pendente de teste em aparelho físico: abrir o SMS, envio pela operadora e permissões de GPS do Android. APK de teste; AAB sem assinatura não publicado na Play Store.

Publicação confirmada em 20/10/2026: site em https://aumm.com.br, fonte 5c040194e432ff5a8f23011fa23e213073e00483 e GitHub Pages b31aa4e5b213dc24492957013d4edb79eb2707eb com status built. /admin/solicitacoes/ responde HTTP 200; o JavaScript público de emergência tem SHA-256 idêntico à build local. APK final com assinatura Android Debug válida, portal e emergência incluídos; hashes do APK/AAB conferidos. Não foi solicitada permissão SEND_SMS.


### Avisos de emergência para todos os administradores — 20/10/2026

Sino com contador e destaque visual no painel conectado, com leitura individual por administrador. O mesmo incidente não repete o destaque ao navegar ou atualizar o status; um novo incidente avisa novamente. Todos os níveis ativos recebem apenas o sinal geral (incidentId, status e horários). Telefone, nome e GPS continuam restritos à equipe autorizada. Incidente e sinal são gravados/atualizados atomicamente, e as regras recusam sinal falso, dados privados no sinal e alteração sem sincronização.

Verificação: 31 testes de regras aprovados, incluindo administradores de níveis 1 a 5, inativo e visitantes. Integração real com Auth/Firestore locais em 390px: administradores de níveis 3 e 5 conectados antes do acidente receberam sino e destaque; nível 5 não recebeu nome/telefone/link de atendimento; atualização de status não repetiu o aviso; novo incidente avisou e cancelamento limpou o destaque. Build móvel com TypeScript e APK/AAB gerados. Sem envio real de SMS ou push de sistema.

Publicação dos avisos confirmada em 20/10/2026: regras Firestore publicadas em aumm-21dda; GitHub Pages aaa2771abb80d339701eef74e7567301bdefe7ad com status built, fonte 324cffce6299341517e83edcb42a07f92b3284af. O JavaScript público com emergencyAdminSignals tem SHA-256 idêntico à build local. APK/AAB com hashes conferidos. Prévia visual do aviso em 35-notificacao-emergencia-painel.png e do sino no nível 5 em 34-aviso-emergencia-admin-nivel-5.png.
