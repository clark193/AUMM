import { AuthGate } from "@/components/AuthGate";
import { MemberCredential } from "@/components/MemberCardContent";

export default function DigitalCard() {
  return <AuthGate><MemberCredential /></AuthGate>;
}
