import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Execute somente com o Firestore Emulator: defina FIRESTORE_EMULATOR_HOST antes de rodar o seed.");
}

const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
const projectId = process.env.GCLOUD_PROJECT || "aumm-local-demo";
const environment = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port) } });
const assemblyId = "demo-assembleia-local";

await environment.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  const now = Date.now();
  const members = Array.from({ length: 10 }, (_, index) => ({
    uid: `demo-member-${index + 1}`,
    fullName: `Associado Demonstração ${index + 1}`,
    memberNumber: `AUMM-DEMO-${String(index + 1).padStart(3, "0")}`,
  }));

  await setDoc(doc(db, "assemblies", assemblyId), {
    type: "extraordinary", title: "Assembleia de demonstração local", description: "Fixture exclusiva do Emulator.",
    orderOfDay: "Demonstração de três pautas", additionalInfo: "NÃO USAR EM PRODUÇÃO", format: "Assembleia eletrônica escrita",
    firstCallAt: Timestamp.fromMillis(now - 3_600_000), secondCallAt: Timestamp.fromMillis(now - 1_800_000),
    thirdCallAt: Timestamp.fromMillis(now), status: "in_session", minimumNoticeDays: 15,
    eligibleVoterCount: 10, acknowledgementCount: 10, presenceCount: 10, presenceOpen: false,
    currentCall: 3, installedCallNumber: 3, currentAgendaId: "pauta-1", minutesStatus: "pending",
    minutesApproverUids: ["demo-member-1"], createdBy: "demo-admin", createdAt: Timestamp.now(),
  });

  await Promise.all(members.flatMap((member) => [
    setDoc(doc(db, "associados", member.uid), { ...member, status: "active", eligibleToVote: true, role: "Associado" }),
    setDoc(doc(db, "assemblies", assemblyId, "eligibleVoters", member.uid), { ...member, eligible: true, snapshotCreatedAt: Timestamp.now() }),
    setDoc(doc(db, "assemblies", assemblyId, "acknowledgements", member.uid), { uid: member.uid, name: member.fullName, assemblyId, acknowledgedAt: Timestamp.now() }),
    setDoc(doc(db, "assemblies", assemblyId, "presence", member.uid), { uid: member.uid, memberName: member.fullName, assemblyId, callNumber: 3, registeredAt: Timestamp.now() }),
  ]));

  for (let index = 1; index <= 3; index += 1) {
    const agendaId = `pauta-${index}`;
    await setDoc(doc(db, "assemblies", assemblyId, "agenda", agendaId), {
      order: index, title: `Pauta de demonstração ${index}`, description: "Conteúdo fictício somente local.",
      fullText: "Texto integral da proposta de demonstração.", assetUrl: "", links: [], allowComments: true,
      allowVoting: true, votingType: "yes_no_abstention", votePrivacy: "reserved",
      options: ["APROVO", "REJEITO", "ABSTENÇÃO"], approvalRule: "simple_majority_present",
      hideResultsUntilClosed: true, status: index === 1 ? "voting" : "pending",
      commentsOpen: index === 1, votingOpen: index === 1, resultPublished: false,
      votingStartsAt: Timestamp.fromMillis(now - 60_000), votingEndsAt: Timestamp.fromMillis(now + 3_600_000),
    });
  }

  await Promise.all(members.slice(0, 3).map((member, index) =>
    setDoc(doc(db, "assemblies", assemblyId, "agenda", "pauta-1", "comments", `comentario-${index + 1}`), {
      authorUid: member.uid, authorNameSnapshot: member.fullName, content: `Manifestação de teste ${index + 1}.`,
      type: index === 1 ? "question" : "manifestation", hidden: false, moderationReason: "", createdAt: Timestamp.now(),
    })));
  await Promise.all(members.slice(0, 5).map((member, index) =>
    setDoc(doc(db, "assemblies", assemblyId, "agenda", "pauta-1", "votes", member.uid), {
      voterUid: member.uid, choice: index < 3 ? "APROVO" : index === 3 ? "REJEITO" : "ABSTENÇÃO",
      createdAt: Timestamp.now(), assemblyId, agendaId: "pauta-1",
    })));
});

await environment.cleanup();
console.log(`Seed local criado: ${assemblyId}. Nunca execute este arquivo contra produção.`);
