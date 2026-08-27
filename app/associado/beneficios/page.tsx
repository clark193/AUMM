import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { MemberBenefitsPage } from "@/components/MemberBenefitsPage";

export const metadata: Metadata = { title: "Benefícios do associado" };
export default function BenefitsPage() { return <AuthGate><MemberBenefitsPage /></AuthGate>; }
