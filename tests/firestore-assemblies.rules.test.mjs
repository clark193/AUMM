import test, { after, before, beforeEach } from "node:test";
import fs from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

let environment;
const assemblyId = "assembly-security-test";

before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");
  environment = await initializeTestEnvironment({
    projectId: "aumm-rules-test",
    firestore: {
      host,
      port: Number(port),
      rules: await fs.readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "adminRoles", "admin-1"), { active: true, level: 1, role: "Presidente" }),
      setDoc(doc(db, "associados", "member-1"), { uid: "member-1", status: "active", eligibleToVote: true, role: "Associado" }),
      setDoc(doc(db, "associados", "member-present"), { uid: "member-present", status: "active", eligibleToVote: true, role: "Associado" }),
      setDoc(doc(db, "associados", "member-viewer"), { uid: "member-viewer", status: "active", eligibleToVote: true, role: "Associado" }),
      setDoc(doc(db, "associados", "member-inactive"), { uid: "member-inactive", status: "inactive", eligibleToVote: false, role: "Associado" }),
      setDoc(doc(db, "assemblies", assemblyId), {
        type: "extraordinary", title: "Teste", description: "Teste de regras", orderOfDay: "Pauta",
        additionalInfo: "", format: "eletrônico", status: "in_session", minimumNoticeDays: 15,
        firstCallAt: Timestamp.fromMillis(Date.now() - 7_200_000), secondCallAt: Timestamp.fromMillis(Date.now() - 5_400_000),
        thirdCallAt: Timestamp.fromMillis(Date.now() - 3_600_000), eligibleVoterCount: 2,
        acknowledgementCount: 0, presenceCount: 1, presenceOpen: false, currentCall: 3,
        currentAgendaId: "agenda-open", createdAt: Timestamp.now(), createdBy: "admin-1",
      }),
      setDoc(doc(db, "assemblies", assemblyId, "eligibleVoters", "member-1"), { uid: "member-1", eligible: true }),
      setDoc(doc(db, "assemblies", assemblyId, "eligibleVoters", "member-present"), { uid: "member-present", eligible: true }),
      setDoc(doc(db, "assemblies", assemblyId, "presence", "member-present"), { uid: "member-present", assemblyId, callNumber: 3 }),
      setDoc(doc(db, "assemblies", assemblyId, "agenda", "agenda-open"), {
        order: 1, title: "Pauta", description: "Descrição", fullText: "Texto", allowComments: true,
        allowVoting: true, options: ["APROVO", "REJEITO", "ABSTENÇÃO"], votePrivacy: "reserved",
        status: "voting", commentsOpen: false, votingOpen: true, resultPublished: false,
        votingStartsAt: Timestamp.fromMillis(Date.now() - 60_000), votingEndsAt: Timestamp.fromMillis(Date.now() + 600_000),
      }),
      setDoc(doc(db, "assemblies", assemblyId, "agenda", "agenda-future"), {
        order: 2, title: "Pauta futura", description: "Descrição", fullText: "Texto", allowComments: true,
        allowVoting: true, options: ["APROVO", "REJEITO", "ABSTENÇÃO"], votePrivacy: "reserved",
        status: "voting", commentsOpen: false, votingOpen: true, resultPublished: false,
        votingStartsAt: Timestamp.fromMillis(Date.now() + 600_000), votingEndsAt: Timestamp.fromMillis(Date.now() + 1_200_000),
      }),
      setDoc(doc(db, "assemblies", assemblyId, "agenda", "agenda-open", "comments", "comment-1"), {
        authorUid: "member-present", authorNameSnapshot: "Associado", content: "Texto imutável",
        type: "manifestation", hidden: false, createdAt: Timestamp.now(),
      }),
      setDoc(doc(db, "assemblies", assemblyId, "auditLogs", "log-1"), {
        action: "ASSEMBLY_OPENED", actorUid: "admin-1", assemblyId, timestamp: Timestamp.now(),
      }),
      setDoc(doc(db, "documents", "public-doc"), { title:"Público",category:"statute",visibility:"public",published:true,status:"published" }),
      setDoc(doc(db, "documents", "member-doc"), { title:"Associados",category:"minutes",visibility:"members",published:true,status:"published" }),
      setDoc(doc(db, "documents", "admin-doc"), { title:"Admin",category:"other",visibility:"admin",published:true,status:"published" }),
    ]);
  });
});

after(async () => environment?.cleanup());

test("não autenticado não lê uma assembleia interna", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "assemblies", assemblyId)));
});

test("associado habilitado lê a assembleia, mas não cria nem eleva privilégios", async () => {
  const db = environment.authenticatedContext("member-1").firestore();
  await assertSucceeds(getDoc(doc(db, "assemblies", assemblyId)));
  await assertFails(setDoc(doc(db, "assemblies", "forged"), { status: "draft", createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, "associados", "member-1"), { adminLevel: 1, eligibleToVote: true }));
});

test("associado ativo acompanha assembleias visíveis sem ganhar direito de voto", async () => {
  const db = environment.authenticatedContext("member-viewer").firestore();
  await assertSucceeds(getDoc(doc(db, "assemblies", assemblyId)));
  await assertSucceeds(getDocs(query(
    collection(db, "assemblies"),
    where("status", "in", ["published", "first_call", "waiting_second_call", "second_call", "waiting_third_call", "third_call", "in_session", "closed"]),
    orderBy("firstCallAt", "desc"),
    limit(50),
  )));
  await assertFails(setDoc(doc(db, "assemblies", assemblyId, "agenda", "agenda-open", "votes", "member-viewer"), {
    voterUid: "member-viewer", choice: "APROVO", createdAt: serverTimestamp(), assemblyId, agendaId: "agenda-open",
  }));
});

test("associado inativo continua sem acesso às assembleias", async () => {
  const db = environment.authenticatedContext("member-inactive").firestore();
  await assertFails(getDoc(doc(db, "assemblies", assemblyId)));
});

test("associado não vota sem presença nem antes do horário", async () => {
  const absent = environment.authenticatedContext("member-1").firestore();
  await assertFails(setDoc(doc(absent, "assemblies", assemblyId, "agenda", "agenda-open", "votes", "member-1"), {
    voterUid: "member-1", choice: "APROVO", createdAt: serverTimestamp(), assemblyId, agendaId: "agenda-open",
  }));
  const present = environment.authenticatedContext("member-present").firestore();
  await assertFails(setDoc(doc(present, "assemblies", assemblyId, "agenda", "agenda-future", "votes", "member-present"), {
    voterUid: "member-present", choice: "APROVO", createdAt: serverTimestamp(), assemblyId, agendaId: "agenda-future",
  }));
});

test("um voto válido é criado uma vez e nunca editado ou apagado", async () => {
  const db = environment.authenticatedContext("member-present").firestore();
  const vote = doc(db, "assemblies", assemblyId, "agenda", "agenda-open", "votes", "member-present");
  await assertSucceeds(setDoc(vote, { voterUid: "member-present", choice: "APROVO", createdAt: serverTimestamp(), assemblyId, agendaId: "agenda-open" }));
  await assertFails(updateDoc(vote, { choice: "REJEITO" }));
  await assertFails(deleteDoc(vote));
});

test("comentário e log de auditoria são imutáveis", async () => {
  const member = environment.authenticatedContext("member-present").firestore();
  await assertFails(updateDoc(doc(member, "assemblies", assemblyId, "agenda", "agenda-open", "comments", "comment-1"), { content: "alterado" }));
  const admin = environment.authenticatedContext("admin-1").firestore();
  await assertFails(deleteDoc(doc(admin, "assemblies", assemblyId, "auditLogs", "log-1")));
});

test("admin nível 1 cria draft, mas não adultera voto do associado", async () => {
  const db = environment.authenticatedContext("admin-1").firestore();
  await assertSucceeds(setDoc(doc(db, "assemblies", "new-draft"), {
    type: "ordinary", title: "Nova", description: "Descrição", orderOfDay: "Pauta", additionalInfo: "",
    format: "eletrônico", firstCallAt: Timestamp.fromMillis(Date.now() + 20 * 86_400_000),
    secondCallAt: Timestamp.fromMillis(Date.now() + 20 * 86_400_000 + 1_800_000),
    thirdCallAt: Timestamp.fromMillis(Date.now() + 20 * 86_400_000 + 3_600_000),
    status: "draft", minimumNoticeDays: 15, eligibleVoterCount: 0,
    createdBy: "admin-1", createdAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(db, "assemblies", assemblyId, "agenda", "agenda-open", "votes", "member-1"), {
    voterUid: "member-1", choice: "APROVO", createdAt: serverTimestamp(), assemblyId, agendaId: "agenda-open",
  }));
});

test("visitante lê somente documento público publicado", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db,"documents","public-doc")));
  await assertFails(getDoc(doc(db,"documents","member-doc")));
  await assertFails(getDoc(doc(db,"documents","admin-doc")));
});

test("associado lê público e exclusivo, mas não administrativo nem modifica", async () => {
  const db = environment.authenticatedContext("member-1").firestore();
  await assertSucceeds(getDoc(doc(db,"documents","public-doc")));
  await assertSucceeds(getDoc(doc(db,"documents","member-doc")));
  await assertFails(getDoc(doc(db,"documents","admin-doc")));
  await assertFails(updateDoc(doc(db,"documents","member-doc"),{title:"Adulterado"}));
});

test("admin nível 1 cria, publica e arquiva documento", async () => {
  const db = environment.authenticatedContext("admin-1").firestore(); const ref=doc(db,"documents","admin-flow");
  await assertSucceeds(setDoc(ref,{title:"Ata",description:"Teste",category:"board_minutes",visibility:"members",sourceType:"external",externalUrl:"https://example.com/ata.pdf",status:"draft",published:false,createdBy:"admin-1",createdAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(ref,{status:"published",published:true,publishedAt:serverTimestamp(),publishedBy:"admin-1"}));
  await assertSucceeds(updateDoc(ref,{status:"archived",published:false}));
});

function addMembershipRequest(db, { uid, requestId, cpfHash = "c".repeat(64), emailHash = "e".repeat(64), status = "pending" }) {
  const batch = writeBatch(db);
  batch.set(doc(db, "membershipRequests", requestId), {
    requestId, ownerUid: uid, fullName: "João da Silva", birthDate: Timestamp.fromDate(new Date("1990-05-20T12:00:00Z")),
    cpf: "52998224725", cpfNormalized: "52998224725", cpfHash,
    email: `${uid}@example.com`, emailNormalized: `${uid}@example.com`, emailHash,
    whatsapp: "(47) 99999-9999", category: "Motoboy", statuteAccepted: true, statuteVersion: "2021",
    statuteAcceptedAt: serverTimestamp(), electronicAcceptanceType: "Aceite eletrônico da solicitação de filiação",
    status, statutoryDocumentVerified: false, submittedAt: serverTimestamp(),
  });
  batch.set(doc(db, "membershipRequestCpfIndex", cpfHash), { requestId, ownerUid: uid, cpfHash, createdAt: serverTimestamp() });
  batch.set(doc(db, "membershipRequestEmailIndex", emailHash), { requestId, ownerUid: uid, emailHash, createdAt: serverTimestamp() });
  batch.set(doc(db, "membershipRequestOwners", uid), { requestId, ownerUid: uid, status: "pending", updatedAt: serverTimestamp() });
  batch.set(doc(db, "membershipAuditLogs", `created-${requestId}`), { action: "MEMBERSHIP_REQUEST_CREATED", requestId, actorUid: uid, actorNameSnapshot: "Solicitante", timestamp: serverTimestamp() });
  return batch.commit();
}

test("interessado anônimo cria atomicamente e relê somente o próprio pedido", async () => {
  const own = environment.authenticatedContext("applicant-1").firestore();
  await assertSucceeds(addMembershipRequest(own, { uid: "applicant-1", requestId: "request-1" }));
  await assertSucceeds(getDoc(doc(own, "membershipRequestOwners", "applicant-1")));
  await assertSucceeds(getDoc(doc(own, "membershipRequests", "request-1")));
  const other = environment.authenticatedContext("applicant-2").firestore();
  await assertFails(getDoc(doc(other, "membershipRequests", "request-1")));
});

test("índice por hash bloqueia uma segunda solicitação com o mesmo CPF", async () => {
  const first = environment.authenticatedContext("applicant-1").firestore();
  await assertSucceeds(addMembershipRequest(first, { uid: "applicant-1", requestId: "request-1" }));
  const second = environment.authenticatedContext("applicant-2").firestore();
  await assertFails(addMembershipRequest(second, { uid: "applicant-2", requestId: "request-2", emailHash: "f".repeat(64) }));
});

test("interessado não cria pedido já aprovado nem altera a decisão", async () => {
  const db = environment.authenticatedContext("applicant-1").firestore();
  await assertFails(addMembershipRequest(db, { uid: "applicant-1", requestId: "forged-approved", status: "approved" }));
  await assertSucceeds(addMembershipRequest(db, { uid: "applicant-1", requestId: "request-1" }));
  await assertFails(updateDoc(doc(db, "membershipRequests", "request-1"), { status: "approved", statutoryDocumentVerified: true }));
});

test("admin não aprova Motoboy antes da conferência documental", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "membershipRequests", "request-admin"), { requestId: "request-admin", ownerUid: "applicant-1", fullName: "João", email: "joao@example.com", category: "Motoboy", status: "pending", statutoryDocumentVerified: false });
    await setDoc(doc(db, "membershipRequestOwners", "applicant-1"), { requestId: "request-admin", ownerUid: "applicant-1", status: "pending" });
  });
  const db = environment.authenticatedContext("admin-1").firestore();
  await assertFails(updateDoc(doc(db, "membershipRequests", "request-admin"), { status: "approved", memberUid: "new-member", memberNumber: "AUMM-2026-000001" }));
  await assertSucceeds(updateDoc(doc(db, "membershipRequests", "request-admin"), { statutoryDocumentVerified: true, statutoryDocumentVerifiedAt: serverTimestamp(), statutoryDocumentVerifiedBy: "admin-1" }));
});

test("admin analisa, aprova Ciclista e rejeita outra solicitação com registro atômico", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "membershipRequests", "cycle-approval"), { requestId: "cycle-approval", ownerUid: "cycle-owner", fullName: "Maria Ciclista", email: "maria@example.com", category: "Ciclista", status: "pending", statutoryDocumentVerified: false }),
      setDoc(doc(db, "membershipRequestOwners", "cycle-owner"), { requestId: "cycle-approval", ownerUid: "cycle-owner", status: "pending" }),
      setDoc(doc(db, "membershipRequests", "request-reject"), { requestId: "request-reject", ownerUid: "reject-owner", fullName: "Carlos", email: "carlos@example.com", category: "Motoboy", status: "under_review", statutoryDocumentVerified: false }),
      setDoc(doc(db, "membershipRequestOwners", "reject-owner"), { requestId: "request-reject", ownerUid: "reject-owner", status: "under_review" }),
    ]);
  });
  const db = environment.authenticatedContext("admin-1").firestore();
  const review = writeBatch(db);
  review.update(doc(db, "membershipRequests", "cycle-approval"), { status: "under_review", reviewedAt: serverTimestamp(), reviewedBy: "admin-1" });
  review.update(doc(db, "membershipRequestOwners", "cycle-owner"), { status: "under_review", updatedAt: serverTimestamp() });
  review.set(doc(db, "membershipAuditLogs", "review-cycle"), { action: "MEMBERSHIP_REQUEST_REVIEW_STARTED", requestId: "cycle-approval", actorUid: "admin-1", actorNameSnapshot: "Presidente", timestamp: serverTimestamp() });
  await assertSucceeds(review.commit());
  const approve = writeBatch(db);
  approve.set(doc(db, "associados", "cycle-member"), { uid: "cycle-member", membershipRequestId: "cycle-approval", email: "maria@example.com", status: "active" });
  approve.set(doc(db, "publicMembers", "AUMM-2026-000001"), { uid: "cycle-member", memberNumber: "AUMM-2026-000001", status: "active" });
  approve.update(doc(db, "membershipRequests", "cycle-approval"), { status: "approved", memberUid: "cycle-member", memberNumber: "AUMM-2026-000001", decisionAt: serverTimestamp(), decisionDate: Timestamp.now(), decisionBy: "admin-1" });
  approve.update(doc(db, "membershipRequestOwners", "cycle-owner"), { status: "approved", memberNumber: "AUMM-2026-000001", updatedAt: serverTimestamp() });
  approve.set(doc(db, "membershipAuditLogs", "approve-cycle"), { action: "MEMBERSHIP_REQUEST_APPROVED", requestId: "cycle-approval", actorUid: "admin-1", actorNameSnapshot: "Presidente", timestamp: serverTimestamp() });
  await assertSucceeds(approve.commit());

  const reject = writeBatch(db);
  reject.update(doc(db, "membershipRequests", "request-reject"), { status: "rejected", decisionAt: serverTimestamp(), decisionDate: Timestamp.now(), decisionBy: "admin-1" });
  reject.update(doc(db, "membershipRequestOwners", "reject-owner"), { status: "rejected", updatedAt: serverTimestamp() });
  reject.set(doc(db, "membershipAuditLogs", "reject-request"), { action: "MEMBERSHIP_REQUEST_REJECTED", requestId: "request-reject", actorUid: "admin-1", actorNameSnapshot: "Presidente", timestamp: serverTimestamp() });
  await assertSucceeds(reject.commit());
});
