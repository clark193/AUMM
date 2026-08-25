import { AuthGate } from "@/components/AuthGate";
import { MemberCardContent } from "@/components/MemberCardContent";

export default function DigitalCard() {
  return <AuthGate><MemberCardContent /></AuthGate>;
}
