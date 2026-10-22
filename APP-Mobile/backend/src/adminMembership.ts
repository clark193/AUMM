import {getFirestore} from "firebase-admin/firestore";
export async function hasAdminMembership(uid:string,role:Record<string,unknown>){
 const memberId=typeof role.memberId==="string"?role.memberId:uid;
 if(!memberId||memberId.includes("/"))return false;
 const member=(await getFirestore().doc(`associados/${memberId}`).get()).data();
 return member?.uid===uid&&member.status==="active";
}
