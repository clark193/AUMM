import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/components/PasswordRecoveryForm";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecoverPasswordPage() {
  return <PasswordRecoveryForm />;
}
