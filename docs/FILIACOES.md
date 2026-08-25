# Filiações simplificadas

## Fluxo público

A rota `/associe-se` solicita somente nome completo, data de nascimento, CPF, WhatsApp, e-mail, categoria (Motoboy ou Ciclista) e aceite do Estatuto Social versão 2021.

Ao abrir a página sem uma sessão Firebase, o sistema cria silenciosamente uma sessão anônima. Depois do envio, a sessão consulta apenas `membershipRequestOwners/{uid}` e o pedido que pertence ao mesmo UID. Por isso, ao atualizar a página ou abrir novamente no mesmo navegador, o formulário não reaparece e o status atual é mostrado.

O navegador guarda apenas o sinal de envio e o ID não sensível do pedido. CPF e data de nascimento não são gravados no `localStorage`, não aparecem em URLs e não são enviados a páginas públicas.

## Duplicidade e atomicidade

O CPF e o e-mail são normalizados. O navegador calcula SHA-256 com prefixo de domínio e grava, no mesmo `writeBatch`:

- `membershipRequests/{requestId}`;
- `membershipRequestCpfIndex/{cpfHash}`;
- `membershipRequestEmailIndex/{emailHash}`;
- `membershipRequestOwners/{ownerUid}`;
- o evento `MEMBERSHIP_REQUEST_CREATED` em `membershipAuditLogs`.

As regras permitem criar os índices, mas não atualizá-los. Assim, se um hash já existir, a operação inteira é recusada e nenhum pedido incompleto é criado. Os índices não podem ser listados nem lidos pelo público.

## Análise administrativa

Entre em `Admin → Filiações`. O Super Admin nível 1 possui acesso integral. Outros administradores precisam receber explicitamente `permissions.canManageMembershipRequests = true` em `adminRoles/{uid}`.

O administrador pode colocar o pedido em análise, conferir CPF completo quando necessário, registrar reunião/ata/observação, aprovar ou rejeitar. Para Motoboy, a aprovação só é liberada depois de marcar a documentação estatutária como conferida fora do sistema.

A conferência registra somente `statutoryDocumentVerified`, `statutoryDocumentVerifiedAt` e `statutoryDocumentVerifiedBy`. Nenhuma imagem, número ou arquivo de CNH é armazenado. O nome do agente fica no log imutável `MEMBERSHIP_DOCUMENT_VERIFIED`.

Ao aprovar, o fluxo atual cria o acesso de e-mail/senha, o registro privado em `associados`, o perfil mínimo em `publicMembers` e atualiza o pedido atomicamente. O painel entrega uma senha temporária para envio por canal privado. O associado pode alterá-la no portal.

## Estatuto versionado

O texto registrado está em `lib/statute/2021.ts`. Para uma nova versão, crie outro arquivo (por exemplo `lib/statute/2027.ts`), preserve o arquivo de 2021 e altere a constante usada como versão vigente somente depois da aprovação institucional. Nunca substitua silenciosamente a transcrição anterior.

## Teste local

1. Habilite Authentication anônima no Firebase ou use o Emulator Suite.
2. Execute `npm run dev` e abra `/associe-se`.
3. Use apenas dados de teste e um CPF matematicamente válido.
4. Atualize a página e confirme que o status permanece.
5. Entre como administrador e abra `/admin/filiacoes`.
6. Execute `npm run lint`, `npm run typecheck`, `npm test` e `npm run test:rules`.
