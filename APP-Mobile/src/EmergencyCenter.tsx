import { useEffect, useRef, useState } from "react";
import { wakeExternalNotifications } from "../../lib/externalNotifications";
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { Siren, Phone, MapPin } from "lucide-react";
import { friendly, services } from "./firebase";
import { locate, composeEmergencySms } from "./platform";
import { isPreview, previewPosition } from "./preview";
import { emergencyPhone, emergencyMessage } from "../../lib/emergencyMessage";

type Alert = { status: string; fullName: string; location: { lat: number; lng: number; accuracy: number } | null; contactPhone: string; incidentId: string };
const labels: Record<string, string> = { open: "Aguardando atendimento da associação", contacting: "A associação está verificando seu pedido", resolved: "Atendimento encerrado", cancelled: "Alerta cancelado" };
export default function EmergencyCenter({ uid }: { uid: string }) {
  const [name, setName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [useGps, setUseGps] = useState(true);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (isPreview) { setName("Mariana · contato fictício"); setContactPhone("+5547999991234"); setPhone("+5547999994321"); setSaved(true); setLoading(false); return; }
    const { db } = services();
    const stopContact = onSnapshot(doc(db, "emergencyContacts", uid), { includeMetadataChanges: true }, (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const data = snap.data(); setName(data?.name || ""); setContactPhone(data?.contactPhone || ""); setPhone(data?.phone || ""); setSaved(snap.exists()); setLoading(false);
    }, (e) => { setError(friendly(e)); setLoading(false); });
    const stopAlert = onSnapshot(doc(db, "emergencyAlerts", uid), { includeMetadataChanges: true }, (snap) => {
      if (!snap.metadata.hasPendingWrites) setAlert(snap.exists() ? snap.data() as Alert : null);
    }, (e) => setError(friendly(e)));
    return () => { alive.current = false; stopContact(); stopAlert(); };
  }, [uid]);
  const active = !!alert && ["open", "contacting"].includes(alert.status);
  async function saveContact() {
    if (isPreview) { setSaved(true); return; }
    setBusy(true); setError("");
    try {
      if (name.trim().length < 2) throw new Error("Informe o nome do contato.");
      await setDoc(doc(services().db, "emergencyContacts", uid), { uid, name: name.trim(), contactPhone: emergencyPhone(contactPhone), phone: emergencyPhone(phone), updatedAt: serverTimestamp() });
    } catch (e) { setError(e instanceof Error ? e.message : friendly(e)); }
    finally { setBusy(false); }
  }
  async function sendAlert() {
    if (isPreview) {
      setAlert({ status: "open", fullName: "Associado de demonstração", location: useGps ? { lat: previewPosition.lat, lng: previewPosition.lng, accuracy: previewPosition.accuracy } : null, contactPhone, incidentId: "preview" }); setConfirm(false); return;
    }
    setBusy(true); setError("");
    try {
      const location = useGps ? await locate() : null;
      if (!alive.current) return;
      const { db } = services();
      const registered = await runTransaction(db, async (tx) => {
        const ref = doc(db, "emergencyAlerts", uid);
        const [member, contact, previous] = await Promise.all([tx.get(doc(db, "associados", uid)), tx.get(doc(db, "emergencyContacts", uid)), tx.get(ref)]);
        if (member.data()?.status !== "active" || member.data()?.mustChangePassword) throw new Error("O alerta exige uma conta de associado ativa.");
        if (!contact.exists()) throw new Error("Salve primeiro o contato de emergência.");
        if (previous.exists() && ["open", "contacting"].includes(previous.data().status)) throw new Error("Seu alerta já está em andamento.");
        const data = { ownerUid: uid, fullName: String(member.data()?.fullName || "Associado AUMM"), memberNumber: String(member.data()?.memberNumber || ""), phone: contact.data().phone,
          contactName: contact.data().name, contactPhone: contact.data().contactPhone, incidentId: crypto.randomUUID(),
          location, status: "open", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        tx.set(ref, data);
        tx.set(doc(db, "emergencyAdminSignals", uid), { incidentId: data.incidentId, status: data.status, createdAt: data.createdAt, updatedAt: data.updatedAt });
        return data;
      });
      setConfirm(false);
      wakeExternalNotifications(services());
      try { await composeEmergencySms(registered.contactPhone, emergencyMessage(registered.fullName, registered.location)); }
      catch { setError("O alerta foi registrado na AUMM, mas o SMS não abriu. Use o botão abaixo para tentar novamente ou ligue para seu contato."); }
    } catch (e) { if (alive.current) setError((e instanceof Error ? e.message : friendly(e)) + (useGps ? " Se necessário, desmarque o GPS e envie sem localização." : "")); }
    finally { if (alive.current) setBusy(false); }
  }
  async function cancel() {
    setBusy(true); setError("");
    try {
      if (isPreview) setAlert(current => current ? { ...current, status: "cancelled" } : null);
      else {
        const { db } = services();
        await runTransaction(db, async tx => {
          const ref = doc(db, "emergencyAlerts", uid), current = await tx.get(ref);
          if (!current.exists()) throw new Error("Alerta não encontrado.");
          const updatedAt = serverTimestamp();
          tx.update(ref, { status: "cancelled", updatedAt });
          tx.set(doc(db, "emergencyAdminSignals", uid), { incidentId: current.data().incidentId, status: "cancelled", createdAt: current.data().createdAt, updatedAt });
        });
      }
    } catch (e) { setError(friendly(e)); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Carregando contato de emergência…</p>;
  return <section className="emergency-center">
    <div className="emergency-intro"><Siren size={32} /><h3>Preciso de apoio após um acidente</h3><p>O alerta aparece no painel da AUMM. O atendimento depende de um responsável disponível e não substitui o socorro de emergência.</p></div>
    {isPreview && <p className="info-panel">Demonstração: nenhum alerta ou mensagem será enviado.</p>}
    {error && <p className="error-panel" role="alert">{error}</p>}
    {active ? <div className="emergency-progress" role="status"><strong>{labels[alert.status]}</strong><p>{alert.location ? "Localização do momento do alerta registrada." : "Alerta registrado sem localização."}</p><p>O registro no painel não confirma que alguém já leu. Você pode ligar para o seu contato agora.</p><a className="btn" href={`tel:${alert.contactPhone}`} onClick={e => { if (isPreview) e.preventDefault(); }}><Phone size={18} /> Ligar para o contato</a><EmergencyMessageAction alert={alert} />{isPreview && <><button className="btn" onClick={() => setAlert(current => current ? { ...current, status: "contacting" } : null)}>Simular associação entrando em contato</button><button className="btn secondary" onClick={() => setAlert(current => current ? { ...current, status: "resolved" } : null)}>Simular atendimento encerrado</button></>}<button className="btn secondary" disabled={busy} onClick={() => void cancel()}>Cancelar alerta · acionei por engano</button></div> : <>
      {alert && <p role="status">{labels[alert.status]}</p>}
      <form onSubmit={(e) => { e.preventDefault(); void saveContact(); }} className="emergency-contact-form">
        <h3>Seu contato de emergência</h3><p>Combine com essa pessoa antes de cadastrá-la. Estes dados ficam disponíveis apenas para você e para a equipe autorizada da AUMM.</p>
        <label>Nome do contato<input maxLength={100} value={name} onChange={e => { setName(e.target.value); setSaved(false); }} required /></label>
        <label>Celular do contato com DDD<input type="tel" maxLength={25} value={contactPhone} onChange={e => { setContactPhone(e.target.value); setSaved(false); }} required /></label>
        <label>Seu celular para retorno<input type="tel" maxLength={25} value={phone} onChange={e => { setPhone(e.target.value); setSaved(false); }} required /></label>
        <button className="btn secondary" disabled={busy}>{saved ? "Contato salvo" : "Salvar contato"}</button>
      </form>
      {!confirm ? <button type="button" className="emergency-trigger" disabled={!saved || busy} onClick={() => { setError(""); setConfirm(true); }}><Siren /> Sofri um acidente · pedir apoio</button> : <div className="emergency-confirm"><h3>Confirmar alerta de acidente?</h3><label><input type="checkbox" checked={useGps} onChange={e => setUseGps(e.target.checked)} disabled={busy} /><MapPin size={18} /> Incluir minha localização atual</label><p>Seu nome, telefone, contato e localização autorizada serão registrados para a associação entrar em contato. Depois abriremos o SMS: toque em Enviar no celular para avisar seu contato. A operadora pode cobrar pelo SMS.</p><button type="button" className="emergency-trigger" disabled={busy} onClick={() => void sendAlert()}>{busy ? "Registrando alerta…" : "Confirmar e avisar a associação"}</button><button className="btn secondary" disabled={busy} onClick={() => setConfirm(false)}>Voltar sem enviar</button></div>}
    </>}
  </section>;
}
function EmergencyMessageAction({ alert }: { alert: Alert }) {
  const [error, setError] = useState("");
  return <><p className="muted">O SMS precisa ser enviado no aplicativo de mensagens do celular. Não conseguimos confirmar envio ou entrega. A operadora pode cobrar pelo SMS.</p><button className="btn" onClick={() => {
    if (isPreview) { setError("Demonstração: o SMS não será aberto."); return; }
    void composeEmergencySms(alert.contactPhone, emergencyMessage(alert.fullName, alert.location)).catch(() => setError("Não foi possível abrir o SMS. Ligue para o contato ou copie a mensagem abaixo."));
  }}>Abrir SMS para meu contato</button>{error && <p role="alert">{error}</p>}<details><summary>Ver mensagem para copiar</summary><p>{emergencyMessage(alert.fullName, alert.location)}</p></details></>;
}

export function EmergencyHome({ uid, onOpen }: { uid: string; onOpen: () => void }) {
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (isPreview) return;
    return onSnapshot(doc(services().db, "emergencyAlerts", uid), snap => setStatus(String(snap.data()?.status || "")), () => setStatus(""));
  }, [uid]);
  return <button className="emergency-home" onClick={onOpen}><Siren size={24} /><span><strong>{["open", "contacting"].includes(status) ? "Alerta de emergência em andamento" : "Botão de emergência"}</strong><small>{labels[status] || "Acidente · contato de confiança e apoio da AUMM"}</small></span><span aria-hidden>›</span></button>;
}
