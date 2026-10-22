import {useEffect,useRef} from "react";
import {AdminModuleContent} from "../../components/AdminModuleContent";
import {AdminDashboardContent} from "../../components/AdminDashboardContent";
import {navGroups} from "../../components/AdminShell";
import {EmbeddedAdminContext,NativeActionsContext} from "../../components/EmbeddedAdmin";
import {EmergencyAdmin} from "../../components/EmergencyAdmin";
import {openUrl} from "./platform";
import {Share} from "@capacitor/share";
import {Clipboard} from "@capacitor/clipboard";
import {Capacitor} from "@capacitor/core";
import {activateEmbeddedNavigation,navigate,useRoute} from "./portal/navigation";
import type {ActiveAdmin} from "../../lib/useActiveAdmin";
import {ArrowLeft,Info,ShieldCheck} from "lucide-react";
import {adminLevelExplanation} from "../../lib/adminLevels";
export default function AdminWorkspace({profile,startPath="/admin",onExit}:{profile:ActiveAdmin;startPath?:string;onExit:(path:string)=>void}){
 const exit=useRef(onExit);exit.current=onExit;const route=useRoute().split("?")[0];
 useEffect(()=>activateEmbeddedNavigation(startPath,path=>exit.current(path)),[]);
 useEffect(()=>{navigate(startPath);},[startPath]);
 const allowed=(href:string,levels:readonly number[])=>levels.includes(Number(profile.level))||(href==="/admin/assembleias"&&Object.entries(profile.permissions||{}).some(([key,value])=>value&&["canManageAssemblies","canPublishAssembly","canPresideAssembly","canModerateAssembly","canCertifyResults","canFinalizeMinutes"].includes(key)))||(href==="/admin/filiacoes"&&profile.permissions?.canManageMembershipRequests===true);
 return <EmbeddedAdminContext.Provider value={true}><NativeActionsContext.Provider value={{siteUrl:import.meta.env.VITE_SITE_URL||"https://aumm.com.br",share:async url=>{if(Capacitor.isNativePlatform()||typeof navigator.share==="function")await Share.share({title:"Credencial AUMM",url});else await Clipboard.write({string:url});}}}><div className="mobile-member-feature mobile-admin-workspace" onClickCapture={event=>{const anchor=(event.target as Element).closest("a");if(!anchor)return;const href=anchor.getAttribute("href")||"";if(href.startsWith("/")||href.startsWith("#/")){event.preventDefault();navigate(href.startsWith("#")?href.slice(1):href);}else if(/^(https?:|tel:|mailto:|geo:)/i.test(href)){event.preventDefault();void openUrl(href).catch(()=>{});}}}><div className="admin-native-heading"><ShieldCheck size={27}/><div><small>{profile.role||"Administração"}</small><h1>Espaço administrativo</h1></div></div><details className="permission-info"><summary><Info size={17}/> Meu acesso · nível {profile.level}</summary><p>{adminLevelExplanation(Number(profile.level))}</p></details>{[1,2,3].includes(Number(profile.level))&&<EmergencyAdmin compact/>}{route==="/admin"?<><p className="muted">Sua conta também reúne as ferramentas da diretoria. Escolha uma área.</p>{navGroups.map(group=>{const links=group.links.filter(link=>allowed(link.href,link.levels));return links.length?<section className="admin-native-group" key={group.label}><h2>{group.label}</h2><div className="admin-tool-grid">{links.filter(link=>link.href!=="/admin").map(({href,label,icon:Icon})=><button key={href} onClick={()=>navigate(href)}><Icon size={23}/><span>{label}</span></button>)}</div></section>:null;})}<details className="admin-overview"><summary>Resumo da gestão</summary><AdminDashboardContent/></details></>:<><button className="text-btn admin-back" onClick={()=>navigate("/admin")}><ArrowLeft size={17}/> Todas as ferramentas</button><AdminModuleContent key={route} module={route.slice(7)}/></>}</div></NativeActionsContext.Provider></EmbeddedAdminContext.Provider>;
}
