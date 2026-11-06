# Privacidade e exclusão — site e aplicativo AUMM

Páginas públicas, sem login: /privacidade/, /termos/, /exclusao/ e o alias /exclusão/. O endereço sem acento /exclusao/ é o canônico recomendado para o campo de exclusão de conta no Play Console. /privacidade/ é o endereço da política de privacidade.

As páginas identificam o aplicativo AUMM (br.com.aumm.app), a associação, as categorias de dados e finalidades observadas no projeto, localização com serviço em primeiro plano, provedores, armazenamento, segurança, conservação e atendimento. O contato WhatsApp +55 (47) 99252-4104 foi conferido em settings/public em 06/11/2026. Nenhum e-mail de contato foi inventado: o campo atual no Firebase estava vazio. Se o canal oficial mudar, atualizar lib/legalContent.ts e republicar as páginas.

## Solicitação e atendimento real

O formulário público prepara uma mensagem no WhatsApp oficial com e-mail de cadastro, nome opcional, tipo do pedido e detalhes opcionais. Ele não salva dados no Firestore, não envia e-mail, não gera protocolo e não apaga contas. O pedido só é recebido pela associação quando o usuário envia a mensagem na conversa. O atendimento também pode orientar por telefone e pelos canais de /contato/. Se o bot mostrar menu, o solicitante deve escolher atendimento humano.

A associação precisa acompanhar o canal e efetivamente tratar cada pedido. Confirmar a titularidade por contato já vinculado ou outro procedimento justificado, sem pedir senha ou código de autenticação. Confirmar recebimento e informar prazo de atendimento. Não foram inventados um SLA ou um prazo legal universal de exclusão. Havendo retenção, informar ao titular as categorias, motivo e prazo ou critério específico.

O botão de desassociação apenas inativa o vínculo. O botão administrativo de excluir perfil preserva a conta Firebase Authentication. Nenhum desses botões, isoladamente, conclui a exclusão de conta anunciada nesta página.

Após verificação e autorização do titular, o administrador responsável deve localizar a conta pelo UID e tratar o login no Firebase Authentication e os dados relacionados: users, associados, memberPhotos/adminPhotos, userPreferences, tokens de dispositivos/notificação, publicMembers/adminCards, solicitações de filiação e seus índices, localização/links, apoios e conversas. Conferir as referências no código antes de qualquer operação: nomes e relações variam por recurso. Encerrar acessos e links ativos, tratar dados em serviços conectados e confirmar a conclusão ao titular. Não executar exclusão em massa nem usar contas reais como teste.

Registros financeiros, contábeis, associativos, atas, votos e auditoria podem precisar de conservação específica e justificada. Limitar os dados e o acesso, anonimizar quando possível e informar o período aplicável. Não prometer eliminação de histórico público do GitHub ou de mensagens já controladas por terceiros; avaliar o caso e orientar o titular. Não manter toda a conta por mera conveniência.

## Aplicativo e Google Play

- O menu e rodapé do site e as configurações do associado indicam as páginas legais.
- No código Android/Capacitor, o modal de privacidade passa a abrir diretamente /exclusao/ e /termos/. A explicação de localização foi corrigida para refletir o serviço que continua com tela apagada/app minimizado quando o usuário inicia um compartilhamento.
- Esses ajustes no código embarcado exigem compilar, assinar e enviar uma nova versão APK/AAB para aparecer no aplicativo distribuído. Publicar o site não altera um APK já instalado. Esta tarefa não envia um aplicativo à Play Store.
- Preencher a seção Segurança dos dados do Play Console conforme as práticas efetivas, os SDKs e a versão distribuída; só a existência das páginas não garante aprovação.
- A AUMM deve manter suas práticas, prazos de atendimento e retenções alinhados às páginas e às informações declaradas na loja.

Referências oficiais consultadas em 06/11/2026:
- https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR
- https://support.google.com/googleplay/android-developer/answer/10144311?hl=pt-BR

## Validação

`node --experimental-strip-types --test tests/deletion-request.test.ts`

`npm run build:pages`

Conferir HTML público, formulário, contato e canonical, incluindo o caminho com acento, e preservar as páginas de notícias e imagens geridas automaticamente ao publicar o restante do site. Nenhuma exclusão real deve ser realizada como teste.
