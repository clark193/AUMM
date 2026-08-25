import { AuthGate } from "@/components/AuthGate";
import { MemberPortalContent } from "@/components/MemberPortalContent";

export default function MemberPortal() {
  return <AuthGate><MemberPortalContent /></AuthGate>;
}
