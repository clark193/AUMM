"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Newspaper } from "lucide-react";
import { usePublishedNews } from "./HomeNewsHero";

type Props = { compact?: boolean };

export function PublicNewsFeed({ compact = false }: Props) {
  const published = usePublishedNews();
  const items = compact ? published.slice(0, 3) : published;

  if (!items.length) return <div className="empty-state">Nenhuma notícia publicada.</div>;

  return (
    <div className="news-grid">
      {items.map((item, index) => (
        <article className={compact && index === 0 ? "news-card news-featured" : "news-card"} key={item.id}>
          <div
            className={`news-art ${item.imageUrl ? "has-image" : ""}`}
            style={item.imageUrl?.startsWith("https://") ? { backgroundImage: `url("${item.imageUrl.replace(/["\\]/g, "")}")` } : undefined}
          >
            <span>{item.category || "Notícia"}</span>
            {!item.imageUrl && (index === 0 ? <Newspaper /> : <CalendarDays />)}
          </div>
          <div className="news-body">
            <small>{item.publishedAt?.toDate?.().toLocaleDateString("pt-BR") || "AUMM"}</small>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <Link className="read-more" href="/noticias">
              Ver publicação <ArrowRight size={16} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
