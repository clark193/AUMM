import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
export const metadata:Metadata={title:"Entrar"};
export default function Login(){return <Suspense fallback={<main className="verify-shell"><div className="empty-state">Carregando…</div></main>}><LoginForm/></Suspense>}
