import { sendPasswordResetEmail } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";

// A conta do Authentication permanece no plano gratuito.
export async function manageMemberAccount(data: { memberId: string; action: "password" | "delete"; confirmation?: string }) {
  const { auth, db } = getFirebaseServices();
  const actor = auth.currentUser;
  if (!actor) throw new Error("Faça login novamente.");
  const roleRef = doc(db, "adminRoles", actor.uid);
  const memberRef = doc(db, "associados", data.memberId);
  const [role, member] = await Promise.all([getDoc(roleRef), getDoc(memberRef)]);
  if (role.data()?.active !== true || ![1, "1"].includes(role.data()?.level)) throw new Error("Apenas administradores ativos de nível 1 podem realizar esta ação.");
  if (!member.exists()) throw new Error("Cadastro não encontrado.");
  const person = member.data();
  const auditRef = doc(collection(db, "auditLogs"));
  const audit = {
    action: data.action === "delete" ? "MEMBER_PROFILE_DELETED" : "MEMBER_PASSWORD_RESET_REQUESTED",
    resource: "associados", resourceId: data.memberId,
    description: data.action === "delete" ? "Cadastro removido; login do Authentication preservado." : "Recuperação de senha solicitada por e-mail.",
    actorUid: actor.uid, actorName: String(role.data()?.fullName || actor.email || "Administrador"),
    actorEmail: actor.email || "", actorRole: String(role.data()?.role || "Administrador"), actorLevel: 1,
    timestamp: serverTimestamp(),
  };
  if (data.action === "password") {
    if (!person.uid || !person.email) throw new Error("Este cadastro ainda não possui login com e-mail.");
    await runTransaction(db, async (tx) => {
      const currentRole = await tx.get(roleRef);
      if (currentRole.data()?.active !== true || ![1, "1"].includes(currentRole.data()?.level)) throw new Error("Acesso revogado.");
      tx.set(auditRef, audit);
    });
    await sendPasswordResetEmail(auth, String(person.email));
    return;
  }
  if (data.confirmation !== person.fullName) throw new Error("Digite o nome completo para confirmar.");
  const uid = String(person.uid || data.memberId);
  if (uid === actor.uid) throw new Error("Você não pode remover o próprio cadastro por aqui.");
  const [cards, helping, shares] = await Promise.all([
    getDocs(query(collection(db, "publicMembers"), where("uid", "==", uid), limit(51))),
    getDocs(query(collection(db, "supportRequests"), where("helperUid", "==", uid), limit(51))),
    getDocs(query(collection(db, "locationShareOwners"), where("ownerUid", "==", uid), limit(51))),
  ]);
  if ([cards, helping, shares].some((snap) => snap.size > 50)) throw new Error("Há muitos registros vinculados. Encerre os compartilhamentos e atendimentos antes de remover o cadastro.");
  const active = helping.docs.filter((item) => ["open", "awaiting_confirmation", "accepted"].includes(item.data().status));
  if (active.length > 8) throw new Error("Encerre os atendimentos de apoio antes de remover este cadastro.");
  await runTransaction(db, async (tx) => {
    const [currentRole, currentMember, targetRole, ownSupport, ...supportDocs] = await Promise.all([
      tx.get(roleRef), tx.get(memberRef), tx.get(doc(db, "adminRoles", uid)),
      tx.get(doc(db, "supportRequests", uid)), ...active.map((item) => tx.get(item.ref)),
    ]);
    if (currentRole.data()?.active !== true || ![1, "1"].includes(currentRole.data()?.level)) throw new Error("Acesso revogado.");
    if (targetRole.exists()) throw new Error("Este perfil também possui acesso administrativo. Gerencie-o em Administradores.");
    if (!currentMember.exists() || currentMember.data().fullName !== data.confirmation || String(currentMember.data().uid || data.memberId) !== uid) throw new Error("O cadastro mudou. Abra-o novamente.");
    const support = new Map([ownSupport, ...supportDocs].map((item) => [item.id, item]));
    for (const item of support.values()) {
      if (item.exists() && ["open", "awaiting_confirmation", "accepted"].includes(item.data().status)
        && (item.data().ownerUid === uid || item.data().helperUid === uid)) {
        tx.update(item.ref, { status: "cancelled", updatedAt: serverTimestamp() });
        for (const key of ["location", "helperProfile", "helperPosition", "requesterPosition"]) tx.delete(doc(item.ref, "private", key));
      }
    }
    for (const item of shares.docs) { tx.delete(doc(db, "liveLocations", item.id)); tx.delete(item.ref); }
    for (const item of cards.docs) tx.delete(item.ref);
    tx.delete(doc(db, "memberPhotos", uid));
    tx.delete(memberRef);
    tx.set(auditRef, audit);
  });
}
