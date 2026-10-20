import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseServices } from "./firebase";

export async function manageMemberAccount(data: {
  memberId: string;
  action: "password" | "delete";
  password?: string;
  confirmation?: string;
}) {
  const { app } = getFirebaseServices();
  await httpsCallable(getFunctions(app, "southamerica-east1"), "manageMemberAccount")(data);
}
