import { Suspense } from "react";
import { MemberVerification } from "@/components/MemberVerification";
import { PublicShell } from "@/components/PublicShell";

export default function VerifyPage() {
  return <PublicShell><Suspense fallback={<div className="verify-shell">Carregando…</div>}><MemberVerification /></Suspense></PublicShell>;
}
