import { STATUTE_VERSION } from "./version";
export { STATUTE_VERSION } from "./version";
export const STATUTE_REGISTERED_DATE = "15 de agosto de 2021";

export type StatuteBlock =
  | { type: "heading"; text: string }
  | { type: "article"; id: string; number: string; text: string }
  | { type: "paragraph"; text: string };

export type StatuteChapter = {
  id: string;
  roman: string;
  title: string;
  blocks: StatuteBlock[];
};

const STATUTE_TRANSCRIPTION = `# ESTATUTO SOCIAL DA ASSOCIAÇÃO UNIÃO MAIOR MOTOBOYS (AUMM)

## CAPÍTULO I

### DO NOME, SEDE, DURAÇÃO E OBJETO

**Art. 1º** A Associação União Maior Motoboys (AUMM) fundada em 15 de agosto de 2021, é uma associação dotada de personalidade jurídica de direito privado, sem fins econômicos, políticos ou religiosos, com sede na Rua Curitibanos, nº 50, bairro Vila Nova, CEP 89035-060 e foro no município de Blumenau, estado de Santa Catarina, e se regerá pelo presente Estatuto e pelas disposições legais que lhe forem aplicáveis.

**Parágrafo Único:** a Associação União Maior Motoboys (AUMM) poderá constituir e manter núcleos de atuação diretamente ou com entidades parceiras afins em todo território nacional.

**Art. 2º** O prazo de duração da Associação União Maior Motoboys (AUMM) é indeterminado e ilimitado o número de associados.

**Art. 3º** A Associação União Maior Motoboys (AUMM) tem por objetivo:

**I.** Promoção e defesa dos direitos dos associados, respaldados na solidariedade, na ética e na democracia;

**II.** Desenvolvimento de projetos educativos, sociais e culturais; observando os princípios da legalidade, transparência, impessoalidade, moralidade, economicidade e da eficiência; sem qualquer forma de discriminação racial, de gênero, orientação sexual, nacionalidade, religião, situação econômica ou qualquer outro aspecto social;

**III.** Desenvolvimento de ações de proteção social, segurança e saúde do trabalho; atendo-se a proteção e segurança no trânsito de associados;

**IV.** Promoção de melhorias das condições de trabalho e defesa dos interesses dos associados;

**V.** Desenvolvimento de ações de valorização e reconhecimento do trabalho exercido por motoboys e motociclistas de entregas rápidas;

**VI.** Promoção da cooperação, da solidariedade e da ajuda mútua.

**Art. 4º** Para atingir seus objetivos, a Associação União Maior Motoboys (AUMM), na medida de suas possibilidades e respeitada a autonomia dos associados e parceiros, se propõe a:

**I.** Desenvolver projetos educativos, sociais, culturais, ambientais e recreativos;

**II.** Promover ações voltadas a proteção social, segurança e saúde do trabalho, proteção e segurança no trânsito e mobilidade urbana;

**III.** Disponibilizar espaço físico e infraestrutura para o desenvolvimento de atividades que promovam a formação e organização dos associados;

**IV.** Promover mobilizações, campanhas de valorização do trabalho e defesa dos direitos de motoboys e motociclistas de entregas rápidas;

**V.** Efetuar parcerias, convênios e congêneres com órgãos e ou entidades públicas e ou privadas nacionais e ou estrangeiras. Em conformidade com a legislação, para o desenvolvimento de projetos e ações de: assistência social, saúde, cultura, educação, segurança e saúde do trabalhador, mobilidade urbana, segurança no trânsito, trabalho e renda e outros temas de interesse dos associados;

**VI.** Integrar-se a instituições educacionais para o desenvolvimento de atividade de pesquisa, extensão e ensino; para o desenvolvimento de tecnologias alternativas, produção e divulgação de informações, conhecimentos técnicos e científicos que digam respeito aos objetivos previstos no art. 3º;

**VII.** Promover estudos e pesquisas que abordem sobre inclusão socioeconômica de motoboys e motociclistas de entregas rápidas, identificando mercados, produtos alternativos, mecanismos de divulgação, comercialização de bens e serviços;

**VIII.** Organizar, promover e patrocinar eventos, seminários, fóruns, formações, congressos, simpósios, mostras e outras atividades de interesse dos associados;

**IX.** Fomentar, entre os associados, o espírito de solidariedade visando a comunhão de interesses, contribuindo para o desenvolvimento da pessoa humana, despertando neles a consciência dos direitos humanos e deveres dos associados e motivando-os a participarem das atividades na plenitude de seus direitos;

**X.** Representar e defender as aspirações e reivindicações dos associados no âmbito municipal, estadual, federal e internacional, bem como todas as causas que contribuam para o desenvolvimento dos presentes objetivos;

**XI.** Promover a divulgação das ações da Associação União Maior Motoboys (AUMM) na comunidade e região;

---

## CAPÍTULO II

### DO CAPITAL SOCIAL E RECURSOS FINANCEIROS

**Art. 5º** Os recursos financeiros necessários a manutenção da Associação União Maior Motoboys (AUMM) poderão ser obtidos por meio de:

**I)** Contribuições periódicas ou eventuais de seus associados;

**II)** Recursos públicos recebidos por meio de parceria, convênios, subvenções, contratos, acordos, termos de colaboração ou termos de parceria para financiamento de projetos na sua área de atuação;

**III)** Contratos e acordos firmados com a iniciativa privada, agências nacionais e internacionais;

**IV)** Doações, legados e heranças;

**V)** Rendimentos de aplicações de seus ativos financeiros e outros pertinentes ao patrimônio sob a sua administração;

**VI)** Recebimento de direitos autorais;

**VII)** Subvenções, contribuições, auxílios, doações que venha a receber de pessoas naturais e ou estrangeiras;

**VIII)** Receitas resultantes da prestação de serviços, vendas de publicações, materiais e comercialização de produtos;

**IX)** Outras receitas que se verificarem factíveis e compatíveis com suas finalidades e princípios de atuação.

**Art. 6º** A Associação União Maior Motoboys (AUMM) não distribui entre seus associados, diretores, secretários, tesoureiro, conselheiros ou doadores, eventuais excedentes operacionais brutos ou líquidos, dividendos, bonificações, participações ou parcelas do seu patrimônio, auferidos mediante o exercício de suas atividades, aplicando tais valores integralmente na consecução de seus objetivos sociais.

---

## CAPÍTULO III

### DOS ASSOCIADOS

**Art. 7º** Poderão associar-se a Associação União Maior Motoboys (AUMM) motoboys, ciclistas e motociclistas de entregas rápidas, de acordo com a CBO nº 5191.

**Parágrafo único:** os associados e associadas são autônomos e sem vínculo empregatício com a Associação União Maior Motoboys (AUMM), a qual não responde solidária e nem subsidiariamente por quaisquer compromissos que sejam assumidos pelos associados.

### DAS CATEGORIAS DOS ASSOCIADOS

**Art. 8º** Os Associados e associadas dividir-se-ão nas seguintes categorias:

**I)** Motoboys, ciclistas e motociclistas de entregas rápidas.

**II)** Associado (a) honorário (a) – pessoas físicas, instituições ou entidades que tenham contribuído de maneira excepcional para o desenvolvimento da Associação União Maior Motoboys (AUMM).

**Parágrafo Único:** os associados (as) honorários (as) não possuem direito a voto.

### DA ADMISSÃO DOS ASSOCIADOS

**Art. 9º** A admissão de associados e associadas será feita através do Registro de Associado, que consiste no preenchimento de formulário assinado pelo interessado e encaminhado para análise e aprovação do Conselho Diretor da Associação União Maior Motoboys (AUMM).

**§1º.** No caso de motociclistas, junto ao formulário deverá ser apresentado cópia da Carteira Nacional de Habilitação (CNH).

**§2º.** Os motoboys, ciclistas e motociclistas de entregas rápidas terão pleno gozo de suas atividades na Associação União Maior Motoboys (AUMM) após a aprovação de sua filiação, registrada em ata do Conselho Diretor.

**§3º.** Caberá ao Conselho Diretor considerar a relevância da contribuição prestada, homologar a indicação e conferir o título de Associado Honorário.

**Art. 10º** Serão excluídos, conforme especificado no Regimento Interno da Associação União Maior Motoboys (AUMM), os associados e associadas que:

**I.** Deixarem de existir juridicamente;

**II.** Infringirem o Estatuto Social, o Regimento Interno, as determinações do Conselho Diretor da Associação União Maior Motoboys (AUMM), bem como as obrigações ou deveres decorrentes dos cargos que lhes foram confiados ou outorgados na administração da Associação União Maior Motoboys (AUMM), inclusive as conservantes a débitos;

**III.** Atentarem contra o nome ou a existência da Associação União Maior Motoboys (AUMM), promovendo descrédito ou desunião entre os associados;

**IV.** Utilizarem-se da situação de associado ou filiado em benefício próprio ou de seu empreendimento, entidade ou instituição de vínculo;

**V.** Danificarem ou comprometerem o patrimônio social.

**§1º.** Compete ao Conselho Diretor analisar os recursos e aprovar a exclusão do associado.

**§2º.** O desligamento do associado, em qualquer caso, não gera direito a restituição das contribuições realizadas, bem como não gera direito à cota de fração ideal do patrimônio.

**§3º.** O(a) associado (a) que estiver de posse de documentos, instrumentos, equipamentos, móveis, utensílios ou qualquer outro bem de propriedade da Associação União Maior Motoboys (AUMM) deverá devolvê-lo imediatamente, por ocasião do seu desligamento, conforme termo de responsabilidade de uso de patrimônio da Associação União Maior Motoboys (AUMM).

### DOS DIREITOS DOS ASSOCIADOS

**Art. 11º** São direitos dos associados e associadas filiados:

**I.** Votar e ser votado nas Assembleias Gerais;

**II.** Compor o Conselho Diretor e Conselho Fiscal;

**III.** Apresentar propostas ou projetos de interesse dos associados para apreciação pela administração da Associação União Maior Motoboys (AUMM);

**IV.** Utilizar-se de todos os serviços oferecidos aos associados da Associação União Maior Motoboys (AUMM);

**V.** Fazer parte de Comissões ou Projetos para as quais forem nomeados;

**VI.** Recorrer das decisões da Administração da Associação União Maior Motoboys (AUMM) ou do Conselho Diretor na Assembleia Geral;

**VII.** Solicitar o seu desligamento da Associação União Maior Motoboys (AUMM) através de carta escrita justificando seu pedido;

**VIII.** Ser informado (a) das atividades desenvolvidas pela Associação União Maior Motoboys (AUMM);

**IX.** Solicitar, a qualquer momento, informações relativas às atividades da Associação União Maior Motoboys (AUMM);

**X.** Receber as publicações de atividades da Associação União Maior Motoboys (AUMM);

**XI.** Receber avaliadores de projetos nas visitas de acompanhamento, sempre que estiver envolvido na execução dos mesmos;

**XII.** Receber apoio para divulgação e participação em eventos e atividades, conforme decisão do Conselho Diretor;

**XIII.** Receber informações periódicas das atividades, das finanças e dos eventos da Associação União Maior Motoboys (AUMM);

**XIV.** Utilizar o espaço para reuniões e eventos, desde que acordado no coletivo;

**XV.** Receber formação e assessoramento técnico;

**§1º.** Perderá seus direitos o/a associado (a) que deixar de comparecer a 3 (três) assembleias consecutivas, sem justificativas;

**§2.** Não gozarão dos direitos estabelecidos neste artigo os associados (as) que estiverem em débito com suas obrigações perante a Associação União Maior Motoboys (AUMM).

### DAS OBRIGAÇÕES DOS ASSOCIADOS

**Art. 12º** São deveres dos associados (as) filiados à Associação União Maior Motoboys (AUMM):

**I)** Cumprir e respeitar as determinações do Estatuto Social, do Regimento Interno, das deliberações das Assembleias Gerais e do Conselho Diretor da Associação União Maior Motoboys (AUMM);

**II)** Exercer assiduamente as atribuições do cargo que lhe forem confiadas;

**III)** Zelar pelo nome e pelos bens da Associação União Maior Motoboys (AUMM) e de seus associados;

**IV)** Comparecer às reuniões, seminários, conferências, cursos e eventos promovidos ou apoiados pela Associação União Maior Motoboys (AUMM) para os quais tenham sido convidados;

**V)** Efetuar com a contribuição mensal, como acordado nas deliberações estabelecidas na Assembleia de Fundação da Associação, a ser coletada pelo coordenador administrativo financeiro ou demais integrantes do conselho diretor.

**VI)** Respeitar os membros da gestão da Associação União Maior Motoboys (AUMM) em função da autoridade investida no cargo e os demais associados (as), especialmente quando reunidos em nome da Associação União Maior Motoboys (AUMM);

**VII)** Contribuir para o fortalecimento da Associação União Maior Motoboys (AUMM) proporcionando-lhe colaboração eficiente e constante;

**VIII)** Assumir as suas funções junto a Associação União Maior Motoboys (AUMM) de forma correta, preservando desta forma a unidade de todos para o bem comum;

**IX)** Participar de trabalhos de mutirão em benefício da Associação União Maior Motoboys (AUMM) ou de seus associados, visando o auxílio mútuo solidário;

**X)** Exercer, com zelo e dedicação, os compromissos e atribuições que tenham assumido junto à Associação União Maior Motoboys (AUMM);

**XI)** Zelar pelo patrimônio social, pelo bom andamento dos trabalhos e pelo bom tratamento aos que os desempenham;

**XII)** Não se manifestar publicamente sobre assuntos cuja competência seja da Administração da Associação União Maior Motoboys (AUMM);

**XIII)** Garantir que suas atividades estejam de acordo com as respectivas leis;

**XIV)** Participar dos eventos, formações e reuniões relacionadas aos objetivos da associação;

**XV)** Zelar pela qualidade de produtos ofertados e serviços prestados;

**XVI)** Opinar efetivamente, buscar ser propositivo (a) e participar com ideias inovadoras e viáveis para a Associação União Maior Motoboys (AUMM);

**§1º** São de responsabilidade dos (as) associados (as): manter atualizadas as informações e dados relativos às suas atividades junto à Associação União Maior Motoboys (AUMM).

---

## CAPÍTULO IV

### COMPOSIÇÃO DA ADMINISTRAÇÃO

**Art. 13º** Administração da Associação União Maior Motoboys (AUMM) possui a seguinte composição:

**I)** Assembleia Geral;

**II)** Conselho Diretor;

**III)** Conselho Fiscal;

**IV)** Coordenações e Comissões Especiais.

### DAS ASSEMBLEIAS GERAIS

**Art. 14º** A Assembleia Geral, é órgão supremo da Associação União Maior Motoboys (AUMM), constituído pelos associados (as) em pleno gozo dos seus direitos e cujas decisões são soberanas e vinculam a todos, ainda que ausentes.

**Art. 15º** Compete à Assembleia Geral:

**I)** Eleger a cada dois (2) anos os membros do Conselho Diretor e do Conselho Fiscal;

**II)** Votar o relatório anual de atividades apresentado pelo Conselho Diretor;

**III)** Votar o balanço anual, previamente apreciado pelo Conselho Fiscal; aprovar ou reprovar as contas de resultado e deliberar sobre a destinação de eventuais resultados ou sobre a recuperação de perdas;

**IV)** Deliberar anualmente sobre o plano de atividades, bem como sobre o orçamento anual correspondente para o exercício seguinte, apresentado pelo Conselho Diretor;

**V)** Avaliar e deliberar sobre diretrizes e linhas prioritárias de ação, de criação e ou de ampliação de programas propostos pelo Conselho Diretor;

**VI)** Deliberar sobre a aquisição, venda, permuta, cessão de direitos, comodatos, arrendamento, hipoteca, gravame de ônus real ou oneração sobre bens imóveis da Associação União Maior Motoboys (AUMM), delegando ao Conselho Diretor a tramitação necessária;

**VII)** Decidir sobre as propostas de admissão ou exclusão de associados (as), nos termos deste Estatuto;

**VIII)** Deliberar sobre alterações propostas a este Estatuto;

**IX)** Aprovar o Regimento Interno da Associação União Maior Motoboys (AUMM) e suas alterações;

**X)** Aprovar o plano de cargos e salários da Associação União Maior Motoboys (AUMM);

**XI)** Decidir sobre a implementação de outras unidades ou estabelecimentos vinculados a Associação União Maior Motoboys (AUMM) em qualquer parte do território nacional, de modo a bem exercer suas atividades;

**XII)** Convocar o Conselho Diretor em caráter extraordinário;

**XIII)** Dissolver ou declarar extinta a Associação União Maior Motoboys (AUMM) nos termos do disposto no artigo nº 41 do presente Estatuto;

**XIV)** Julgar em última instância os recursos impetrados pelos associados;

**XV)** Destituir o Conselho Diretor da Associação União Maior Motoboys (AUMM);

**XVI)** Resolver os casos omissos deste Estatuto.

**§ 1º** Para a deliberação do que se refere nos incisos VIII e XIV será exigido quórum qualificado de 2/3 dos associados presentes;

**§ 2º** Os membros do Conselho Diretor e do Conselho Fiscal tomarão posse em até 30 (trinta) dias após a sua eleição;

**Art. 16º** A convocação da Assembleia Geral será feita pelo Presidente do Conselho Diretor ou por 1/5 (um quinto) dos associados, com antecedência mínima de 15 (quinze) dias, por convocação fixada na sede da Associação União Maior Motoboys (AUMM) e por correspondência eletrônica com manifestação de recebimento pelos associados (as), com a indicação da data, do horário, do local e da ordem do dia, devendo ser publicamente divulgada e encaminhada a todos associados.

**Art. 17º** Salvo os casos expressamente previstos neste Estatuto, a Assembleia Geral funcionará legalmente em primeira chamada com a presença de, no mínimo, dois terços (2/3) dos associados; em segunda chamada, meia hora após, com no mínimo a metade dos associados; e em terceira chamada, meia hora após, com qualquer número de associados presentes.

**Art. 18º** Salvo os casos expressamente previstos neste Estatuto, as resoluções da Assembleia Geral serão tomadas pelo voto da maioria simples dos associados presentes.

**Art. 19º** A Assembleia Geral reunir-se-á ordinariamente uma vez por ano até a segunda quinzena de abril, e extraordinariamente sempre que convocada pelo Conselho Diretor ou por 1/5 (um quinto) dos associados.

### DO CONSELHO DIRETOR E SEUS MEMBROS

**Art. 20º** O Conselho Diretor da Associação União Maior Motoboys (AUMM) é constituído pelo: Presidente do Conselho Diretor, Coordenador Administrativo-Financeiro, Coordenador da Secretaria, por 4 (quatro) Coordenadores Adjuntos, eleitos em Assembleia Geral, para um mandato de dois anos, sendo permitida uma reeleição.

**Parágrafo Único** – em caso de vacância, os cargos serão exercidos pelos demais membros do Conselho Diretor de acordo com o estabelecido neste Estatuto, até a próxima Assembleia Geral.

**Art. 21º** O Conselho Diretor se reunirá mensalmente para acompanhar o funcionamento geral da Associação União Maior Motoboys (AUMM) e a implementação das deliberações da Assembleia Geral.

**Art. 22º** Compete ao Conselho Diretor:

**I)** Cumprir e fazer cumprir as disposições estatutárias e regulamentares, bem como as decisões das Assembleias Gerais;

**II)** Propor à Assembleia Geral a admissão e exclusão de associados (as);

**III)** Planejar, organizar e dirigir as atividades da Associação União Maior Motoboys (AUMM);

**IV)** Administrar bens, recursos financeiros e benefícios aos associados, de acordo com as deliberações da Assembleia Geral e do Regimento Interno;

**V)** Elaborar e analisar, propostas de mudança no Estatuto Social e Regimento Interno a serem encaminhadas à Assembleia Geral;

**VI)** Constituir comissões de estudos, elaboração, desenvolvimento e execução de projetos, bem como aprovar e designar os respectivos coordenadores ou gerentes de projetos;

**VII)** Preencher os cargos destinados ao funcionamento da Associação União Maior Motoboys (AUMM), respeitando o orçamento;

**VIII)** Analisar o planejamento estratégico e a proposta orçamentária do exercício subsequente;

**IX)** Celebrar contratos, convênios e parcerias com órgãos ou entidades públicas ou privadas, nacionais ou estrangeiras para a mútua colaboração em atividades de interesse comum, de acordo com os objetivos da Associação União Maior Motoboys (AUMM);

**X)** Criar os cargos de coordenadores de projetos ou comissões que julgar necessários ao funcionamento e objetivos da Associação União Maior Motoboys (AUMM), bem como nomear pessoas para ocuparem esses cargos, definindo o tempo de permanência e suas atribuições;

**XI)** Analisar os relatórios da diretoria executiva, dos coordenadores dos projetos e das comissões;

**XII)** Aprovar e implantar reajustes de contribuições e taxas;

**XIII)** Decidir sobre os casos omissos neste Estatuto e no Regimento Geral, e sobre dúvidas quanto a aplicação dos atos normativos da Associação União Maior Motoboys (AUMM);

**XIV)** Formular propostas relativas à gestão administrativa da Associação União Maior Motoboys (AUMM);

**XV)** Discutir e propor ações prioritárias da cultura local e regional;

**XVI)** Participar das ações do planejamento que promovam o desenvolvimento regional e a responsabilidade ambiental na área da abrangência da Associação União Maior Motoboys (AUMM);

**XVII)** Aprovar o ingresso dos associados na Associação União Maior Motoboys (AUMM);

**XVIII)** Propor e aprovar moções e pareceres.

### ATRIBUIÇÕES DO PRESIDENTE DO CONSELHO DIRETOR

**Art. 23º** Compete ao Presidente do Conselho Diretor:

**I)** Representar a Associação União Maior Motoboys (AUMM), ativa e passivamente, judicial e extrajudicialmente ou delegar esta representação a qualquer membro do Conselho Diretor e, na impossibilidade destes, a qualquer associado efetivo, especificando os limites da representação;

**II)** Convocar e presidir Assembleias Gerais ordinárias e extraordinárias, e reuniões do Conselho Diretor;

**III)** Propor, aprovar e publicar a pauta das reuniões e das assembleias;

**IV)** Implementar os cargos e regentes de projetos, coordenadores de comissões ou coordenadorias regionais criadas pelo Conselho Diretor;

**V)** Elaborar, protocolar e entregar, no ato da posse dos membros eleitos, o Termo de Responsabilidade dos integrantes da Administração da Associação União Maior Motoboys (AUMM);

**VI)** Assinar, em conjunto com o Secretário, os convênios e parcerias efetuadas com terceiros, após aprovadas pelo Conselho Diretor;

**VII)** Apresentar à Assembleia Geral, os relatórios de atividades, balanços contábeis e financeiros da Associação União Maior Motoboys (AUMM);

**VIII)** Elaborar o planejamento estratégico da Associação União Maior Motoboys (AUMM) e apresentar à Assembleia Geral;

**IX)** Manter contato com entidades públicas ou privadas para execução de convênios ou parcerias, ou para definir políticas da Associação União Maior Motoboys (AUMM);

**X)** Submeter ao Conselho Diretor os expedientes oriundos das coordenarias e comissões de projetos;

**XI)** Solicitar a contribuição dos conselheiros e delegar competências;

**XII)** Constituir e extinguir, após aprovadas e registradas em atas do Conselho Diretor, coordenadorias ou comissões criadas para realização de ações específicas;

**XIII)** Assinar, em conjunto com o Secretário, as atas da Associação União Maior Motoboys (AUMM);

**XIV)** Admitir, promover, conceder licença, suspender, dispensar ou demitir funcionários, ou contratar quaisquer serviços permanentes ou eventuais, aprovados pelo Conselho Diretor;

**XV)** Abrir contas bancárias, conforme aprovado pelo Conselho Diretor, e assinar cheques em conjunto com o Tesoureiro ou com o Procurador com poderes específicos;

**XVI)** Solicitar apoio institucional necessário para consecução dos objetivos da Associação União Maior Motoboys (AUMM);

**XVII)** Deliberar sobre medida de urgência necessária à execução das atividades da Associação União Maior Motoboys (AUMM), *ad referendum*, do Colegiado;

**XVIII)** Propor criação de coordenadorias, visando a administração descentralizada da Associação União Maior Motoboys (AUMM);

**XIX)** Praticar os demais atos necessários ao cumprimento das atribuições do Conselho Diretor.

### ATRIBUIÇÕES DO COORDENADOR DE SECRETARIA

**Art. 24º** Compete ao coordenador de secretaria:

**I)** Secretariar as Assembleias Gerais ordinárias e extraordinárias e as reuniões do Conselho Diretor, bem como elaborar as respectivas atas;

**II)** Substituir o Presidente do Conselho Diretor nos seus impedimentos em todas as suas atribuições;

**III)** Auxiliar os trabalhos do Presidente do Conselho Diretor;

**IV)** Manter os arquivos relativos à memória do Conselho Diretor;

**V)** Manter os arquivos dos documentos da Associação União Maior Motoboys (AUMM), tais como originais do cartão CNPJ, Estatuto Social, Ata de Constituição, declaração RAIS, declarações do Imposto de Renda, livros fiscais e contábeis, inclusive dos exercícios anteriores à sua gestão;

**VI)** Efetuar inscrição de associados, encaminhar para aprovação pela Assembleia Geral ou Conselho Diretor e manter o registro dos associados arquivado;

**VII)** Elaborar procurações com poderes específicos, conforme definido pelo Conselho Diretor, assinando em conjunto com o Presidente do Conselho Diretor;

**VIII)** Assessorar técnica e administrativamente o Conselho Diretor;

**IX)** Receber dos membros do Conselho Diretor, sugestões para a pauta de reuniões;

**X)** Elaborar a pauta das reuniões para a aprovação do Presidente do Conselho Diretor;

**XI)** Convocar as reuniões do Conselho Diretor, por determinação do Presidente;

**XII)** Solicitar aos Coordenadores de Comissões ou de Projetos, os documentos e relatórios dos assuntos para reunião do Conselho Diretor.

### ATRIBUIÇÕES DO COORDENADOR ADMINISTRATIVO FINANCEIRO

**Art. 25º** Compete ao Coordenador Administrativo Financeiro:

**I)** Elaborar orçamentos, balanços, balancetes, documentos de restauração de contas, documentos financeiros, de crédito e débitos;

**II)** Exercer a guarda, o controle e a atualização constante de livros fiscais, contas bancárias, créditos e débitos e demais documentos financeiros, contábeis e da Tesouraria, referentes ao exercício em vigência, conservando-os prontos para exibição a quem de direito;

**III)** Encaminhar ao Secretário, para arquivo na Secretaria Geral, os documentos contábeis de exercícios anteriores, após a prestação de contas;

**IV)** Efetuar diretamente ou por meio bancário, pagamentos, recebimentos e cobranças necessárias ao funcionamento da Associação União Maior Motoboys (AUMM);

**V)** Administrar e controlar o patrimônio da Associação União Maior Motoboys (AUMM), mantendo registros atualizados de todos os bens;

**VI)** Assinar, em conjunto com o Presidente, balancetes mensais e anuais, recibos, cheques, ordens de pagamento e demais documentos bancários;

**VII)** Abrir e movimentar contas bancárias, juntamente com o Presidente do Conselho Diretor;

**VIII)** Apresentar semestralmente ao Conselho Diretor, balancete geral das atividades da Associação União Maior Motoboys (AUMM);

**IX)** Efetuar depósito em conta corrente da Associação União Maior Motoboys (AUMM), das importâncias sob sua responsabilidade;

**X)** Receber e assinar documentos em nome da Associação União Maior Motoboys (AUMM), das ofertas, doações, legados, auxílios e subvenções dos poderes públicos, entidades parceiras ou órgãos financiadores de projetos.

### ATRIBUIÇÕES DOS COORDENADORES ADJUNTOS

**Art. 26º** Compete aos Coordenadores Adjuntos:

**I)** Substituir o Coordenador Administrativo Financeiro e Coordenador de Secretaria nos seus impedimentos ou sucedê-los em caso de vacância, até a próxima Assembleia Geral;

**II)** Auxiliar nas atividades do Conselho Diretor da Associação União Maior Motoboys (AUMM).

### DO CONSELHO FISCAL

**Art. 27º** O Conselho Fiscal é composto e 3 (três) membros titulares e 3 (três) membros suplentes eleitos em Assembleia Geral Ordinária.

**Parágrafo único:** em caso de vacância, o mandato será assumido pelo respectivo suplente, até o término.

**Art. 28º** A duração do mandato dos membros do Conselho Fiscal é de 2 (dois) anos, podendo ser reeleito uma vez.

**Art. 29º** O Conselho Fiscal reunir-se-á, no mínimo, uma vez por ano para análise e aprovação da prestação de contas do exercício finalizado, cujo relatório deve ser apresentado para análise na Assembleia Geral Ordinária, extraordinária ou quando for convocado pelo Conselho Diretor.

**Art. 30º** Compete ao Conselho Fiscal;

**I)** Fiscalizar a situação financeira da Associação União Maior Motoboys (AUMM), emitindo parecer de aprovação ou rejeição das contas;

**II)** Examinar os livros de escrituração da Associação União Maior Motoboys (AUMM);

**III)** Apreciar e opinar sobre balanços e relatórios de desempenho financeiro e contábil e sobre as operações patrimoniais realizadas, emitindo pareceres para o Conselho Diretor;

**IV)** Requisitar, a qualquer tempo, ao Presidente do Conselho Diretor e ao Tesoureiro, a documentação comprobatória das operações econômico-financeiras realizadas pela Associação União Maior Motoboys (AUMM);

**V)** Contratar e acompanhar o trabalho de eventuais auditores externos independentes;

**VI)** Verificar se as operações e atividades realizadas por prestadores de serviço correspondem em volume, qualidade e valor ao convencionado em contrato ou termo.

### DAS COORDENAÇÕES DE COMISSÕES ESPECIAIS

**Art. 31º** Poderão ser instituídas coordenações e comissões especiais pela Assembleia Geral, por proposição do Conselho Diretor.

**Art. 32º** No ato de criação deverão ser definidas:

**I)** Composição;

**II)** Atribuições;

**III)** Prazos de atuação;

**IV)** Condições de funcionamento, no caso das comissões especiais.

---

## CAPÍTULO V

### DA EXECUÇÃO DA ADMINISTRAÇÃO DA ASSOCIAÇÃO UNIÃO MAIOR MOTOBOYS – (AUMM)

**Art. 33º** Na Gestão Administrativa da Associação União Maior Motoboys (AUMM) deverão ser observados os seguintes princípios:

**I)** Do trabalho: dignidade do trabalhador e trabalhadora, respeito à integridade física e moral do trabalhador (a), rendimento justo, com segurança e proteção social, liberdade de manifestação e organização;

**II)** Da gestão pública: legalidade, impessoalidade, moralidade, publicidade, economicidade e eficiência;

**III)** Dos direitos humanos: nenhum tipo de discriminação social, racial ou de gênero, religião, ideologia, cultura.

**Art. 34º** As eleições para o Conselho Diretor e Conselho Fiscal serão organizadas e coordenadas por um Comitê Eleitoral constituído com antecedência mínima de 30 (trinta) dias do pleito e composto por 3 (três) associados da Associação União Maior Motoboys (AUMM), todos não candidatos a cargos eletivos.

**Art. 35º** Compete ao Comitê Eleitoral:

**I)** Divulgar entre os associados e associadas, através de circulares e/ou outros meios adequados, o número e a natureza de vagas existentes;

**II)** Fixar o prazo para inscrição de chapa de candidatos (as), de modo que possam ser conhecidos e divulgados os nomes 5 (cinco) dias antes da data da Assembleia Geral que vai proceder a eleição;

**III)** Registrar as chapas inscritas, verificando se estão no gozo dos seus direitos sociais e se foi observado os dispositivos deste Estatuto;

**IV)** Homologar as chapas inscritas;

**V)** Estudar as impugnações, prévia ou posteriormente formuladas por associados no gozo dos seus direitos sociais, bem como as denúncias de irregularidades nas eleições.

**Art. 36º** Requisitos mínimos para concorrer aos cargos:

**I)** Ser associado de fato e de direito, filiado a Associação União Maior Motoboys (AUMM) no mínimo há 6 (seis) meses antes da realização das eleições;

**II)** Estar em dia com suas obrigações junto a Associação União Maior Motoboys (AUMM);

**III)** Ter residência e domicílio na região de abrangência da Associação União Maior Motoboys (AUMM).

**Art. 37º** Somente serão aceitas chapas com composição para todos os cargos do Conselho de Direção.

---

## CAPÍTULO VI

### DA RENDA E DO PATRIMÔNIO

**Art. 38º** O Patrimônio da Associação União Maior Motoboys (AUMM) constituir-se-á de bens móveis e imóveis, veículos, semoventes, ações e títulos da dívida pública ou legados cedidos à Associação União Maior Motoboys (AUMM) ou por ela adquiridos.

**Art. 39º** Os bens, rendas e direitos da Associação União Maior Motoboys (AUMM) só podem ser utilizados na consecução de seus objetivos sociais.

**Art. 40º** Venda, permuta ou alienação de bens e valores da Associação União Maior Motoboys (AUMM) será obrigatória a aprovação da Assembleia Geral Ordinária.

**Art. 41º** Em caso de dissolução da Associação União Maior Motoboys (AUMM), que só se dará por deliberação expressa em Assembleia Geral Ordinária com um quórum de 75% (setenta e cinco por cento) de seus associados em pleno direito de voto, o patrimônio será destinado à outra entidade congênere da área social, preferencialmente que tenha os mesmos objetivos da Associação União Maior Motoboys (AUMM).

---

## CAPÍTULO VII

### DA ELABORAÇÃO DAS ATAS

**Art. 42º** Todas as atas de reuniões e assembleias da Associação União Maior Motoboys (AUMM) e dos Conselhos, deverão ser assinadas e rubricadas todas as páginas pelo Presidente do Conselho Diretor e pelo secretário da reunião ou assembleia.

**I)** Os demais participantes da reunião ou assembleia assinam a lista de presença do evento que deverá ser anexada à respectiva ata;

**II)** A ata deverá ser lida e validada no início da próxima reunião ou assembleia;

**III)** Se houver correções, deverão ser registradas na ata de validação;

**IV)** Os originais das atas devem permanecer arquivados junto a secretaria da Associação União Maior Motoboys (AUMM).

---

## CAPÍTULO VIII

### DA DISPOSIÇÕES GERAIS

**Art. 43º** Os casos omissos neste Estatuto serão resolvidos no Regimento Interno ou em Assembleia Geral.

**Art. 44º** A Associação União Maior Motoboys (AUMM) tem legitimidade ativa *ad causam* para invocar a tutela jurisdicional, propondo as ações jurídicas cabíveis, inclusive a Ação Civil Pública, na defesa dos interesses coletivos.

**Art. 45º** Revogam-se as disposições contrárias ao presente Estatuto.

**Blumenau, 15 de agosto de 2021.**`;

function clean(value: string) {
  return value.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function parseStatute(): StatuteChapter[] {
  const lines = STATUTE_TRANSCRIPTION.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const chapters: StatuteChapter[] = [];
  let current: StatuteChapter | null = null;
  for (const line of lines) {
    if (line === "---" || line.startsWith("# ESTATUTO SOCIAL")) continue;
    const chapter = /^## CAPÍTULO (.+)$/.exec(line);
    if (chapter) {
      current = { id: `capitulo-${chapter[1].toLowerCase()}`, roman: chapter[1], title: "", blocks: [] };
      chapters.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("### ")) {
      const heading = line.slice(4).trim();
      if (!current.title) current.title = heading;
      else current.blocks.push({ type: "heading", text: heading });
      continue;
    }
    const article = /^\*\*Art\.\s*(\d+)º\*\*\s*(.*)$/.exec(line);
    if (article) {
      current.blocks.push({ type: "article", id: `art-${article[1]}`, number: article[1], text: article[2] });
      continue;
    }
    current.blocks.push({ type: "paragraph", text: clean(line) });
  }
  return chapters;
}

export const statute2021 = {
  version: STATUTE_VERSION,
  title: "Estatuto Social da AUMM",
  association: "Associação União Maior Motoboys",
  registeredDate: STATUTE_REGISTERED_DATE,
  chapters: parseStatute(),
  signatories: [
    ["Rodrigo Fellipe dos Santos", "Presidente Conselho Diretor"],
    ["Paulo Renato Ferreira da Costa", "Coordenador de Secretaria"],
    ["Rafael Cristiano da Silva", "Coordenador Administrativo-Financeiro"],
    ["Rodrigo Saraiva Lopes", "Coordenador Adjunto"],
    ["Felipe de Souza", "Coordenador Adjunto"],
    ["Leandro Pimentel Couto", "Coordenador Adjunto"],
    ["Diogo Pereira Spiecker", "Coordenador Adjunto"],
  ] as const,
};
