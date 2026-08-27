"use client";

import { deleteApp, FirebaseError, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, deleteUser, inMemoryPersistence, initializeAuth, signOut } from "firebase/auth";
import { collection, doc, getDocs, limit, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, LoaderCircle, Upload, UsersRound } from "lucide-react";
import { useState } from "react";
import readXlsxFile, { type Row } from "read-excel-file/browser";
import { firebaseConfig, getFirebaseServices } from "@/lib/firebase";

type Candidate = {
  fullName: string; email: string; cpf: string; phone: string; birthDate: string; rg: string;
  issuingBody: string; address: string; maritalStatus: string; dependents: string;
  bloodType: string; emergencyContact: string;
};
type Preview = { candidates: Candidate[]; sourceRows: number; duplicates: number; invalid: number; warnings: string[]; issues: string[] };

function text(value: Row[number]) {
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  return value === null || value === undefined ? "" : String(value).trim();
}
function normalized(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function digits(value: string) { return value.replace(/\D/g, ""); }
function normalizeCpf(value: Row[number]) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value).toString().padStart(11, "0");
  const raw = text(value);
  if (/^[\d.,]+e\+?\d+$/i.test(raw)) return Math.trunc(Number(raw.replace(",", "."))).toString().padStart(11, "0");
  const current = digits(raw);
  return current.length && current.length <= 11 ? current.padStart(11, "0") : current;
}
function headerIndex(headers: string[], ...matches: string[]) { return headers.findIndex(header => matches.some(match => header.includes(match))); }
function valueAt(row: Row, index: number) { return index >= 0 ? text(row[index]) : ""; }

function parseCandidates(rows: Row[]): Preview {
  if (rows.length < 2) return { candidates: [], sourceRows: 0, duplicates: 0, invalid: 0, warnings: ["A planilha não possui dados."], issues: [] };
  const headers = rows[0].map(value => normalized(text(value)));
  const indexes = {
    name: headerIndex(headers, "nome completo"), birth: headerIndex(headers, "data de nascimento"), cpf: headerIndex(headers, "numero de cpf"),
    rg: headerIndex(headers, "numero de rg"), issuer: headerIndex(headers, "orgao emissor"), address: headerIndex(headers, "endereco insira", "endereco"),
    phone: headerIndex(headers, "numero do celular"), email: headerIndex(headers, "e mail para contato", "email para contato"), marital: headerIndex(headers, "estado civil"),
    dependents: headerIndex(headers, "filhos ou demais dependentes"), blood: headerIndex(headers, "tipo sanguineo"), emergency: headerIndex(headers, "referencia familiar"),
  };
  const missingHeaders = [[indexes.name, "nome"], [indexes.email, "e-mail"], [indexes.cpf, "CPF"], [indexes.phone, "celular"]].filter(([index]) => Number(index) < 0).map(([, label]) => String(label));
  if (missingHeaders.length) return { candidates: [], sourceRows: rows.length - 1, duplicates: 0, invalid: rows.length - 1, warnings: [`Colunas obrigatórias não encontradas: ${missingHeaders.join(", ")}.`], issues: [] };

  const deduped = new Map<string, Candidate>();
  const cpfOwners = new Map<string, string>();
  let invalid = 0;
  let duplicates = 0;
  const issues: string[] = [];
  for (const [rowIndex, row] of rows.slice(1).entries()) {
    if (!row.some(value => text(value))) continue;
    const email = valueAt(row, indexes.email).toLowerCase();
    const cpf = normalizeCpf(row[indexes.cpf]);
    const fullName = valueAt(row, indexes.name);
    const phone = digits(valueAt(row, indexes.phone));
    const problems = [!fullName ? "nome ausente" : "", !/^\S+@\S+\.\S+$/.test(email) ? "e-mail inválido ou ausente" : "", cpf.length !== 11 ? "CPF inválido ou ausente" : ""].filter(Boolean);
    if (problems.length) { invalid += 1; issues.push(`Linha ${rowIndex + 2}: ${fullName || email || "sem identificação"} — ${problems.join(", ")}.`); continue; }
    const candidate: Candidate = { fullName, email, cpf, phone, birthDate: valueAt(row, indexes.birth), rg: valueAt(row, indexes.rg), issuingBody: valueAt(row, indexes.issuer), address: valueAt(row, indexes.address), maritalStatus: valueAt(row, indexes.marital), dependents: valueAt(row, indexes.dependents), bloodType: valueAt(row, indexes.blood), emergencyContact: valueAt(row, indexes.emergency) };
    const previousByCpf = cpfOwners.get(cpf);
    if (deduped.has(email) || previousByCpf) duplicates += 1;
    if (previousByCpf && previousByCpf !== email) deduped.delete(previousByCpf);
    deduped.set(email, candidate);
    cpfOwners.set(cpf, email);
  }
  return { candidates: [...deduped.values()], sourceRows: rows.slice(1).filter(row => row.some(value => text(value))).length, duplicates, invalid, warnings: [], issues };
}

function memberNumber() { return `AUMM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`; }

export function BulkMemberImport() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ created: number; existing: number; failed: number } | null>(null);
  const [message, setMessage] = useState("");

  async function selectFile(file?: File) {
    if (!file) return;
    setMessage(""); setResult(null);
    try {
      const sheets = await readXlsxFile(file);
      const primary = sheets.find(sheet => normalized(sheet.sheet).includes("respostas ao formulario 1")) || sheets[0];
      if (!primary) throw new Error("Nenhuma aba encontrada na planilha.");
      setPreview(parseCandidates(primary.data));
    } catch (error) { setPreview(null); setMessage(error instanceof Error ? error.message : "Não foi possível ler a planilha."); }
  }

  async function runImport() {
    if (!preview?.candidates.length) return;
    setBusy(true); setProgress(0); setMessage(""); setResult(null);
    const { auth, db } = getFirebaseServices();
    if (!auth.currentUser) { setBusy(false); return setMessage("A sessão administrativa expirou. Entre novamente."); }
    const secondaryApp = initializeApp(firebaseConfig, `bulk-member-import-${crypto.randomUUID()}`);
    const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
    let created = 0, existing = 0, failed = 0;
    try {
      for (let index = 0; index < preview.candidates.length; index += 1) {
        const item = preview.candidates[index];
        let createdUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>["user"] | null = null;
        try {
          const found = await getDocs(query(collection(db, "associados"), where("email", "==", item.email), limit(1)));
          if (!found.empty) { existing += 1; setProgress(index + 1); continue; }
          const credential = await createUserWithEmailAndPassword(secondaryAuth, item.email, item.cpf);
          createdUser = credential.user;
          const number = memberNumber();
          const batch = writeBatch(db);
          batch.set(doc(db, "associados", createdUser.uid), { uid: createdUser.uid, memberNumber: number, fullName: item.fullName, email: item.email, cpf: item.cpf, phone: item.phone, whatsapp: item.phone, birthDate: item.birthDate, rg: item.rg, issuingBody: item.issuingBody, address: item.address, city: "Blumenau", state: "SC", maritalStatus: item.maritalStatus, dependents: item.dependents, bloodType: item.bloodType, emergencyContact: item.emergencyContact, role: "Associado", status: "active", authorized: true, eligibleToVote: true, mustChangePassword: true, source: "excel_import", createdBy: auth.currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          batch.set(doc(db, "publicMembers", number), { uid: createdUser.uid, memberNumber: number, fullName: item.fullName, role: "Associado", status: "active", updatedAt: serverTimestamp() });
          await batch.commit();
          await signOut(secondaryAuth);
          created += 1;
        } catch (error) {
          if (createdUser) { try { await deleteUser(createdUser); } catch { /* conta órfã sinalizada no resultado */ } }
          if (error instanceof FirebaseError && error.code === "auth/email-already-in-use") existing += 1; else failed += 1;
        }
        setProgress(index + 1);
      }
      setResult({ created, existing, failed });
      setMessage(failed ? "Importação concluída com algumas pendências. Revise o resumo abaixo." : "Importação concluída com sucesso.");
    } finally {
      try { await signOut(secondaryAuth); } catch { /* sessão já encerrada */ }
      await deleteApp(secondaryApp);
      setBusy(false);
    }
  }

  return <section className="panel bulk-import">
    <div className="panel-head"><div><h3><FileSpreadsheet /> Importar associados do Excel</h3><p>Cria os logins usando o e-mail e define o CPF como senha inicial, sem guardar a senha no banco.</p></div></div>
    <label className="bulk-import-drop"><Upload /><span><strong>Selecionar planilha .xlsx</strong><small>O arquivo é lido no seu aparelho e os dados não são enviados ao GitHub.</small></span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={event => selectFile(event.target.files?.[0])} /></label>
    {preview && <div className="import-summary"><div><strong>{preview.candidates.length}</strong><span>prontos para importar</span></div><div><strong>{preview.sourceRows}</strong><span>linhas encontradas</span></div><div><strong>{preview.duplicates}</strong><span>duplicidades consolidadas</span></div><div className={preview.invalid ? "warning" : ""}><strong>{preview.invalid}</strong><span>linhas incompletas</span></div></div>}
    {preview?.warnings.map(warning => <div className="form-message error" key={warning}><AlertTriangle /> {warning}</div>)}
    {!!preview?.issues.length && <details className="import-issues"><summary>Ver {preview.issues.length} linha(s) que precisam de correção</summary><ul>{preview.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></details>}
    {busy && <div className="import-progress"><div style={{ width: `${preview ? progress / preview.candidates.length * 100 : 0}%` }} /><span>{progress} de {preview?.candidates.length}</span></div>}
    {result && <div className="import-result"><CheckCircle2 /><span><strong>{result.created} contas criadas</strong><small>{result.existing} já existentes · {result.failed} pendências</small></span></div>}
    {message && <div className={`form-message ${result?.failed || !result ? "error" : "success"}`}>{message}</div>}
    <button className="button" type="button" disabled={busy || !preview?.candidates.length} onClick={runImport}>{busy ? <LoaderCircle className="spin" /> : <UsersRound />} {busy ? "Importando…" : `Criar ${preview?.candidates.length || 0} acessos`}</button>
  </section>;
}
