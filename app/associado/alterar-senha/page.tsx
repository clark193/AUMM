import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export const metadata: Metadata = { title: "Alterar senha" };

export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
