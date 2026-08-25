import type { AssemblyStatus } from "./assemblyTypes";

export const AUMM_CURRENT_STATUTE = {
  associationName: "Associação União Maior Motoboys",
  minimumNoticeDays: 15,
  callIntervalMinutes: 30,
  timeZone: "America/Sao_Paulo",
  firstCallFraction: 2 / 3,
  secondCallFraction: 1 / 2,
  thirdCallMinimum: 1,
  ordinaryApprovalRule: "simple_majority_present",
} as const;

const transitions: Record<AssemblyStatus, readonly AssemblyStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["first_call", "cancelled"],
  first_call: ["in_session", "waiting_second_call", "cancelled"],
  waiting_second_call: ["second_call", "cancelled"],
  second_call: ["in_session", "waiting_third_call", "cancelled"],
  waiting_third_call: ["third_call", "cancelled"],
  third_call: ["in_session", "cancelled"],
  in_session: ["closed"],
  closed: [],
  cancelled: [],
};

export function canTransitionAssembly(from: AssemblyStatus, to: AssemblyStatus) {
  return from === to || transitions[from].includes(to);
}

export function calculateQuorum(eligible: number, callNumber: number) {
  const total = Math.max(0, Math.floor(eligible));
  if (callNumber === 1) return Math.ceil((total * 2) / 3);
  if (callNumber === 2) return Math.ceil(total / 2);
  return 1;
}

export function quorumReached(eligible: number, present: number, callNumber: number) {
  return present >= calculateQuorum(eligible, callNumber) && present > 0;
}

export function noticeDaysBetween(publishedAt: Date, firstCallAt: Date) {
  return Math.floor((firstCallAt.getTime() - publishedAt.getTime()) / 86_400_000);
}

export function noticePeriodIsValid(publishedAt: Date, firstCallAt: Date, minimumDays: number = AUMM_CURRENT_STATUTE.minimumNoticeDays) {
  return firstCallAt.getTime() - publishedAt.getTime() >= minimumDays * 86_400_000;
}

export function calculateVoteResult(
  options: string[],
  choices: string[],
  totalPresent: number,
  approvalRule: string = AUMM_CURRENT_STATUTE.ordinaryApprovalRule,
) {
  const optionCounts = Object.fromEntries(options.map((option) => [option, 0])) as Record<string, number>;
  choices.forEach((choice) => { if (choice in optionCounts) optionCounts[choice] += 1; });
  const yes = optionCounts.APROVO || 0;
  const no = optionCounts.REJEITO || 0;
  const abstention = optionCounts["ABSTENÇÃO"] || 0;
  const totalVotes = choices.length;
  const resultStatus = approvalRule === "simple_majority_present"
    ? (yes > no ? "approved" : "rejected")
    : "recorded";
  return {
    optionCounts,
    totalVotes,
    yes,
    no,
    abstention,
    notVoted: Math.max(0, totalPresent - totalVotes),
    resultStatus,
  } as const;
}

export function formatSaoPaulo(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: AUMM_CURRENT_STATUTE.timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
