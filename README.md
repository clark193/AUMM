# Plataforma AUMM

Plataforma web da AUMM — Associação dos Motoboys e Motociclistas de Blumenau. O projeto reúne site institucional, captação e aprovação de associados, portal autenticado, carteirinha digital, administração, conteúdo e transparência.

## Tecnologias

- Next.js 16, React 19 e TypeScript;
- Vinext/Vite para a prévia hospedada no Sites;
- Firebase Authentication, Firestore, Storage, Hosting e Cloud Functions;
- Firebase App Check com reCAPTCHA Enterprise (opcional, recomendado em produção);
- QR Code e Lucide Icons;
- GitHub Actions para validação e deploy.

## Módulos implementados

- Site institucional responsivo: início, quem somos, diretoria, projetos, ações, benefícios, parceiros, eventos, contato e páginas legais;
- Notícias com listagem, página individual, metadados, sitemap, robots e Open Graph;
- Cadastro público com validações, consentimento LGPD e upload protegido;
- Fluxo serverless de aprovação com número único, perfil público mínimo e log de auditoria;
- Login Firebase, recuperação de senha e separação de acesso de associado/admin;
- Portal do associado, perfil resumido, comunicados, benefícios e protocolos;
- Carteirinha digital mobile-first, QR Code, impressão/PDF e compartilhamento;
- Verificação pública por token não sequencial, sem dados sensíveis;
- Painel administrativo para associados, cargos configuráveis, diretoria, notícias, comunicados, eventos, benefícios, solicitações, transparência, financeiro, documentos, administradores, logs e configurações;
- RBAC por custom claims e regras de segurança em Firestore/Storage;
- Deploy automatizado e documentação de operação.

Os conteúdos pessoais e financeiros presentes na interface estão claramente marcados como demonstração e não são gravados no Firebase. Remova-os substituindo os arrays em `lib/content.ts` e nos componentes de dashboard por consultas aos serviços Firebase.

## Execução local

Requisitos: Node.js 22.13 ou superior e npm.

```bash
copy .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem variáveis Firebase o projeto entra em modo demonstrativo; depois da configuração, cadastro e login usam o projeto real.

Comandos úteis:

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm run build:firebase
```

## Estrutura

- `app/`: rotas públicas, portal do associado, administração, SEO e verificação;
- `components/`: estrutura visual e proteção de acesso;
- `lib/`: configuração do Firebase, serviços e dados demonstrativos;
- `functions/`: operações privilegiadas, aprovação, numeração e RBAC;
- `firestore.rules` e `storage.rules`: autorização no backend;
- `firestore.indexes.json`: índices de consultas;
- `.github/workflows/`: validação e deploy;
- `CONFIGURACAO_AUMM.md`: tutorial completo em português.

## Arquitetura do Firestore

Collections principais: `users`, `associados`, `publicMembers`, `associationApplications`, `roles`, `adminRoles`, `news`, `communications`, `partners`, `benefits`, `events`, `documents`, `requests`, `transparency`, `financialEntries`, `auditLogs`, `settings`, `notifications` e `counters`.

Dados privados ficam em `associados` e `users`. A verificação pública consulta somente `publicMembers`, documento propositalmente mínimo. Numeração é emitida em transação usando `counters/members`. Aprovação e alteração de claims ocorrem apenas em Cloud Functions/Admin SDK.

## Segurança

O frontend nunca é a autoridade de permissão. Firestore Rules, Storage Rules e Cloud Functions verificam autenticação e permissões. Uploads aceitam somente JPG, PNG, WEBP ou PDF de até 5 MB. Logs de auditoria não podem ser alterados ou excluídos pelo cliente. Cadastros públicos recebem autenticação anônima temporária para vincular documentos à solicitação.

Nunca versione `.env.local`, `.firebaserc`, chaves de conta de serviço ou credenciais. O `.gitignore` bloqueia arquivos `.env*`; apenas `.env.example` deve ser público.

## Deploy

O fluxo previsto é `main → GitHub Actions → Firebase Hosting`. O workflow funciona após criar o projeto, configurar os Secrets e habilitar o framework web do Firebase. Para uma prévia sem domínio, o projeto também possui configuração de Sites.

Leia [CONFIGURACAO_AUMM.md](CONFIGURACAO_AUMM.md) antes do primeiro deploy.

## Primeiro Super Admin

Crie o usuário no Firebase Authentication e execute localmente, autenticado com o Google Cloud CLI:

```bash
node scripts/set-first-admin.mjs seu-email@exemplo.com
```

Não existe senha padrão. Faça logout e login após aplicar o claim.

## Backup e recuperação

Use exportações gerenciadas do Firestore para um bucket separado, retenção/versionamento do Storage e cópia segura das configurações/rules. O procedimento completo está no guia de configuração.
