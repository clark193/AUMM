# Configuração da Plataforma AUMM — passo a passo

Este guia foi escrito para quem nunca configurou Firebase. Faça as etapas na ordem. Não publique nenhuma senha, chave administrativa ou arquivo de conta de serviço.

> **Configuração atual (plano Spark):** o projeto `aumm-21dda` usa Authentication, Firestore e Hosting estático. Storage, Cloud Functions e SSR permanecem desativados porque exigem o plano Blaze. Nenhuma conta de faturamento é necessária para o fluxo atual.

## 1. O que já está pronto

O código, as telas, regras de segurança, índices, Cloud Functions, workflow do GitHub e arquivos de configuração já estão no projeto. Você precisa apenas conectar suas contas e copiar os valores do seu projeto Firebase.

## 2. Instalar os programas necessários

1. Confirme que o Node.js está instalado abrindo o PowerShell e executando `node --version`. Use a versão 22.13 ou superior.
2. Na pasta do projeto, execute `npm install`.
3. Instale a ferramenta do Firebase com `npm install -g firebase-tools`.
4. Execute `firebase login`.
5. O navegador abrirá. Entre com a conta Google que será proprietária do projeto e autorize o Firebase CLI.

## 3. Criar o projeto Firebase

1. Abra https://console.firebase.google.com/.
2. Clique em **Criar um projeto**.
3. Digite um nome, por exemplo `AUMM Blumenau`.
4. Confira o **ID do projeto**. Sugestão: `aumm-blumenau`. Esse ID é público e não poderá ser alterado depois.
5. Aceite os termos e clique em **Continuar**.
6. O Google Analytics é opcional. Para começar com menos configuração, você pode desativá-lo e ativá-lo depois.
7. Clique em **Criar projeto** e aguarde.
8. Quando aparecer a confirmação, clique em **Continuar**.

Referência oficial: https://firebase.google.com/docs/web/setup

## 4. Registrar a aplicação web

1. Na página **Visão geral do projeto**, clique no ícone `</>` (Web).
2. Em apelido, digite `AUMM Web`.
3. Marque **Também configurar o Firebase Hosting**.
4. Clique em **Registrar app**.
5. O Firebase mostrará um bloco chamado `firebaseConfig`.
6. Mantenha essa página aberta; os valores serão copiados para `.env.local` na próxima etapa.
7. Não copie o bloco para o código-fonte. Este projeto já possui a inicialização correta em `lib/firebase.ts`.

## 5. Configurar o arquivo `.env.local`

1. Na pasta do projeto, copie `.env.example` e renomeie a cópia para `.env.local`.
2. Abra `.env.local` em um editor de texto.
3. No bloco `firebaseConfig` exibido pelo console, copie somente o valor de cada campo, sem aspas e sem vírgula final:
   - `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`;
   - `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`;
   - `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`;
   - `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`;
   - `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`;
   - `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`.
4. Durante o desenvolvimento, mantenha `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
5. Salve o arquivo.
6. Não envie `.env.local` para o GitHub. O `.gitignore` já o bloqueia.

Os valores `NEXT_PUBLIC_*` do SDK Web identificam o projeto, mas não concedem acesso administrativo. A segurança real está nas regras e na autenticação. Mesmo assim, nunca coloque chave de conta de serviço no frontend.

## 6. Ativar Authentication

1. No menu esquerdo do Firebase, abra **Criação** ou **Security**, depois **Authentication**.
2. Clique em **Primeiros passos**.
3. Abra a aba **Método de login**.
4. Clique em **E-mail/senha**.
5. Ative **E-mail/senha** e clique em **Salvar**. Esse método é usado pelo Portal do Associado depois da aprovação.
6. Volte à lista de provedores, abra **Anônimo**, ative-o e clique em **Salvar**. A sessão anônima protege o pedido público sem exigir senha antes da análise.
7. Não é necessário ativar login por link neste momento.
8. Em **Configurações → Domínios autorizados**, confirme `localhost` durante o desenvolvimento e os domínios de publicação utilizados pelo projeto.
9. Quando os domínios forem comprados, adicione `aumm.com.br`, `www.aumm.com.br`, `associado.aumm.com.br` e `admin.aumm.com.br`.
10. Em **Modelos**, personalize os e-mails de recuperação de senha com o nome e os contatos da AUMM.

Referência: https://firebase.google.com/docs/auth/web/password-auth

## 7. Criar o Firestore

1. No menu esquerdo, abra **Databases & Storage → Firestore**.
2. Clique em **Criar banco de dados**.
3. Escolha a edição **Standard**.
4. Escolha **Modo de produção**. As regras do projeto serão publicadas depois.
5. Na localização, prefira uma região próxima dos usuários e compatível com os demais recursos. Para este projeto, use `southamerica-east1` (São Paulo) quando a opção estiver disponível.
6. Atenção: a localização padrão não deve ser escolhida casualmente, porque diversos recursos não podem ser movidos depois.
7. Clique em **Criar** e aguarde.
8. Não precisa criar collections manualmente; elas serão criadas pelas operações da aplicação.

Referência: https://firebase.google.com/docs/firestore/quickstart

## 8. Storage no plano Spark

O Storage não é usado na configuração Spark. Fotos e documentos são solicitados pela AUMM após o envio do cadastro. O arquivo `storage.rules` e o código de Functions foram preservados apenas para uma eventual migração futura.

## 9. Conectar o projeto local ao Firebase

1. No PowerShell, dentro da pasta AUMM, execute `firebase use --add`.
2. Selecione o projeto criado.
3. Quando pedir um apelido, digite `default`.
4. Esse comando criará `.firebaserc`. Ele não contém senha, mas o projeto inclui `.firebaserc.example` para referência.
5. Execute `firebase projects:list` e confirme que o projeto aparece.

## 10. Publicar regras e índices

1. Execute `firebase deploy --only firestore:rules,firestore:indexes,hosting`.
2. Aguarde a mensagem de sucesso.
3. No console, abra **Firestore → Regras** e confirme que o conteúdo publicado começa com `rules_version = '2';`.
4. Se o Firebase pedir para habilitar uma API, aceite e execute o comando novamente.
5. Nunca use regras com `allow read, write: if true` em produção.

## 11. Cloud Functions no plano Spark

Cloud Functions não são publicadas no Spark. O cadastro grava diretamente no Firestore sob regras restritivas. Operações administrativas usam documentos em `adminRoles`. A implementação de Functions permanece no repositório somente como opção futura.

## 12. Configurar o primeiro Super Admin

Não existe senha padrão e nenhum administrador é criado no código.

1. No Firebase Console, abra **Authentication → Usuários**.
2. Clique em **Adicionar usuário**.
3. Informe seu e-mail administrativo.
4. Crie uma senha longa e exclusiva. Guarde-a em um gerenciador de senhas.
5. Clique em **Adicionar usuário**.
6. Copie o **UID** mostrado na linha do usuário.
7. Abra **Firestore Database → Dados** e clique em **Iniciar coleção**.
8. ID da coleção: `adminRoles`.
9. ID do documento: cole exatamente o UID do usuário.
10. Adicione `active` (boolean) = `true`, `superAdmin` (boolean) = `true`, `level` (number) = `1`, `role` (string) = `Presidente` ou `Vice-Presidente` e `permissions` (mapa) = mapa vazio.
11. Salve o documento e entre em `/associado/login?destino=admin`.
12. Depois de acessar o painel, troque a senha usando a recuperação por e-mail ou pelo console Authentication quando necessário.

### Criar um administrador de nível 5

O nível 5 é o perfil de recrutador. Ele consulta o Dashboard visual sem abrir, aprovar ou alterar registros existentes e possui somente o formulário separado para cadastrar um novo associado, com a chave de autorização imediata. Ele não publica notícias, responde solicitações nem acessa a auditoria completa.

1. Em **Authentication → Usuários**, adicione o usuário administrativo e copie o UID.
2. Em `adminRoles`, crie um documento cujo ID seja esse UID.
3. Adicione `active` (boolean) = `true`, `superAdmin` (boolean) = `false`, `level` (number) = `5`, `role` (string) = `Cadastro` e `permissions` (mapa) = mapa vazio.
4. Esse usuário entra em `/associado/login?destino=admin`.
5. O perfil nível 5 não recebe permissões de escrita no Firestore.

## 13. Configurar App Check

Faça primeiro em modo de monitoramento. Só ative a aplicação forçada depois de confirmar que não existem requisições legítimas bloqueadas.

1. Abra https://console.cloud.google.com/security/recaptcha e selecione o projeto.
2. Ative a API reCAPTCHA Enterprise quando solicitado.
3. Crie uma chave do tipo **Site** baseada em pontuação, sem caixa de seleção.
4. Adicione inicialmente `localhost` e o endereço temporário do Hosting. Depois adicione os quatro domínios da AUMM.
5. Copie a chave de site.
6. No Firebase Console, abra **Security → App Check**.
7. Na aba **Apps**, selecione `AUMM Web`, clique em **Registrar** e escolha reCAPTCHA Enterprise.
8. Cole a chave de site.
9. Copie a mesma chave para `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` em `.env.local`.
10. Publique e monitore as métricas.
11. Quando tudo estiver estável, ative enforcement gradualmente para Firestore e Authentication.

Referência: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider?hl=pt-br

## 14. Executar e testar localmente

1. Na raiz, execute `npm run dev`.
2. Abra http://localhost:3000.
3. Teste o site em largura de celular e desktop.
4. Abra `/associe-se`, preencha somente os seis dados básicos com informações fictícias, aceite o Estatuto e envie.
5. No Firestore, confirme o documento em `membershipRequests` e os índices SHA-256 correspondentes.
6. Atualize a página e confirme que o formulário não reaparece.
7. Entre no nível 1, abra **Filiações**, coloque o pedido em análise e, para Motoboy, marque a documentação como conferida fora do sistema.
8. Aprove a filiação, copie o acesso temporário e teste o Portal do Associado.
9. Teste recuperação de senha.
10. Entre no admin e confirme que um usuário comum é recusado.
11. Abra `/estatuto`, teste busca, índice, link de artigo e impressão.
12. Execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:rules`.

## 15. Publicar no Firebase Hosting

1. Na raiz, execute `npm run build:firebase`.
2. Execute `firebase experiments:enable webframeworks` se o CLI solicitar suporte a framework.
3. Execute `firebase deploy --only hosting`.
4. Ao final, o terminal mostrará um endereço semelhante a `https://SEU_PROJECT_ID.web.app`.
5. Abra o endereço e teste as páginas públicas, login e cadastro.
6. Em caso de erro, abra **Firebase Console → Hosting → Releases** e consulte a versão.
7. Para voltar uma versão, abra o menu da release anterior e escolha a opção de rollback.

Firebase Hosting fornece HTTPS e subdomínios temporários `web.app`/`firebaseapp.com`. Referência: https://firebase.google.com/docs/hosting/quickstart

## 16. Criar o repositório no GitHub

1. Entre em https://github.com/.
2. Clique em **New repository**.
3. Nome sugerido: `aumm-plataforma`.
4. Escolha **Private** enquanto houver configuração inicial.
5. Não marque README, `.gitignore` ou licença; estes arquivos já existem.
6. Clique em **Create repository**.
7. Copie a URL HTTPS mostrada pelo GitHub.
8. No PowerShell, na pasta do projeto, execute `git remote add origin URL_COPIADA`.
9. Confira com `git remote -v`.
10. Envie com `git push -u origin main`.

Referência: https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github

## 17. Configurar GitHub Secrets

1. No repositório, clique em **Settings**.
2. No menu esquerdo, abra **Secrets and variables → Actions**.
3. Clique em **New repository secret**.
4. Crie um secret para cada variável de `.env.example`, mantendo exatamente os nomes:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`;
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`;
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`;
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`;
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`;
   - `NEXT_PUBLIC_FIREBASE_APP_ID`;
   - `NEXT_PUBLIC_SITE_URL`;
   - `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
5. Para o deploy, abra o Google Cloud Console → **IAM e administrador → Contas de serviço**.
6. Crie uma conta de serviço exclusiva para o GitHub Actions com somente as permissões necessárias ao Hosting/Rules.
7. Gere uma chave JSON apenas se você não for configurar Workload Identity Federation.
8. Abra o JSON em um editor, copie todo o conteúdo e crie o secret `FIREBASE_SERVICE_ACCOUNT_AUMM`.
9. Exclua o arquivo JSON baixado após cadastrar o secret e esvazie a lixeira. Nunca o coloque na pasta do projeto.
10. Para segurança mais forte, substitua depois a chave JSON por Workload Identity Federation.

Referência: https://docs.github.com/en/actions/reference/security/secrets

## 18. Confirmar o deploy automático

1. Abra a aba **Actions** do repositório.
2. O workflow `Deploy Firebase` será executado após um push para `main`.
3. Abra a execução e confirme as etapas de instalação, lint, tipagem, build, autenticação e deploy.
4. Se falhar em um secret, confira o nome exato em **Settings → Secrets and variables → Actions**.
5. Faça uma pequena alteração segura, commit e push para confirmar o fluxo completo.

## 19. Configurar o domínio quando ele for comprado

Você poderá apontar os três ambientes sem reconstruir o sistema. O `middleware.ts` já direciona cada host para sua área.

### Site principal: `aumm.com.br` e `www.aumm.com.br`

1. No Firebase Console, abra **Hosting**.
2. No site principal, clique em **Adicionar domínio personalizado**.
3. Digite `aumm.com.br`.
4. O Firebase exibirá um registro TXT para provar a propriedade. Copie nome e valor.
5. Entre no painel da empresa onde o domínio foi comprado e abra a gestão de DNS.
6. Crie o registro TXT exatamente como mostrado. Para o domínio raiz, o campo nome pode ser `@`.
7. Volte ao Firebase e clique em **Verificar**.
8. Após a verificação, o Firebase exibirá os registros A/AAAA necessários. Remova registros A conflitantes do domínio raiz e crie os registros exibidos.
9. Adicione `www.aumm.com.br` como outro domínio personalizado. Para `www`, o Firebase normalmente fornece um CNAME; use exatamente o valor mostrado no console.
10. Escolha qual endereço será o canônico e configure redirecionamento do outro.

### Portal: `associado.aumm.com.br`

1. Ainda em Hosting, clique em **Adicionar domínio personalizado**.
2. Digite `associado.aumm.com.br`.
3. No DNS, crie o TXT de verificação quando solicitado.
4. Depois crie o CNAME ou registros fornecidos pelo Firebase.
5. Adicione o domínio também em **Authentication → Configurações → Domínios autorizados** e no reCAPTCHA Enterprise.

### Administração: `admin.aumm.com.br`

Repita o procedimento do portal usando `admin.aumm.com.br`. Também adicione esse host aos domínios autorizados do Authentication e App Check.

### SSL e propagação

1. O certificado SSL é emitido automaticamente pelo Firebase depois que o DNS está correto.
2. Não instale certificado manualmente.
3. A propagação pode levar de minutos a até 48 horas, dependendo do provedor DNS e do TTL anterior.
4. Não remova os registros enquanto o status estiver **Provisionando certificado**.
5. Quando o Firebase mostrar **Conectado**, abra cada endereço com `https://` e confirme o cadeado.

Referência: https://firebase.google.com/docs/hosting/custom-domain

## 20. Backup do Firestore

Exportação gerenciada exige faturamento (plano Blaze) e cobra leituras/documentos.

1. No Google Cloud Console, crie um bucket exclusivo para backup em região próxima do Firestore.
2. Ative versionamento e uma política de retenção adequada à AUMM.
3. No Cloud Shell, execute `gcloud config set project SEU_PROJECT_ID`.
4. Para exportar tudo, execute `gcloud firestore export gs://NOME_DO_BUCKET/aumm-backups --database='(default)'`.
5. Confira o resultado em **Cloud Storage → Buckets**.
6. Para restaurar, localize o prefixo exato do backup e execute `gcloud firestore import gs://NOME_DO_BUCKET/aumm-backups/PREFIXO --database='(default)'`.
7. A importação sobrescreve documentos com o mesmo ID e não apaga documentos extras. Teste a restauração em um projeto separado antes de uma emergência real.
8. Guarde também `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json` e o código do GitHub; o export de dados não contém os índices.

Referência: https://firebase.google.com/docs/firestore/manage-data/export-import

## 21. Backup do Storage

1. Abra Google Cloud Console → **Cloud Storage → Buckets**.
2. Selecione o bucket usado pelo Firebase Storage.
3. Ative **Versionamento de objetos** ou use uma política de retenção/lifecycle adequada.
4. Para uma cópia independente, use `gcloud storage rsync --recursive gs://BUCKET_FIREBASE gs://BUCKET_BACKUP`.
5. Restrinja o bucket de backup a proprietários e conta de serviço de backup.
6. Teste periodicamente a recuperação de um arquivo não sensível.

## 22. Manutenção cotidiana

- **Alterar textos, cores e dados:** use os módulos administrativos correspondentes. As telas iniciam sem registros fictícios.
- **Cadastrar administrador:** crie o usuário no Authentication e atribua função pelo módulo Administradores; somente o Super Admin pode mudar claims.
- **Recuperar senha:** na tela de login, clique em **Esqueci minha senha**, informe o e-mail e o WhatsApp. O pedido aparecerá em Admin → Recuperar senhas para contato após conferência da identidade.
- **Consultar logs:** Admin → Logs. Os logs críticos são somente leitura para o cliente.
- **Suspender associado:** Admin → Associados → abrir cadastro → alterar status. A verificação pública deve refletir o novo status.
- **Atualizar o sistema:** crie uma branch, altere, abra Pull Request, aguarde o workflow de validação e então faça merge em `main`.
- **Monitorar custo:** configure orçamento e alertas no Google Cloud Billing e acompanhe uso de Firestore, Storage e Functions.

## 23. Checklist antes de produção

- [ ] E-mail/senha ativado no Authentication;
- [ ] Firestore e Storage criados na região correta;
- [ ] regras e índices publicados;
- [ ] Functions compiladas e publicadas;
- [ ] primeiro Super Admin criado sem senha padrão;
- [ ] App Check monitorado e depois aplicado gradualmente;
- [ ] Secrets cadastrados no GitHub;
- [ ] workflow verde;
- [ ] orçamento/alertas configurados;
- [ ] política de privacidade revisada por responsável jurídico;
- [ ] canais oficiais de contato publicados;
- [ ] cadastros, aprovação, login, QR, permissões e uploads testados;
- [ ] backup e restauração testados;
- [ ] domínios e SSL verificados quando disponíveis.
