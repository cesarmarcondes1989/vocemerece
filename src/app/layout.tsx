import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Tudo aqui é por pessoa (cookie da sessão): deixa as rotas renderizarem no servidor a cada request.
export const instant = false;

export const metadata: Metadata = {
  title: "Universo 2026",
  description: "Seu 2026, seu planeta, seu time.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#05060f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="stars" aria-hidden />
        <div className="relative z-10 min-h-full">{children}</div>
      </body>
    </html>
  );
}
