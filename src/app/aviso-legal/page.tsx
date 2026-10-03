import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, Building2, Scale, BookOpen, Mail, Phone, MapPin } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BUSINESS_INFO, SEDES } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Aviso Legal | Galindo Barber Academy & Supply',
  description: 'Información legal, titularidad corporativa y condiciones de uso del sitio web de Galindo Barber Academy & Supply conforme a las leyes de la República del Perú.',
  alternates: {
    canonical: 'https://galindobarber.pe/aviso-legal',
  },
};

export default function AvisoLegalPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 bg-zinc-50/60 border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Enlace volver */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </Link>
          </div>

          {/* Tarjeta de Contenido */}
          <div className="bg-white p-6 sm:p-12 rounded-2xl border border-zinc-200 shadow-xs space-y-8">
            
            {/* Encabezado */}
            <div className="border-b border-zinc-200 pb-6 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                <span className="flex items-center gap-1 font-semibold text-zinc-700">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Transparencia Corporativa
                </span>
                <span>•</span>
                <span>Comercio Electrónico</span>
                <span>•</span>
                <span>Perú</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-zinc-950 uppercase tracking-tight">
                Aviso Legal
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                Última actualización: Septiembre de 2026
              </p>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pt-2">
                En cumplimiento del principio de transparencia e información al consumidor, el presente Aviso Legal regula el acceso, navegación y utilización de la plataforma web oficial de <b>Galindo Barber Academy & Supply</b>.
              </p>
            </div>

            {/* Articulado Legal */}
            <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-zinc-700 divide-y divide-zinc-100">
              
              {/* 1. Datos Identificativos */}
              <section className="space-y-3 pt-6 first:pt-0">
                <h2 className="text-sm sm:text-base font-bold text-zinc-950 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-zinc-700" />
                  1. Datos Identificativos del Titular
                </h2>
                <p>
                  En cumplimiento del deber de información, se indican los datos de la empresa titular y operadora del presente sitio web:
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5 font-mono text-xs text-zinc-800">
                  <p><b>Razón Social:</b> {BUSINESS_INFO.yapeHolder}</p>
                  <p><b>Nombre Comercial:</b> {BUSINESS_INFO.name}</p>
                  <p><b>Actividad Económica:</b> Enseñanza y capacitación técnica presencial de barbería, estilismo y visagismo; venta minorista de herramientas, máquinas de corte y suministros de peluquería.</p>
                  <p><b>Sede Central Ica:</b> {SEDES.ica.direccionCompleta} (Tel: {SEDES.ica.whatsappDisplay})</p>
                  <p><b>Sede Huancayo:</b> {SEDES.huancayo.direccionCompleta} (Tel: {SEDES.huancayo.whatsappDisplay})</p>
                  <p><b>Correo Electrónico Oficial:</b> {BUSINESS_INFO.email}</p>
                </div>
              </section>

              {/* 2. Objeto y Ámbito de Aplicación */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm sm:text-base font-bold text-zinc-950 uppercase tracking-wide">
                  2. Objeto y Ámbito de Aplicación
                </h2>
                <p>
                  El sitio web pone a disposición de los usuarios información acerca de los programas académicos presenciales, módulos de formación, catálogo de herramientas originales de barbería y el sistema de pedidos con recojo express en tienda física.
                </p>
                <p>
                  El acceso a este portal atribuye la condición de Usuario e implica la aceptación plena de todas las disposiciones incluidas en este Aviso Legal, así como en nuestros{' '}
                  <Link href="/terminos" className="font-semibold text-black underline hover:text-zinc-600">
                    Términos y Condiciones
                  </Link>{' '}
                  y{' '}
                  <Link href="/privacidad" className="font-semibold text-black underline hover:text-zinc-600">
                    Política de Privacidad
                  </Link>.
                </p>
              </section>

              {/* 3. Propiedad Intelectual e Industrial */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm sm:text-base font-bold text-zinc-950 uppercase tracking-wide flex items-center gap-2">
                  <Scale className="w-4 h-4 text-zinc-700" />
                  3. Propiedad Intelectual e Industrial
                </h2>
                <p>
                  Todos los contenidos de la plataforma (diseños, textos, logotipos, imágenes, audios, código fuente y estructura de navegación) son propiedad exclusiva de <b>{BUSINESS_INFO.yapeHolder}</b> o de terceros que han autorizado su uso, encontrándose protegidos por la legislación peruana de derechos de autor (Decreto Legislativo N° 822) y normas internacionales.
                </p>
                <p>
                  Las marcas comerciales de herramientas distribuidas (incluyendo Wahl®, BaBylissPRO®, Andis®, Gamma+®, entre otras) pertenecen a sus respectivos fabricantes y se exhiben en este sitio web única y legítimamente con fines de identificación y comercialización de productos originales.
                </p>
              </section>

              {/* 4. Exclusión de Responsabilidad */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm sm:text-base font-bold text-zinc-950 uppercase tracking-wide">
                  4. Exclusión de Responsabilidad
                </h2>
                <p>
                  Galindo Barber adopta medidas técnicas y de seguridad para garantizar la continuidad y correcto funcionamiento del portal. No obstante, no se hace responsable por:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                  <li>Interrupciones temporales causadas por fallas en las redes de telecomunicaciones ajenas a nuestro control.</li>
                  <li>Uso indebido de la información o de las herramientas por parte del usuario o de terceros.</li>
                  <li>Variaciones de stock originadas por compras simultáneas en el mostrador físico antes de la sincronización de inventario.</li>
                </ul>
              </section>

              {/* 5. Libro de Reclamaciones */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm sm:text-base font-bold text-zinc-950 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  5. Protección al Consumidor y Reclamaciones
                </h2>
                <p>
                  De conformidad con la Ley N° 29571 (Código de Protección y Defensa del Consumidor del Perú) y el D.S. N° 011-2011-PCM, Galindo Barber cuenta con un canal virtual permanente para registrar cualquier disconformidad con respecto a nuestros productos o servicios.
                </p>
                <div className="pt-1">
                  <Link
                    href="/reclamaciones"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Acceder al Libro de Reclamaciones Virtual</span>
                  </Link>
                </div>
              </section>

              {/* 6. Ley Aplicable y Jurisdicción */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm sm:text-base font-bold text-zinc-950 uppercase tracking-wide">
                  6. Ley Aplicable y Jurisdicción
                </h2>
                <p>
                  Para la resolución de cualquier controversia o cuestión litigiosa relativa a este sitio web o a las transacciones efectuadas a través del mismo, resultará de aplicación la legislación de la <b>República del Perú</b>, sometiéndose las partes a la competencia territorial de los jueces y tribunales del distrito judicial correspondiente a la sede del servicio.
                </p>
              </section>

            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
