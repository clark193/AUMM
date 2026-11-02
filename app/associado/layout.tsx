import { MemberMenuProvider } from "@/components/MemberNavigation";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberMenuProvider>{children}</MemberMenuProvider>;
}
