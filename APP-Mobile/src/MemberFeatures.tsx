import { AssemblyMember } from "../../components/AssemblyMember";
import { MemberSettingsPage } from "../../components/MemberSettingsPage";
import { MemberCardContent } from "../../components/MemberCardContent";
import { MemberFinancialTransparency } from "../../components/MemberFinancialTransparency";
import { DocumentLibrary } from "../../components/DocumentLibrary";
import { MemberBenefits } from "../../components/MemberBenefits";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { useState } from "react";
import { StatutePage } from "../../components/StatutePage";
export default function MemberFeatures({feature,onPhoto}:{feature:string;onPhoto:()=>void}) {
  const [statute,setStatute]=useState(false);
  if (statute || feature === "statute") return <div className="mobile-member-feature">{statute&&<button className="btn secondary" onClick={()=>setStatute(false)}>Voltar aos documentos</button>}<StatutePage mobile/></div>;
  return <div className="mobile-member-feature">{feature==="benefits"?<MemberBenefits/>:feature==="assembly"?<AssemblyMember embedded/>:feature==="settings"?<MemberSettingsPage embedded/>:feature==="card"?<MemberCardContent embedded siteUrl={import.meta.env.VITE_SITE_URL||"https://aumm.com.br"} onPhoto={onPhoto} onShare={async url=>{if(Capacitor.isNativePlatform()||typeof navigator.share === "function")await Share.share({title:"Carteirinha AUMM",url});else await navigator.clipboard.writeText(url);}}/>:feature==="transparency"?<MemberFinancialTransparency/>:feature==="documents"?<DocumentLibrary member siteUrl={import.meta.env.VITE_SITE_URL||"https://aumm.com.br"} onStatute={()=>setStatute(true)}/>:null}</div>;
}
