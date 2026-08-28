"use client";

import Image from "next/image";
import Link from "next/link";
import { AtSign, Building2, Mail } from "lucide-react";
import { withBasePath } from "@/lib/paths";
import { usePublicSettings } from "./PublicContactDetails";

export function SiteFooter() {
  const settings = usePublicSettings();
  return <footer className="footer">
    <div className="container footer-grid">
      <div className="footer-brand"><Image src={withBasePath("/logo.png")} width={84} height={84} alt="AUMM" /><div><strong>AUMM</strong><p>A força da organização dos trabalhadores em todo o Brasil.</p></div></div>
      <div><h3>Institucional</h3><Link href="/quem-somos">Quem somos</Link><Link href="/realizacoes">O que já fizemos</Link><Link href="/diretoria">Diretoria</Link><Link href="/estatuto">Estatuto Social</Link><Link href="/documentos">Documentos</Link></div>
      <div><h3>Serviços</h3><Link href="/associe-se">Associe-se</Link><Link href="/verificar">Verificar carteirinha</Link><Link href="/associado/login">Portal do associado</Link><Link href="/admin">Administração</Link></div>
      <div><h3>Contato</h3>{settings.email && <p><Mail size={16}/> {settings.email}</p>}{settings.instagram && <p><AtSign size={16}/> <a href="https://www.instagram.com/aumm.oficial/" target="_blank" rel="noreferrer">@aumm.oficial</a></p>}{settings.cnpj && <p><Building2 size={16}/> CNPJ: {settings.cnpj}</p>}</div>
    </div>
    <div className="container footer-bottom"><span>© 2026 AUMM. Todos os direitos reservados.</span><span><Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos de uso</Link></span></div>
  </footer>;
}
