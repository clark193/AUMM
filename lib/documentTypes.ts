import type { Timestamp } from "firebase/firestore";

export type InstitutionalDocument = {
  id: string; category: string; subcategory?: string; title: string; description: string;
  documentNumber?: string; year: number; documentDate: Timestamp; sourceType: "internal" | "external" | "assembly_minutes" | "assembly_notice";
  internalUrl?: string; externalUrl?: string; sourceId?: string; visibility: "public" | "members" | "admin";
  status: "draft" | "published" | "archived" | "current" | "replaced" | "revoked" | "awaiting_approval" | "approved";
  published: boolean; isCurrent?: boolean; statuteVersion?: string; approvedAt?: Timestamp; registeredAt?: Timestamp;
  replacedAt?: Timestamp; minutesType?: "general_assembly" | "board_meeting" | "other"; meetingType?: "ordinary" | "extraordinary";
  assemblyId?: string; approvalStatus?: string; signedDocumentUrl?: string; createdAt?: Timestamp; updatedAt?: Timestamp; publishedAt?: Timestamp;
};

export const DOCUMENT_CATEGORIES = ["statute","assembly_minutes","board_minutes","notice","convocation","regulation","standard","accounts","institutional","other"] as const;
export const DOCUMENT_CATEGORY_NAMES: Record<string,string> = { statute:"Estatuto Social",assembly_minutes:"Ata de Assembleia",board_minutes:"Ata do Conselho Diretor",notice:"Edital",convocation:"Convocação",regulation:"Regimento",standard:"Norma",accounts:"Prestação de Contas",institutional:"Documento Institucional",other:"Outro" };
