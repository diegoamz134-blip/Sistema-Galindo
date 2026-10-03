import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { SedeProvider } from "@/context/SedeContext";
import { CartGlobalComponents } from "@/components/cart/CartGlobalComponents";
import { StructuredData } from "@/components/common/StructuredData";
import { GoogleAnalytics } from "@/components/common/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://galindobarber.pe"),
  title: {
    default: "Galindo Barber Academy & Supply | Ica y Huancayo, Perú",
    template: "%s | Galindo Barber",
  },
  description:
    "Escuela técnica de barbería profesional y tienda oficial de herramientas de corte (Wahl, BaBylissPRO) en Ica y Huancayo. Cursos presenciales de fade, visagismo y kits de inicio.",
  keywords: [
    "barbería Ica",
    "barbería Huancayo",
    "cursos de barbería",
    "academia de barbería Perú",
    "máquinas Wahl originales",
    "Wahl Magic Clip",
    "BaBylissPRO Skeleton",
    "herramientas de barbería",
    "fade profesional",
  ],
  authors: [{ name: "Galindo Barber Academy & Supply" }],
  creator: "Galindo Barber",
  publisher: "GALINDO BARBERS E.I.R.L.",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "https://galindobarber.pe",
    siteName: "Galindo Barber Academy & Supply",
    title: "Galindo Barber Academy & Supply | Ica y Huancayo",
    description:
      "Escuela de barbería profesional y tienda oficial de herramientas de corte. Cursos presenciales y venta de máquinas originales.",
    images: [
      {
        url: "/baner.webp",
        width: 1200,
        height: 630,
        alt: "Galindo Barber Academy & Supply Portada Oficial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Galindo Barber Academy & Supply",
    description:
      "Formación técnica profesional en barbería y venta de herramientas originales en Ica y Huancayo, Perú.",
    images: ["/baner.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
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
      <head>
        <StructuredData />
      </head>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <AuthProvider>
          <SedeProvider>
            <CartProvider>
              {children}
              <CartGlobalComponents />
              <GoogleAnalytics />
            </CartProvider>
          </SedeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

