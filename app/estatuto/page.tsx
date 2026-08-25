import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { StatutePage } from "@/components/StatutePage";

export const metadata: Metadata = {
  title: "Estatuto Social",
  description: "Estatuto Social da Associação União Maior Motoboys, registrado em 2021, em formato HTML acessível e pesquisável.",
};

export default function StatuteRoute() {
  return <PublicShell><StatutePage /></PublicShell>;
}
