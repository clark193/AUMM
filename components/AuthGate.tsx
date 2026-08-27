"use client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

export function AuthGate({children,admin=false}:{children:React.ReactNode;admin?:boolean}){const router=useRouter();const pathname=usePathname();const [allowed,setAllowed]=useState(!firebaseEnabled);const [checking,setChecking]=useState(firebaseEnabled);useEffect(()=>{if(!firebaseEnabled)return;const {auth,db}=getFirebaseServices();return onAuthStateChanged(auth,async user=>{if(!user){router.replace(`/associado/login?destino=${admin?"admin":"associado"}`);return}if(admin){const access=await getDoc(doc(db,"adminRoles",user.uid));if(!access.exists()||access.data().active!==true){router.replace("/associado/login?destino=admin&erro=acesso");return}}else{const membership=await getDocs(query(collection(db,"associados"),where("uid","==",user.uid),limit(1)));if(membership.empty||membership.docs[0].data().status!=="active"){router.replace("/associado/login?erro=acesso");return}if(membership.docs[0].data().mustChangePassword===true&&!pathname.endsWith("/alterar-senha")){router.replace("/associado/alterar-senha?primeiro=1");return}}setAllowed(true);setChecking(false)})},[admin,pathname,router]);if(checking)return <div className="verify-shell"><div className="empty-state">Verificando acesso seguro…</div></div>;return allowed?<>{children}</>:null}
