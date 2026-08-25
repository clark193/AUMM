import Link from "next/link";
import { ArrowRight, CheckCircle2, Handshake, HeartHandshake, ShieldCheck, UsersRound } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { BoardWall } from "@/components/BoardWall";
import { HomeNewsHero } from "@/components/HomeNewsHero";
import { PublicNewsFeed } from "@/components/PublicNewsFeed";

export default function HomePage() {
  return <PublicShell>
    <HomeNewsHero />
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
      <PublicNewsFeed compact />
    </div></section>
    <BoardWall/>
  </PublicShell>;
}
