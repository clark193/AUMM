"use client";
import {useEffect,useState} from "react";
import {onAuthStateChanged} from "firebase/auth";
import {doc,onSnapshot} from "firebase/firestore";
import {firebaseEnabled,getFirebaseServices} from "./firebase";
export type ActiveAdmin={active:boolean;level:number|string;fullName?:string;role?:string;roleId?:string;permissions?:Record<string,boolean>};
export function useActiveAdmin(){const [role,setRole]=useState<ActiveAdmin|null>(null),[loading,setLoading]=useState(firebaseEnabled);useEffect(()=>{if(!firebaseEnabled){setLoading(false);return;}const {auth,db}=getFirebaseServices();let stopRole=()=>{};const stop=onAuthStateChanged(auth,user=>{stopRole();setRole(null);if(!user||user.isAnonymous){setLoading(false);return;}setLoading(true);stopRole=onSnapshot(doc(db,"adminRoles",user.uid),s=>{setRole(s.data()?.active===true?s.data() as ActiveAdmin:null);setLoading(false);},()=>{setRole(null);setLoading(false);});});return()=>{stop();stopRole();};},[]);return {role,loading};}
