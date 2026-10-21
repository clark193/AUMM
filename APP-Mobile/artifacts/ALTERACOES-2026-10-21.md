# Atualização AUMM — 21/10/2026

## Aplicativo e site

- Início com identidade vermelha/branca, hierarquia mais clara, título da união e rodapé maiores. Notícias, apoio e notificações conservam seus fluxos.
- Cabeçalho mostra o nome completo da conta com truncamento; foto acompanha `memberPhotos`. Associado ativo não recebe convite para se associar novamente.
- Emergência: contato cadastrado previamente em Meu Perfil; acionamento somente por confirmação. Sem contato, orienta o cadastro. Falta de GPS não impede registrar alerta sem coordenadas; falta de conexão não é apresentada como sucesso. A diretoria recebe avisos no painel e liga manualmente ao associado/contato. Nenhum SMS é aberto ou enviado.
- Cadastro completo aceita datas antigas em texto ou Timestamp. Administração autorizada envia/troca foto ou abre a câmera. Apenas nível 1 altera senha de associado pelo servidor, com confirmação da própria senha, auditoria e revogação de sessões; conta administrativa não pode ser alvo. A remoção do perfil continua preservando o login Authentication, conforme escolha anterior.
- Compartilhamento: opções exatas de 30 minutos, 1, 2, 4, 8 ou 12 horas. Compartilhar e Copiar link são botões separados. O destinatário usa o navegador, sem conta ou aplicativo. O mapa recebe novas posições, expira e é revogado ao encerrar. “Traçar rota até a pessoa” usa a última posição; Android usa `geo:`, iOS usa Apple Maps e desktop usa Google Maps. O navegador/sistema decide se apresenta uma escolha de aplicativos ou abre o padrão configurado.
- Android usa serviço de localização visível, com aviso e botão Encerrar. Credenciais são renovadas durante sessões longas e mantidas somente na memória. Forçar parada, reiniciar/desligar ou restrições do fabricante podem interromper o serviço. No navegador, o envio requer a tela ativa.
- Eventos publicados aparecem no início, com lista de próximos/anteriores, filtro por data e detalhes. Datas sem horário não inventam meia-noite nem mudam para o dia anterior. Nenhuma participação/inscrição fictícia foi criada.
- Minhas jornadas registra ganhos/despesas em centavos, odômetro e resumo mensal real, com persistência local por conta. Dados não são sincronizados nem recuperados após limpar o armazenamento. Calculadoras, manutenção e checklist existentes permanecem.
- Ícones Android têm área de segurança maior para recortes redondos/adaptativos. Não existe projeto iOS neste repositório.

## Recursos do associado dentro da interface do aplicativo

| Recurso | Implementação |
|---|---|
| Cadastro de filiação | Formulário React existente compilado localmente no APK |
| Carteirinha e renovação | `MemberCardContent`, foto atualizada e QR para o domínio público |
| Benefícios e parceiros | `MemberBenefits` com as coleções existentes |
| Documentos e estatuto | `DocumentLibrary` e `StatutePage`; arquivos externos continuam abrindo seu documento |
| Assembleias | `AssemblyMember`: ciência, presença, discussão, voto, resultados e aprovação interna de ata conforme permissão |
| Ata finalizada | Leitura dentro da interface, sem depender da impressão Android |
| Transparência financeira | `MemberFinancialTransparency` com as permissões existentes |
| Perfil, foto, preferências, senha e desfiliação | `MemberSettingsPage` integrado diretamente |
| Notícias, comunicados, apoio, emergência, eventos e notificações | Fluxos React locais e dados reais do Firestore |
| Administração | Painel React compilado localmente no APK, com os mesmos níveis do site |

Esses recursos não carregam o portal remoto em iframe ou página incorporada. Componentes e regras de negócio do site são compartilhados no build.

## Infraestrutura e dados

As regras completas estão em `FIREBASE-REGRAS-COMPLETAS.txt`; a fonte é `firestore.rules`. Mudanças: prazo máximo de 12 horas, upload administrativo de fotos com validação de formato e bloqueio de sessões antigas por `sessionRevocations` (somente servidor). Sem migração obrigatória dos documentos existentes.

O servidor Render permanece gratuito e usa uma permissão IAM personalizada somente para ler/atualizar usuários Authentication, além das permissões já existentes. Não foi ativado Blaze, criado serviço pago ou colocada chave administrativa no APK/site. Hospedagem gratuita pode dormir e atrasar push; o registro no painel depende de internet e de administradores conectados.

## Validação

- Testes unitários: datas legadas, cálculos, valores inválidos, apoio e notificações.
- Regras: 33 cenários, incluindo limite de 12h, fotos autorizadas, privacidade e sessões revogadas.
- Java real: política GPS, pacote REST autenticado e revogação sob as regras emuladas.
- Authentication emulado: troca real de senha, recusa da senha anterior, bloqueio de nível 2/conta administrativa/sessão antiga e auditoria sem senha.
- Navegador: link público independente, mapa com tiles, deslocamento GPS simulado, expiração/revogação; emergência com/sem GPS, confirmação/cancelamento e avisos para administradores de níveis 3 e 5 sem exposição indevida.
- Prévia visual sem escritas no Firebase ou mensagens reais.

As verificações adicionais de interface, build, assinatura e publicação serão registradas abaixo ao término.

## Limites de teste

Não há telefone Android conectado. GPS com tela bloqueada por 12h, consumo de bateria, câmera, seletor de navegação e push com aplicativo fechado precisam de validação em aparelho físico. Os testes não alteram senhas de usuários reais nem disparam mensagens de emergência reais. Nenhuma promessa de socorro ou entrega imediata foi adicionada.
