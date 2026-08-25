import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
export const metadata:Metadata={title:"Entrar"};export const dynamic="force-dynamic";
export default function Login(){return <LoginForm/>}
