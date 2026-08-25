import type { Timestamp } from "firebase/firestore";

export type AssemblyStatus =
  | "draft"
  | "published"
  | "first_call"
  | "waiting_second_call"
  | "second_call"
  | "waiting_third_call"
  | "third_call"
  | "in_session"
  | "closed"
  | "cancelled";

export type AgendaStatus =
  | "pending"
  | "open"
  | "discussion"
  | "voting"
  | "voting_closed"
  | "result"
  | "closed";

export type Assembly = {
  id: string;
  type: "ordinary" | "extraordinary";
  title: string;
  description: string;
  orderOfDay: string;
  format: string;
  additionalInfo?: string;
  firstCallAt: Timestamp;
  secondCallAt: Timestamp;
  thirdCallAt: Timestamp;
  status: AssemblyStatus;
  minimumNoticeDays: number;
  eligibleVoterCount: number;
  acknowledgementCount?: number;
  presenceCount?: number;
  currentCall?: number;
  currentAgendaId?: string | null;
  presenceOpen?: boolean;
  quorumMet?: boolean;
  installedCallNumber?: number;
  calledByName?: string;
  publishedAt?: Timestamp;
  publishedByName?: string;
  createdByName?: string;
  openedAt?: Timestamp;
  closedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  minutesStatus?: "pending" | "draft" | "finalized";
  minutesApproverUids?: string[];
  publishedDocumentId?: string;
};

export type AssemblyAgenda = {
  id: string;
  order: number;
  title: string;
  description: string;
  fullText: string;
  assetUrl?: string;
  links?: string[];
  allowComments: boolean;
  allowVoting: boolean;
  votingType: "yes_no_abstention" | "single_choice";
  votePrivacy: "nominal" | "reserved";
  options: string[];
  approvalRule: string;
  hideResultsUntilClosed: boolean;
  status: AgendaStatus;
  commentsOpen?: boolean;
  votingOpen?: boolean;
  votingStartsAt?: Timestamp;
  votingEndsAt?: Timestamp;
  resultPublished?: boolean;
  openedAt?: Timestamp;
  closedAt?: Timestamp;
};

export type AssemblyComment = {
  id: string;
  authorUid: string;
  authorNameSnapshot: string;
  content: string;
  type: "manifestation" | "question" | "admin_response";
  hidden: boolean;
  moderationReason?: string;
  createdAt?: Timestamp;
};

export type AssemblyResult = {
  totalEligible: number;
  totalPresent: number;
  totalVotes: number;
  yes: number;
  no: number;
  abstention: number;
  notVoted: number;
  optionCounts: Record<string, number>;
  calculatedAt?: Timestamp;
  calculatedBy: string;
  approvalRule: string;
  resultStatus: "approved" | "rejected" | "recorded";
};

export const ASSEMBLY_ACTIVE_STATUSES: AssemblyStatus[] = [
  "published", "first_call", "waiting_second_call", "second_call",
  "waiting_third_call", "third_call", "in_session",
];

export const ASSEMBLY_MEMBER_VISIBLE_STATUSES: AssemblyStatus[] = [
  ...ASSEMBLY_ACTIVE_STATUSES,
  "closed",
];
