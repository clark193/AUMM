import type { Metadata } from "next";
import { ApplicationForm } from "./ApplicationForm";
export const metadata: Metadata={title:"Associe-se",description:"Envie sua solicitação de associação à AUMM."};
export default function JoinPage(){return <ApplicationForm/>}
