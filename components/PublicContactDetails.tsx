"use client";

import { AtSign, ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

export type PublicSettings = {
  associationName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  instagram?: string;
  facebook?: string;
  siteMessage?: string;
};

export const publicSettingsFallback: PublicSettings = {
  associationName: "Associação União Maior Motoboys",
  email: "contato@aumm.com.br",
  city: "Blumenau",
  state: "SC",
  instagram: "@aummblumenau",
};

export function usePublicSettings() {
  const [settings, setSettings] = useState(publicSettingsFallback);
  useEffect(() => {
    if (!firebaseEnabled) return;
    return onSnapshot(doc(getFirebaseServices().db, "settings", "public"), (snapshot) => {
      if (snapshot.exists()) setSettings({ ...publicSettingsFallback, ...snapshot.data() });
    });
  }, []);
  return settings;
}

function digits(value?: string) { return (value || "").replace(/\D/g, ""); }
function socialUrl(value?: string, network?: "instagram" | "facebook") {
  const current = value?.trim();
  if (!current) return "";
  if (/^https?:\/\//i.test(current)) return current;
  const handle = current.replace(/^@/, "");
  return network === "facebook" ? `https://facebook.com/${handle}` : `https://instagram.com/${handle}`;
}

export function PublicContactDetails() {
  const settings = usePublicSettings();
  const whatsapp = digits(settings.whatsapp || settings.phone);
  const instagram = socialUrl(settings.instagram, "instagram");
  const facebook = socialUrl(settings.facebook, "facebook");
  return <div className="contact-grid">
    <article className="contact-card contact-card-main">
      <span>Atendimento AUMM</span>
      <h2>Fale com a associação</h2>
      <p>{settings.siteMessage || "Estamos à disposição para orientar associados, parceiros e profissionais da categoria."}</p>
      {whatsapp && <a className="button" href={`https://wa.me/55${whatsapp.replace(/^55/, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Chamar no WhatsApp</a>}
    </article>
    <div className="contact-list">
      {settings.email && <a href={`mailto:${settings.email}`}><Mail /><span><small>E-mail</small><strong>{settings.email}</strong></span></a>}
      {(settings.phone || settings.whatsapp) && <a href={`tel:+55${digits(settings.phone || settings.whatsapp).replace(/^55/, "")}`}><Phone /><span><small>Telefone</small><strong>{settings.phone || settings.whatsapp}</strong></span></a>}
      {(settings.address || settings.city) && <div><MapPin /><span><small>Endereço</small><strong>{[settings.address, [settings.city, settings.state].filter(Boolean).join(" · ")].filter(Boolean).join(" — ")}</strong></span></div>}
      {instagram && <a href={instagram} target="_blank" rel="noreferrer"><AtSign /><span><small>Instagram</small><strong>{settings.instagram}</strong></span><ExternalLink /></a>}
      {facebook && <a href={facebook} target="_blank" rel="noreferrer"><AtSign /><span><small>Facebook</small><strong>{settings.facebook}</strong></span><ExternalLink /></a>}
    </div>
  </div>;
}
