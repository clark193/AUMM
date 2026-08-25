import type { Metadata } from "next";
import { ApplicationForm } from "./ApplicationForm";
export const metadata: Metadata={title:"Associe-se",description:"Solicite sua filiação à Associação União Maior Motoboys de forma simples e segura."};
export default function JoinPage(){return <ApplicationForm/>}
