"use client";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { firebaseEnabled, getFirebaseServices } from "@/lib/firebase";

export function AuthGate({children,admin=false}:{children:React.ReactNode;admin?:boolean}){const router=useRouter();const [allowed,setAllowed]=useState(!firebaseEnabled);const [checking,setChecking]=useState(firebaseEnabled);useEffect(()=>{if(!firebaseEnabled)return;const {auth}=getFirebaseServices();return onAuthStateChanged(auth,async user=>{if(!user){router.replace(`/associado/login?destino=${admin?"admin":"associado"}`);return}if(admin){const token=await user.getIdTokenResult();const role=String(token.claims.adminRole||"");if(token.claims.admin!==true&&!role){router.replace("/associado");return}}setAllowed(true);setChecking(false)})},[admin,router]);if(checking)return <div className="verify-shell"><div className="empty-state">Verificando acesso seguro…</div></div>;return allowed?<>{children}</>:null}
