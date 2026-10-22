"use client";
import {useEffect,useState} from "react";
import {onAuthStateChanged} from "firebase/auth";
import {collection,doc,limit,onSnapshot,query,where} from "firebase/firestore";
import {firebaseEnabled,getFirebaseServices} from "./firebase";
export type ActiveAdmin={active:boolean;level:number|string;fullName?:string;role?:string;roleId?:string;permissions?:Record<string,boolean>};
export function useActiveAdmin(){
 const [role,setRole]=useState<ActiveAdmin|null>(null),[loading,setLoading]=useState(firebaseEnabled);
 useEffect(()=>{
  if(!firebaseEnabled){setLoading(false);return;}
  const {auth,db}=getFirebaseServices();let stopRole=()=>{},stopMember=()=>{};
  const stop=onAuthStateChanged(auth,user=>{
   stopRole();stopMember();setRole(null);
   if(!user||user.isAnonymous){setLoading(false);return;}
   setLoading(true);let candidate:ActiveAdmin|null=null,roleReady=false,memberReady=false,activeMember=false;
   const publish=()=>{if(roleReady&&memberReady){setRole(activeMember?candidate:null);setLoading(false);}};
   stopRole=onSnapshot(doc(db,"adminRoles",user.uid),s=>{candidate=s.data()?.active===true?s.data() as ActiveAdmin:null;roleReady=true;publish();},()=>{candidate=null;roleReady=true;publish();});
   stopMember=onSnapshot(query(collection(db,"associados"),where("uid","==",user.uid),limit(1)),s=>{activeMember=!s.empty&&s.docs[0].data().status==="active";memberReady=true;publish();},()=>{activeMember=false;memberReady=true;publish();});
  });return()=>{stop();stopRole();stopMember();};
 },[]);return {role,loading};
}
