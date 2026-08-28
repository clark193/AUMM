import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BatteryCharging,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Droplets,
  GraduationCap,
  HandHeart,
  HeartPulse,
  MessageCircleMore,
  ShieldCheck,
  Toilet,
  UsersRound,
} from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { withBasePath } from "@/lib/paths";

export const metadata: Metadata = {
  title: { absolute: "Centro de Apoio ao Motoboy | AUMM Blumenau" },
  description: "Conheça o projeto Centro de Apoio ao Motoboy, iniciativa da Associação União Maior Motoboys para oferecer apoio, estrutura, orientação e capacitação aos motoboys e entregadores de Blumenau.",
  alternates: { canonical: "https://aumm.com.br/centrodeapoioaomotoboy" },
  openGraph: {
    title: "Centro de Apoio ao Motoboy - AUMM",
    description: "Conheça o projeto da AUMM para criar em Blumenau um espaço de apoio, orientação, segurança e valorização dos motoboys e entregadores.",
    url: "https://aumm.com.br/centrodeapoioaomotoboy",
    siteName: "AUMM",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "https://aumm.com.br/logo.png", width: 1694, height: 1384, alt: "Logo oficial da AUMM" }],
  },
  twitter: {
    card: "summary",
    title: "Centro de Apoio ao Motoboy - AUMM",
    description: "Projeto da AUMM para apoio, orientação, segurança e valorização dos motoboys e entregadores de Blumenau.",
    images: ["https://aumm.com.br/logo.png"],
  },
};

const services = [
  { icon: Droplets, title: "Descanso e hidratação", text: "Espaço para pequenas pausas, água e estrutura básica durante a jornada." },
  { icon: Toilet, title: "Banheiro e higiene", text: "Acesso a instalações adequadas para os trabalhadores." },
  { icon: BatteryCharging, title: "Recarga de celular", text: "Pontos de energia para celulares e equipamentos utilizados durante o trabalho." },
  { icon: MessageCircleMore, title: "Orientação", text: "Informações sobre segurança, trânsito, direitos, serviços e benefícios ligados à atividade." },
  { icon: GraduationCap, title: "Capacitação", text: "Cursos e palestras sobre trânsito, primeiros socorros, prevenção de acidentes e desenvolvimento profissional." },
  { icon: HeartPulse, title: "Saúde e prevenção", text: "Campanhas e ações de saúde realizadas em parceria com instituições." },
  { icon: UsersRound, title: "Espaço da categoria", text: "Local para reuniões, encontros, assembleias e atividades promovidas pela AUMM." },
];

const impacts = [
  "Oferecer um ponto de referência para a categoria.",
  "Melhorar as condições de apoio durante a jornada.",
  "Ampliar ações de segurança e prevenção.",
  "Realizar capacitações e atividades educativas.",
  "Aproximar motoboys, empresas e instituições.",
  "Fortalecer a organização e a valorização profissional.",
  "Contribuir para uma mobilidade urbana mais segura.",
];

const stages = [
  "Planejamento e definição da estrutura.",
  "Captação de recursos e parceiros.",
  "Adequação do espaço.",
  "Aquisição de mobiliário e equipamentos.",
  "Estruturação e instalação.",
  "Início das atividades.",
  "Desenvolvimento contínuo de ações, campanhas e capacitações.",
];

export default function SupportCenterPage() {
  return <PublicShell>
    <section className="support-center-hero">
      <div className="container support-center-hero-grid">
        <div className="support-center-hero-copy">
          <span className="eyebrow light">Projeto social · em desenvolvimento</span>
          <h1>Centro de Apoio<br />ao Motoboy</h1>
          <p>Um espaço de acolhimento, apoio, orientação e valorização para quem movimenta Blumenau todos os dias.</p>
          <div className="support-center-location"><Building2 /><span><strong>Associação União Maior Motoboys – AUMM</strong><small>Blumenau / Santa Catarina</small></span></div>
          <div className="hero-actions"><Link className="button" href="/contato">Quero apoiar o projeto <ArrowRight /></Link><a className="button button-ghost" href="#sobre-o-projeto">Conhecer a proposta</a></div>
        </div>
        <div className="support-center-mark" aria-label="Identidade oficial da AUMM">
          <div className="support-center-logo"><Image src={withBasePath("/logo.png")} width={300} height={300} priority alt="Logo oficial da AUMM" /></div>
          <span><i /> Projeto em fase de captação</span>
        </div>
      </div>
    </section>

    <section className="section support-center-intro" id="sobre-o-projeto">
      <div className="container support-center-two-columns">
        <div><span className="eyebrow">Sobre o projeto</span><h2>Um ponto de referência para quem trabalha sobre duas rodas.</h2></div>
        <div className="support-center-prose"><p>O Centro de Apoio ao Motoboy é uma iniciativa da Associação União Maior Motoboys – AUMM para criar em Blumenau um ponto de referência destinado aos profissionais que trabalham diariamente sobre duas rodas.</p><p>A proposta é oferecer um espaço simples, organizado e acolhedor, onde motoboys e entregadores possam realizar pequenas pausas durante a jornada, ter acesso a estrutura básica, receber orientações e participar de ações de segurança, prevenção e capacitação.</p><p>Além do apoio cotidiano, o Centro deverá receber atividades da AUMM, reuniões da categoria, campanhas educativas e projetos desenvolvidos com empresas, instituições e poder público.</p></div>
      </div>
    </section>

    <section className="section surface support-center-why">
      <div className="container support-center-two-columns">
        <div className="support-center-dark-card"><span>Por que esse projeto?</span><h2>A rua é o local de trabalho. Falta um lugar seguro para a pausa.</h2><p>Motoboys são fundamentais para restaurantes, farmácias, mercados, lojas, empresas e muitos outros setores da cidade.</p></div>
        <div><p className="lead">Muitos profissionais passam grande parte da jornada nas ruas sem um local adequado para:</p><ul className="support-center-check-list">{["Fazer uma pausa e beber água.","Utilizar banheiro.","Carregar o celular.","Proteger-se temporariamente da chuva ou do calor.","Receber orientação.","Participar de ações voltadas à categoria."].map((item) => <li key={item}><CheckCircle2 /> {item}</li>)}</ul></div>
      </div>
    </section>

    <section className="section">
      <div className="container"><div className="section-heading"><div><span className="eyebrow">Estrutura planejada</span><h2>O que pretendemos oferecer</h2></div><p>Uma estrutura funcional, construída de acordo com os recursos captados e as parcerias confirmadas.</p></div><div className="support-center-services">{services.map(({ icon: Icon, title, text }, index) => <article key={title}><span>0{index + 1}</span><Icon /><h3>{title}</h3><p>{text}</p></article>)}</div></div>
    </section>

    <section className="section support-center-objective">
      <div className="container"><div className="support-center-objective-card"><ShieldCheck /><div><span className="eyebrow light">Nosso objetivo</span><h2>Apoio, segurança, saúde e valorização.</h2><p>Criar e estruturar um espaço físico adequado para oferecer apoio, serviços, orientação e capacitação aos motoboys e entregadores de Blumenau, promovendo melhores condições de trabalho, segurança, saúde, educação e bem-estar, além de fortalecer a união, a valorização e a representatividade da categoria.</p></div></div></div>
    </section>

    <section className="section">
      <div className="container support-center-audience"><div><span className="eyebrow">Quem será beneficiado</span><h2>Profissionais que atuam diariamente nas ruas de Blumenau.</h2><p>O projeto é voltado principalmente a motoboys, entregadores, trabalhadores de plataformas, profissionais autônomos e pessoas que utilizam a motocicleta como instrumento de trabalho.</p></div><div className="support-center-audience-list">{["Motoboys e entregadores","Profissionais de plataformas de entrega","Trabalhadores autônomos da categoria","Profissionais que usam motocicleta no trabalho"].map((item) => <span key={item}><BriefcaseBusiness /> {item}</span>)}</div></div>
    </section>

    <section className="section surface">
      <div className="container"><div className="section-heading"><div><span className="eyebrow">Impacto esperado</span><h2>Uma base para cuidar, orientar e aproximar.</h2></div></div><div className="support-center-impact-grid">{impacts.map((item) => <article key={item}><CheckCircle2 /><p>{item}</p></article>)}</div></div>
    </section>

    <section className="section support-center-stages">
      <div className="container"><div className="section-heading"><div><span className="eyebrow">Etapas do projeto</span><h2>Da captação ao início das atividades</h2></div><p>O cronograma depende dos recursos disponíveis e das parcerias obtidas ao longo da implantação.</p></div><ol>{stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span><div><small>Etapa {index + 1}</small><strong>{stage}</strong></div></li>)}</ol></div>
    </section>

    <section className="section surface">
      <div className="container support-center-accountability">
        <article><ShieldCheck /><span className="eyebrow">Transparência do projeto</span><h2>Responsabilidade em cada etapa.</h2><p>A Associação União Maior Motoboys acredita que toda parceria deve ser construída com responsabilidade e transparência. Conforme o projeto avançar, esta página poderá receber atualizações sobre parceiros, etapas concluídas, ações realizadas e resultados alcançados.</p></article>
        <article><HandHeart /><span className="eyebrow">Apoiadores do projeto</span><h2>Construção coletiva.</h2><p>Projeto em fase de captação de parceiros.</p></article>
      </div>
    </section>

    <section className="section support-center-updates">
      <div className="container support-center-two-columns"><div><span className="eyebrow light">Atualizações</span><h2>Novas informações serão publicadas conforme o projeto avançar.</h2></div><div><p>Parcerias confirmadas, aquisições, definição do espaço, adequações, capacitações, eventos e prestações de contas poderão ser acompanhados nos canais oficiais da AUMM.</p><Link className="button button-light" href="/noticias">Acompanhar notícias <ArrowRight /></Link></div></div>
    </section>

    <section className="section support-center-contact">
      <div className="container"><div><span className="eyebrow">Empresas e parceiros</span><h2>Quer apoiar este projeto?</h2><p>Empresas e instituições podem contribuir com apoio financeiro, equipamentos, mobiliário, serviços, materiais ou outras parcerias ligadas à implantação e manutenção do Centro.</p></div><Link className="button" href="/contato">Quero apoiar o projeto <ArrowRight /></Link></div>
    </section>
  </PublicShell>;
}
