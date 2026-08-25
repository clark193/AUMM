import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const email=process.argv[2];if(!email){console.error("Uso: node scripts/set-first-admin.mjs email@exemplo.com");process.exit(1)}initializeApp({credential:applicationDefault()});const user=await getAuth().getUserByEmail(email);await getAuth().setCustomUserClaims(user.uid,{admin:true,adminRole:"super_admin",permissions:{}});console.log(`Super Admin configurado com segurança para ${email}. Faça logout e login novamente.`);
