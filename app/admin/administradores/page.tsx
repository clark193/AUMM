"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
export default function LegacyAdminAccess(){const router=useRouter();useEffect(()=>router.replace("/admin/associados"),[router]);return <p>Os cargos e níveis agora são definidos na <Link href="/admin/associados">lista de associados</Link>.</p>;}
