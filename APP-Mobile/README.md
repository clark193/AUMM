# AUMM · Aplicativo Android

Aplicativo com interface própria para celular, em React + TypeScript + Capacitor 8. O site continua separado. No Windows, `APP` e `app` apontam para a mesma pasta; por isso o projeto móvel está em **APP-Mobile**.

## O que está implementado

- Início com atalhos, últimas notícias reais e acesso de convidado.
- Notícias integradas à coleção `news` do site, leitura dentro do app, busca, categorias e favoritos locais.
- Login com a mesma conta Firebase do site, vínculo ativo e troca obrigatória da senha inicial.
- Centro de Apoio com solicitação por gasolina, pneu, pane ou outro apoio, cidade, bairro, observações e consentimento para localização.
- Um pedido ativo por identidade. Convidados autenticam anonimamente ao enviar um pedido; não precisam preencher cadastro.
- Mural para associados ativos, aceite por transação, proteção contra dois ajudantes aceitarem simultaneamente, acompanhamento em tempo real com app aberto e links para Google Maps/Waze.
- Localização exata e detalhes fora do mural. Somente solicitante e associado que aceitou podem ler. São removidos atomicamente ao concluir/cancelar e ficam inacessíveis após a expiração de 24h. A expiração não implica exclusão física automática de documentos abandonados; configure limpeza administrativa se necessário.
- Busca de postos, oficinas, locais para pausa e água pelo Google Maps. Os resultados não são parceiros certificados nem garantem disponibilidade.
- Calculadora de combustível/ganho líquido, checklist persistente e agenda de manutenção local.
- Compartilhamento nativo da localização e chamadas telefônicas de emergência.
- Carteirinha com QR de verificação e validade existentes, benefícios, comunicados, documentos, eventos e transparência conectados ao Firebase.
- Portal existente para filiação, emissão/renovação de carteirinha e assembleias/votações. Esses fluxos abrem no navegador seguro e solicitam login próprio; não há transferência de senha/token entre app e navegador.
- Botão voltar Android, permissões de GPS sob demanda e adaptação a áreas seguras e telas estreitas.
- Central de notificações com contador, histórico, leitura, preferências e avisos de notícias, comunicados e etapas do apoio. Backend de push Android preparado em um codebase separado; veja [NOTIFICACOES.md](NOTIFICACOES.md) para ativação.

Nenhum associado, notícia, pedido de ajuda ou parceiro fictício é inserido no banco. A calculadora inicia com valores de exemplo editáveis. Não há cobrança ou despacho garantido de assistência.

## Executar e visualizar

Requisitos: Node 22.13+ e npm. Para compilar Android: JDK 21 e SDK Android 36. A configuração de referência é a documentação oficial do [Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).

```powershell
cd APP-Mobile
npm ci
Copy-Item .env.example .env.local
# Preencha VITE_FIREBASE_* com a configuração pública do mesmo projeto usado no site.
npm run dev
```

Abra **http://127.0.0.1:5174** no computador. A interface se adapta ao navegador e ao Android. Para testar GPS fora do localhost, use HTTPS ou um dispositivo Android; HTTP pela rede local não oferece contexto seguro para a API web de geolocalização.

Neste computador, **Abrir-APP.cmd** abre a prévia usando o Node portátil preparado durante a entrega. **Gerar-Android.cmd** recompila e atualiza os binários em `artifacts/`. Os scripts não alteram a configuração global do Windows.

A prévia interativa em moldura de celular está em **http://127.0.0.1:5174/preview-celular.html**. Ela usa o próprio aplicativo em uma tela de 390px; você pode tocar nos controles, rolar e testar os fluxos. Consulte `artifacts/VALIDACAO.md` para o resultado dos testes e as pendências de produção.

```powershell
npm run build
npm test
npm run test:rules
npm run android:sync
npm run android:open
```

`dist/` contém o frontend compilado. `android/` é o projeto Android real. `artifacts/` reúne capturas e os binários gerados nesta entrega, quando disponíveis.

## Ativar os serviços reais

1. Use os mesmos valores públicos de Firebase do site em `.env.local`. Não copie contas de serviço, credenciais administrativas ou arquivos de assinatura para o app.
2. No Firebase Authentication, habilite e-mail/senha e autenticação anônima. Preserve os cadastros de associados existentes em `associados/{uid}` com `uid`, `status: active` e senha inicial já trocada.
3. Publique **as regras completas da raiz do site**, que agora incluem `supportRequests`. Não substitua as regras do site por um arquivo parcial. O comando abaixo publica somente regras e índices, sem alterar a hospedagem:

   ```powershell
   # Na raiz AUMM, usando sua conta Firebase autorizada:
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

4. Se o projeto exigir App Check para Firestore, será necessária integração de atestação compatível com Android antes da produção. O reCAPTCHA do site não é automaticamente compartilhado com o aplicativo.
5. Valide em dois aparelhos reais: pedido por convidado, visualização por associado ativo, aceite, rota e conclusão. Permissões, GPS, navegador instalado e chamadas dependem do aparelho.

**As regras não são publicadas automaticamente pela build.** Sem ativá-las, o Centro de Apoio apresenta erro de autorização em vez de simular envio. Os avisos dentro do app atualizam enquanto ele está aberto. O push Android foi implementado, mas precisa do aplicativo Android registrado no Firebase e do backend de envio publicado; não está ativado automaticamente. A manutenção local não agenda alarmes de sistema.

## Dados e autorização

`supportRequests/{uid}` guarda somente: proprietário, ajudante, categoria, cidade, região, estado e datas. `supportRequests/{uid}/private/location` guarda coordenadas, precisão e observações.

Estados: `open → accepted → resolved`, ou cancelamento pelo solicitante. Solicitante também pode encerrar um pedido aberto. O encerramento exige um lote atômico que apaga o documento de localização. Aceite exige associado ativo, senha inicial trocada e pedido ainda válido. Coordenadas não podem ser alteradas depois do envio.

Para preservar um pedido de convidado, o app bloqueia saída e login em outra conta enquanto esse pedido estiver aberto. Ao sair, checklist, agenda local e favoritos são removidos do aparelho. Dados privados de associados não são persistidos em Firestore offline; usa-se o cache padrão em memória.

## Google Play

O projeto usa o identificador `br.com.aumm.app`, `versionCode 1` e `versionName 1.0.0`. Confirme que o identificador está disponível e pertence à associação antes da primeira publicação.

- APK de depuração: serve para instalação e avaliação; não é o arquivo de publicação.
- Bundle release sem assinatura: gerado para preparar a entrega; precisa da chave de upload da associação.
- Em Android Studio, use **Build → Generate Signed App Bundle / APK → Android App Bundle**, escolha/crie e guarde a chave de upload fora do repositório. A assinatura e o [Play App Signing](https://developer.android.com/studio/publish/app-signing) ficam sob controle do responsável pela conta.
- Antes de enviar, revise nome/ícone, capturas, classificação, testes exigidos pela conta, política de privacidade e formulário de segurança dos dados. Informe o uso de localização precisa somente ao pedir/compartilhar e o compartilhamento com o voluntário que aceitar.
- O app oferece acesso a canais de atendimento para solicitar exclusão. Antes da publicação, disponibilize também um endereço web público específico para solicitação de exclusão e confira se o processo atende à [política de exclusão de contas do Google Play](https://support.google.com/googleplay/android-developer/answer/13327111). Não existe exclusão administrativa automática de todos os dados nesta versão.
- Revise suporte a App Check, retenção de pedidos abandonados, moderação/denúncias e notificações push antes de operar a rede em escala.

Nenhuma publicação na Play Store, deploy de regras ou alteração de dados de produção é feita pelos comandos de build.

## Testes

`npm test`: cálculo de custos/ganho e coordenadas dos links de navegação.

`npm run test:rules`: emulador Firestore isolado `demo-aumm-mobile`. Verifica privacidade, convidado, associado inativo, senha inicial, aceite concorrente, encerramento atômico, expiração e tentativa de vazamento de coordenadas. Não usa os dados de produção.

## Mapa e acompanhamento do ajudante

O pedido agora mostra um mapa interativo desde a confirmação da localização. Após o aceite, o associado pode tocar em **Compartilhar meu trajeto**. O solicitante passa a ver os dois pontos, a idade da última atualização e a distância em linha reta. Não é uma rota de trânsito nem uma previsão de chegada.

Usamos [MapLibre GL JS](https://maplibre.org/) e [OpenFreeMap](https://openfreemap.org/quick_start/), com dados do OpenStreetMap e atribuição visível. O serviço público do OpenFreeMap não exige chave de API. O mapa precisa de internet e WebGL no navegador/WebView. O estilo pode ser configurado em `VITE_MAP_STYLE_URL`. A sincronização das posições usa o Firestore existente e consome sua cota; mapa sem chave não significa banco de dados ilimitado.

A posição do ajudante fica em `supportRequests/{uid}/private/helperPosition`, acessível somente aos participantes. Só o associado que aceitou pode escrever. As regras recusam coordenadas inválidas, identidade de outro usuário e datas de atualização forjadas. Ao concluir/cancelar, as localizações do solicitante e do ajudante precisam ser apagadas no mesmo lote.

**O compartilhamento é opcional e funciona com a tela de apoio aberta.** Sair dessa tela, colocar o app em segundo plano ou abrir Waze/Google Maps pausa o envio. O ajudante precisa ativar novamente ao retornar. Não há rastreamento em segundo plano nesta versão. O botão **Parar de compartilhar** interrompe o GPS e remove o ponto. Se a conexão cair antes da remoção, a última posição é sinalizada como desatualizada após 45 segundos, sem simular movimento.

As amostras são limitadas a uma gravação a cada 10 segundos, com nova publicação após deslocamento de 15 metros ou 30 segundos quando o GPS continuar emitindo amostras. Apenas a posição mais recente é mantida; não há histórico de trajeto. O provedor de mapas recebe requisições da área visualizada para renderizar o mapa.

Republique as regras completas da raiz para ativar esse recurso no Firebase real. Não houve deploy automático. Os 13 testes de regras e os testes geográficos podem ser rodados sem dados de produção. `tests/tracking-ui.mjs` exercita dois navegadores com GPS simulado nos emuladores de Auth (9099) e Firestore (8080), com Vite em modo `emulator` na porta 5175. Nunca use esse modo na build da loja.

Na prévia local em `preview-celular.html`, os pedidos de apoio são demonstrações isoladas: use o ponto fictício e o botão Simular alguém aceitando ajudar para ver o fluxo. Não solicita GPS nem envia pedidos reais. A simulação exige servidor de desenvolvimento local e `?preview=1`; não funciona no APK ou em produção.

## Atendimento de apoio

O início exibe cartões de apoio em andamento para o solicitante e para quem aceitou ajudar. O aceite grava, na mesma transação, uma identificação mínima validada pelas regras com o cadastro: nome e matrícula do associado. Esses dados ficam em `supportRequests/{id}/private/helperProfile`, acessíveis somente aos participantes durante o atendimento, sem abrir leitura de cadastros completos.

Após o aceite, os dois podem ativar a própria localização na tela de apoio: `private/helperPosition` e `private/requesterPosition`. Cada pessoa só escreve sua posição, com identidade e horário verificados pelas regras. O ponto inicial e as observações permanecem imutáveis em `private/location`. O mapa acompanha as duas posições, informa precisão, idade do sinal e distância em linha reta. Rotas para o solicitante usam a última posição compartilhada, ou o ponto inicial quando o compartilhamento não está ativo.

O envio exige a tela de atendimento aberta e pausa ao sair, abrir outro aplicativo ou entrar em segundo plano. Não há rastreamento em segundo plano. Cada envio é limitado por tempo/movimento, sem histórico de trajeto. Ao concluir ou cancelar, a transação apaga as duas posições, o ponto inicial e a identificação privada; as regras bloqueiam um encerramento incompleto e novos envios. As regras da raiz precisam ser publicadas no Firebase real antes de usar o fluxo público atualizado.

A prévia simula a identificação e o movimento dos dois, sem GPS ou escrita remota. A simulação não acompanha aparelhos reais.
## Confirmação, placa e conversa privada

O formulário exige uma placa antiga ou Mercosul, normalizada sem hífen. Ela fica em `private/location`, não vai para o mural nem para notificações push. O aceite passa o pedido para `awaiting_confirmation`; somente a identificação mínima do associado é liberada nessa fase. O solicitante tem até cinco minutos, contados pelo `acceptedAt` do servidor, para confirmar que ainda precisa. Só ele pode confirmar. Antes disso, o ajudante não lê placa/coordenadas e ninguém envia GPS ou mensagens.

Ao confirmar, o pedido passa para `accepted`. O atendimento tem tela própria com abas Mapa e encontro e Chat. O cartão fixo acima da navegação retorna ao atendimento de qualquer aba. Trocar para Chat mantém o GPS já ativado dentro da tela de atendimento; sair dela continua pausando o compartilhamento.

As mensagens ficam em `supportRequests/{id}/chats/{chatId}/messages/{messageId}`. Cada pedido recebe um `chatId` novo: conversas antigas nunca aparecem em pedidos reutilizados. Regras verificam participação, confirmação, validade do pedido, remetente, tamanho do texto e horário do servidor. São carregadas as últimas 100 mensagens. O acesso é bloqueado ao encerrar. `mobileCleanupSupportChat` remove as mensagens após o encerramento quando o backend estiver publicado. Existe um campo timestamp de expiração de sete dias, mas não se promete exclusão física por TTL sem configurar a política no Firebase.

`mobileExpireConfirmations` verifica confirmações vencidas a cada minuto e remove o ponto inicial, as posições e a identificação privada ao cancelar. A tela aberta também tenta encerrar no prazo. A confirmação fica bloqueada pelas regras depois do prazo, mesmo sem a função publicada. Para cancelamento automático com os aplicativos fechados, é necessário publicar essa função no projeto real.

Duas prévias locais, isoladas dos pedidos reais:

- Solicitante: `http://127.0.0.1:5174/preview-celular.html`
- Associado: `http://127.0.0.1:5174/preview-celular.html?role=helper`

A prévia do associado já contém um pedido fictício. Aceite, use Simular confirmação do solicitante e teste o mapa e o chat. As respostas do chat e posições são simuladas. Não há GPS nem escrita Firestore nesse modo.
### Abrir o GPS do celular

O atendimento tem uma única ação, Abrir localização no GPS. No Android, o plugin local NavigationChooser usa o seletor nativo de aplicativos para mostrar o ponto em apps compatíveis com geo; inclui o Waze por deep link quando necessário, sem duplicar a opção. O destino é a última posição compartilhada ou o ponto inicial, conforme o estado exibido na tela. Sem app compatível, usa a rota web. Na prévia de navegador, o botão mostra um aviso: o seletor do sistema só existe no Android.

O campo do chat usa colunas independentes, com botão de envio de 44px e área de texto com largura disponível. Barras de rolagem e alças de redimensionamento ficam ocultas; rolagem por toque permanece disponível. A WebView Android também desativa barras e efeito de overscroll.

Referências técnicas: [seletor de intents Android](https://developer.android.com/guide/components/intents-filters), [plugins locais Capacitor](https://capacitorjs.com/docs/android/custom-code), [deep links Waze](https://developers.google.com/waze/deeplinks).
## Atualização de administração, cadastro e localização

- O app usa vermelho e branco e inclui `portal.html`, empacotado no próprio APK. O portal reutiliza os módulos de administração do site, com a mesma conta e as mesmas regras. Não depende de abrir o site para gerenciar a associação.
- Em Meu perfil → Acesso administrativo, entre com a conta administrativa. O menu exibe os módulos do nível autorizado.
- Cadastro/filiação, estatuto e consulta do pedido funcionam dentro do app. A aprovação continua seguindo o processo administrativo da associação. O formulário é preservado ao consultar o estatuto.
- Na lista de associados, Abrir cadastro → Administração da conta disponibiliza troca de senha temporária e exclusão somente ao nível 1 ativo. A função `manageMemberAccount` consulta `adminRoles` a cada chamada, protege contas administrativas e registra auditoria sem senhas. A exclusão cancela apoios, revoga links ao vivo, remove login e perfil, mantendo registros institucionais.
- Em Utilidades ou Meu perfil → Compartilhar localização ao vivo, o usuário aceita o compartilhamento e envia um link de até 55 minutos. A posição pública não inclui nome, UID, placa, CPF ou histórico. Somente quem tem o link pode consultar uma posição; listagens são bloqueadas. O link é revogado ao encerrar/fechar a tela. O envio pausa ao bloquear a tela ou colocar o app em segundo plano; o destinatário vê o último sinal e sua idade. Isso não é rastreamento em segundo plano.
- A página pública do site fica em `/acompanhar/#TOKEN`. O token fica no fragmento da URL. A posição exige amostra recente, e o mapa sinaliza falta de sinal após 45 segundos.

Instale também as dependências da raiz (`npm install`) antes das dependências do APP-Mobile: o painel e o cadastro compartilham os componentes existentes do site. Não altere os aliases de Next definidos no Vite; eles adaptam a navegação para as telas locais do aplicativo.

### Publicação

O site de produção usa GitHub Pages (`clark193/AUMM`, branch `gh-pages`, domínio `aumm.com.br`). `npm run build:firebase` continua sendo o nome do comando de exportação estática; o resultado em `out/` pode ser servido pelo GitHub Pages. `npm run preview:network`, na raiz, expõe esse resultado na porta 3000 da rede local.

A função administrativa e as regras são uma publicação separada no Firebase `aumm-21dda`. Após autenticar o CLI, compile `functions` e publique apenas `functions:manageMemberAccount,firestore:rules`. Não publique Hosting do Firebase para esta atualização. A publicação de funções depende das condições e permissões do projeto Firebase; não habilitamos faturamento automaticamente. O push Android continua exigindo a configuração descrita em NOTIFICACOES.md.

As regras completas atualizadas para copiar estão em `artifacts/FIREBASE-REGRAS-COMPLETAS.txt`.