import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { MemberEventsPage } from "@/components/MemberEventsPage";

export const metadata: Metadata = { title: "Eventos do associado" };
export default function MemberEventsRoute() { return <AuthGate><MemberEventsPage /></AuthGate>; }
