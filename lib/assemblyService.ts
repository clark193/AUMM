import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseServices } from "./firebase";
import {
  AUMM_CURRENT_STATUTE,
  calculateQuorum,
  calculateVoteResult,
  canonicalJson,
  noticePeriodIsValid,
  quorumReached,
  sha256Hex,
} from "./assemblyRules";
import type { Assembly, AssemblyAgenda, AssemblyStatus } from "./assemblyTypes";

export type AssemblyActor = { uid: string; name: string; role: string };

export type AgendaDraft = {
  title: string;
  description: string;
  fullText: string;
  assetUrl: string;
  links: string[];
  allowComments: boolean;
  allowVoting: boolean;
  votingType: "yes_no_abstention" | "single_choice";
  votePrivacy: "nominal" | "reserved";
  options: string[];
};

export type AssemblyDraft = {
  type: "ordinary" | "extraordinary";
  title: string;
  description: string;
  orderOfDay: string;
  additionalInfo: string;
  firstCallAt: Date;
  secondCallAt: Date;
  thirdCallAt: Date;
  agendas: AgendaDraft[];
  minutesApproverUids: string[];
};

function auditPayload(action: string, actor: AssemblyActor, assemblyId: string, metadata: Record<string, unknown> = {}, agendaId?: string) {
  return {
    action,
    actorUid: actor.uid,
    actorNameSnapshot: actor.name,
    actorRoleSnapshot: actor.role,
    timestamp: serverTimestamp(),
    assemblyId,
    agendaId: agendaId || null,
    metadata,
  };
}

export async function createAssemblyDraft(input: AssemblyDraft, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(collection(db, "assemblies"));
  const batch = writeBatch(db);
  batch.set(assemblyRef, {
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    orderOfDay: input.orderOfDay.trim(),
    additionalInfo: input.additionalInfo.trim(),
    format: "Assembleia Geral realizada integralmente por meio eletrônico através do Portal do Associado da AUMM.",
    firstCallAt: Timestamp.fromDate(input.firstCallAt),
    secondCallAt: Timestamp.fromDate(input.secondCallAt),
    thirdCallAt: Timestamp.fromDate(input.thirdCallAt),
    status: "draft",
    minimumNoticeDays: AUMM_CURRENT_STATUTE.minimumNoticeDays,
    eligibleVoterCount: 0,
    acknowledgementCount: 0,
    presenceCount: 0,
    presenceOpen: false,
    currentCall: 0,
    currentAgendaId: null,
    minutesStatus: "pending",
    minutesApproverUids: input.minutesApproverUids,
    createdAt: serverTimestamp(),
    createdBy: actor.uid,
    createdByName: actor.name,
    updatedAt: serverTimestamp(),
  });
  input.agendas.forEach((agenda, index) => {
    const agendaRef = doc(collection(assemblyRef, "agenda"));
    batch.set(agendaRef, {
      order: index + 1,
      title: agenda.title.trim(),
      description: agenda.description.trim(),
      fullText: agenda.fullText.trim(),
      assetUrl: agenda.assetUrl.trim(),
      links: agenda.links.filter(Boolean),
      allowComments: agenda.allowComments,
      allowVoting: agenda.allowVoting,
      votingType: agenda.votingType,
      votePrivacy: agenda.votePrivacy,
      options: agenda.votingType === "yes_no_abstention" ? ["APROVO", "REJEITO", "ABSTENÇÃO"] : agenda.options,
      approvalRule: AUMM_CURRENT_STATUTE.ordinaryApprovalRule,
      hideResultsUntilClosed: true,
      status: "pending",
      commentsOpen: false,
      votingOpen: false,
      resultPublished: false,
      createdAt: serverTimestamp(),
    });
  });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("ASSEMBLY_CREATED", actor, assemblyRef.id));
  await batch.commit();
  return assemblyRef.id;
}

export async function publishAssembly(assembly: Assembly, actor: AssemblyActor) {
  if (assembly.status !== "draft") throw new Error("Somente rascunhos podem ser publicados.");
  if (!noticePeriodIsValid(new Date(), assembly.firstCallAt.toDate(), assembly.minimumNoticeDays)) {
    throw new Error(`A convocação não atende ao prazo mínimo configurado de ${assembly.minimumNoticeDays} dias.`);
  }
  const { db } = getFirebaseServices();
  const membersSnapshot = await getDocs(query(collection(db, "associados"), where("status", "==", "active")));
  const voters = membersSnapshot.docs
    .map((item) => ({
      id: item.id,
      ...(item.data() as { uid?: string; eligibleToVote?: boolean; fullName?: string; memberNumber?: string }),
    }))
    .filter((member) => member.uid && member.eligibleToVote !== false);
  if (!voters.length) throw new Error("Não existem associados ativos habilitados para formar o colégio eleitoral.");
  if (voters.length > 450) throw new Error("Há mais de 450 eleitores. Publique em lotes administrativos antes de continuar.");

  const assemblyRef = doc(db, "assemblies", assembly.id);
  const batch = writeBatch(db);
  voters.forEach((member) => batch.set(doc(assemblyRef, "eligibleVoters", String(member.uid)), {
    uid: member.uid,
    name: member.fullName || "Associado",
    memberNumber: member.memberNumber || "",
    eligible: true,
    snapshotCreatedAt: serverTimestamp(),
  }));
  batch.update(assemblyRef, {
    status: "published",
    eligibleVoterCount: voters.length,
    publishedAt: serverTimestamp(),
    publishedBy: actor.uid,
    publishedByName: actor.name,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("ASSEMBLY_PUBLISHED", actor, assembly.id, { eligibleVoterCount: voters.length }));
  await batch.commit();
  return voters.length;
}

export async function acknowledgeNotice(assembly: Assembly, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const acknowledgementRef = doc(assemblyRef, "acknowledgements", actor.uid);
  await runTransaction(db, async (transaction) => {
    const [acknowledgement, currentAssembly] = await Promise.all([
      transaction.get(acknowledgementRef), transaction.get(assemblyRef),
    ]);
    if (acknowledgement.exists()) throw new Error("Você já confirmou o recebimento desta convocação.");
    transaction.set(acknowledgementRef, { uid: actor.uid, name: actor.name, assemblyId: assembly.id, acknowledgedAt: serverTimestamp() });
    transaction.update(assemblyRef, { acknowledgementCount: Number(currentAssembly.data()?.acknowledgementCount || 0) + 1 });
    transaction.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("NOTICE_ACKNOWLEDGED", actor, assembly.id));
  });
}

export async function registerPresence(assembly: Assembly, actor: AssemblyActor) {
  if (!assembly.presenceOpen || !assembly.currentCall) throw new Error("O registro de presença ainda não está aberto.");
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const presenceRef = doc(assemblyRef, "presence", actor.uid);
  await runTransaction(db, async (transaction) => {
    const [presence, currentAssembly] = await Promise.all([
      transaction.get(presenceRef), transaction.get(assemblyRef),
    ]);
    if (presence.exists()) throw new Error("Sua presença já foi registrada.");
    transaction.set(presenceRef, {
      uid: actor.uid, memberName: actor.name, registeredAt: serverTimestamp(),
      callNumber: assembly.currentCall, assemblyId: assembly.id,
    });
    transaction.update(assemblyRef, { presenceCount: Number(currentAssembly.data()?.presenceCount || 0) + 1 });
    transaction.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("PRESENCE_REGISTERED", actor, assembly.id, { callNumber: assembly.currentCall }));
  });
}

export async function performCall(assembly: Assembly, callNumber: 1 | 2 | 3, actor: AssemblyActor) {
  const expected: Record<number, AssemblyStatus[]> = {
    1: ["published", "first_call"],
    2: ["waiting_second_call", "second_call"],
    3: ["waiting_third_call", "third_call"],
  };
  if (!expected[callNumber].includes(assembly.status)) throw new Error("Esta chamada não corresponde à etapa atual.");
  const scheduled = callNumber === 1 ? assembly.firstCallAt : callNumber === 2 ? assembly.secondCallAt : assembly.thirdCallAt;
  if (Date.now() < scheduled.toMillis()) throw new Error("A chamada não pode ser realizada antes do horário previsto.");
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const count = (await getCountFromServer(collection(assemblyRef, "presence"))).data().count;
  const required = calculateQuorum(assembly.eligibleVoterCount, callNumber);
  const met = quorumReached(assembly.eligibleVoterCount, count, callNumber);
  const nextStatus: AssemblyStatus = callNumber === 1 ? "first_call" : callNumber === 2 ? "second_call" : "third_call";
  const action = callNumber === 1 ? "FIRST_CALL_ATTEMPTED" : callNumber === 2 ? "SECOND_CALL_ATTEMPTED" : "THIRD_CALL_ATTEMPTED";
  const batch = writeBatch(db);
  batch.update(assemblyRef, {
    status: nextStatus,
    currentCall: callNumber,
    presenceOpen: true,
    presenceCount: count,
    quorumMet: met,
    [`call${callNumber}Result`]: { present: count, required, quorumMet: met, attemptedAt: serverTimestamp(), attemptedBy: actor.uid },
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload(action, actor, assembly.id, { present: count, required, quorumMet: met }));
  await batch.commit();
  return { present: count, required, met };
}

export async function waitForNextCall(assembly: Assembly, actor: AssemblyActor) {
  const nextStatus = assembly.status === "first_call" ? "waiting_second_call" : assembly.status === "second_call" ? "waiting_third_call" : null;
  if (!nextStatus || assembly.quorumMet) throw new Error("Não é possível avançar para a próxima chamada.");
  const nextTime = nextStatus === "waiting_second_call" ? assembly.secondCallAt : assembly.thirdCallAt;
  if (Date.now() < nextTime.toMillis()) throw new Error("Ainda não chegou o horário estatutário da próxima chamada.");
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const batch = writeBatch(db);
  batch.update(assemblyRef, { status: nextStatus, updatedAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload(nextStatus === "waiting_second_call" ? "WAITING_SECOND_CALL" : "WAITING_THIRD_CALL", actor, assembly.id));
  await batch.commit();
}

export async function openAssembly(assembly: Assembly, actor: AssemblyActor) {
  if (!["first_call", "second_call", "third_call"].includes(assembly.status) || !assembly.quorumMet) throw new Error("A Assembleia somente pode ser aberta após uma chamada com quórum.");
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const batch = writeBatch(db);
  batch.update(assemblyRef, { status: "in_session", installedCallNumber: assembly.currentCall, presenceOpen: false, openedAt: serverTimestamp(), openedBy: actor.uid, updatedAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("ASSEMBLY_OPENED", actor, assembly.id, { callNumber: assembly.currentCall }));
  await batch.commit();
}

export async function setAgendaOperation(assemblyId: string, agenda: AssemblyAgenda, operation: "open" | "open_comments" | "close_comments" | "open_voting", actor: AssemblyActor, votingMinutes = 30) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const agendaRef = doc(assemblyRef, "agenda", agenda.id);
  const batch = writeBatch(db);
  if (operation === "open") {
    batch.update(assemblyRef, { currentAgendaId: agenda.id, updatedAt: serverTimestamp() });
    batch.update(agendaRef, { status: "open", openedAt: serverTimestamp(), commentsOpen: false, votingOpen: false });
    batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("AGENDA_OPENED", actor, assemblyId, {}, agenda.id));
  } else if (operation === "open_comments") {
    batch.update(agendaRef, { status: "discussion", commentsOpen: true });
    batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("COMMENTS_OPENED", actor, assemblyId, {}, agenda.id));
  } else if (operation === "close_comments") {
    batch.update(agendaRef, { commentsOpen: false, status: "open" });
    batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("COMMENTS_CLOSED", actor, assemblyId, {}, agenda.id));
  } else {
    const startsAt = Timestamp.now();
    const endsAt = Timestamp.fromMillis(startsAt.toMillis() + Math.max(1, votingMinutes) * 60_000);
    batch.update(agendaRef, { status: "voting", commentsOpen: false, votingOpen: true, votingStartsAt: startsAt, votingEndsAt: endsAt, resultPublished: false });
    batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("VOTING_OPENED", actor, assemblyId, { votingMinutes }, agenda.id));
  }
  await batch.commit();
}

export async function createAssemblyComment(assemblyId: string, agendaId: string, content: string, type: "manifestation" | "question" | "admin_response", actor: AssemblyActor) {
  const clean = content.trim();
  if (!clean || clean.length > 2000) throw new Error("A manifestação deve possuir entre 1 e 2000 caracteres.");
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const agendaRef = doc(assemblyRef, "agenda", agendaId);
  const batch = writeBatch(db);
  batch.set(doc(collection(agendaRef, "comments")), { authorUid: actor.uid, authorNameSnapshot: actor.name, content: clean, type, hidden: false, moderationReason: "", createdAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("COMMENT_CREATED", actor, assemblyId, { type }, agendaId));
  await batch.commit();
}

export async function moderateComment(assemblyId: string, agendaId: string, commentId: string, reason: string, actor: AssemblyActor) {
  if (!reason.trim()) throw new Error("Informe o motivo da moderação.");
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const commentRef = doc(assemblyRef, "agenda", agendaId, "comments", commentId);
  const batch = writeBatch(db);
  batch.update(commentRef, { hidden: true, moderationReason: reason.trim(), moderatedAt: serverTimestamp(), moderatedBy: actor.uid });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("COMMENT_MODERATED", actor, assemblyId, { commentId, reason: reason.trim() }, agendaId));
  await batch.commit();
}

export async function castVote(assemblyId: string, agendaId: string, choice: string, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const voteRef = doc(assemblyRef, "agenda", agendaId, "votes", actor.uid);
  const agendaRef = doc(assemblyRef, "agenda", agendaId);
  await runTransaction(db, async (transaction) => {
    const [voteSnapshot, agendaSnapshot] = await Promise.all([transaction.get(voteRef), transaction.get(agendaRef)]);
    if (voteSnapshot.exists()) throw new Error("Seu voto já foi registrado e não pode ser alterado.");
    const agenda = agendaSnapshot.data() as AssemblyAgenda;
    if (!agenda.votingOpen || !agenda.options.includes(choice)) throw new Error("A votação não está aberta ou a opção é inválida.");
    transaction.set(voteRef, { voterUid: actor.uid, choice, createdAt: serverTimestamp(), assemblyId, agendaId });
    transaction.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("VOTE_CAST", actor, assemblyId, {}, agendaId));
  });
  const confirmation = await getDoc(voteRef);
  if (!confirmation.exists()) throw new Error("O voto não foi confirmado pelo Firestore.");
  return confirmation.data();
}

export async function closeVotingAndCalculate(assembly: Assembly, agenda: AssemblyAgenda, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const agendaRef = doc(assemblyRef, "agenda", agenda.id);
  const votesSnapshot = await getDocs(collection(agendaRef, "votes"));
  const choices = votesSnapshot.docs.map((item) => String(item.data().choice));
  const calculated = calculateVoteResult(agenda.options, choices, assembly.presenceCount || 0, agenda.approvalRule);
  const batch = writeBatch(db);
  batch.update(agendaRef, { votingOpen: false, status: "voting_closed", votingClosedAt: serverTimestamp() });
  batch.set(doc(agendaRef, "results", "summary"), {
    totalEligible: assembly.eligibleVoterCount,
    totalPresent: assembly.presenceCount || 0,
    ...calculated,
    calculatedAt: serverTimestamp(),
    calculatedBy: actor.uid,
    approvalRule: agenda.approvalRule,
  });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("VOTING_CLOSED", actor, assembly.id, { totalVotes: calculated.totalVotes }, agenda.id));
  await batch.commit();
  return calculated;
}

export async function publishAgendaResult(assemblyId: string, agendaId: string, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const agendaRef = doc(assemblyRef, "agenda", agendaId);
  const batch = writeBatch(db);
  batch.update(agendaRef, { resultPublished: true, status: "result", resultPublishedAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("RESULT_PUBLISHED", actor, assemblyId, {}, agendaId));
  await batch.commit();
}

export async function closeAgenda(assemblyId: string, agendaId: string, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const batch = writeBatch(db);
  batch.update(doc(assemblyRef, "agenda", agendaId), { status: "closed", commentsOpen: false, votingOpen: false, closedAt: serverTimestamp() });
  batch.update(assemblyRef, { currentAgendaId: null, updatedAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("AGENDA_CLOSED", actor, assemblyId, {}, agendaId));
  await batch.commit();
}

export async function closeAssembly(assemblyId: string, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const batch = writeBatch(db);
  batch.update(assemblyRef, { status: "closed", closedAt: serverTimestamp(), closedBy: actor.uid, presenceOpen: false, currentAgendaId: null, minutesStatus: "pending", updatedAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("ASSEMBLY_CLOSED", actor, assemblyId));
  await batch.commit();
}

export async function cancelAssembly(assembly: Assembly, reason: string, actor: AssemblyActor) {
  if (!["draft", "published"].includes(assembly.status)) throw new Error("Somente rascunho ou convocação ainda não iniciada pode ser cancelado.");
  if (reason.trim().length < 10) throw new Error("Informe uma justificativa de cancelamento com pelo menos 10 caracteres.");
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const batch = writeBatch(db);
  batch.update(assemblyRef, { status: "cancelled", cancellationReason: reason.trim(), cancelledAt: serverTimestamp(), cancelledBy: actor.uid, updatedAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("ASSEMBLY_CANCELLED", actor, assembly.id, { reason: reason.trim() }));
  await batch.commit();
}

export async function saveMinutesDraft(assembly: Assembly, agendas: AssemblyAgenda[], actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assembly.id);
  const [presence, acknowledgement] = await Promise.all([
    getDocs(collection(assemblyRef, "presence")),
    getDocs(collection(assemblyRef, "acknowledgements")),
  ]);
  const results = await Promise.all(agendas.map(async (agenda) => {
    const result = await getDoc(doc(assemblyRef, "agenda", agenda.id, "results", "summary"));
    return { agendaId: agenda.id, title: agenda.title, result: result.exists() ? result.data() : null };
  }));
  const minutes = {
    associationName: AUMM_CURRENT_STATUTE.associationName,
    assemblyId: assembly.id,
    assemblyTitle: assembly.title,
    assemblyType: assembly.type,
    format: assembly.format,
    firstCallAt: assembly.firstCallAt.toMillis(),
    secondCallAt: assembly.secondCallAt.toMillis(),
    thirdCallAt: assembly.thirdCallAt.toMillis(),
    installedCallNumber: assembly.installedCallNumber || 0,
    openedAt: assembly.openedAt?.toMillis() || null,
    closedAt: assembly.closedAt?.toMillis() || null,
    eligibleVoterCount: assembly.eligibleVoterCount,
    presence: presence.docs.map((item) => item.data()),
    acknowledgementCount: acknowledgement.size,
    orderOfDay: assembly.orderOfDay,
    agendas: agendas.map((agenda) => ({ id: agenda.id, order: agenda.order, title: agenda.title, description: agenda.description })),
    results,
  };
  await updateDoc(assemblyRef, { minutesStatus: "draft", updatedAt: serverTimestamp() });
  await writeBatch(db).set(doc(assemblyRef, "minutes", "official"), { ...minutes, status: "draft", generatedAt: serverTimestamp(), generatedBy: actor.uid }).commit();
  return minutes;
}

export async function finalizeMinutes(assemblyId: string, minutes: Record<string, unknown>, actor: AssemblyActor) {
  const canonical = canonicalJson(minutes);
  const hash = await sha256Hex(canonical);
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const minutesRef = doc(assemblyRef, "minutes", "official");
  const batch = writeBatch(db);
  batch.update(minutesRef, { status: "finalized", canonical, hash, algorithm: "SHA-256", finalizedAt: serverTimestamp(), finalizedBy: actor.uid });
  batch.update(assemblyRef, { minutesStatus: "finalized", minutesHash: hash, updatedAt: serverTimestamp() });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("MINUTES_FINALIZED", actor, assemblyId, { hash, algorithm: "SHA-256" }));
  await batch.commit();
  return hash;
}

export async function confirmMinutesApproval(assemblyId: string, actor: AssemblyActor) {
  const { db } = getFirebaseServices();
  const assemblyRef = doc(db, "assemblies", assemblyId);
  const minutesRef = doc(assemblyRef, "minutes", "official");
  const approvalRef = doc(minutesRef, "approvals", actor.uid);
  const [minutes, approval] = await Promise.all([getDoc(minutesRef), getDoc(approvalRef)]);
  if (!minutes.exists() || minutes.data().status !== "finalized") throw new Error("A ata ainda não foi finalizada.");
  if (approval.exists()) throw new Error("Sua confirmação interna já foi registrada.");
  const batch = writeBatch(db);
  batch.set(approvalRef, {
    uid: actor.uid,
    name: actor.name,
    roleSnapshot: actor.role,
    timestamp: serverTimestamp(),
    minutesHash: minutes.data().hash,
  });
  batch.set(doc(collection(assemblyRef, "auditLogs")), auditPayload("MINUTES_APPROVED_INTERNALLY", actor, assemblyId, { hash: minutes.data().hash }));
  await batch.commit();
}
