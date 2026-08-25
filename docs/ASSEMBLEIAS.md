# Assembleias Gerais Eletrônicas da AUMM

Módulo integrado ao portal existente da **Associação União Maior Motoboys**. A assembleia acontece integralmente por escrito dentro do Portal do Associado.

## Arquitetura

- `assemblies/{id}`: edital, horários, estado, quórum e situação da ata.
- `eligibleVoters/{uid}`: snapshot mínimo do colégio eleitoral no momento da publicação.
- `acknowledgements/{uid}`: ciência individual imutável.
- `presence/{uid}`: presença individual imutável.
- `agenda/{agendaId}`: pautas e janelas de discussão/votação.
- `agenda/{agendaId}/comments/{id}`: manifestações escritas imutáveis; moderação apenas oculta.
- `agenda/{agendaId}/votes/{uid}`: um voto por UID, sem update ou delete.
- `agenda/{agendaId}/results/summary`: snapshot da apuração.
- `auditLogs/{id}`: trilha imutável.
- `minutes/official`: minuta e versão final com SHA-256.
- `minutes/official/approvals/{uid}`: confirmação interna da ata.

Nenhuma dessas collections substitui `associados`, `users`, `adminRoles` ou o Firebase Authentication existente.

## Permissões administrativas

O nível 1 continua sendo Super Admin e possui acesso completo. Para delegar apenas partes do módulo, adicione no mapa `permissions` de `adminRoles/{uid}`:

- `canManageAssemblies`
- `canPublishAssembly`
- `canPresideAssembly`
- `canModerateAssembly`
- `canCertifyResults`
- `canFinalizeMinutes`

Exemplo de documento do Presidente:

```json
{
  "active": true,
  "level": 1,
  "role": "Presidente",
  "permissions": {
    "canManageAssemblies": true,
    "canPublishAssembly": true,
    "canPresideAssembly": true,
    "canModerateAssembly": true,
    "canCertifyResults": true,
    "canFinalizeMinutes": true
  }
}
```

O cargo estatutário e o nível técnico continuam campos diferentes. Nunca dê ao associado comum permissão de escrita em `adminRoles`.

## Configuração do Firebase

1. Abra o Console Firebase e selecione o projeto correto.
2. Em **Authentication → Método de login**, mantenha **E-mail/senha** habilitado.
3. Em **Firestore Database**, mantenha o banco em modo de produção.
4. Na pasta do projeto, autentique a CLI com `firebase login`.
5. Confira o projeto selecionado com `firebase use`.
6. Valide localmente com `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:rules`.
7. Somente depois de revisar, publique regras e índices com `firebase deploy --only firestore:rules,firestore:indexes`.
8. O site continua no processo de deploy existente. Publicar o frontend sem publicar as novas regras deixa o módulo sem funcionar; publicar regras sem o frontend não expõe uma interface, mas altera a autorização do banco.

Este trabalho local não publica automaticamente regras nem site.

## App Check

O suporte já está em `lib/firebase.ts` usando reCAPTCHA Enterprise. Para configurar:

1. No Console Firebase, abra **App Check** e selecione o aplicativo Web.
2. Registre o provedor reCAPTCHA Enterprise e informe os domínios reais e `localhost` para testes.
3. Copie a chave pública do site para `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` no ambiente local e nos secrets/variables do deploy.
4. Abra o site e confira em **App Check → Métricas** se chegam solicitações válidas.
5. Teste cadastro, login, painel, ciência, presença, comentário e voto.
6. Só depois ative enforcement para Firestore. Não ative enforcement durante o primeiro teste.

A chave pública do App Check não é credencial administrativa. Nunca coloque service account, private key ou Admin SDK no frontend.

## Migração dos associados existentes

Novos associados aprovados recebem `eligibleToVote: true`. Para registros antigos, a publicação mantém compatibilidade: ausência do campo é tratada como habilitado; somente `eligibleToVote: false` exclui o associado.

No painel **Cadastros e associados**, pesquise cada registro e use o botão da coluna **Voto** para confirmar a situação. Faça essa revisão antes da primeira publicação. Não apague nem renomeie collections. O campo é protegido pelas Security Rules e não pode ser alterado pelo próprio associado.

Antes de implantar, faça backup lógico conforme `docs/FIREBASE_FREE_TIER.md`.

## Como realizar uma assembleia de teste

1. Entre como nível 1 e abra **Assembleias eletrônicas**.
2. Crie um rascunho com primeira chamada pelo menos 15 dias à frente. A segunda e terceira são calculadas em +30 e +60 minutos.
3. Cadastre todas as pautas e, se houver documento/imagem, informe uma URL HTTPS ou caminho estático.
4. Informe os UIDs do Presidente/Secretário responsáveis por conferir a ata.
5. Publique. O sistema cria o snapshot de todos os associados ativos habilitados.
6. Entre como associado e abra **Assembleias**. Confirme a ciência.
7. No horário, o administrador realiza a 1ª chamada; isso abre a presença.
8. O associado registra presença. O administrador usa **Atualizar quórum**.
9. Se não houver quórum, aguarde o horário seguinte e avance para a 2ª/3ª chamada. Zero presentes nunca instala a assembleia.
10. Com quórum, clique em **Instalar assembleia**.
11. Abra a primeira pauta, abra a discussão e faça manifestações/perguntas por escrito.
12. Encerre a discussão, abra a votação e vote como associado. O voto não pode ser alterado.
13. Encerre e apure; depois publique o resultado e encerre a pauta.
14. Repita nas demais pautas e encerre a assembleia.
15. Gere a minuta, revise e finalize. O sistema grava a representação canônica e o hash SHA-256.
16. O responsável indicado confirma que leu e concorda. Isso é **confirmação interna**, não assinatura digital ICP-Brasil.
17. Exporte ciência, presença, votos e auditoria; imprima a ata em PDF.

Para testar horários sem esperar 15 dias, use exclusivamente o Firestore Emulator com fixtures locais. Nunca altere a regra de 15 dias em produção só para testar.

## Testes das regras

O teste `tests/firestore-assemblies.rules.test.mjs` cobre usuário anônimo, associado, voto sem presença, voto antecipado, duplicidade/imutabilidade, comentários, audit logs e admin nível 1.

Requisitos: JDK 21 ou superior e Firebase CLI atual. Execute:

```powershell
npm run test:rules
```

Se a máquina estiver com Java 8, o Firebase Emulator atual não inicia; instale um JDK 21 e confirme com `java -version`.

Para a demonstração local, inicie o Emulator, defina `FIRESTORE_EMULATOR_HOST` e execute `npm run seed:assembly:emulator`. O script cria 10 associados, uma assembleia, três pautas, comentários e votos fictícios, e se recusa a iniciar sem o endereço do Emulator. Nunca use esse seed em produção.

## Limitações honestas do modo reservado

`reserved` impede associados comuns de ler votos de terceiros. Como a arquitetura é exclusivamente cliente/Spark e não possui backend criptográfico independente, administradores com `canCertifyResults` conseguem acessar votos individuais para apurar. Portanto, não descreva esse modo como “voto secreto absoluto”.

O SHA-256 da ata detecta alteração interna, mas não é assinatura ICP-Brasil.

## Checklist antes de uma assembleia real

- Estatuto, quórum e interpretação da maioria revisados por assessoria jurídica.
- Data e três horários conferidos no fuso America/Sao_Paulo.
- Regras e índices publicados no projeto correto.
- App Check observado em métricas antes de enforcement.
- Associados ativos e `eligibleToVote` revisados.
- E-mails e domínios do Authentication testados.
- Presidente e substituto conseguem entrar como nível 1.
- URLs de documentos abrem no celular sem exigir conta pessoal.
- Fluxo completo ensaiado no Emulator e depois em assembleia de teste sem valor deliberativo.
- Plano de contingência e canal oficial de suporte comunicados.
- Exportações e backup lógico testados.
- Linguagem “voto reservado” e “confirmação interna” usada corretamente.
