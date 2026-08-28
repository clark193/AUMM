"use client";

import Image from "next/image";
import Link from "next/link";
import { FileCheck2, Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/paths";

const menuGroups = [
  {
    title: "A associação",
    items: [
      { label: "Início", href: "/" },
      { label: "Quem somos", href: "/quem-somos" },
      { label: "Diretoria", href: "/diretoria" },
      { label: "Estatuto Social", href: "/estatuto" },
      { label: "O que já fizemos", href: "/realizacoes" },
    ],
  },
  {
    title: "Ações e comunidade",
    items: [
      { label: "Notícias", href: "/noticias" },
      { label: "Projetos", href: "/projetos" },
      { label: "Centro de Apoio ao Motoboy", href: "/centrodeapoioaomotoboy" },
      { label: "Eventos", href: "/eventos" },
      { label: "Benefícios", href: "/beneficios" },
      { label: "Parceiros", href: "/parceiros" },
      { label: "Apoio e patrocínio", href: "/patrocinadores" },
    ],
  },
  {
    title: "Informações e acesso",
    items: [
      { label: "Transparência financeira", href: "/transparencia" },
      { label: "Documentos", href: "/documentos" },
      { label: "Verificar carteirinha", href: "/verificar" },
      { label: "Contato", href: "/contato" },
    ],
  },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <header className="site-header">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="topline"><div className="container topline-inner"><span>Atuação em todo o Brasil</span><span>A força da organização dos trabalhadores</span></div></div>
    <div className="container nav-wrap">
      <Link href="/" className="brand" aria-label="AUMM — Início">
        <Image src={withBasePath("/logo.png")} width={72} height={72} priority alt="Logo da AUMM" />
        <span><strong>AUMM</strong><small>Associação União Maior Motoboys</small></span>
      </Link>
      <div className="public-header-actions">
        <Link className="nav-login" href="/associado/login"><UserRound size={16} /> Área do associado</Link>
        <Link className="button button-sm public-header-join" href="/associe-se">Associe-se</Link>
        <button className="menu-toggle public-menu-toggle" type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="public-menu" aria-label="Abrir menu completo"><Menu /><span>Menu</span></button>
      </div>
    </div>

    {open && <div className="public-menu-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="public-menu-drawer" id="public-menu" role="dialog" aria-modal="true" aria-label="Menu principal">
        <div className="public-menu-head">
          <div><Image src={withBasePath("/logo.png")} width={54} height={54} alt="AUMM" /><span><strong>Menu AUMM</strong><small>Navegue por todo o site</small></span></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu"><X /></button>
        </div>
        <nav className="public-menu-groups" aria-label="Navegação principal">
          {menuGroups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}</section>)}
        </nav>
        <div className="public-menu-access">
          <Link href="/associado/login" onClick={() => setOpen(false)}><UserRound /> <span><strong>Portal do associado</strong><small>Acesse carteirinha, eventos e benefícios</small></span></Link>
          <Link href="/verificar" onClick={() => setOpen(false)}><FileCheck2 /> <span><strong>Verificar carteirinha</strong><small>Consulte a validade de uma credencial</small></span></Link>
          <Link className="button" href="/associe-se" onClick={() => setOpen(false)}>Quero me associar</Link>
        </div>
      </aside>
    </div>}
  </header>;
}
