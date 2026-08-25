import { AuthGate } from "@/components/AuthGate";
import { AssemblyMember } from "@/components/AssemblyMember";

export default function MemberAssembliesPage() {
  return (
    <AuthGate>
      <AssemblyMember />
    </AuthGate>
  );
}
