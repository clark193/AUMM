import type { Metadata } from "next";
import { Suspense } from "react";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const metadata: Metadata = { title: "Alterar senha" };

export default function ChangePasswordPage() {
  return <Suspense fallback={<div className="verify-shell"><div className="empty-state">Carregando segurança…</div></div>}><ChangePasswordForm /></Suspense>;
}
