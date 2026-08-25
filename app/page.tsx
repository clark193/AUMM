import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, Handshake, HeartHandshake, ShieldCheck, UsersRound } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { BoardWall } from "@/components/BoardWall";
import { news } from "@/lib/content";

export default function HomePage() {
  return <PublicShell>
    <section className="hero">
      <div className="hero-grid container">
        <div className="hero-copy">
          <span className="eyebrow light"><span className="pulse"/> Blumenau sobre duas rodas</span>
          <h1>Mais união.<br/><em>Mais respeito.</em><br/>Mais segurança.</h1>
          <p>A AUMM representa quem trabalha, se desloca e movimenta Blumenau todos os dias. Juntos, somos uma voz mais forte.</p>
          <div className="hero-actions"><Link className="button" href="/associe-se">Quero me associar <ArrowRight size={18}/></Link><Link className="button button-ghost" href="/quem-somos">Conheça a AUMM</Link></div>
          <div className="hero-trust"><span><ShieldCheck/> Atuação responsável</span><span><BadgeCheck/> Gestão transparente</span></div>
        </div>
        <div className="hero-visual" aria-label="Identidade da AUMM">
          <div className="hero-logo-ring"><Image src="/logo.png" fill sizes="(max-width: 800px) 70vw, 420px" priority alt="AUMM — Associação de motoboys e motociclistas de Blumenau" /></div>
        </div>
      </div>
      <div className="hero-stripe"><div className="container"><span>Representatividade</span><i/> <span>Benefícios</span><i/> <span>Segurança</span><i/> <span>Comunidade</span></div></div>
    </section>
    <section className="section intro-section"><div className="container split">
      <div><span className="eyebrow">Nossa razão de existir</span><h2>Quem vive a realidade das ruas merece ser ouvido.</h2></div>
      <div><p className="lead">A AUMM nasceu para transformar desafios individuais em conquistas coletivas — com diálogo, presença e compromisso.</p><Link className="text-link" href="/quem-somos">Conheça nossa história <ArrowRight size={17}/></Link></div>
    </div></section>
    <section className="section surface"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">O que fazemos</span><h2>Uma associação presente<br/>em cada parte da jornada.</h2></div><p>Atuação prática para proteger direitos, criar oportunidades e fortalecer toda a categoria.</p></div>
      <div className="feature-grid">
        {[{icon:UsersRound,title:"Representação",text:"Defendemos os interesses da categoria em diálogo com poder público, empresas e sociedade."},{icon:ShieldCheck,title:"Proteção",text:"Orientação, apoio e ações que promovem mais segurança e dignidade no trabalho."},{icon:Handshake,title:"Benefícios",text:"Parcerias e convênios que geram economia real para o associado e sua família."},{icon:HeartHandshake,title:"Comunidade",text:"Uma rede próxima, solidária e pronta para agir quando um companheiro precisa."}].map((item, i)=><article className="feature-card" key={item.title}><span className="feature-number">0{i+1}</span><item.icon/><h3>{item.title}</h3><p>{item.text}</p><Link href={i===2?"/beneficios":"/projetos"} aria-label={`Saiba mais sobre ${item.title}`}><ArrowRight/></Link></article>)}
      </div>
    </div></section>
    <section className="section cta-band"><div className="container cta-band-grid"><div><span className="eyebrow light">Faça parte</span><h2>Você não precisa rodar sozinho.</h2><p>Associe-se e tenha uma rede inteira ao seu lado.</p></div><div className="cta-benefits"><span><CheckCircle2/> Carteirinha digital</span><span><CheckCircle2/> Rede de benefícios</span><span><CheckCircle2/> Suporte e orientação</span></div><Link className="button button-light" href="/associe-se">Começar cadastro <ArrowRight size={18}/></Link></div></section>
    <section className="section"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">Fique por dentro</span><h2>Notícias da AUMM</h2></div><Link className="text-link" href="/noticias">Ver todas <ArrowRight size={17}/></Link></div>
      <div className="news-grid">{news.map((item,i)=><Link className={i===0?"news-card news-featured":"news-card"} href={`/noticias/${item.slug}`} key={item.slug}><div className="news-art"><span>{item.category}</span>{i===0?<ShieldCheck/>:i===1?<Handshake/>:<CalendarDays/>}</div><div className="news-body"><small>{item.date}</small><h3>{item.title}</h3><p>{item.summary}</p><span className="read-more">Ler notícia <ArrowRight size={16}/></span></div></Link>)}</div>
    </div></section>
    <BoardWall/>
  </PublicShell>;
}
