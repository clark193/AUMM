# Notícias e prévias de compartilhamento

As notícias publicadas usam `/noticias/ID/`, com título, resumo, imagem, canonical, Open Graph e Twitter Card gravados no HTML exportado. O botão Compartilhar notícia usa este endereço, inclusive quando o visitante abriu o endereço legado `/noticias/publicacao/?id=ID`.

O comando build:pages prepara uma cópia JPEG leve do banner em public/news-previews/, com 1200 × 630 pixels e sem cortar a imagem original. Os metadados usam essa cópia no domínio AUMM, com tipo e dimensões explícitos. Os arquivos gerados devem ser publicados junto com o HTML, mas não versionados na main. A versão da imagem é incluída no link do botão para ajudar a renovar prévias em cache. Mensagens já enviadas no WhatsApp podem conservar a imagem antiga.

O GitHub Pages serve arquivos estáticos. A sincronização automática é feita pelo backend Render quando GITHUB_NEWS_TOKEN está configurado. Consulte APP-Mobile/backend/NEWS_PUBLISHING.md para ativação, limites e verificação. Depois disso, criar, editar, despublicar ou excluir uma notícia no painel dispensa recompilar o site manualmente. Até o deploy Pages terminar, a leitura pode ser feita pelo Firebase. Não publique informações privadas em notícias.

Execute `npm run build:pages`, com `NEXT_PUBLIC_FIREBASE_PROJECT_ID` e as demais variáveis públicas configuradas. Esse comando fixa o domínio público em https://aumm.com.br, mesmo que arquivos de ambiente antigos apontem para o Firebase Hosting. A exportação consulta exclusivamente notícias com status published pela API pública do Firestore, sem credenciais administrativas. Uma falha nessa consulta interrompe a compilação. Publique o conteúdo completo de out/ na gh-pages, preservando CNAME e .nojekyll, e confira o HTML no domínio.

Notícias sem imagem usam a logo institucional. O WhatsApp pode manter prévias antigas em cache; utilize o novo endereço `/noticias/ID/` e teste em uma mensagem nova. O endereço legado com query string conserva o HTML genérico, pois o Pages não consegue variá-lo por ID.

Validação: `node --experimental-strip-types --test tests/news-sharing.test.ts` e conferência do HTML exportado sem executar JavaScript. As alterações de Firebase não devem ser usadas como teste de produção.
