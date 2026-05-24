import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lab Fluxos — Laboratório de Fluxos PJe",
  description:
    "Plataforma multi-agente para governança de fluxos PJe (jBPM jPDL 3.2 + BPMN 2.0).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable}`}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
