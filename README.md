# Plataforma AUMM

Plataforma web da AUMM — Associação União Maior Motoboys. O projeto reúne site institucional, captação e aprovação de associados, portal autenticado, carteirinha digital, administração, conteúdo e transparência.

## Tecnologias

- Next.js 16, React 19 e TypeScript;
- Vinext/Vite para a prévia hospedada no Sites;
- Firebase Authentication, Cloud Firestore, Cloud Storage e Firebase Hosting;
- Firebase App Check com reCAPTCHA Enterprise (opcional, recomendado em produção);
- QR Code e Lucide Icons;
- GitHub Actions para validação e deploy.

## Módulos implementados

- Site institucional responsivo: início, quem somos, diretoria, projetos, ações, benefícios, parceiros, eventos, contato e páginas legais;
- Notícias com resumo, texto completo em página própria, imagem, metadados, sitemap, robots e Open Graph;
- Filiação pública simplificada com CPF validado, aceite versionado do Estatuto, acompanhamento após recarga e proteção atômica contra duplicidade;
- Estatuto Social de 2021 integral em HTML, com índice, busca local, âncoras por artigo e impressão;
- Estrutura preparada para aprovação, número único, perfil público mínimo e log de auditoria;
- Login Firebase, solicitação de recuperação atendida pelo WhatsApp e separação de acesso de associado/admin;
- Portal do associado com comunicados, atalhos, benefícios, perfil, alteração obrigatória da senha inicial e carteirinha;
- Foto da carteirinha enviada diretamente pelo associado em JPG, PNG ou WebP, sem depender de link público;
- Portal da transparência protegido dentro da área do associado;
- Mural da diretoria editável pelo admin, com nome, cargo, ordem e URL da foto;
- Carteirinha digital mobile-first, QR Code, impressão/PDF e compartilhamento;
- Verificação pública por token não sequencial, sem dados sensíveis;
- Painel administrativo operacional para associados, filiações, cargos configuráveis, diretoria, notícias, comunicados, parceiros, eventos, benefícios, solicitações, recuperação de acesso, transparência, financeiro, documentos, administradores, logs e configurações, com cadastro, pesquisa, edição e exclusão/arquivamento conforme cada módulo;
- Importação em lote de associados por planilha XLSX, com consolidação de duplicidades, relatório de inconsistências e criação de login com troca obrigatória no primeiro acesso;
- Dados da página de contato e do rodapé atualizados pelo painel administrativo;
- Gestão de administradores pelo próprio nível 1, incluindo criação da conta, definição de nível, alteração de função, desativação e recuperação de senha;
- RBAC por níveis de 1 a 5 e permissões específicas nas regras do Firestore;
- Deploy automatizado e documentação de operação.

O repositório não inclui registros pessoais, financeiros, notícias, eventos ou parceiros fictícios. As telas operacionais iniciam vazias e usam o Firebase configurado.

## Execução local

Requisitos: Node.js 22.13 ou superior e npm.

```bash
copy .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`. As variáveis do Firebase são necessárias para cadastro, login e painéis protegidos.

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
- `lib/`: configuração do Firebase, serviços e conteúdo institucional;
- `functions/`: implementação opcional preservada para uma futura migração ao Blaze;
- `firestore.rules`: autorização do banco no plano Spark;
- `firestore.indexes.json`: índices de consultas;
- `.github/workflows/`: validação e deploy;
- `CONFIGURACAO_AUMM.md`: tutorial completo em português.

## Arquitetura do Firestore

Collections principais: `users`, `associados`, `publicMembers`, `membershipRequests`, `membershipRequestOwners`, `membershipRequestCpfIndex`, `membershipRequestEmailIndex`, `membershipAuditLogs`, `associationApplications` (legado), `applicationSummaries` (legado), `passwordResetRequests`, `dashboardActivity`, `roles`, `adminRoles`, `news`, `communications`, `partners`, `benefits`, `events`, `documents`, `requests`, `transparency`, `financialEntries`, `auditLogs`, `settings`, `notifications` e `counters`.

Dados privados ficam em `associados` e `users`. A verificação pública consulta somente `publicMembers`, documento propositalmente mínimo. No modo Spark, a autorização administrativa consulta `adminRoles/{uid}` diretamente pelas regras.

## Segurança

O frontend nunca é a autoridade de permissão. As regras do Firestore verificam autenticação, propriedade e permissões. A solicitação pública usa sessão anônima e só vira filiação depois da decisão administrativa. Índices SHA-256 de CPF e e-mail impedem pedidos repetidos no mesmo lote atômico. A CNH não é enviada nem armazenada; quando aplicável, sua conferência ocorre fora do sistema.

Nunca versione `.env.local`, `.firebaserc`, chaves de conta de serviço ou credenciais. O `.gitignore` bloqueia arquivos `.env*`; apenas `.env.example` deve ser público.

## Deploy

O fluxo previsto é `main → publicação do site estático`. A aplicação não depende de SSR ou Functions; as fotos de perfil usam o Cloud Storage protegido por regras de acesso.

Leia [CONFIGURACAO_AUMM.md](CONFIGURACAO_AUMM.md) antes do primeiro deploy.

## Primeiro Super Admin

Crie o usuário no Firebase Authentication e depois crie o documento `adminRoles/{UID}` conforme o tutorial em `CONFIGURACAO_AUMM.md`. Não existe senha padrão.

## Backup e recuperação

No Spark, exportações gerenciadas para bucket não estão disponíveis. Preserve o código, as regras e faça exportações administrativas dos dados permitidos pela aplicação.

## Assembleias eletrônicas

O portal inclui convocação, ciência, presença, chamadas estatutárias, discussão escrita, voto eletrônico, resultados, ata com hash e auditoria. Consulte `docs/ASSEMBLEIAS.md` para configuração e operação e `docs/FIREBASE_FREE_TIER.md` para limites e economia de cota.

## Documentos Institucionais

O painel administra Estatuto, atas, editais, convocações, normas e prestação de contas por arquivo estático, URL externa ou documento gerado pela Assembleia. Consulte `docs/DOCUMENTOS.md`.

## Filiações e Estatuto em HTML

Consulte `docs/FILIACOES.md` para o fluxo público, proteção contra duplicidade, análise administrativa, conferência documental externa e versionamento do Estatuto.
