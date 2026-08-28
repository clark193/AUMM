import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { MemberSettingsPage } from "@/components/MemberSettingsPage";

export const metadata: Metadata = { title: "Configurações do associado" };
export default function MemberSettingsRoute() { return <AuthGate><MemberSettingsPage /></AuthGate>; }
