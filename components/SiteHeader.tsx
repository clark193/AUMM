"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X, UserRound } from "lucide-react";
import { useState } from "react";
import { navItems } from "@/lib/content";
import { withBasePath } from "@/lib/paths";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <div className="topline"><div className="container topline-inner"><span>Atuação em todo o Brasil</span><span>A força da organização dos trabalhadores</span></div></div>
      <div className="container nav-wrap">
        <Link href="/" className="brand" aria-label="AUMM — Início">
          <Image src={withBasePath("/logo.png")} width={72} height={72} priority alt="Logo da AUMM" />
          <span><strong>AUMM</strong><small>Associação União Maior Motoboys</small></span>
        </Link>
        <button className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X /> : <Menu />}</button>
        <nav className={open ? "main-nav is-open" : "main-nav"} aria-label="Navegação principal">
          {navItems.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
          <Link className="nav-login" href="/associado/login" onClick={() => setOpen(false)}><UserRound size={16} /> Área do associado</Link>
          <Link className="button button-sm" href="/associe-se" onClick={() => setOpen(false)}>Associe-se</Link>
        </nav>
      </div>
    </header>
  );
}
