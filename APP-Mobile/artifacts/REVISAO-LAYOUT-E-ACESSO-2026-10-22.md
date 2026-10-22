# Correções de layout e acesso — 22/10/2026

- Aplicativo: tabelas administrativas em cartões, dados e ações sem arraste lateral; contraste do tema escuro corrigido; dados longos do perfil quebram linha.
- Android: tratamento nativo das barras do sistema pelo SystemBars do Capacitor 8, viewport-fit=auto e fundo escuro da janela. A confirmação visual em aparelho físico permanece necessária.
- Administração exige vínculo ativo de associado, tanto na interface quanto nas regras e no servidor. Cargo e nível são independentes; atribuição por nível 1 na lista de associados. O próprio nível 1 não pode remover ou reduzir seu acesso.
- Painel separado de Administradores removido; endereço antigo redireciona para a lista de associados.
- Migração autorizada concluída: conta principal existente promovida a nível 1; sete contas administrativas antigas sem vínculo foram excluídas do Authentication, com revogação das sessões e limpeza das credenciais administrativas. Nenhuma conta associada foi excluída nessa migração.
- Catálogo de cargos complementado com Diretor, Secretaria, Administrativo-Financeiro e Coordenação Adjunta, sem conceder permissões por cargo.

## Verificações

65 testes de regras aprovados; 4 testes de notificações/reuniões aprovados; fluxo de senha administrativa no emulador aprovado. Teste adicional confirma que administrador sem associado não recebe aviso de reunião.

Interfaces: login unificado, alteração de cargo/nível, emergências, contatos, reuniões, credencial, perfil/foto e cadastro legado aprovados. Verificação de largura 320/360/390 px sem rolagem horizontal, contraste de texto de perfil/utilidades >=4,5:1 e ausência do painel separado.

Build estático de 63 páginas, TypeScript, Vite e Android (assembleDebug/bundleRelease) concluídos. Regras publicadas no projeto Firebase de produção.

APK: `aumm-2026-10-22-layout-corrigido-debug.apk`, 10.579.104 bytes; assinatura v2 válida e certificado igual à versão anterior. Os 20 scripts empacotados são idênticos ao build, usam Firebase de produção e não contêm contas de demonstração. SystemBars nativo e viewport auto conferidos dentro do APK. Sem permissões de envio de SMS ou ligação automática.

SHA256: `92c5684f4cdb299d7b639cb194407e55dabec95b54d00b668b633e3391372766`.

## Limitações

Não havia aparelho Android conectado para conferir fisicamente as barras do sistema, GPS em segundo plano e entrega de notificações. O servidor gratuito Render pode dormir; mantém-se a limitação de atraso em avisos e lembretes já documentada.

Referências técnicas: https://capacitorjs.com/docs/updating/8-0 e https://developer.android.com/develop/ui/views/layout/edge-to-edge .
## Publicação confirmada

- Fonte: `cb1da3926182d27d975f4a12bd57854243f8b6a9`.
- GitHub Pages: `ac601abe57564c91f05d0bc9470695a84aca65f9`. `https://aumm.com.br/versao.json` corresponde à fonte acima; nove rotas HTTP 200 e 26 scripts públicos com hashes idênticos à exportação local.
- Render: `dep-dbd1ph0ae00c738c3u8g`, estado live, mesma fonte; /health HTTP 200 e endpoint administrativo sem autenticação HTTP 401.
- Regras completas do artefato e arquivo raiz com SHA256 idêntico; publicação do Firebase concluída.
- Conta principal reconfirmada como associado ativo e nível 1 após a publicação; credencial pública antiga de associado invalidada para emissão da credencial do cargo.