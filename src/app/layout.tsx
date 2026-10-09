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
    default: "Galindo Barber Academy & Supply | Academia de Barbería Profesional en Ica y Huancayo",
    template: "%s | Galindo Barber Academy",
  },
  description:
    "Academia líder en formación de Barberos Profesionales y Estilistas Masculinos en Ica y Huancayo. Cursos presenciales de corte de cabello, fade, visagismo, tijera y venta de máquinas originales Wahl y BaBylissPRO. ¡Matrículas abiertas con certificación técnica!",
  keywords: [
    // Profesiones y carreras
    "barbero profesional",
    "carrera de barbero",
    "estilista masculino",
    "tecnico en barberia",
    "profesion de barbero peru",
    // Cursos y capacitaciones
    "academia de barberia",
    "curso de barberia",
    "escuela de barberia",
    "clases de barberia",
    "aprender barberia desde cero",
    "cursos de corte de cabello",
    "tecnicas de fade y degradados",
    "visagismo capilar masculino",
    "colorimetria y disenos",
    "barboterapia y afeitado tradicional",
    "certificacion tecnica de barbero",
    // Ubicaciones
    "barberia en Ica",
    "cursos de barberia en Ica",
    "academia de barberia Ica",
    "barberia en Huancayo",
    "cursos de barberia en Huancayo",
    "academia de barberia Huancayo",
    "escuela de barberos peru",
    // Tienda y herramientas
    "maquinas Wahl originales",
    "Wahl Magic Clip",
    "BaBylissPRO Skeleton",
    "herramientas para barbero",
    "tijeras de barbero filo dulce",
    "tienda de barberia en Ica",
    "tienda de barberia en Huancayo",
    "barber supply peru",
    "Galindo Barber",
    "Galindo Barber Academy",
  ],
  authors: [{ name: "Galindo Barber Academy & Supply", url: "https://galindobarber.pe" }],
  creator: "Galindo Barber Academy",
  publisher: "GALINDO BARBERS E.I.R.L.",
  category: "Education",
  classification: "Academia de Barbería y Comercio de Herramientas de Corte",
  alternates: {
    canonical: "https://galindobarber.pe",
  },
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
    title: "Galindo Barber Academy & Supply | Academia de Barbería en Ica y Huancayo",
    description:
      "Aprende la profesión de Barbero Profesional con clases 100% prácticas en Ica y Huancayo. Tienda oficial de máquinas de corte Wahl y BaBylissPRO.",
    images: [
      {
        url: "/baner.webp",
        width: 1200,
        height: 630,
        alt: "Galindo Barber Academy & Supply - Formación de Barberos Profesionales",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Galindo Barber Academy & Supply | Academia de Barbería en Ica y Huancayo",
    description:
      "Formación técnica profesional en barbería y venta de herramientas originales en Ica y Huancayo, Perú.",
    images: ["/baner.webp"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "google0057ec1f2f18a44c",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
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

