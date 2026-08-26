"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { CheckCircle2, Plus, Save } from "lucide-react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";
import { firebaseErrorMessage } from "@/lib/firebaseErrorMessage";
import { initialBoard, type BoardMember } from "./BoardWall";

export function BoardAdmin() {
  const [members, setMembers] = useState(initialBoard);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!firebaseEnabled) return;
    getDocs(collection(getFirebaseServices().db, "boardMembers")).then(snapshot => {
      if (!snapshot.empty) setMembers(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as BoardMember)).sort((a,b)=>a.order-b.order));
    }).catch(() => setMessage("Não foi possível carregar o mural."));
  }, []);

  const update = (id: string, field: keyof BoardMember, value: string | number | boolean) => setMembers(current => current.map(member => member.id === id ? { ...member, [field]: value } : member));
  const add = () => setMembers(current => [...current, { id: crypto.randomUUID(), name: "", title: "Novo cargo", photoURL: "", order: current.length + 1, active: true }]);
  async function save() {
    if (!firebaseEnabled) return setMessage("Configure o Firebase para salvar.");
    setBusy(true); setMessage("");
    try {
      const { db } = getFirebaseServices();
      const batch = writeBatch(db);
      members.forEach(member => batch.set(doc(db, "boardMembers", member.id), { name: member.name.trim(), title: member.title.trim(), photoURL: member.photoURL.trim(), order: Number(member.order), active: member.active, updatedAt: serverTimestamp() }, { merge: true }));
      await batch.commit();
      setMessage("Mural da diretoria atualizado.");
    } catch (error) { setMessage(firebaseErrorMessage(error, "Não foi possível salvar.")); }
    finally { setBusy(false); }
  }

  return <section className="panel"><div className="panel-head"><div><h3>Mural da diretoria</h3><p>Edite nome, cargo, ordem e URL pública da foto.</p></div><button className="button button-sm" onClick={add}><Plus size={15}/> Adicionar</button></div>
    <div className="board-admin-list">{members.map(member => <div className="board-admin-row" key={member.id}>
      <label className="field"><span>Nome</span><input value={member.name} onChange={event=>update(member.id,"name",event.target.value)}/></label>
      <label className="field"><span>Cargo</span><input value={member.title} onChange={event=>update(member.id,"title",event.target.value)}/></label>
      <label className="field board-photo-url"><span>URL da foto</span><input type="url" placeholder="https://..." value={member.photoURL} onChange={event=>update(member.id,"photoURL",event.target.value)}/></label>
      <label className="field board-order"><span>Ordem</span><input type="number" min="1" value={member.order} onChange={event=>update(member.id,"order",Number(event.target.value))}/></label>
      <label className="board-active"><input type="checkbox" checked={member.active} onChange={event=>update(member.id,"active",event.target.checked)}/> Exibir</label>
    </div>)}</div>
    {message&&<div className="form-message success"><CheckCircle2 size={16}/> {message}</div>}
    <button className="button" onClick={save} disabled={busy}><Save size={16}/> {busy?"Salvando...":"Salvar mural"}</button>
  </section>;
}
