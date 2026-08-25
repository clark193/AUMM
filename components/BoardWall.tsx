"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { UserRound } from "lucide-react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

export type BoardMember = {
  id: string;
  name: string;
  title: string;
  photoURL: string;
  order: number;
  active: boolean;
};

export const initialBoard: BoardMember[] = [
  { id: "presidente", name: "Nome a definir", title: "Presidente", photoURL: "", order: 1, active: true },
  { id: "vice-presidente", name: "Nome a definir", title: "Vice-Presidente", photoURL: "", order: 2, active: true },
  { id: "diretor", name: "Nome a definir", title: "Diretor", photoURL: "", order: 3, active: true },
  { id: "secretario-1", name: "Nome a definir", title: "1º Secretário", photoURL: "", order: 4, active: true },
  { id: "secretario-2", name: "Nome a definir", title: "2º Secretário", photoURL: "", order: 5, active: true },
  { id: "secretario-3", name: "Nome a definir", title: "3º Secretário", photoURL: "", order: 6, active: true },
  { id: "tesoureiro", name: "Nome a definir", title: "Tesoureiro", photoURL: "", order: 7, active: true },
];

export function BoardWall() {
  const [members, setMembers] = useState(initialBoard);
  useEffect(() => {
    if (!firebaseEnabled) return;
    getDocs(collection(getFirebaseServices().db, "boardMembers")).then(snapshot => {
      if (snapshot.empty) return;
      const loaded = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as BoardMember));
      setMembers(loaded.filter(item => item.active).sort((a, b) => a.order - b.order));
    }).catch(() => undefined);
  }, []);

  return <section className="section board-section"><div className="container">
    <div className="section-heading"><div><span className="eyebrow">Quem representa a categoria</span><h2>Diretoria da AUMM</h2></div><p>Conheça as pessoas responsáveis por conduzir, representar e fortalecer a associação.</p></div>
    <div className="board-grid">{members.map(member => <article className="board-card" key={member.id}>
      <div className="board-photo" style={member.photoURL ? { backgroundImage: `url("${member.photoURL.replace(/["\\]/g, "")}")` } : undefined}>{!member.photoURL && <UserRound aria-hidden="true"/>}</div>
      <div><span>{member.title}</span><h3>{member.name}</h3></div>
    </article>)}</div>
  </div></section>;
}
