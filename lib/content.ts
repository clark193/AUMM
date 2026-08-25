export type NewsItem = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  featured?: boolean;
};

export const navItems = [
  { label: "Início", href: "/" },
  { label: "A AUMM", href: "/quem-somos" },
  { label: "Notícias", href: "/noticias" },
  { label: "Benefícios", href: "/beneficios" },
  { label: "Transparência", href: "/transparencia" },
  { label: "Contato", href: "/contato" },
];

export const news: NewsItem[] = [
  {
    slug: "campanha-seguranca-no-transito",
    title: "AUMM amplia diálogo por mais segurança no trânsito",
    summary: "Entidade reúne trabalhadores e poder público em uma agenda permanente de prevenção e respeito.",
    category: "Segurança",
    date: "22 AGO 2026",
    featured: true,
  },
  {
    slug: "novos-convenios-para-associados",
    title: "Novos convênios fortalecem a rede de benefícios",
    summary: "Oficinas, serviços e estabelecimentos locais passam a oferecer condições especiais aos associados.",
    category: "Benefícios",
    date: "18 AGO 2026",
  },
  {
    slug: "assembleia-geral-setembro",
    title: "Assembleia geral acontece em setembro",
    summary: "Encontro terá prestação de contas, planejamento e espaço aberto para propostas da categoria.",
    category: "Institucional",
    date: "12 AGO 2026",
  },
];

export const publicPages: Record<string, { eyebrow: string; title: string; intro: string; sections: { title: string; text: string }[] }> = {
  "quem-somos": {
    eyebrow: "A associação",
    title: "A força de quem movimenta Blumenau",
    intro: "A AUMM representa motoboys e motociclistas, promovendo respeito, segurança, qualificação e melhores condições para toda a categoria.",
    sections: [
      { title: "Nossa missão", text: "Unir, representar e defender os profissionais que fazem a cidade acontecer todos os dias." },
      { title: "Nossa visão", text: "Ser referência regional em proteção, desenvolvimento e valorização do trabalho sobre duas rodas." },
      { title: "Nossos valores", text: "União, transparência, respeito, responsabilidade e compromisso com a vida." },
    ],
  },
  diretoria: {
    eyebrow: "Governança",
    title: "Diretoria AUMM",
    intro: "Uma gestão próxima, responsável e comprometida com os associados.",
    sections: [
      { title: "Presidência", text: "Representação institucional e coordenação estratégica da associação." },
      { title: "Secretaria", text: "Organização administrativa, registros e relacionamento com os associados." },
      { title: "Conselho fiscal", text: "Acompanhamento independente das contas e da boa governança." },
    ],
  },
  projetos: {
    eyebrow: "Impacto",
    title: "Projetos que protegem e aproximam",
    intro: "Iniciativas construídas com a categoria para gerar segurança, oportunidade e qualidade de vida.",
    sections: [
      { title: "Pilotagem segura", text: "Capacitações práticas e campanhas permanentes de prevenção." },
      { title: "Apoio ao trabalhador", text: "Orientação, encaminhamento e rede de acolhimento para associados." },
      { title: "Voz nas ruas", text: "Escuta ativa e articulação com órgãos públicos e empresas." },
    ],
  },
  acoes: {
    eyebrow: "Presença",
    title: "Ações da AUMM",
    intro: "Mobilizações, campanhas educativas e atendimento direto onde a categoria precisa.",
    sections: [
      { title: "Blitz educativa", text: "Informação sobre equipamentos, direção defensiva e manutenção preventiva." },
      { title: "Escuta da categoria", text: "Encontros territoriais para transformar demandas em ações concretas." },
      { title: "Solidariedade", text: "Campanhas de apoio e resposta rápida em momentos críticos." },
    ],
  },
  beneficios: {
    eyebrow: "Vantagens",
    title: "Benefícios que acompanham sua rotina",
    intro: "Uma rede de parceiros pensada para reduzir custos e cuidar de quem vive sobre duas rodas.",
    sections: [
      { title: "Oficinas e peças", text: "Condições especiais em manutenção, pneus, peças e acessórios." },
      { title: "Saúde e bem-estar", text: "Acesso facilitado a serviços de saúde, proteção e qualidade de vida." },
      { title: "Formação", text: "Cursos e oportunidades para ampliar renda, segurança e desenvolvimento profissional." },
    ],
  },
  parceiros: {
    eyebrow: "Rede AUMM",
    title: "Parceiros que valorizam a categoria",
    intro: "Empresas locais que reconhecem a importância dos motoboys e motociclistas para Blumenau.",
    sections: [
      { title: "Moto Center Blumenau", text: "Desconto demonstrativo de 10% em serviços selecionados." },
      { title: "Protege Moto", text: "Condições demonstrativas em assistência e proteção veicular." },
      { title: "Academia Rota Ativa", text: "Planos especiais demonstrativos para associados ativos." },
    ],
  },
  eventos: {
    eyebrow: "Agenda",
    title: "Próximos eventos",
    intro: "Encontros, capacitações e assembleias para fortalecer a comunidade AUMM.",
    sections: [
      { title: "07 SET · 09H", text: "Passeio pela Vida — concentração no Parque Vila Germânica." },
      { title: "18 SET · 19H", text: "Assembleia geral — sede provisória da associação." },
      { title: "03 OUT · 08H", text: "Curso de pilotagem defensiva — vagas limitadas." },
    ],
  },
  contato: {
    eyebrow: "Fale conosco",
    title: "A AUMM está perto de você",
    intro: "Envie sua mensagem ou procure nossos canais de atendimento.",
    sections: [
      { title: "WhatsApp", text: "(47) 00000-0000 · número demonstrativo" },
      { title: "E-mail", text: "contato@aumm.com.br" },
      { title: "Atendimento", text: "Segunda a sexta, das 9h às 18h, em Blumenau/SC." },
    ],
  },
  privacidade: {
    eyebrow: "LGPD",
    title: "Política de Privacidade",
    intro: "A AUMM trata dados pessoais com transparência, segurança e finalidade definida.",
    sections: [
      { title: "Dados coletados", text: "Coletamos apenas os dados necessários para analisar cadastros, manter a relação associativa e cumprir obrigações legais." },
      { title: "Seus direitos", text: "Você pode solicitar acesso, correção, portabilidade, informação sobre compartilhamento e eliminação quando legalmente aplicável." },
      { title: "Segurança", text: "Usamos controles de acesso, registros de auditoria e armazenamento protegido para reduzir riscos de acesso indevido." },
    ],
  },
  termos: {
    eyebrow: "Uso responsável",
    title: "Termos de Uso",
    intro: "Regras essenciais para uma experiência segura e transparente na plataforma AUMM.",
    sections: [
      { title: "Conta pessoal", text: "Credenciais são individuais e não devem ser compartilhadas." },
      { title: "Informações corretas", text: "O usuário se compromete a fornecer informações verdadeiras e manter seus dados atualizados." },
      { title: "Uso adequado", text: "A plataforma não pode ser usada para fraude, abuso ou acesso não autorizado." },
    ],
  },
};
