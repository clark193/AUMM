import type { MetadataRoute } from "next";
export const dynamic="force-static";
export default function robots():MetadataRoute.Robots{const base=process.env.NEXT_PUBLIC_SITE_URL||"https://aumm.com.br";return {rules:{userAgent:"*",allow:"/",disallow:["/admin/","/associado/","/verificar/"]},sitemap:`${base}/sitemap.xml`}}
