"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, WalletCards } from "lucide-react";
import { getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";

type FinancialEntry = {
  id: string;
  date?: string;
  description?: string;
  category?: string;
  type?: "income" | "expense";
  amount?: number;
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(value?: string) {
  if (!value) return "Data não informada";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

export function MemberFinancialTransparency() {
  const [rows, setRows] = useState<FinancialEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => onSnapshot(
    query(
      collection(getFirebaseServices().db, "financialEntries"),
      where("status", "==", "published"),
      where("visibility", "in", ["public", "members"]),
      orderBy("date", "desc"),
      limit(100),
    ),
    (snapshot) => {
      setError("");
      setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as FinancialEntry));
    },
    (reason) => setError(firebaseErrorMessage(reason, "Não foi possível carregar os lançamentos financeiros.")),
  ), []);

  const totals = useMemo(() => rows.reduce((result, item) => {
    const amount = Number(item.amount || 0);
    if (item.type === "income") result.income += amount;
    if (item.type === "expense") result.expense += amount;
    return result;
  }, { income: 0, expense: 0 }), [rows]);

  if (error) return <div className="form-message error">{error}</div>;

  return <div className="financial-transparency">
    <section className="financial-summary" aria-label="Resumo financeiro publicado">
      <article><ArrowUpCircle /><span>Entradas publicadas</span><strong>{money.format(totals.income)}</strong></article>
      <article><ArrowDownCircle /><span>Saídas publicadas</span><strong>{money.format(totals.expense)}</strong></article>
      <article><WalletCards /><span>Saldo dos lançamentos</span><strong>{money.format(totals.income - totals.expense)}</strong></article>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>Movimentações financeiras</h3><p>Somente receitas e despesas publicadas pela administração.</p></div></div>
      {rows.length === 0
        ? <div className="empty-state">Nenhuma movimentação financeira foi publicada.</div>
        : <div className="financial-entry-list">{rows.map((item) => <article key={item.id}>
          <div className={`financial-entry-icon ${item.type === "income" ? "income" : "expense"}`}>{item.type === "income" ? <ArrowUpCircle /> : <ArrowDownCircle />}</div>
          <div><span>{item.category || "Movimentação"}</span><h3>{item.description || "Lançamento financeiro"}</h3><small><CalendarDays /> {formatDate(item.date)}</small></div>
          <strong className={item.type === "income" ? "income" : "expense"}>{item.type === "income" ? "+" : "−"} {money.format(Number(item.amount || 0))}</strong>
        </article>)}</div>}
    </section>
  </div>;
}
