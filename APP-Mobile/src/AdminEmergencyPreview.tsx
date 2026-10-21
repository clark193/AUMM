import { useState } from "react";
import { Bell, CheckCheck, Phone, Siren, X } from "lucide-react";

// Esta tela só é exibida na prévia local. Todas as ações são simuladas.
export default function AdminEmergencyPreview() {
  const [level, setLevel] = useState("3");
  const [status, setStatus] = useState("idle");
  const [toast, setToast] = useState(false);
  const [inbox, setInbox] = useState(false);
  const [read, setRead] = useState(false);
  const [detail, setDetail] = useState(false);
  const active = ["open", "contacting"].includes(status);
  function simulate() { setStatus("open"); setToast(true); setRead(false); setDetail(false); }
  return <section className="admin-preview">
    <p className="info-panel">Demonstração interativa. Nenhum alerta, ligação ou mensagem é enviado.</p>
    <div className="admin-preview-toolbar"><span className="member-pill">Administração · nível {level}</span><button className="icon-btn" aria-label={`Notificações da demonstração${active && !read ? ", 1 nova" : ""}`} onClick={() => { setInbox(!inbox); setRead(true); setToast(false); }}><Bell />{active && !read && <b className="demo-badge">1</b>}</button></div>
    <label className="demo-level">Visualizar como<select value={level} onChange={e => { setLevel(e.target.value); setDetail(false); }}><option value="3">Equipe de atendimento · nível 3</option><option value="5">Recrutamento · nível 5</option></select></label>
    {inbox && <section className="demo-inbox"><h3>Notificações</h3>{active ? <><strong><Siren size={18} /> Emergência de associado</strong><p>Um associado acionou o alerta de acidente e solicita contato da AUMM.</p>{level === "3" ? <button className="btn" onClick={() => { setDetail(true); setInbox(false); }}>Abrir atendimento</button> : <p>A equipe autorizada acompanha os detalhes em Solicitações.</p>}</> : <p>Nenhum alerta em andamento.</p>}</section>}
    <h3>Central da associação</h3><p className="muted">Veja como chega um novo pedido e como o associado acompanha o atendimento.</p>
    <button className="btn" onClick={simulate}><Siren size={18} /> Simular novo alerta de acidente</button>
    {active && <button className="demo-alert-card" onClick={() => { if (level === "3") { setDetail(true); setRead(true); setToast(false); } else { setInbox(true); setRead(true); setToast(false); } }}><Siren /><span><strong>1 alerta de emergência</strong><small>{status === "contacting" ? "Em acompanhamento pela associação" : "Aguardando acompanhamento"}</small></span><span>›</span></button>}
    {detail && active && level === "3" && <article className="demo-emergency-detail"><span className="eyebrow">Atendimento de demonstração</span><h3>Rafael · associado fictício</h3><p>AUMM-DEMO · acidente informado agora</p><div className="demo-location"><Siren size={24} /><strong>Localização do alerta</strong><p>Centro · Blumenau, SC</p><small>Mapa e informações ilustrativos nesta prévia.</small></div><p><Phone size={15} /> Contato do associado: (47) 9••••-••••</p>{status === "open" && <button className="btn" onClick={() => setStatus("contacting")}>Estou entrando em contato</button>}<button className="btn secondary" onClick={() => { setStatus("resolved"); setToast(false); setDetail(false); }}>Encerrar atendimento</button></article>}
    {status === "resolved" && <p className="demo-success" role="status"><CheckCheck size={19} /> Atendimento encerrado. No app do associado, o status também é atualizado.</p>}
    {toast && active && <aside className="demo-emergency-toast" role="alert"><Siren size={25} /><div><strong>Emergência de associado</strong><p>Um associado pediu contato após um acidente.</p><button className="btn" onClick={() => { setToast(false); setRead(true); if (level === "3") setDetail(true); else setInbox(true); }}>{level === "3" ? "Abrir atendimento" : "Ver aviso"}</button></div><button className="icon-btn" aria-label="Dispensar aviso de demonstração" onClick={() => setToast(false)}><X size={18} /></button></aside>}
  </section>;
}
