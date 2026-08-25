import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
type Props={params:Promise<{token:string}>};
export function generateStaticParams(){return [{token:"AUMM-DEMO-1027"}];}
export const dynamicParams=false;
export const metadata={title:"Verificação de Carteirinha",robots:{index:false,follow:false}};
export default async function Verify({params}:Props){const {token}=await params;const isDemo=token==="AUMM-DEMO-1027";return <PublicShell><div className="verify-shell"><article className="verify-card"><div className="verify-head"><BadgeCheck/><h1>ASSOCIADO AUMM VÁLIDO</h1></div><div className="verify-data">{isDemo&&<span className="demo-badge">Dados de demonstração</span>}<div className="verify-row"><span>Nome</span><strong>{isDemo?"João Silva":"Associado verificado"}</strong></div><div className="verify-row"><span>Número</span><strong>{isDemo?"AUMM-1027":"Protegido"}</strong></div><div className="verify-row"><span>Cargo</span><strong>Associado</strong></div><div className="verify-row"><span>Situação</span><span className="status active">Ativo</span></div><div className="verify-row"><span>Verificado em</span><strong>24/08/2026</strong></div></div><div className="verify-foot">Esta página exibe apenas dados autorizados. Nenhum CPF, contato ou documento é divulgado.</div></article><Link className="text-link" href="/" style={{marginTop:25}}>Conhecer a AUMM</Link></div></PublicShell>}
