import type { Metadata } from "next";
import { Archivo, Oswald } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "AUMM — União que move Blumenau", template: "%s | AUMM" },
  description: "Associação de motoboys e motociclistas de Blumenau. Representação, segurança, benefícios e transparência.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: { title: "AUMM — União que move Blumenau", description: "Motoboys e motociclistas unidos por respeito, segurança e futuro.", images: ["/og.png"], locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image", title: "AUMM — União que move Blumenau", description: "Motoboys e motociclistas unidos por respeito, segurança e futuro.", images: ["/og.png"] },
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
