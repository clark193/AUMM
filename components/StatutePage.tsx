"use client";

import Link from "next/link";
import { Check, Copy, Menu, Printer, Search, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { statute2021 } from "@/lib/statute/2021";
import { withBasePath } from "@/lib/paths";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, term }: { text: string; term: string }) {
  const query = term.trim();
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return <>{parts.map((part, index) => part.toLocaleLowerCase("pt-BR") === query.toLocaleLowerCase("pt-BR") ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>)}</>;
}

export function StatutePage() {
  const [search, setSearch] = useState("");
  const [indexOpen, setIndexOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const results = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return 0;
    return statute2021.chapters.reduce((count, chapter) => count + chapter.blocks.filter((block) => block.text.toLocaleLowerCase("pt-BR").includes(term)).length, 0);
  }, [search]);

  async function copyArticle(id: string) {
    const url = new URL(`${withBasePath("/estatuto")}#${id}`, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(id);
    window.setTimeout(() => setCopied(""), 1600);
  }

  const chapterIndex = <nav aria-label="Índice do Estatuto">{statute2021.chapters.map((chapter) => <a key={chapter.id} href={`#${chapter.id}`} onClick={() => setIndexOpen(false)}><strong>Capítulo {chapter.roman}</strong><span>{chapter.title}</span></a>)}</nav>;

  return <div className="statute-page">
    <header className="statute-hero statute-print-content">
      <div className="container">
        <span className="eyebrow light">Documento institucional</span>
        <h1>Estatuto Social da AUMM</h1>
        <p>Associação União Maior Motoboys</p>
        <strong>Estatuto registrado em 2021</strong>
      </div>
    </header>
    <div className="container statute-layout">
      <aside className="statute-index statute-no-print"><div><span>Índice</span>{chapterIndex}</div></aside>
      <main className="statute-document statute-print-content">
        <div className="statute-tools statute-no-print">
          <label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no Estatuto" aria-label="Buscar no Estatuto" />{search && <small>{results} {results === 1 ? "trecho encontrado" : "trechos encontrados"}</small>}</label>
          <button type="button" onClick={() => window.print()}><Printer size={17} /> Imprimir Estatuto</button>
          <button className="statute-mobile-index" type="button" onClick={() => setIndexOpen(true)}><Menu size={17} /> Índice do Estatuto</button>
        </div>
        <div className="statute-notice">Esta página apresenta a transcrição em formato digital do Estatuto Social da Associação União Maior Motoboys — AUMM, registrado em 2021.</div>
        <div className="statute-title-print"><h1>ESTATUTO SOCIAL DA ASSOCIAÇÃO UNIÃO MAIOR MOTOBOYS (AUMM)</h1></div>
        {statute2021.chapters.map((chapter) => <section className="statute-chapter" id={chapter.id} key={chapter.id}>
          <header><span>CAPÍTULO {chapter.roman}</span><h2>{chapter.title}</h2></header>
          {chapter.blocks.map((block, index) => {
            if (block.type === "heading") return <h3 key={`${chapter.id}-${index}`}><Highlight text={block.text} term={search} /></h3>;
            if (block.type === "article") return <article className="statute-article" id={block.id} key={block.id}><div className="statute-article-head"><strong>Art. {block.number}º</strong><button className="statute-no-print" type="button" onClick={() => copyArticle(block.id)} aria-label={`Copiar link do artigo ${block.number}`}>{copied === block.id ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar link</>}</button></div><p><Highlight text={block.text} term={search} /></p></article>;
            return <p className="statute-paragraph" key={`${chapter.id}-${index}`}><Highlight text={block.text} term={search} /></p>;
          })}
        </section>)}
        <section className="statute-original"><span className="eyebrow">Documento original</span><h2>Signatários</h2><div>{statute2021.signatories.map(([name, role]) => <p key={name}><strong>{name}</strong><span>{role}</span></p>)}</div><small>Transcrição do documento registrado. Assinaturas manuscritas não são reproduzidas nesta página.</small></section>
        <div className="statute-bottom statute-no-print"><Link className="button" href="/associe-se">Solicitar filiação</Link><Link className="button button-dark" href="/documentos">Outros documentos</Link></div>
      </main>
    </div>
    {indexOpen && <div className="statute-drawer statute-no-print" role="dialog" aria-modal="true" aria-label="Índice do Estatuto"><div><button type="button" onClick={() => setIndexOpen(false)} aria-label="Fechar índice"><X /></button><h2>Índice do Estatuto</h2>{chapterIndex}</div></div>}
  </div>;
}
