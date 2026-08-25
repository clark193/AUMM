# Plataforma AUMM

Plataforma web da AUMM — Associação dos Motoboys e Motociclistas de Blumenau. O projeto reúne site institucional, captação e aprovação de associados, portal autenticado, carteirinha digital, administração, conteúdo e transparência.

## Tecnologias

- Next.js 16, React 19 e TypeScript;
- Vinext/Vite para a prévia hospedada no Sites;
- Firebase Authentication, Cloud Firestore e Firebase Hosting no plano Spark;
- Firebase App Check com reCAPTCHA Enterprise (opcional, recomendado em produção);
- QR Code e Lucide Icons;
- GitHub Actions para validação e deploy.

## Módulos implementados

- Site institucional responsivo: início, quem somos, diretoria, projetos, ações, benefícios, parceiros, eventos, contato e páginas legais;
- Notícias com listagem, página individual, metadados, sitemap, robots e Open Graph;
- Cadastro público com validações, consentimento LGPD e gravação protegida no Firestore;
- Estrutura preparada para aprovação, número único, perfil público mínimo e log de auditoria;
- Login Firebase, recuperação de senha e separação de acesso de associado/admin;
- Portal do associado, perfil resumido, comunicados, benefícios e protocolos;
- Carteirinha digital mobile-first, QR Code, impressão/PDF e compartilhamento;
- Verificação pública por token não sequencial, sem dados sensíveis;
- Painel administrativo para associados, cargos configuráveis, diretoria, notícias, comunicados, eventos, benefícios, solicitações, transparência, financeiro, documentos, administradores, logs e configurações;
- RBAC por documentos administrativos e regras de segurança do Firestore;
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
- `functions/`: implementação opcional preservada para uma futura migração ao Blaze;
- `firestore.rules`: autorização do banco no plano Spark;
- `firestore.indexes.json`: índices de consultas;
- `.github/workflows/`: validação e deploy;
- `CONFIGURACAO_AUMM.md`: tutorial completo em português.

## Arquitetura do Firestore

Collections principais: `users`, `associados`, `publicMembers`, `associationApplications`, `roles`, `adminRoles`, `news`, `communications`, `partners`, `benefits`, `events`, `documents`, `requests`, `transparency`, `financialEntries`, `auditLogs`, `settings`, `notifications` e `counters`.

Dados privados ficam em `associados` e `users`. A verificação pública consulta somente `publicMembers`, documento propositalmente mínimo. No modo Spark, a autorização administrativa consulta `adminRoles/{uid}` diretamente pelas regras.

## Segurança

O frontend nunca é a autoridade de permissão. As regras do Firestore verificam autenticação, propriedade e permissões. Cadastros públicos recebem autenticação anônima temporária e usam um identificador determinístico derivado do CPF para evitar duplicidade no fluxo normal. Anexos ficam desativados no Spark e são solicitados durante a análise.

Nunca versione `.env.local`, `.firebaserc`, chaves de conta de serviço ou credenciais. O `.gitignore` bloqueia arquivos `.env*`; apenas `.env.example` deve ser público.

## Deploy

O fluxo previsto é `main → GitHub Actions → Firebase Hosting`. A aplicação é exportada como site estático para funcionar no plano Spark, sem SSR, Functions ou Storage.

Leia [CONFIGURACAO_AUMM.md](CONFIGURACAO_AUMM.md) antes do primeiro deploy.

## Primeiro Super Admin

Crie o usuário no Firebase Authentication e depois crie o documento `adminRoles/{UID}` conforme o tutorial em `CONFIGURACAO_AUMM.md`. Não existe senha padrão.

## Backup e recuperação

No Spark, exportações gerenciadas para bucket não estão disponíveis. Preserve o código, as regras e faça exportações administrativas dos dados permitidos pela aplicação.
