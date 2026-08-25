import { AdminDashboardContent } from "@/components/AdminDashboardContent";
import { AdminShell } from "@/components/AdminShell";

export default function AdminDashboard() {
  return <AdminShell title="Visão geral"><AdminDashboardContent /></AdminShell>;
}
