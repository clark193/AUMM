# AUMM — atendimento por QR code (não oficial)

O responsável mudou expressamente o projeto para uma integração não oficial em 03/11/2026, aceitando os riscos. O modo Cloud API anterior foi preservado e fica desligado. Não rodar os dois modos no mesmo número ao mesmo tempo.

## Estado verificado

- QR exibido somente em painel local e escaneado pelo responsável no aplicativo Business; conta com final 4104 conectada.
- Sessão criptografada restaurada depois de uma parada/reinício, sem novo QR.
- Uma mensagem MENU de outro celular gerou resposta com seis opções; o responsável confirmou recebimento e o painel registrou uma resposta aceita e zero pendências.
- Sete testes do modo QR e os sete testes anteriores passaram. Testes do banco usam simulação, não emulador Firestore. O teste real acima usou WhatsApp e Firestore de produção, sem alterar usuários ou senhas.
- **Funciona neste computador enquanto o processo estiver ativo. Não foi implantado na nuvem.** Não existe inicialização automática no Windows configurada por esta tarefa.

## Arquitetura

Baileys `7.0.0-rc14`, versão fixada e lockfile. A [documentação do projeto](https://github.com/WhiskeySockets/Baileys) informa que a biblioteca usa o protocolo do WhatsApp Web/aparelhos conectados e não é afiliada à Meta. É uma versão de pré-lançamento, que exige acompanhamento de mudanças. Não há garantia contra bloqueios ou desconexões.

Reutiliza o menu programado de `APP-Mobile/backend/src/whatsapp.ts`: institucional, associação, notícias publicadas, benefícios/informações públicas, portal e atendimento humano. Sem IA, templates ou campanhas. Não usa Graph API ou franquia de mensagens Meta. Continuam existindo limites/custos possíveis da hospedagem e Firestore; nenhuma cobrança foi habilitada.

Grupos, status, canais, mensagens próprias, histórico, mídia e conteúdo encapsulado são ignorados. Responde somente a mensagens de texto novas, posteriores ao início do processo e com até cinco minutos. Texto livre é reduzido a MENU ou comando 1–6/SAIR/PARAR, sem persistir CPF, senha ou conteúdo livre. Não usa telefone como autenticação. Notícias são limitadas a publicadas; benefícios privados não são lidos. Pedidos humanos pausam respostas até MENU e ficam na coleção privada `whatsappQrJobs`; o operador atende pelo aplicativo Business, sem promessa de horário.

O módulo é separado do backend administrativo. Quando habilitado no servidor existente, preserva seus endpoints e notificações. O processo QR standalone serve apenas `/health` na nuvem; o QR não tem endpoint público.

## Sessão e segurança

As credenciais e chaves do aparelho vinculado são salvas **criptografadas com AES-256-GCM** em `whatsappQrAuth`, com contexto autenticado e IV aleatório. Os IDs de documentos não contêm telefone ou nomes de chaves. `whatsappQrControl` limita a uma instância, com renovação de 60 em 60 segundos e validade de três minutos; gravações e envios verificam a posse do controle. Ao mover o bot, parar a instância anterior primeiro.

`WA_QR_SESSION_KEY` é uma chave mestre de 32 bytes em base64, mantida no armazenamento seguro do servidor. Localmente foi criada fora do repositório em um diretório protegido por permissões Windows somente para usuário atual/SYSTEM. Não está no frontend, pacote, GitHub ou logs. Perder/trocar essa chave impede ler a sessão; exige revogar o aparelho e parear novamente. Não copiar credenciais do Firebase CLI para a nuvem.

Coleções privadas pelas regras atuais: `whatsappQrAuth`, `whatsappQrControl`, `whatsappQrJobs`, `whatsappQrChats`, `whatsappQrLimits`. Não abrir leitura ao frontend. A conta de serviço do backend precisa dos acessos Firestore já existentes. O papel mínimo e os acessos de operadores devem ser revistos na hospedagem; não compartilhar a chave administrativa.

O painel de pareamento é exclusivo de `127.0.0.1`, com Host fixo, cookie HttpOnly/SameSite, proteção de origem, bloqueio de iframe e sem cache. Não encaminhar a porta por túnel ou proxy público. O QR funciona como credencial: não enviar screenshot/código no chat nem publicar em repositórios.

Logs de protocolo/console são silenciados enquanto o módulo está ativo para evitar vazamento de chaves; o backend expõe apenas o estado sanitizado no cabeçalho `X-AUMM-WhatsApp-State` de `/health`. Essa opção também silencia logs genéricos via console do processo compartilhado. O estado do processo não prova entrega das mensagens; `accepted` significa aceitação pelo transporte. Nesta tarefa o recebimento real foi confirmado pelo responsável.

## Limites e falhas

Por padrão, ambas as opções `WA_QR_ENABLED` e `WA_QR_SEND_ENABLED` ficam desligadas. O piloto local em execução foi habilitado para respostas a novos contatos diretos, com teto de **50 respostas/dia UTC**. Esse teto limita automação; não é cota comercial gratuita. Máximo configurável: 500/dia. Sem envio em lote ou endpoint para escolher destinatários. Há intervalo mínimo de 1,5 segundo por conversa.

Deduplicação persistente antes de enviar, limite diário transacional e fila em memória de até 100 eventos. Falhas/timeout ficam em `review` e não são reenviados automaticamente, pois podem ter chegado ao destinatário. Um `sending` deixado por encerramento abrupto exige revisão e não é reexecutado. Eventos ignorados ou perdidos por desconexão não garantem recuperação; este não é um serviço de entrega garantida.

SAIR/PARAR e opção 6 pausam o chat. MENU retoma. Um administrador que passar a atender manualmente também deve orientar a pessoa a usar a opção 6, pois não se deduz automaticamente que uma mensagem enviada pelo app é atendimento humano.

Jobs, pausas e limites antigos são excluídos após oito dias, em lotes de até 100 por coleção a cada hora em que o processo está ativo. A sessão criptografada não expira automaticamente, pois é necessária para reconectar. Ao desativar definitivamente, revogar o aparelho em WhatsApp Business → Aparelhos conectados e solicitar limpeza dos documentos dessa sessão. O botão Parar encerra o processo local e libera o controle, mas não revoga o aparelho vinculado.

## Executar localmente

Requer Node 22.12+ e o Firebase CLI já autorizado em `APP-Mobile`. Não exige senha no chat. Compilar o backend para reutilizar o menu:

```sh
npm --prefix APP-Mobile/backend ci
npm --prefix APP-Mobile/backend run build
npm --prefix APP-Mobile/whatsapp-qr ci
```

Configurar no ambiente local (não em arquivos públicos): `WA_QR_ENABLED=true`, `WA_ENABLED=false`, `WA_QR_KEY_FILE` apontando para o arquivo de chave protegido. Iniciar com `node APP-Mobile/whatsapp-qr/scripts/local.mjs`. Abrir `http://127.0.0.1:8799/` e escanear no aplicativo Business → Aparelhos conectados → Conectar um aparelho. Por padrão nenhuma resposta é enviada.

Para piloto restrito: `WA_QR_SEND_ENABLED=true`, `WA_QR_ALLOWED_JIDS` com remetentes autorizados separados por vírgula. IDs pessoais podem ter sufixo `@s.whatsapp.net` ou `@lid`; não presumir que um número de telefone resolve um LID. Para atendimento a qualquer nova mensagem direta recebida: `WA_QR_PUBLIC=true` junto do envio habilitado. Reiniciar o processo após alterar variáveis. Nunca remover o registro da conta no aplicativo.

```sh
node --test APP-Mobile/whatsapp-qr/tests/qr.test.mjs
node APP-Mobile/tests/whatsapp.mjs
```

## Nuvem: ainda pendente

O código pode ser incorporado ao **mesmo serviço `aumm-notificacoes`**, sem contratar outro serviço. `render.yaml` acrescenta a instalação das dependências QR, mantendo `plan: free` e start atual. O backend carrega o transporte somente com `WA_QR_ENABLED=true`. Nenhum segredo está no Blueprint.

O conector Render continua mostrando somente Streamcord, espaço que o responsável excluiu por não ser da AUMM. Não foi modificado. É necessário entrar em [Render Dashboard](https://dashboard.render.com/) com a conta que contém o serviço da associação, antes de implantar.

**O Render Free não atende funcionamento contínuo deste bot.** Ele [repousa após 15 minutos sem requisições HTTP recebidas](https://render.com/docs/free), leva cerca de um minuto para iniciar, tem 750 horas compartilhadas/mês e disco temporário. A conexão QR é um WebSocket iniciado pelo bot para WhatsApp; quando o Render dorme, ela cai. Uma mensagem no WhatsApp não é um webhook HTTP para o Render e não acorda o serviço por si só. Preservar sessão não significa preservar disponibilidade. Não foi implementado tráfego artificial para mantê-lo acordado.

Plano Hobby: 5 GB de saída e 500 minutos de build/mês, conforme documentação consultada em 03/11/2026. Com pagamento cadastrado pode haver cobrança por excessos; sem pagamento pode haver suspensão/impedimento de builds. Antes de implantar, conferir plano, cotas e configuração de cobrança na conta correta. Não ativar plano pago sem autorização.

Firestore Spark continua sem cobrança e com cotas compartilhadas com site/aplicativo. A renovação de controle custa cerca de 1.440 gravações e leituras/dia quando continuamente ativo, além das chaves do protocolo, consultas e atendimento. Tráfego alto no número também pode consumir cotas de criptografia mesmo quando o bot não responde. Sem TTL pago. O projeto não mede nem garante saldo de cota disponível.

Para nuvem contínua é preciso um servidor já disponível que mantenha o processo Node ativo ou uma hospedagem adequada, possivelmente paga. Não foi encontrada/provisionada nesta tarefa uma opção sem custo que cumpra continuidade garantida. Até resolver a hospedagem, o bot continua local e para se este computador/processo parar.

Passos de transferência, depois do acesso e da verificação de custos:

1. Parar a instância local pelo painel; não revogar o aparelho se a intenção é restaurar na nuvem.
2. Na hospedagem correta, manter a credencial Firebase já protegida e configurar as variáveis de `qr.env.example`. Inserir a **mesma chave mestre** somente no campo secreto `WA_QR_SESSION_KEY`, nunca no chat, código, log ou frontend. Essa etapa ainda não foi executada.
3. Desligar `WA_ENABLED`/`WA_SEND_ENABLED`; habilitar QR e inicialmente manter respostas desligadas. Implantar a branch revisada. Verificar `/health`, revisão e `X-AUMM-WhatsApp-State=connected`.
4. Ativar respostas com limite conservador. Fazer nova conversa real autorizada e testar menu, notícias, pedido humano, pausa/retomada e reinício na própria hospedagem. Teste local não comprova nuvem.
5. Monitorar disponibilidade e cotas; documentar a revisão e o resultado. Não declarar a hospedagem concluída antes disso.

## Referência de arquivos

- `src/store.mjs`: criptografia, posse exclusiva e armazenamento de autenticação.
- `src/engine.mjs`: filtros, deduplicação, pausa, limite e retenção.
- `src/transport.mjs`: conexão Baileys, reconexão e envio.
- `src/panel.mjs`: pareamento privado local.
- `src/server.mjs`: execução standalone ou incorporada ao backend.
- `scripts/local.mjs`: inicialização local com sessão Firebase CLI existente.
- `qr.env.example`: configuração sem valores reais.

O `read.me` registra a mudança de direção. O modo oficial e sua documentação foram preservados para eventual retorno.
