"use client";

import Link from "next/link";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Newspaper,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

export type PublicNews = {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl?: string;
  status: "draft" | "published";
  showOnHome?: boolean;
  publishedAt?: Timestamp;
  updatedAt?: Timestamp;
};

function newsTime(item: PublicNews) {
  return item.publishedAt?.toMillis?.() || item.updatedAt?.toMillis?.() || 0;
}

function safeBackground(value?: string) {
  const url = value?.trim();
  if (!url || (!url.startsWith("https://") && !url.startsWith("/"))) return undefined;
  return `url("${url.replace(/["\\]/g, "")}")`;
}

export function usePublishedNews() {
  const [items, setItems] = useState<PublicNews[]>([]);

  useEffect(() => {
    if (!firebaseEnabled) return;
    const published = query(
      collection(getFirebaseServices().db, "news"),
      where("status", "==", "published"),
    );
    return onSnapshot(
      published,
      (snapshot) => {
        const loaded = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as PublicNews[];
        setItems(loaded.sort((a, b) => newsTime(b) - newsTime(a)));
      },
      () => setItems([]),
    );
  }, []);

  return items;
}

export function HomeNewsHero() {
  const published = usePublishedNews();
  const highlights = useMemo(
    () => published.filter((item) => item.showOnHome),
    [published],
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (
      highlights.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % highlights.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, [highlights.length]);

  const activeIndex = highlights.length ? active % highlights.length : 0;
  const current = highlights[activeIndex];
  const move = (direction: number) => {
    if (!highlights.length) return;
    setActive((index) => (index + direction + highlights.length) % highlights.length);
  };

  return (
    <section className={`hero hero-news ${current ? "has-news" : ""}`}>
      <div className="hero-news-backgrounds" aria-hidden="true">
        {highlights.map((item, index) => (
          <div
            className={`hero-news-background ${index === activeIndex ? "active" : ""}`}
            style={{ backgroundImage: safeBackground(item.imageUrl) }}
            key={item.id}
          />
        ))}
      </div>
      <div className="hero-grid container">
        <div className="hero-copy">
          <span className="eyebrow light">
            <span className="pulse" /> Blumenau sobre duas rodas
          </span>
          <h1>
            Mais união.<br />
            <em>Mais respeito.</em><br />
            Mais segurança.
          </h1>
          <p>
            A AUMM representa quem trabalha, se desloca e movimenta Blumenau
            todos os dias. Juntos, somos uma voz mais forte.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/associe-se">
              Quero me associar <ArrowRight size={18} />
            </Link>
            <Link className="button button-ghost" href="/quem-somos">
              Conheça a AUMM
            </Link>
          </div>
          <div className="hero-trust">
            <span><ShieldCheck /> Atuação responsável</span>
            <span><BadgeCheck /> Gestão transparente</span>
          </div>
        </div>

        <div className="hero-news-panel" aria-live="polite">
          {current ? (
            <>
              <span className="hero-news-label">
                <Newspaper size={15} /> Destaque AUMM · {current.category || "Notícia"}
              </span>
              <h2>{current.title}</h2>
              <p>{current.summary}</p>
              <div className="hero-news-footer">
                <Link href="/noticias">
                  Ver notícias <ArrowRight size={16} />
                </Link>
                {highlights.length > 1 && (
                  <div className="hero-news-controls">
                    <button type="button" onClick={() => move(-1)} aria-label="Notícia anterior">
                      <ArrowLeft />
                    </button>
                    <span>{activeIndex + 1} / {highlights.length}</span>
                    <button type="button" onClick={() => move(1)} aria-label="Próxima notícia">
                      <ArrowRight />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hero-news-empty">
              <Newspaper />
              <span>Destaques da AUMM</span>
              <p>As notícias escolhidas pela administração aparecerão aqui.</p>
            </div>
          )}
        </div>
      </div>
      <div className="hero-stripe">
        <div className="container">
          <span>Representatividade</span><i />
          <span>Benefícios</span><i />
          <span>Segurança</span><i />
          <span>Comunidade</span>
        </div>
      </div>
    </section>
  );
}
