import type { MetadataRoute } from "next";
export const dynamic="force-static";
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.NEXT_PUBLIC_SITE_URL||"https://aumm.com.br";return ["","/quem-somos","/diretoria","/noticias","/projetos","/acoes","/beneficios","/parceiros","/eventos","/transparencia","/documentos","/contato","/associe-se","/privacidade","/termos"].map(path=>({url:`${base}${path}`,lastModified:new Date(),changeFrequency:path==="/noticias"?"weekly":"monthly",priority:path===""?1:.7}))}
