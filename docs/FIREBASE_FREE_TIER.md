# Assembleias no Firebase Spark

O módulo foi desenhado para funcionar no plano gratuito Spark, usando somente Firebase Authentication, Cloud Firestore e o SDK Web já existente. Não há Cloud Functions, Cloud Run, Storage, servidor permanente ou API paga.

## Como o consumo foi reduzido

- As telas carregam no máximo 50 assembleias e cancelam todos os listeners ao sair.
- Somente a lista, as pautas da assembleia selecionada e os comentários da pauta atual usam atualização em tempo real.
- Votos, presenças, ciências, resultados e auditoria ficam em documentos separados; não existem arrays gigantes.
- O painel consulta os votos somente quando o administrador encerra/apura ou exporta.
- O colégio eleitoral é congelado uma vez na publicação. O lote aceita até 450 eleitores para permanecer abaixo do limite de 500 operações do Firestore.
- Imagens e anexos usam URL. Não grave vídeos, PDFs grandes ou fotos em base64 no Firestore.

## Acompanhar a cota

No Console Firebase, abra **Firestore Database → Uso** e acompanhe leituras, gravações, exclusões e armazenamento. Durante uma assembleia, evite abrir o mesmo painel em muitos dispositivos administrativos e não atualize a página repetidamente.

## Limites operacionais adotados

- Até 450 eleitores por publicação no fluxo atual.
- Comentário com no máximo 2.000 caracteres.
- Histórico inicial limitado a 50 assembleias.
- Uma votação é apurada uma vez; o resultado fica salvo como snapshot.
- CSV e PDF são gerados no navegador, sem servidor.

Se a associação ultrapassar esses limites, faça uma revisão de arquitetura antes da assembleia real. Não simplesmente remova as travas.

## Imagens

Use preferencialmente arquivos estáticos versionados em `public/` ou uma URL HTTPS já hospedada. O campo `assetUrl` desacopla o módulo e permite migrar para Storage futuramente, se o projeto passar ao Blaze. O upload direto de foto do associado continua sem Storage; por enquanto use URL de imagem ou um arquivo estático revisado pela administração.

## Backup no Spark

O Spark não oferece a exportação gerenciada para bucket. Antes de uma assembleia real:

1. preserve uma cópia do commit do código, `firestore.rules` e `firestore.indexes.json`;
2. exporte pelo painel os CSVs de eleitores, ciência, presença e votos;
3. exporte o JSON de auditoria;
4. imprima a ata finalizada em PDF;
5. guarde os arquivos em local institucional com controle de acesso.
