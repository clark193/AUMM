"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";

type EventRow = {
  id: string;
  title?: string;
  description?: string;
  eventDate?: string | Timestamp;
  location?: string;
  url?: string;
};

function eventDate(value?: string | Timestamp) {
  if (!value) return null;
  const parsed = typeof value === "string" ? new Date(`${value}T12:00:00`) : value.toDate();
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const item = new Date(start);
    item.setDate(start.getDate() + index);
    return item;
  });
}

export function MemberDashboardCalendar() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));

  useEffect(() => onSnapshot(
    query(collection(getFirebaseServices().db, "events"), where("status", "==", "active")),
    (snapshot) => setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as EventRow)),
    () => setRows([]),
  ), []);

  const days = useMemo(() => calendarDays(month), [month]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    rows.forEach((item) => {
      const parsed = eventDate(item.eventDate);
      if (!parsed) return;
      const key = dayKey(parsed);
      map.set(key, [...(map.get(key) || []), item]);
    });
    return map;
  }, [rows]);
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rows
      .map((item) => ({ item, date: eventDate(item.eventDate) }))
      .filter((entry): entry is { item: EventRow; date: Date } => Boolean(entry.date && entry.date.getTime() >= today.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);
  }, [rows]);
  const selectedEvents = eventsByDay.get(selectedDay) || [];
  const todayKey = dayKey(new Date());

  function moveMonth(direction: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return <section className="panel member-calendar-panel member-dashboard-calendar-panel">
    <div className="panel-head member-dashboard-calendar-title">
      <div><h3><CalendarDays size={19} /> Agenda AUMM</h3><p>Veja no calendário os próximos eventos publicados pela associação.</p></div>
      <Link href="/associado/eventos">Ver agenda completa</Link>
    </div>
    <div className="member-dashboard-calendar-layout">
      <div>
        <div className="member-calendar-head member-dashboard-calendar-head">
          <div><span className="eyebrow">Calendário</span><h2>{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2></div>
          <div><button type="button" aria-label="Mês anterior" onClick={() => moveMonth(-1)}><ChevronLeft /></button><button type="button" onClick={() => { const today = new Date(); setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(dayKey(today)); }}>Hoje</button><button type="button" aria-label="Próximo mês" onClick={() => moveMonth(1)}><ChevronRight /></button></div>
        </div>
        <div className="member-calendar dashboard-calendar-grid">
          <div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((item) => <span key={item}>{item}</span>)}</div>
          <div className="calendar-grid">{days.map((day) => {
            const key = dayKey(day);
            const events = eventsByDay.get(key) || [];
            return <button type="button" key={key} className={`${day.getMonth() !== month.getMonth() ? "outside" : ""} ${key === todayKey ? "today" : ""} ${key === selectedDay ? "selected" : ""}`} onClick={() => setSelectedDay(key)} aria-label={`${day.toLocaleDateString("pt-BR")}${events.length ? `, ${events.length} evento(s)` : ""}`}>
              <span>{day.getDate()}</span>{events.length > 0 && <small><i title={events[0].title}>{events[0].title}</i>{events.length > 1 && <b>+{events.length - 1}</b>}</small>}
            </button>;
          })}</div>
        </div>
        {selectedEvents.length > 0 && <div className="dashboard-calendar-selection"><strong>Eventos em {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("pt-BR")}</strong>{selectedEvents.map((item) => <span key={item.id}>{item.title || "Evento AUMM"}</span>)}</div>}
      </div>
      <aside className="member-upcoming-events">
        <div><span className="eyebrow">Próximos eventos</span><strong>{upcoming.length ? "Reserve essas datas" : "Agenda livre por enquanto"}</strong></div>
        {upcoming.length === 0 ? <div className="empty-state"><CalendarDays /><span>Nenhum evento futuro publicado.</span></div> : upcoming.map(({ item, date }) => <article key={item.id}>
          <time dateTime={dayKey(date)}><b>{date.toLocaleDateString("pt-BR", { day: "2-digit" })}</b><span>{date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></time>
          <div><strong>{item.title || "Evento AUMM"}</strong>{item.location && <span><MapPin /> {item.location}</span>}{item.description && <p>{item.description}</p>}{item.url && <a href={item.url} target="_blank" rel="noreferrer">Ver detalhes <ExternalLink /></a>}</div>
        </article>)}
        {upcoming.length > 0 && <Link className="button button-sm button-dark" href="/associado/eventos">Abrir todos os eventos</Link>}
      </aside>
    </div>
  </section>;
}
