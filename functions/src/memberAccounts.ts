import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// Consulta o perfil atual em cada chamada. Uma permissão avulsa ou claim antiga
// não concede acesso a estas operações exclusivas do nível 1.
export const manageMemberAccount = onCall(
  { region: "southamerica-east1", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Entre como administrador.");
    const db = getFirestore();
    const actor = await db.doc(`adminRoles/${request.auth.uid}`).get();
    if (actor.data()?.active !== true || ![1, "1"].includes(actor.data()?.level)) {
      throw new HttpsError("permission-denied", "Somente administradores ativos de nível 1 podem realizar esta ação.");
    }
    const { memberId, action, password, confirmation } = request.data || {};
    if (typeof memberId !== "string" || !memberId || memberId.includes("/") || memberId.length > 128
      || !["password", "delete"].includes(action)) {
      throw new HttpsError("invalid-argument", "Selecione um associado e uma ação válida.");
    }
    const ref = db.doc(`associados/${memberId}`);
    const member = await ref.get();
    if (!member.exists) throw new HttpsError("not-found", "Cadastro não encontrado. Atualize a lista.");
    const data = member.data()!;
    const uid = typeof data.uid === "string" && data.uid ? data.uid : null;
    if (uid) {
      const targetAdmin = await db.doc(`adminRoles/${uid}`).get();
      if (uid === request.auth.uid || targetAdmin.exists) {
        throw new HttpsError("failed-precondition", "Contas administrativas devem ser gerenciadas no módulo Administradores.");
      }
    }
    const audit = (description: string) => ({
      actorUid: request.auth!.uid, actorName: actor.data()?.fullName || actor.data()?.role || "Administrador",
      actorLevel: 1, action: action === "password" ? "MEMBER_PASSWORD_CHANGED" : "MEMBER_DELETED",
      resource: "associados", resourceId: memberId, description,
      timestamp: FieldValue.serverTimestamp(),
    });
    if (action === "password") {
      if (!uid) throw new HttpsError("failed-precondition", "Este cadastro ainda não possui conta de acesso.");
      if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        throw new HttpsError("invalid-argument", "A senha temporária deve ter entre 8 e 128 caracteres.");
      }
      // Define a exigência de troca antes de mudar a senha, impedindo que a nova
      // credencial seja usada como uma senha pessoal permanente.
      await ref.update({ mustChangePassword: true, updatedAt: FieldValue.serverTimestamp() });
      await getAuth().updateUser(uid, { password });
      await getAuth().revokeRefreshTokens(uid);
      await db.collection("auditLogs").add(audit("Alterou a senha temporária do associado; troca obrigatória no próximo acesso."));
      return { ok: true };
    }
    if (confirmation !== data.fullName) throw new HttpsError("invalid-argument", "Digite o nome completo do associado para confirmar a exclusão.");
    // Desativa primeiro: se uma etapa falhar, a conta permanece bloqueada e a
    // operação pode ser repetida enquanto o documento principal existir.
    if (uid) {
      try {
        await getAuth().updateUser(uid, { disabled: true });
        await getAuth().revokeRefreshTokens(uid);
      } catch (error) {
        if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
      }
    }
    await ref.update({ status: "inactive", authorized: false, eligibleToVote: false, updatedAt: FieldValue.serverTimestamp() });
    const publicCards = uid ? await db.collection("publicMembers").where("uid", "==", uid).get() : null;
    const cards = new Map(publicCards?.docs.map((card) => [card.id, card.ref]) || []);
    if (data.memberNumber) {
      const card = await db.doc(`publicMembers/${data.memberNumber}`).get();
      if (card.exists && (!uid || card.data()?.uid === uid)) cards.set(card.id, card.ref);
    }
    for (const card of cards.values()) await card.delete();
    if (uid) {
      // Encerra atendimentos antes de remover o perfil e os dados privados.
      const helping = await db.collection("supportRequests").where("helperUid", "==", uid).get();
      const own = await db.doc(`supportRequests/${uid}`).get();
      for (const support of [...helping.docs, ...(own.exists ? [own] : [])]) {
        await db.runTransaction(async (tx) => {
          const current = await tx.get(support.ref);
          if (!["open", "awaiting_confirmation", "accepted"].includes(current.data()?.status)) return;
          if (current.data()?.ownerUid !== uid && current.data()?.helperUid !== uid) return;
          tx.update(support.ref, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
          for (const key of ["location", "helperPosition", "requesterPosition", "helperProfile"]) tx.delete(support.ref.collection("private").doc(key));
        });
      }
      const links = await db.collection("locationShareOwners").where("ownerUid", "==", uid).get();
      for (const link of links.docs) {
        const batch = db.batch();
        batch.delete(link.ref); batch.delete(db.doc(`liveLocations/${link.id}`));
        await batch.commit();
      }
      for (const name of ["memberPhotos", "users", "userPreferences", "notificationReads", "mobileSubscriptions", "mobileInbox", "mobilePushDevices"]) {
        await db.recursiveDelete(db.doc(`${name}/${uid}`));
      }
      try { await getAuth().deleteUser(uid); }
      catch (error) { if ((error as { code?: string }).code !== "auth/user-not-found") throw error; }
    }
    const batch = db.batch();
    batch.delete(ref);
    batch.create(db.collection("auditLogs").doc(), audit("Excluiu o perfil, as credenciais públicas e a conta de acesso do associado. Histórico institucional preservado."));
    await batch.commit();
    return { ok: true };
  },
);
