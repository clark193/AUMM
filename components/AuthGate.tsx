"use client";
import {onAuthStateChanged} from "firebase/auth";
import {collection,doc,limit,onSnapshot,query,where} from "firebase/firestore";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {firebaseEnabled,getFirebaseServices} from "@/lib/firebase";
export function AuthGate({children,admin=false}:{children:React.ReactNode;admin?:boolean}){
 const router=useRouter(),pathname=usePathname();const [allowed,setAllowed]=useState(!firebaseEnabled),[checking,setChecking]=useState(firebaseEnabled),[error,setError]=useState("");
 useEffect(()=>{if(!firebaseEnabled)return;const {auth,db}=getFirebaseServices();let stopRole=()=>{},stopMember=()=>{};let generation=0;const stop=onAuthStateChanged(auth,user=>{const version=++generation;stopRole();stopMember();setAllowed(false);setChecking(true);setError("");if(!user||user.isAnonymous){router.replace("/associado/login");return;}let roleReady=false,memberReady=false,isAdmin=false,isMember=false,mustChange=false;
  const evaluate=()=>{if(version!==generation||!roleReady||!memberReady)return;if(mustChange&&!pathname.endsWith("/alterar-senha")){router.replace("/associado/alterar-senha?primeiro=1");return;}if(admin?!(isAdmin&&isMember):!isMember){router.replace("/associado/login?erro=acesso");return;}setAllowed(true);setChecking(false);};
  const failed=()=>{if(version===generation){setError("Não foi possível verificar o acesso. Confira sua conexão e tente novamente.");setChecking(false);setAllowed(false);}};
  stopRole=onSnapshot(doc(db,"adminRoles",user.uid),s=>{isAdmin=s.data()?.active===true;roleReady=true;evaluate();},failed);
  stopMember=onSnapshot(query(collection(db,"associados"),where("uid","==",user.uid),limit(1)),s=>{isMember=!s.empty&&s.docs[0].data().status==="active";mustChange=!s.empty&&s.docs[0].data().mustChangePassword===true;memberReady=true;evaluate();},failed);
 });return()=>{generation++;stop();stopRole();stopMember();};},[admin,pathname,router]);
 if(checking)return <div className="verify-shell"><div className="empty-state">Verificando acesso seguro…</div></div>;if(error)return <p role="alert">{error}</p>;return allowed?<>{children}</>:null;
}
