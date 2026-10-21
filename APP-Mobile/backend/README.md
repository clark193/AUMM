# Notificações em servidor externo

O mesmo processamento usado nas Cloud Functions também pode rodar como um serviço Node 22, sem ativar Blaze. `src/server.ts` acompanha as fontes no Firestore e executa os handlers de `src/index.ts`. Não publique ambos os backends ao mesmo tempo.

`render.yaml`, na raiz do repositório, configura uma instância **free**. No Render, o serviço gratuito pode repousar após 15 minutos sem requisições e levar cerca de um minuto para acordar. As horas gratuitas são compartilhadas pelos serviços do workspace. Não há garantia de entrega imediata nem substituição de socorro de emergência.

## Configuração

1. Cadastre o Android `br.com.aumm.app` no Firebase e baixe `google-services.json` para `APP-Mobile/android/app/`. O arquivo é ignorado pelo Git. O build habilita registro FCM quando esse arquivo existe, salvo `VITE_PUSH_CONFIGURED=false`.
2. Use uma conta de serviço própria para o servidor, com `roles/datastore.user` e `roles/firebasecloudmessaging.admin`. Ative a API FCM. Nunca coloque a chave no site, APK, GitHub, chat ou logs.
3. No Render, mantenha `plan: free`. Forneça a credencial por `FIREBASE_SERVICE_ACCOUNT` (secret do Blueprint) ou arquivo secreto `aumm-service-account.json` com `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/aumm-service-account.json`. Defina `GOOGLE_CLOUD_PROJECT=aumm-21dda` e `AUMM_EXTERNAL_PUSH=true`.
4. Build: `npm --prefix APP-Mobile/backend ci && npm --prefix APP-Mobile/backend run build`. Start: `node APP-Mobile/backend/lib/backend/src/server.js`. Health check: `/health`.
5. Após `/health` retornar `200`, adicione **somente** a URL pública HTTPS do serviço no campo `externalPushUrl` de `settings/public`. Os clientes acordam o serviço depois de publicar notícia, comunicado, pedido/atualização de apoio ou alerta de emergência.
6. No celular, permita notificações e ative os avisos do aparelho no aplicativo. FCM pode exibir o aviso com o app fechado; forçar a parada pelo Android impede entregas até reabrir o app.

`POST /wake` exige token Firebase válido e não aceita mensagens/destinatários do cliente. As fontes e permissões são conferidas no servidor. Estado de processamento fica em `externalPushState`, privado pelas regras existentes. A caixa de avisos e os IDs dos eventos evitam repetição ao reiniciar. O primeiro início não dispara notícias antigas para a base.

Emergências geram aviso genérico para administradores ativos dos níveis existentes. Nome, telefone, contato, placa e GPS não aparecem no push. Ao tocar, o administrador abre o painel, que confere novamente sua autorização para os detalhes.

## Verificação local

Com Auth/Firestore emulados e backend compilado:

```
node --test APP-Mobile/tests/notifications-backend.mjs
node APP-Mobile/tests/external-server.mjs
```

Os testes usam destinatários fictícios e simulação do transporte FCM, sem enviar mensagens reais. Verifique também em aparelho físico a permissão, o registro do token, o recebimento com a tela bloqueada e a abertura pelo aviso.
