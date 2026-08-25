# Documentos Institucionais

## Colocar o Estatuto atual no projeto

1. Renomeie o PDF para `estatuto-social-aumm-2021.pdf`.
2. Coloque-o em `public/documentos/estatuto/estatuto-social-aumm-2021.pdf`.
3. Confirme localmente abrindo `http://localhost:3000/documentos/estatuto/estatuto-social-aumm-2021.pdf`.
4. Entre no painel como nível 1 e abra **Documentos**.
5. Categoria: **Estatuto Social**; título: **Estatuto Social da Associação União Maior Motoboys — AUMM**; versão: **2021**.
6. Origem: **Arquivo interno do site**; caminho: `/documentos/estatuto/estatuto-social-aumm-2021.pdf`.
7. Escolha visibilidade **Público**, salve o rascunho, teste o arquivo e publique.
8. Confirme a pergunta para marcá-lo como vigente. O Estatuto anterior será preservado como substituído.

## Ata antiga pelo Google Drive

1. No Drive, configure conscientemente quem pode abrir o arquivo.
2. No painel, abra **Documentos → Novo documento**.
3. Escolha **Ata de Assembleia** ou **Ata do Conselho Diretor**.
4. Informe título, data, número/ano e descrição.
5. Em origem, selecione **Link externo/Google Drive** e cole a URL.
6. Escolha Público, Somente associados ou Somente administração.
7. Use **Testar link**, salve e publique.

A visibilidade da AUMM protege a listagem no portal, mas não torna privada uma URL que esteja pública diretamente no Drive.

## Ata criada pela Assembleia eletrônica

1. Encerre a assembleia, gere a minuta, revise e finalize a ata.
2. No quadro **Comprovação e exportações**, clique **Publicar ata no Portal**.
3. Informe o número e a visibilidade (`public`, `members` ou `admin`).
4. O sistema cria `documents/{id}` com `sourceType: assembly_minutes` e grava o ID em `assemblies/{id}.publishedDocumentId`.
5. A ata aparece automaticamente na biblioteca correta e não pode ser publicada duas vezes.

## Visibilidade e permissões

- `public`: visitante lê somente se `published == true`.
- `members`: associado autenticado e ativo lê; visitante não.
- `admin`: somente administração autorizada.

Permissões delegáveis em `adminRoles/{uid}.permissions`: `canManageDocuments`, `canPublishDocuments` e `canArchiveDocuments`. Níveis 1 e perfis já autorizados para documentos continuam compatíveis.

## Collections

- `documents`: metadados, URLs, fonte, visibilidade, histórico e vínculo com assembleia.
- `documentAuditLogs`: ações administrativas imutáveis.

PDF, scan e arquivo grande nunca são armazenados em Base64 no Firestore.

## Firebase

Antes de usar em produção, publique `firestore.rules` e `firestore.indexes.json` no mesmo projeto Firebase do site. Nenhuma nova API, Storage, Function ou cobrança é necessária.
