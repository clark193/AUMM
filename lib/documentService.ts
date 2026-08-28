import { collection, doc, getDocs, query, runTransaction, serverTimestamp, Timestamp, where, writeBatch } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";
import type { Assembly, AssemblyAgenda } from "./assemblyTypes";
import type { InstitutionalDocument } from "./documentTypes";
import { validExternalDocumentUrl } from "./documentUrl";
import type { AssemblyActor } from "./assemblyService";

export type DocumentDraft = Omit<InstitutionalDocument,"id"|"documentDate"|"createdAt"|"updatedAt"|"publishedAt"> & { documentDate: Date };
const audit = (action:string,actor:AssemblyActor,documentId:string,metadata:Record<string,unknown>={}) => ({ action,actorUid:actor.uid,actorNameSnapshot:actor.name,actorRoleSnapshot:actor.role,documentId,metadata,timestamp:serverTimestamp() });

export async function createInstitutionalDocument(input:DocumentDraft,actor:AssemblyActor) {
  const { db } = getFirebaseServices(); const ref = doc(collection(db,"documents")); const batch = writeBatch(db);
  batch.set(ref,{...input,title:input.title.trim(),description:input.description.trim(),documentDate:Timestamp.fromDate(input.documentDate),published:false,status:"draft",isCurrent:false,createdAt:serverTimestamp(),createdBy:actor.uid,updatedAt:serverTimestamp(),updatedBy:actor.uid});
  batch.set(doc(collection(db,"documentAuditLogs")),audit("DOCUMENT_CREATED",actor,ref.id)); await batch.commit(); return ref.id;
}
export async function publishInstitutionalDocument(item:InstitutionalDocument,actor:AssemblyActor,setCurrent=false) {
  const { db }=getFirebaseServices(); const batch=writeBatch(db);
  if(setCurrent && item.category==="statute") { const old=await getDocs(query(collection(db,"documents"),where("category","==","statute"),where("isCurrent","==",true))); old.docs.forEach(row=>{if(row.id!==item.id) batch.update(row.ref,{isCurrent:false,status:"replaced",replacedAt:serverTimestamp(),updatedAt:serverTimestamp(),updatedBy:actor.uid});}); }
  batch.update(doc(db,"documents",item.id),{published:true,status:setCurrent&&item.category==="statute"?"current":"published",isCurrent:setCurrent&&item.category==="statute",publishedAt:serverTimestamp(),publishedBy:actor.uid,updatedAt:serverTimestamp(),updatedBy:actor.uid});
  batch.set(doc(collection(db,"documentAuditLogs")),audit(setCurrent?"STATUTE_SET_CURRENT":"DOCUMENT_PUBLISHED",actor,item.id)); await batch.commit();
}
export async function archiveInstitutionalDocument(item:InstitutionalDocument,actor:AssemblyActor) { const {db}=getFirebaseServices(); const batch=writeBatch(db); batch.update(doc(db,"documents",item.id),{status:"archived",published:false,isCurrent:false,updatedAt:serverTimestamp(),updatedBy:actor.uid}); batch.set(doc(collection(db,"documentAuditLogs")),audit("DOCUMENT_ARCHIVED",actor,item.id)); await batch.commit(); }
export async function updateSignedDocument(item:InstitutionalDocument,url:string,actor:AssemblyActor) { const safeUrl=validExternalDocumentUrl(url);if(!safeUrl)throw new Error("Informe uma URL completa iniciada por https:// para o documento assinado.");const {db}=getFirebaseServices(); const batch=writeBatch(db); batch.update(doc(db,"documents",item.id),{signedDocumentUrl:safeUrl,updatedAt:serverTimestamp(),updatedBy:actor.uid}); batch.set(doc(collection(db,"documentAuditLogs")),audit("SIGNED_DOCUMENT_LINKED",actor,item.id)); await batch.commit(); }
export async function publishAssemblyMinutesDocument(assembly:Assembly,agendas:AssemblyAgenda[],visibility:"public"|"members"|"admin",number:string,actor:AssemblyActor) {
  const {db}=getFirebaseServices(); const assemblyRef=doc(db,"assemblies",assembly.id); const documentRef=doc(collection(db,"documents"));
  await runTransaction(db,async tx=>{ const current=await tx.get(assemblyRef); if(current.data()?.minutesStatus!=="finalized") throw new Error("Finalize a ata antes de publicar em Documentos."); if(current.data()?.publishedDocumentId) throw new Error("Esta ata já foi publicada no Portal de Documentos.");
    tx.set(documentRef,{category:"assembly_minutes",subcategory:"general_assembly",title:`Ata — ${assembly.title}`,description:assembly.orderOfDay,documentNumber:number,year:assembly.firstCallAt.toDate().getFullYear(),documentDate:assembly.firstCallAt,sourceType:"assembly_minutes",sourceId:assembly.id,assemblyId:assembly.id,minutesType:"general_assembly",meetingType:assembly.type,visibility,status:"published",published:true,isCurrent:false,approvalStatus:"approved",agendaTitles:agendas.map(a=>a.title),createdAt:serverTimestamp(),createdBy:actor.uid,updatedAt:serverTimestamp(),updatedBy:actor.uid,publishedAt:serverTimestamp(),publishedBy:actor.uid});
    tx.update(assemblyRef,{publishedDocumentId:documentRef.id,updatedAt:serverTimestamp()}); tx.set(doc(collection(db,"documentAuditLogs")),audit("ASSEMBLY_MINUTES_PUBLISHED",actor,documentRef.id,{assemblyId:assembly.id})); }); return documentRef.id;
}
