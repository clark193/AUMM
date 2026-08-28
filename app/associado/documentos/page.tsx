import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { MemberDocumentsPage } from "@/components/MemberDocumentsPage";

export const metadata: Metadata = { title: "Documentos do associado" };
export default function MemberDocumentsRoute() { return <AuthGate><MemberDocumentsPage /></AuthGate>; }
