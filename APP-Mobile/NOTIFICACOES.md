# Notificações AUMM

## O que o aplicativo faz

O sino abre uma central com contador, avisos não lidos, histórico, marcação de leitura e preferências. Avisos novos aparecem em um cartão no topo e levam à notícia, ao comunicado ou à aba de apoio.

Eventos implementados:

- Notícia publicada pela primeira vez; editar uma notícia publicada não gera outro aviso.
- Comunicado publicado para todos/associados, somente para associados ativos.
- Pedido enviado, para o solicitante.
- Novo pedido na cidade escolhida, para associados ativos que aceitaram esse tipo de alerta; o próprio solicitante não recebe o chamado de voluntário.
- Ajuda aceita, para quem pediu apoio.
- Conclusão e cancelamento, para os participantes.

Posições do GPS não geram notificações. Não se enviam coordenadas, CPF, documentos ou observações privadas em push. Identificadores estáveis permitem juntar o aviso recebido pelo app e o aviso do servidor sem duplicá-los. Cada pedido novo tem uma geração própria, mesmo quando reutiliza o ID do solicitante.

## Dois modos de funcionamento

**Com o app aberto:** os listeners Firestore atualizam os avisos diretamente e salvam um histórico local separado por conta. A primeira carga de notícias antigas não dispara uma sequência de alertas. Não precisa publicar Functions para usar esses avisos, mas os fluxos de apoio e a sincronização das preferências dependem das regras completas da raiz.

**App fechado/segundo plano:** o código de Firebase Messaging e o servidor estão implementados, mas precisam ser ativados no projeto Firebase da associação. Esta entrega não contém `google-services.json` e não publica Functions nem muda faturamento. O APK continua funcionando com os avisos dentro do app enquanto o push não estiver configurado.

O Android controla a entrega final: permissão negada, restrição de bateria, ausência de rede e interrupção forçada do app podem impedir ou atrasar um push. Não é um serviço de emergência nem um despacho garantido.

## Ativar push Android

1. No mesmo projeto Firebase do site, registre um aplicativo Android com pacote **br.com.aumm.app**.
2. Baixe o `google-services.json` desse aplicativo e coloque em `APP-Mobile/android/app/google-services.json`. O arquivo foi incluído no `.gitignore`. Não use uma conta de serviço ou chave administrativa no Android.
3. Em `APP-Mobile/.env.local`, defina `VITE_PUSH_CONFIGURED=true`. Essa opção só deve ser ativada com o arquivo Android do projeto correto.
4. Recompile com `Gerar-Android.cmd` ou `npm run android:build` e instale o APK atualizado. No sino, abra Preferências e toque em **Ativar notificações no Android**. O pedido de permissão é voluntário, sem popup obrigatório no primeiro acesso.
5. Publique as regras completas da raiz AUMM: elas protegem preferências, tokens e a caixa de avisos.
6. Prepare o servidor abaixo. Teste em aparelho físico: app aberto, segundo plano e encerrado normalmente, notícias, chamado na cidade, aceite, cancelamento e conclusão. Testes de navegador não comprovam entrega pelo sistema Android.

## Servidor de notificações

`backend/` é um codebase independente **aumm-mobile**, separado das Functions legadas da raiz. Requer o plano [Blaze para publicar Cloud Functions](https://firebase.google.com/docs/functions/get-started). Não foi feita mudança de plano nem publicação nesta entrega.

Na pasta `APP-Mobile`:

```powershell
npm --prefix backend ci
npm --prefix backend run build
npx firebase-tools deploy --config firebase.notifications.json --only functions:aumm-mobile --project SEU_PROJECT_ID
```

O `predeploy` compila o backend e o módulo compartilhado em `backend/lib/`, que segue no pacote enviado. `gcp-build` vazio evita recompilar fontes externas ao codebase durante o build remoto.

As Functions exportadas são `mobileNewsPublished`, `mobileCommunicationPublished`, `mobileSupportChanged` e `mobileDeliverPush`. As três primeiras criam avisos com IDs determinísticos em `mobileInbox/{uid}/items/{id}`; a última envia as mensagens aos aparelhos desse usuário.

O envio confere novamente vínculo, preferências e estado atual do pedido. Um aceite obsoleto não é enviado se o atendimento já acabou. Tokens inválidos são removidos. Falhas temporárias fazem o evento ser tentado novamente; o mesmo ID é usado como tag do Android para substituir o aviso na bandeja. Como Firestore/FCM podem repetir eventos, não se promete entrega exatamente uma vez em situações de interrupção entre envio e confirmação.

O FCM precisa estar disponível no projeto e a conta de serviço de execução deve ter permissão para enviar mensagens do Firebase Messaging. Use a identidade de execução do Google Cloud; não inclua chaves privadas em código ou no APK.

## Dados e privacidade

- `mobileSubscriptions/{uid}`: preferências e cidade escolhida. A escolha não depende do GPS.
- `mobilePushDevices/{uid}/devices/{deviceId}`: token deste aparelho e estado de ativação. Apenas o próprio usuário lê/escreve; outros associados não conseguem listar tokens.
- `mobileInbox/{uid}/items/{id}`: só o servidor cria. O usuário só pode ler, apagar ou marcar como lido; não pode falsificar título, destinatário ou conteúdo.

Ao trocar de conta ou sair, o aparelho é desvinculado antes da mudança de autenticação. Os canais Android separam notícias, chamados na cidade, meu atendimento e comunicados. Notícias/comunicados têm importância normal; apoio usa canal de maior importância, respeitando as escolhas do usuário e do Android.

O histórico local mantém até 100 avisos por conta. A caixa do servidor pode ser mantida como histórico, com expiração lógica de 14 dias para publicações e 7 dias para atendimentos. Documentos expirados são filtrados pelo app; a exclusão física no servidor precisa de política administrativa/rotina própria e não acontece por um campo numérico de expiração.

## Validação

- `tests/notifications.test.mjs`: transições, destinatários, preferências, IDs e payload sem dados privados.
- `tests/security.rules.mjs`: isolamento de tokens/preferências e impedimento de avisos forjados.
- `tests/notifications-backend.mjs`: executa os handlers reais contra o emulador, verificando destinatários, idempotência, edição sem novo alerta e bloqueio de push obsoleto. Não envia mensagens FCM reais.
- `tests/notifications-ui.mjs`: dois navegadores com Auth/Firestore locais, notícias, pedido, aceite, cancelamento, leitura, preferências e navegação.

Os testes de integração exigem Auth/Firestore em `9099`/`8080` e a prévia Vite em modo `emulator` na porta `5175`. Use somente o projeto isolado `demo-aumm-mobile`.

### Confirmação de disponibilidade

O aviso de aceite agora pede que o solicitante confirme em até cinco minutos. A confirmação avisa os dois e libera o atendimento. O backend inclui `mobileExpireConfirmations` (agendador) e `mobileCleanupSupportChat` (limpeza da conversa). Publique essas funções junto do codebase `aumm-mobile`. O agendador segue o mecanismo oficial de [funções agendadas do Firebase](https://firebase.google.com/docs/functions/schedule-functions). Nada foi publicado nesta entrega. Mensagens de chat atualizam em tempo real dentro da tela; não há push para cada mensagem de chat.