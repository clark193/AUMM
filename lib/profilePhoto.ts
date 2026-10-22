import {collection,doc,getDoc,getDocs,limit,query,serverTimestamp,where,writeBatch} from "firebase/firestore";
import {getFirebaseServices} from "./firebase";
/** Uma foto pessoal, refletida nas credenciais existentes sem alterar cargo ou status. */
export async function saveProfilePhoto(uid:string,dataUrl:string){
 const {auth,db}=getFirebaseServices();if(!auth.currentUser)throw Error("Sua sessão expirou.");
 const batch=writeBatch(db),photo={uid,dataUrl,contentType:dataUrl.startsWith("data:image/webp")?"image/webp":"image/jpeg",updatedAt:serverTimestamp()};
 batch.set(doc(db,"memberPhotos",uid),photo);
 if(uid===auth.currentUser.uid)batch.set(doc(db,"adminPhotos",uid),photo);
 const [members,card]=await Promise.all([getDocs(query(collection(db,"associados"),where("uid","==",uid),limit(1))),getDoc(doc(db,"adminCards",uid)).catch(()=>null)]);
 const tokens=new Set([String(members.docs[0]?.data().memberNumber||""),String(card?.data()?.cardNumber||"")]);
 for(const token of tokens){if(!token)continue;const ref=doc(db,"publicMembers",token),record=await getDoc(ref);if(record.exists()&&record.data().uid===uid)batch.update(ref,{photoDataUrl:dataUrl,updatedAt:serverTimestamp()});}
 await batch.commit();
}
