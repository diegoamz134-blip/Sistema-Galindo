import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartGlobalComponents } from "@/components/cart/CartGlobalComponents";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Galindo Barber Academy & Supply | Ica, Perú",
  description: "Escuela de barbería profesional y tienda oficial de herramientas de corte en Ica. Cursos de fade, tijera y visagismo con recojo en tienda física.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <AuthProvider>
          <CartProvider>
            {children}
            <CartGlobalComponents />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
