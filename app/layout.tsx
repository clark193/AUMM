import type { Metadata } from "next";
import { Archivo, Oswald } from "next/font/google";
import { withBasePath } from "@/lib/paths";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "AUMM — A força da organização dos trabalhadores", template: "%s | AUMM" },
  description: "Associação União Maior Motoboys. Organização, representação, benefícios e defesa dos trabalhadores em todo o Brasil.",
  icons: {
    icon: withBasePath("/logo.png"),
    shortcut: withBasePath("/logo.png"),
  },
  openGraph: { title: "AUMM — A força da organização dos trabalhadores", description: "Motofretistas e entregadores unidos em todo o Brasil.", images: [{ url: `${siteUrl}/logo.png`, width: 1694, height: 1384, alt: "Logo da Associação União Maior Motoboys" }], locale: "pt_BR", type: "website" },
  twitter: { card: "summary", title: "AUMM — A força da organização dos trabalhadores", description: "Motofretistas e entregadores unidos em todo o Brasil.", images: [`${siteUrl}/logo.png`] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${archivo.variable} ${oswald.variable}`}>
        {children}
      </body>
    </html>
  );
}
