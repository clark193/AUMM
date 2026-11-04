> Histórico: o responsável mudou para o modo QR não oficial. Esta implementação oficial foi preservada e está desligada. Consulte APP-Mobile/whatsapp-qr/README.md para o estado atual.

# Atendimento AUMM pela WhatsApp Cloud API

Verificação: 03/11/2026. Estado: implementação local testada; envio desabilitado; sem implantação ou conversa real verificada. Não tratar este documento como confirmação de produção.

## Viabilidade e custos

Não é possível prometer atendimento ilimitado, contínuo e gratuito. A alternativa oficial mais próxima é a Cloud API direta da Meta, com atendimento iniciado pelo usuário, somente respostas de serviço dentro da janela, limite conservador de mensagens e suspensão de respostas ao atingir o orçamento. Sem templates, campanhas ou IA paga. A API do ChatGPT não é usada.

A [FAQ oficial da Meta](https://whatsappbusiness.com/resources/faq/), seção de preços, informa que desde **01/10/2026** as primeiras **1.000 mensagens de serviço por número por mês** são gratuitas e há cobrança da 1.001ª em diante. São mensagens, não conversas. Uma conversa com dez respostas consome dez mensagens. A [página comercial de preços](https://whatsappbusiness.com/products/platform-pricing/) ainda apresenta a regra anterior de serviço gratuito dentro de 24 horas; há divergência nas páginas oficiais. Portanto não se presume gratuidade pela janela. A [tabela detalhada](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing) exigiu login nesta investigação; tarifa brasileira exata e franquia efetiva da conta precisam ser conferidas no painel antes de qualquer envio. Nenhum pagamento foi habilitado.

O [Render Free](https://render.com/docs/free) repousa após 15 minutos sem tráfego recebido, leva cerca de um minuto para iniciar, pode reiniciar e compartilha 750 horas/mês por espaço. Não oferece SLA de atendimento contínuo. O disco é temporário; não se usa SQLite ou arquivo local para a fila. O plano Hobby inclui [5 GB de saída/mês](https://render.com/docs/outbound-bandwidth) e [500 minutos de compilação/mês](https://render.com/docs/build-pipeline). Com forma de pagamento cadastrada, excessos podem gerar cobrança; sem forma de pagamento, há suspensão/impedimento de builds. O espaço real da AUMM, seu plano, consumo e forma de pagamento ainda não puderam ser inspecionados. Não criar recursos no Streamcord, que o responsável informou ser outro projeto.

O Firestore foi consultado por acesso já autorizado: projeto `aumm-21dda` ativo, `billingEnabled=false`, cinco notícias publicadas. As regras publicadas são iguais às locais. A [franquia Firestore](https://firebase.google.com/docs/firestore/quotas) é compartilhada com site e aplicativo: 1 GiB, 50.000 leituras/dia, 20.000 gravações/dia, 20.000 exclusões/dia e 10 GiB de transferência/mês. Não habilitar Blaze. Não ativar TTL (requer cobrança). O plano Spark pode interromper operações ao esgotar cotas; o bot não garante atendimento nessa situação. As cotas de uso restantes não foram medidas nesta tarefa.

Foi escolhido reutilizar o backend Render existente para um piloto limitado, sem contratar outro serviço. O código funciona na nuvem com o computador desligado, mas o plano gratuito pode repousar/suspender. Se for indispensável disponibilidade contínua contratual, será necessário avaliar hospedagem paga mediante autorização; nenhuma foi contratada. O aplicativo WhatsApp Business com atendimento manual é a alternativa oficial sem bot quando a franquia da API acabar. GitHub Pages continua hospedando somente o site estático.

## Conta Meta e preservação do número

O responsável informou que o número pretendido já está no aplicativo WhatsApp Business. Seu formato E.164 completo ainda deve ser confirmado no próprio aparelho/painel. **Não remover a conta do aplicativo nem registrar o número pela API tradicional antes de confirmar a coexistência.**

1. Entrar em [Meta for Developers — aplicativos](https://developers.facebook.com/apps/) com a própria conta e selecionar/criar o aplicativo da AUMM. Não cadastrar cartão nem aceitar plano pago.
2. Conferir a empresa e o número em [WhatsApp Manager](https://business.facebook.com/wa/manage/home/). Precisamos do acesso à empresa correta; nenhum conector Meta está disponível nesta sessão.
3. Conferir no fluxo oficial a elegibilidade de **coexistência** com o aplicativo Business e as exigências de Embedded Signup/conta do desenvolvedor. A [documentação oficial de onboarding do aplicativo Business](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users) retornou limitação de acesso (429); não foi possível confirmar os requisitos atuais nem a elegibilidade deste número. Não supor que o cadastro direto comum mantém o aplicativo.
4. Se não houver coexistência elegível na conta, preservar o número atual. A alternativa é iniciar pelo número de teste fornecido pela Meta e, depois, avaliar um número separado para Cloud API. Migração do número atual exige avaliação e autorização expressa, pois pode interromper seu uso no aplicativo.
5. Confirmar WABA, identificação do número, versão Graph suportada, permissões `whatsapp_business_messaging` e de gestão necessárias à configuração, titularidade e verificações exigidas pela Meta. Para produção, usar token de usuário de sistema com privilégio mínimo e rotação, guardado somente no servidor. Não solicitar token ou senha no chat. O número de teste é restrito aos destinatários autorizados no painel; não é um canal público de produção.

## Configuração do servidor

Manter o `render.yaml` existente, `plan: free`, comandos de build/start e credencial Firebase atuais. Esta mudança não cria serviço, banco, worker pago ou grupo de segredos. Conferir o serviço da AUMM em [Render Dashboard](https://dashboard.render.com/), usando a conta correta. Nunca reutilizar o espaço Streamcord.

Referência de variáveis: `APP-Mobile/backend/.env.whatsapp.example`. O programa não lê esse arquivo automaticamente: inserir as variáveis em Environment/Secret Files do servidor. Não versionar valores reais.

| Variável | Uso |
| --- | --- |
| `WA_ENABLED` | `false` por padrão. `true` habilita recebimento assinado e persistência. |
| `WA_SEND_ENABLED` | `false` por padrão. Só habilitar após validação de custos, conta e piloto autorizado. |
| `WA_APP_SECRET` | Segredo do aplicativo Meta, usado na assinatura dos bytes originais. |
| `WA_VERIFY_TOKEN` | Valor aleatório próprio para a verificação inicial do webhook. |
| `WA_ACCESS_TOKEN` | Token oficial, exclusivamente no servidor. |
| `WA_PHONE_NUMBER_ID` | ID do número, não o telefone escrito. |
| `WA_WABA_ID` | ID da conta WhatsApp Business autorizada. |
| `WA_GRAPH_VERSION` | Versão suportada confirmada no painel; não há versão presumida em produção. |
| `WA_ALLOWED_SENDERS` | No piloto, restringir aos números de teste autorizados, em dígitos E.164 separados por vírgula. Vazio permite usuários do canal público. |

URL pretendida: `https://aumm-notificacoes.onrender.com/webhooks/whatsapp`. Precisa primeiro implantar este código no serviço correto. Configurar essa URL e o verify token na área WhatsApp/Configuration do app Meta; assinar o campo `messages` da WABA correta. GET com `hub.mode=subscribe`, token correto e `hub.challenge` devolve o desafio. POST exige `X-Hub-Signature-256` válido. WABA e phone ID diferentes são ignorados. O webhook não aceita comandos para escolher arbitrariamente destinatários. Não usar tokens na URL além do verify token exigido pela Meta; conferir que o provedor não registra query strings do handshake.

## Orçamento que bloqueia envio

Mesmo com as variáveis habilitadas, sem documento de orçamento o bot não envia. Antes de criar um orçamento, conferir a franquia disponível **no número inteiro**, o período de cobrança e qualquer envio realizado por outras integrações. Uma contagem local não prova saldo gratuito na Meta. Não habilitar sem essa conferência. O limite de 1.000 é apenas teto técnico, nunca autorização para consumir toda a franquia.

Documento privado `whatsappBudgets/PHONE_NUMBER_ID_AAAA-MM`, criado somente por operador autorizado no servidor/console:

```json
{"exclusivePhone": true, "limit": 10, "reserved": 0}
```

Esse exemplo é para um piloto de até dez tentativas, após confirmar pelo menos dez mensagens gratuitas restantes. `exclusivePhone` confirma que todo envio API daquele número está sob este controle; não afirmar isso se houver outro sistema enviando. O sufixo usa mês UTC como identificação operacional; conferir o período real da Meta e reduzir/atrasar a autorização em transições de mês. **Nenhum orçamento é criado ou renovado automaticamente.** Se não for possível conciliar o saldo, manter envio desligado.

Cada tentativa reserva uma unidade atomicamente antes da chamada à Meta; timeout e erro também consomem reserva. Não devolver reservas manualmente sem investigar. Ao acabar/faltar orçamento, o job fica `budget_blocked` e não é reenviado automaticamente. Templates não são implementados, nem dentro nem fora da janela. A resposta só é enviada antes de 23h54 desde a mensagem recebida (margem dentro de 24 horas). Depois disso, o usuário deve iniciar novamente; não há retomada tarifada.

## Atendimento e dados

Menu 1–6 em português: institucional, associação, notícias, informações públicas/benefícios, portal e atendimento humano. Conteúdo institucional conferido no site. Notícias: até cinco documentos de `news` com `status=published`; não promete ordem cronológica. Nenhum benefício privado é lido: as regras atuais restringem `benefits` a associados/admin. O bot encaminha à página pública e ao portal. Não lê cadastros, CPF, senhas, dados financeiros, mensagens privadas ou contas.

O texto livre é reduzido a um comando permitido, nunca persistido ou repassado a IA. O telefone é usado apenas para responder à mensagem recebida/contato humano; não autentica associado. MENU retoma o bot, SAIR/PARAR pausam, e a opção 6 pausa respostas automáticas.

**Atendimento humano nesta versão:** o pedido fica na fila privada, sem envio automático a terceiros ou promessa de horário. Um operador autorizado consulta `whatsappJobs` filtrando `choice=6`/`humanRequested=true` no [Firestore Console](https://console.firebase.google.com/project/aumm-21dda/firestore). Conferir o estado de cada pedido e atender por canal oficial permitido; não tentar enviar pela API fora da janela ou sem franquia. Não há painel de agentes nem alerta externo nesta versão. Se a coexistência estiver confirmada, o aplicativo Business pode ser o canal manual. Caso contrário, usar os canais reais da página de contato. Depois do atendimento, remover o telefone do job. Não tratar uma confirmação do bot como atendimento humano já realizado.

## Fila, falhas e retenção

`whatsappJobs`, `whatsappSessions` e `whatsappBudgets` são privados pelas regras atuais (sem permissão cliente); somente servidor/operador autorizado via IAM. Não abrir regras para viabilizar o bot.

- Jobs identificados pelo SHA-256 do ID da mensagem evitam duplicatas. ACK 200 somente depois de gravar a entrada; falha na persistência retorna 503 para permitir nova entrega. Resposta à Meta é separada do processamento de atendimento.
- O processo consulta até 20 jobs a cada 15 segundos enquanto acordado e habilitado para envio. Consultas vazias também consomem leitura: cerca de 5.760/dia se ativo continuamente, além do trabalho e dos outros módulos. Não usar tráfego artificial para manter o Render acordado.
- Respostas 429 são tentadas novamente após ao menos um minuto, no máximo três tentativas totais, reservando franquia em cada uma. Outros erros e timeouts ficam em `review`, sem repetição automática que possa duplicar envio. Não é possível garantir exatamente uma entrega num timeout entre Meta e servidor.
- `sent` significa aceitação HTTP pela API, não comprovação de entrega ao aparelho. Webhooks de status são reconhecidos, sem disparar respostas; não há conciliação automática de entrega/cobrança nesta versão. Jobs `sending` interrompidos há mais de um minuto ficam `review` na limpeza, sem reenvio.
- Telefone é removido ao terminar, exceto pedido humano ainda necessário. Sessões guardam hash do telefone, pausa e horário, sem nome/perfil. Jobs/sessões com mais de oito dias são excluídos em lotes de até 100 por coleção no início e a cada hora em que o servidor estiver ativo. Sem TTL. Atrasos de limpeza são possíveis durante repouso, suspensão ou acúmulo; operador deve acompanhar. Orçamentos são preservados para auditoria e não renovam saldo.
- Mensagens, cabeçalhos, tokens e conteúdo de respostas da Graph API não são registrados nos logs da aplicação. Conferir também a política de logs de acesso do provedor.

## Validação e operação

```sh
npm --prefix APP-Mobile/backend ci
npm --prefix APP-Mobile/backend run build
node APP-Mobile/tests/whatsapp.mjs
```

Testes usam banco simulado, HTTP local e transporte Meta simulado, sem destinatários reais ou custos. Compilação TypeScript aprovada. Assinatura, deduplicação, janela, isolamento da conta, menus, bloqueio por orçamento e tratamento de resultado ambíguo foram verificados. Isso não substitui teste em Firestore emulado/ambiente de homologação e conversa real.

Para concluir a implantação:

1. Revisar/mesclar o PR e confirmar acesso ao serviço Render da AUMM e plano/cotas/ausência de cobrança automática. Nenhuma implantação foi feita nesta tarefa.
2. Configurar segredos, `WA_ENABLED=true`, `WA_SEND_ENABLED=false` e remetente autorizado no piloto. Conferir revisão do `/health`.
3. Validar GET público pela Meta, rejeição de POST sem assinatura, inscrição `messages` e gravação de uma mensagem enviada pelo usuário autorizado.
4. Confirmar coexistência ou usar número de teste/separado. Conferir franquia real e custo zero para o piloto; criar orçamento conservador e só então habilitar envio.
5. O próprio usuário autorizado inicia a conversa. Testar MENU e opções 1–6, pausa/retomada, links, notícia publicada, pedido humano e ausência de dados privados. Guardar evidências sanitizadas de recebimento e aceitação/entrega, sem telefone ou tokens.
6. Testar reinício, evento duplicado, assinatura inválida e orçamento esgotado em homologação. Medir resposta no primeiro acesso após repouso; confirmar retries atuais na documentação Meta autenticada. Não prometer que o cold start atende ao prazo do webhook.
7. Registrar aqui data/revisão implantada e resultado real. Até lá o projeto está **pendente de ativação e validação ponta a ponta**.

Parada imediata: `WA_SEND_ENABLED=false`. Para interromper também recebimento/armazenamento: `WA_ENABLED=false` e remover a assinatura do app Meta. O endpoint passa a 503 quando desabilitado; desinscrever na Meta evita tentativas inúteis. Preservar o restante do backend. Nunca repetir migrações de contas/senhas para testar este bot.

## Evidências e limites desta entrega

Em 03/11/2026: site público respondeu 200 e texto institucional conferido; `/health` atual respondeu 200 com revisão `f3d7a0d30de14ba6b246c24f331c7643302a067d`; main remota observada `98cd1fe7eb58e89bd74e60117ed84d55deb80342`. Essa revisão do backend não é a nova implementação. Firebase e regras foram consultados sem mudanças em usuários/senhas. O conector GitHub permite escrita; o único espaço visível no conector Render é Streamcord, explicitamente excluído pelo responsável. Meta não foi autenticada, número não alterado, API de mensagens não foi chamada e cobrança não foi ativada.
