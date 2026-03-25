import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "A2 Publisher",
  description: "Painel de publicação visual da A2 Agency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${geist.className} antialiased min-h-full`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
