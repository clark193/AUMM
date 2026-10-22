# Revisão de bugs e APK — 22/10/2026

## Correções

- Contatos de apoio e emergências: links `tel:` agora abrem o discador pelo AppLauncher no Android. E-mail e links de navegação também usam o aplicativo apropriado; páginas HTTPS continuam no navegador. Falhas de abertura aparecem na interface administrativa. Nenhuma ligação é efetuada automaticamente.
- Dados de acesso copiados pela administração e links do estatuto usam o endereço público da AUMM no aplicativo, em vez de `localhost`.
- Voltar de uma ferramenta administrativa retorna primeiro à lista de ferramentas. Voltar do estatuto ou da privacidade retorna ao formulário de filiação, preservando o preenchimento.
- Ao conceder novamente um cargo a uma pessoa com acesso administrativo desativado, o seletor começa no nível 5, em vez de reaproveitar um nível alto anterior. Cargo e nível continuam independentes e exigem confirmação explícita.

Código das correções: `db1bf5d7a0d846e8dd802d283863a9cf6623cbca`.

## Verificação

- 64 testes de regras: aplicativo, autoridade administrativa, reuniões, contatos, assembleias e proteção dos dados.
- 25 testes unitários, sem testes ignorados, incluindo compilação Java e gravação/revogação REST nativa sob as regras reais do emulador.
- 4 testes dos handlers de notificações/reuniões e teste separado de alteração de senha: aprovados, sem mensagens FCM reais.
- Quatro scripts de interface: conta unificada/cadastro/temas/login salvo; atribuição e retirada de cargos/contatos/emergências/reuniões; emissão e cópia da credencial administrativa; regressão de perfil/nome longo/data/foto/cadastro legado.
- TypeScript, build web do aplicativo, sincronização Capacitor, `assembleDebug` e `bundleRelease`: aprovados.
- Build estático do site: 63 páginas. A primeira tentativa encontrou um erro no cache do Webpack; o cache foi preservado em backup e a compilação limpa passou.
- APK com assinatura v2 válida e certificado igual ao APK de teste anterior. Os 20 arquivos JavaScript empacotados coincidem com o build atual. Firebase de produção `aumm-21dda`; sem contas de demonstração nem servidor de desenvolvimento no pacote. AppLauncher, Clipboard e PushNotifications presentes.
- Manifesto lido e conferido: pacote `br.com.aumm.app`, versão `1.0.0`, código `1`, Android mínimo 7.0 (SDK 24), alvo SDK 36. Sem permissões `SEND_SMS`, `READ_SMS` ou `CALL_PHONE`.
- Site com as correções publicado em https://aumm.com.br, release Pages `2338288041735911386b5b0c569ad9b522610b8f`. Oito rotas retornaram HTTP 200 e 25 arquivos JavaScript públicos coincidem com o build local por SHA-256. Servidor de notificações respondeu HTTP 200 e recusou senha sem autenticação com HTTP 401.

## Arquivo para instalar

`aumm-2026-10-22-revisado-debug.apk`

Tamanho: 10.579.104 bytes, aproximadamente 10,1 MiB.

SHA-256: `f48a2a61cea4a556d142bf244a34ee1128c1410b82c42fc07602d45a861475ef`.

Pode atualizar a versão de teste anterior, pois o pacote e o certificado são os mesmos. O AAB gerado é sem assinatura de publicação e não substitui o APK de teste.

## Limites

Nenhum aparelho apareceu no `adb devices`. Portanto, esta revisão ainda precisa de validação em celular físico: câmera, discador, seletor de mapas, permissões, GPS prolongado e notificações com tela bloqueada/aplicativo fechado. A assinatura e o manifesto foram verificados, mas não houve teste de instalação no aparelho.

O servidor Render gratuito pode entrar em repouso; os horários de entrega dos lembretes continuam sujeitos à disponibilidade do servidor, rede e restrições do Android. Os testes aprovados não constituem garantia de ausência de todos os bugs.
