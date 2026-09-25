import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BUSINESS_INFO } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Política de Cookies y Almacenamiento Local | Galindo Barber',
  description: 'Información sobre el uso de cookies y tecnologías de almacenamiento local en el sitio web de Galindo Barber.',
};

export default function PoliticaCookiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900 selection:bg-zinc-200">
      <Navbar />

      <main className="flex-1 py-12 sm:py-16 bg-zinc-50/60 border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Enlace volver */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la tienda</span>
            </Link>
          </div>

          {/* Tarjeta de Contenido */}
          <div className="bg-white p-6 sm:p-12 rounded-2xl border border-zinc-200 shadow-xs space-y-8">
            
            {/* Encabezado Corporativo Sobrio */}
            <div className="border-b border-zinc-200 pb-6 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                <span>Transparencia Digital</span>
                <span>•</span>
                <span>Almacenamiento Local HTML5</span>
                <span>•</span>
                <span>Perú</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 uppercase tracking-tight">
                Política de Cookies y Almacenamiento Local
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                Última revisión: Septiembre de 2026
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed pt-2">
                Esta política detalla qué tecnologías de almacenamiento técnico utiliza el sitio web de <b>Galindo Barber Academy & Supply</b>, con qué finalidad operan y cómo puedes gestionarlas directamente desde tu navegador.
              </p>
            </div>

            {/* Articulado */}
            <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-zinc-700 divide-y divide-zinc-100">
              
              {/* 1. Qué son */}
              <section className="space-y-3 pt-6 first:pt-0">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  1. Definición de Cookies y Almacenamiento Local
                </h2>
                <p>
                  Las cookies y las tecnologías de almacenamiento web (como <code>localStorage</code> y <code>sessionStorage</code> del estándar HTML5) son pequeños registros de datos que un sitio web almacena en el navegador del usuario. Su función es recordar configuraciones técnicas y preferencias para asegurar el funcionamiento de la tienda online sin tener que reconfigurar todo en cada cambio de página.
                </p>
              </section>

              {/* 2. Marco Legal y Ausencia de Rastreo */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  2. Finalidad Técnica y Ausencia de Rastreo de Terceros
                </h2>
                <p>
                  Conforme a la <b>Ley N° 29733 (Perú)</b> y estándares internacionales de privacidad, las cookies estrictamente necesarias para brindar un servicio solicitado por el usuario (como armar un carrito de compras o elegir la sede de atención) no requieren bloqueo previo, pero sí el deber estricto de información previa y transparencia.
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 space-y-1">
                  <p className="font-bold text-zinc-950">Declaración de No Rastreo Publicitario:</p>
                  <p className="text-zinc-600">
                    Galindo Barber <b>no utiliza cookies de terceros para publicidad invasiva, perfilamiento comercial ni venta de hábitos de navegación</b>. No instalamos píxeles de seguimiento entre páginas web ajenas. Todas nuestras claves son de primer origen (propias del sitio) y operan con fines puramente operativos.
                  </p>
                </div>
              </section>

              {/* 3. Tabla Detallada */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  3. Tecnologías de Almacenamiento Utilizadas en este Sitio
                </h2>
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-50 text-zinc-900 font-bold uppercase font-mono border-b border-zinc-200">
                      <tr>
                        <th className="p-3">Clave / Nombre</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3">Duración</th>
                        <th className="p-3">Finalidad Técnica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-zinc-700">
                      <tr>
                        <td className="p-3 font-mono font-bold text-black">galindo_cart_v1</td>
                        <td className="p-3">localStorage</td>
                        <td className="p-3">Persistente</td>
                        <td className="p-3"><b>Estrictamente necesaria:</b> Mantiene los productos agregados al carrito mientras navegas entre páginas.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-black">galindo_sede_v1</td>
                        <td className="p-3">localStorage</td>
                        <td className="p-3">Persistente</td>
                        <td className="p-3"><b>Preferencia técnica:</b> Recuerda la sede elegida (Ica o Huancayo) para mostrar el stock e inventario correcto.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-black">galindo_sede_prompted_v1</td>
                        <td className="p-3">sessionStorage</td>
                        <td className="p-3">Sesión</td>
                        <td className="p-3"><b>Usabilidad:</b> Evita que el selector de sede interrumpa reiteradamente durante la misma visita.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-black">galindo_cookie_consent_v1</td>
                        <td className="p-3">localStorage</td>
                        <td className="p-3">1 año</td>
                        <td className="p-3"><b>Técnica:</b> Registra que el usuario ya leyó y aceptó el aviso informativo de cookies.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-black">galindo_auth_user</td>
                        <td className="p-3">localStorage</td>
                        <td className="p-3">Sesión segura</td>
                        <td className="p-3"><b>Seguridad:</b> Autenticación exclusiva para personal autorizado del panel de administración.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 4. Borrado */}
              <section className="space-y-3 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  4. Control y Eliminación de Almacenamiento
                </h2>
                <p>
                  El usuario puede eliminar o bloquear estas tecnologías en cualquier momento desde las opciones de configuración de su navegador web (Chrome, Firefox, Safari, Edge). Al hacerlo, el carrito se vaciará y el sistema volverá a solicitar la sede de atención.
                </p>
              </section>

              {/* 5. Contacto */}
              <section className="space-y-2 pt-6">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  5. Consultas
                </h2>
                <p className="text-zinc-600 text-xs">
                  Para cualquier duda sobre el tratamiento de datos o el funcionamiento de este sitio, puedes comunicarte a: <a href="mailto:contacto@galindobarber.pe" className="text-black font-bold underline">{BUSINESS_INFO.email}</a>.
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
